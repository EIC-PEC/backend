import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassType, PaymentStatus, Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateSignedQrToken } from '../common/utils/qr.util';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { PASS_TIERS_CATALOG } from './pass-types.config';
import { randomInt } from 'node:crypto';
import { EmailService } from '../email/email.service';
import QRCode from 'qrcode';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);
  private readonly qrSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.qrSecret = this.config.getOrThrow<string>('QR_HMAC_SECRET');
  }


  async getPassCatalog() {
    const counts = await this.prisma.registration.groupBy({
      by: ['passType'],
      _count: { id: true },
    });

    const countsMap = new Map<PassType, number>();
    for (const c of counts) {
      countsMap.set(c.passType, c._count.id);
    }

    return PASS_TIERS_CATALOG.map((tier) => ({
      ...tier,
      totalIssued: countsMap.get(tier.enumType) ?? 0,
    }));
  }

  async createRegistration(dto: CreateRegistrationDto, authUserId?: string) {
    const catalogItem = PASS_TIERS_CATALOG.find((t) => t.enumType === dto.passType);
    if (!catalogItem) {
      throw new BadRequestException(`Unknown pass type: ${dto.passType}`);
    }

    let user: User;
    if (authUserId) {
      const existing = await this.prisma.user.findUnique({ where: { id: authUserId } });
      if (!existing) throw new NotFoundException('Authenticated user not found.');
      user = existing;
    } else {
      const normalizedEmail = dto.email.toLowerCase().trim();
      const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        user = existing;
      } else {
        let referredById: string | undefined;
        if (dto.referralCode) {
          const referrer = await this.prisma.user.findUnique({
            where: { referralCode: dto.referralCode.trim().toUpperCase() },
          });
          if (referrer) {
            referredById = referrer.id;
          }
        }

        let generatedReferralCode: string | undefined;
        if (dto.passType === PassType.CAMPUS_AMBASSADOR) {
          generatedReferralCode = `CA-${randomInt(1000, 9999)}`;
        }

        user = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            name: dto.name.trim(),
            phone: dto.phone?.trim(),
            college: dto.college?.trim(),
            gradYear: dto.gradYear?.trim(),
            city: dto.city?.trim(),
            role: Role.DELEGATE,
            referralCode: generatedReferralCode,
            referredById,
          },
        });
      }
    }

    const duplicate = await this.prisma.registration.findFirst({
      where: {
        userId: user.id,
        passType: dto.passType,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        `User ${user.email} is already registered with pass ID ${duplicate.passId}.`,
      );
    }

    const passId = await this.generateUniquePassId();
    const qrToken = generateSignedQrToken(user.id, passId, this.qrSecret);
    const fee = catalogItem.feeAmount;
    const isPaid = fee > 0;

    const registration = await this.prisma.$transaction(async (tx) => {
      let paymentId: string | undefined;

      if (isPaid) {
        const orderId = `order_${passId.replace('-', '_')}_${Date.now()}`;
        const payment = await tx.payment.create({
          data: {
            orderId,
            amount: fee,
            currency: 'INR',
            status: PaymentStatus.PENDING,
          },
        });
        paymentId = payment.id;
      }

      return tx.registration.create({
        data: {
          passId,
          userId: user.id,
          passType: dto.passType,
          amountPaid: fee,
          qrToken,
          paymentId,
          tracks: dto.tracks && dto.tracks.length > 0 ? dto.tracks : ['General Sessions'],
          isCheckedIn: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              college: true,
              phone: true,
            },
          },
          payment: true,
        },
      });
    });

    this.logger.log(`Pass ${passId} created for user ${user.email} [${dto.passType}]`);

    const formattedResponse = await this.formatRegistrationResponse(registration);

    // If pass is free, dispatch confirmation email immediately
    if (!isPaid) {
      this.emailService
        .sendPassConfirmationEmail({
          to: user.email,
          recipientName: user.name,
          passId: registration.passId,
          passType: registration.passType,
          qrDataUrl: formattedResponse.qrCodeDataUrl,
          college: user.college ?? undefined,
          amountPaid: 0,
        })
        .catch((err) => this.logger.error(`Pass email background dispatch failed: ${err.message}`));
    }

    return {
      registration: formattedResponse,
      isPaymentRequired: isPaid,
      catalogInfo: catalogItem,
    };
  }


  async getMyPasses(userId: string) {
    const passes = await this.prisma.registration.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            college: true,
            phone: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(passes.map((p) => this.formatRegistrationResponse(p)));
  }

  async getPassById(passId: string) {
    const pass = await this.prisma.registration.findUnique({
      where: { passId: passId.trim().toUpperCase() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            college: true,
            phone: true,
          },
        },
        payment: true,
      },
    });

    if (!pass) {
      throw new NotFoundException(`Pass with ID ${passId} not found.`);
    }

    return await this.formatRegistrationResponse(pass);
  }

  async revokePass(passIdOrRegId: string, revokedByUserId: string) {
    const reg = await this.prisma.registration.findFirst({
      where: {
        OR: [{ id: passIdOrRegId }, { passId: passIdOrRegId.toUpperCase() }],
      },
    });

    if (!reg) {
      throw new NotFoundException(`Registration with identifier "${passIdOrRegId}" not found.`);
    }

    if (reg.isRevoked) {
      throw new ConflictException(`Pass ${reg.passId} is already revoked.`);
    }

    const updated = await this.prisma.registration.update({
      where: { id: reg.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedById: revokedByUserId,
      },
      include: {
        user: true,
        payment: true,
      },
    });

    this.logger.warn(`Pass ${updated.passId} revoked by user ${revokedByUserId}`);
    return await this.formatRegistrationResponse(updated);
  }

  private async generateUniquePassId(): Promise<string> {
    for (let attempts = 0; attempts < 10; attempts++) {
      const code = `PEC-${randomInt(100_000, 999_999)}`;
      const exists = await this.prisma.registration.findUnique({
        where: { passId: code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    return `PEC-${Date.now().toString().slice(-6)}`;
  }

  private async formatRegistrationResponse(reg: any) {
    const catalogItem = PASS_TIERS_CATALOG.find((t) => t.enumType === reg.passType);
    const qrCodeDataUrl = await QRCode.toDataURL(reg.qrToken, {
      width: 240,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    return {
      id: reg.id,
      passId: reg.passId,
      passType: reg.passType,
      categoryTitle: catalogItem?.title ?? reg.passType,
      badgeTitle: catalogItem?.badgeTitle ?? 'DELEGATE',
      amountPaid: reg.amountPaid,
      isCheckedIn: reg.isCheckedIn,
      isRevoked: reg.isRevoked ?? false,
      revokedAt: reg.revokedAt ?? null,
      tracks: reg.tracks,
      qrToken: reg.qrToken,
      qrCodeDataUrl,
      createdAt: reg.createdAt,
      user: reg.user,
      payment: reg.payment
        ? {
            orderId: reg.payment.orderId,
            status: reg.payment.status,
            amount: reg.payment.amount,
          }
        : null,
    };
  }
}

