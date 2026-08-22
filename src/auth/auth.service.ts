import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} 
from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { durationToMs } from '../common/utils/duration';
import type { AccessTokenPayload } from '../common/types/authenticated-user';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

/** Fields safe to return to a client. Never includes passwordHash. */
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  college: true,
  gradYear: true,
  city: true,
  role: true,
  referralCode: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof PUBLIC_USER_SELECT }>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, session: SessionContext) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // An unknown referral code is ignored rather than rejected — a delegate should
    // never be blocked from registering because a CA typo'd their code.
    const referrer = dto.referralCode
      ? await this.prisma.user.findFirst({
          where: { referralCode: dto.referralCode.toUpperCase() },
          select: { id: true },
        })
      : null;

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await this.hashPassword(dto.password),
        name: dto.name.trim(),
        phone: dto.phone,
        college: dto.college,
        gradYear: dto.gradYear,
        city: dto.city,
        role: Role.USER,
        referralCode: await this.generateUniqueReferralCode(),
        referredById: referrer?.id ?? null,
      },
      select: PUBLIC_USER_SELECT,
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role, session);
    return { user, tokens };
  }

  async login(dto: LoginDto, session: SessionContext) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { ...PUBLIC_USER_SELECT, passwordHash: true },
    });

    // Same generic message and a dummy verify on the miss path, so response
    // content and timing don't reveal whether an email is registered.
    if (!user?.passwordHash) {
      await this.dummyVerify();
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash: _discarded, ...publicUser } = user;
    const tokens = await this.issueTokens(user.id, user.email, user.role, session);
    return { user: publicUser, tokens };
  }

  /**
   * Rotates a refresh token: the presented token is revoked and a fresh one
   * issued in the same family. Presenting an already-revoked token is treated
   * as theft and kills every token in that family (§4.1 logout/revocation).
   */
  async refresh(rawToken: string | undefined, session: SessionContext) {
    if (!rawToken) throw new UnauthorizedException('Refresh token missing');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashRefreshToken(rawToken) },
      include: { user: { select: PUBLIC_USER_SELECT } },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revokedAt || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token has expired or been revoked');
    }

    const tokens = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      return this.issueTokens(
        stored.user.id,
        stored.user.email,
        stored.user.role,
        session,
        tx,
      );
    });

    return { user: stored.user, tokens };
  }

  /** Revokes the presented token, ending the active session. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashRefreshToken(rawToken) },
      data: { revokedAt: new Date() },
    });
  }

  /** §4.1 `GET /auth/me` — current user plus their pass status. */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...PUBLIC_USER_SELECT,
        registrations: {
          select: {
            passId: true,
            passType: true,
            amountPaid: true,
            tracks: true,
            isCheckedIn: true,
            badgePdfUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Account no longer exists');

    const { registrations, ...profile } = user;
    return { user: profile, passes: registrations };
  }

  // ── Token issuance ────────────────────────────────────────────────────────

  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
    session: SessionContext,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<IssuedTokens> {
    const payload: AccessTokenPayload = { sub: userId, email, role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_TTL'),
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = new Date(
      Date.now() + durationToMs(this.config.getOrThrow<string>('JWT_REFRESH_TTL')),
    );

    await tx.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        userAgent: session.userAgent?.slice(0, 255),
        ipAddress: session.ipAddress,
        expiresAt: refreshExpiresAt,
      },
    });

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private hashRefreshToken(rawToken: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_REFRESH_SECRET'))
      .update(rawToken)
      .digest('hex');
  }


  // ── Helpers ───────────────────────────────────────────────────────────────

  private hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  /** Burns comparable CPU on the unknown-email path to flatten timing signal. */
  private async dummyVerify(): Promise<void> {
    try {
      await argon2.verify(
        '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000',
        'invalid',
      );
    } catch {
      // Expected — this hash is intentionally unverifiable.
    }
  }

  /** Every user gets a CA referral code; collisions are retried, not ignored. */
  private async generateUniqueReferralCode(): Promise<string> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = Array.from(
        randomBytes(6),
        (byte) => alphabet[byte % alphabet.length],
      ).join('');
      const code = `PEC${suffix}`;

      const taken = await this.prisma.user.findFirst({
        where: { referralCode: code },
        select: { id: true },
      });
      if (!taken) return code;
    }

    throw new Error('Could not generate a unique referral code after 5 attempts');
  }

  // ── Password Reset ─────────────────────────────────────────────────────────

  /**
   * Generates a 15-min password reset token for the given email.
   * Always returns a success message even if the email doesn't exist
   * to prevent user-enumeration attacks.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true },
    });

    // Return immediately if user not found — same response either way.
    if (!user) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHmac('sha256', this.config.getOrThrow('JWT_ACCESS_SECRET'))
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Overwrite any existing tokens for this user.
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      }),
    ]);

    const resetUrl = `${this.config.get('FRONTEND_URL') ?? 'http://localhost:3001'}/reset-password?token=${rawToken}`;

    // In dev: log the reset URL. In production: send via email.
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.warn(`[DEV] Password reset URL for ${email}: ${resetUrl}`);
    } else {
      // TODO: wire this to your email provider (Resend / Nodemailer).
      // Example: await this.mailerService.sendPasswordReset(user.email, resetUrl);
      this.logger.log(`Password reset email would be sent to ${email}`);
    }

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = createHmac('sha256', this.config.getOrThrow('JWT_ACCESS_SECRET'))
      .update(rawToken)
      .digest('hex');

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('This reset link is invalid or has expired.');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      // Mark token as used so it can't be replayed.
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Revoke all active sessions to force re-login everywhere.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password reset completed for user ${record.user?.email}`);
    return { message: 'Password has been reset. Please sign in with your new password.' };
  }
}

export type { User };
