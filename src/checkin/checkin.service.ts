import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { verifySignedQrToken } from '../common/utils/qr.util';
import { VerifyQrDto } from './dto/verify-qr.dto';
import { ManualLookupDto } from './dto/manual-lookup.dto';
import { PASS_TIERS_CATALOG } from '../registrations/pass-types.config';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);
  private readonly qrSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.qrSecret = this.config.getOrThrow<string>('QR_HMAC_SECRET');
  }

  async verifyQrCheckIn(dto: VerifyQrDto, volunteerUserId: string) {
    const cleanToken = dto.qrToken.trim();
    const gateName = dto.gateName?.trim() || 'MAIN_GATE';

    const verification = verifySignedQrToken(cleanToken, this.qrSecret);
    if (!verification.valid || !verification.payload) {
      throw new BadRequestException(
        `Invalid or forged QR token: ${verification.reason || 'Cryptographic signature mismatch.'}`,
      );
    }

    const { userId, passId } = verification.payload;

    const registration = await this.prisma.registration.findFirst({
      where: {
        OR: [{ passId: passId.toUpperCase() }, { qrToken: cleanToken }],
      },
      include: {
        user: true,
        payment: true,
      },
    });

    if (!registration) {
      throw new NotFoundException(`No registration record found for Pass ID ${passId}.`);
    }

    // Revoked passes must NEVER allow gate entry, even with a valid QR signature.
    if (registration.isRevoked) {
      this.logger.warn(`Revoked pass attempt: ${registration.passId} (${registration.user.name})`);
      throw new BadRequestException(
        `Pass ${registration.passId} has been revoked and cannot be used for entry.`,
      );
    }

    if (registration.isCheckedIn) {
      const lastCheckIn = await this.prisma.checkIn.findFirst({
        where: { userId: registration.userId },
        include: { scannedBy: { select: { name: true, email: true } } },
        orderBy: { timestamp: 'desc' },
      });

      const formattedTime = lastCheckIn
        ? new Date(lastCheckIn.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : 'earlier';

      throw new ConflictException({
        statusCode: 409,
        error: 'Duplicate Check-In Prevented',
        message: `Pass ${registration.passId} was ALREADY checked in at ${
          lastCheckIn?.gateName || 'GATE'
        } at ${formattedTime}. Pass reuse is prohibited.`,
        alreadyCheckedIn: true,
        previousCheckIn: lastCheckIn,
        delegate: {
          name: registration.user.name,
          college: registration.user.college,
          passId: registration.passId,
        },
      });
    }

    const [checkInRecord] = await this.prisma.$transaction([
      this.prisma.checkIn.create({
        data: {
          userId: registration.userId,
          scannedById: volunteerUserId,
          gateName,
          timestamp: new Date(),
        },
      }),
      this.prisma.registration.update({
        where: { id: registration.id },
        data: { isCheckedIn: true },
      }),
    ]);

    const catalog = PASS_TIERS_CATALOG.find((t) => t.enumType === registration.passType);

    this.logger.log(
      `Gate check-in SUCCESS: Pass ${registration.passId} (${registration.user.name}) at ${gateName}`,
    );

    return {
      status: 'VERIFIED',
      message: 'Gate Entry Approved',
      passId: registration.passId,
      delegateName: registration.user.name,
      delegateEmail: registration.user.email,
      delegateCollege: registration.user.college,
      passType: registration.passType,
      badgeTitle: catalog?.badgeTitle || 'DELEGATE',
      gateName,
      timestamp: checkInRecord.timestamp,
    };
  }

  async manualLookup(dto: ManualLookupDto, volunteerUserId?: string) {
    const q = dto.query.trim();
    const gateName = dto.gateName?.trim() || 'MANUAL_DESK';

    const attendees = await this.prisma.registration.findMany({
      where: {
        OR: [
          { passId: { contains: q, mode: 'insensitive' } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { user: { phone: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: {
        user: true,
        payment: true,
      },
      take: 10,
    });

    if (attendees.length === 0) {
      throw new NotFoundException(`No attendees found matching query "${q}".`);
    }

    if (dto.performCheckIn && attendees.length === 1) {
      const reg = attendees[0];
      if (reg.isCheckedIn) {
        throw new ConflictException(`Pass ${reg.passId} is already checked in.`);
      }

      await this.prisma.$transaction([
        this.prisma.checkIn.create({
          data: {
            userId: reg.userId,
            scannedById: volunteerUserId || reg.userId,
            gateName,
          },
        }),
        this.prisma.registration.update({
          where: { id: reg.id },
          data: { isCheckedIn: true },
        }),
      ]);

      return {
        status: 'CHECKED_IN',
        attendee: reg,
      };
    }

    return {
      count: attendees.length,
      results: attendees.map((a) => ({
        id: a.id,
        passId: a.passId,
        passType: a.passType,
        isCheckedIn: a.isCheckedIn,
        delegateName: a.user.name,
        delegateEmail: a.user.email,
        delegateCollege: a.user.college,
        delegatePhone: a.user.phone,
        createdAt: a.createdAt,
      })),
    };
  }

  async getCheckInStats() {
    const totalCheckIns = await this.prisma.checkIn.count();

    const byGate = await this.prisma.checkIn.groupBy({
      by: ['gateName'],
      _count: { id: true },
    });

    const recentLogs = await this.prisma.checkIn.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, name: true, college: true, email: true } },
        scannedBy: { select: { id: true, name: true } },
      },
    });

    return {
      totalCheckIns,
      byGate: byGate.map((g) => ({ gate: g.gateName, count: g._count.id })),
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        delegateName: l.user.name,
        delegateCollege: l.user.college,
        gate: l.gateName,
        scannedBy: l.scannedBy.name,
        timestamp: l.timestamp,
      })),
    };
  }
}
