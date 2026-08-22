import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PassType, PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import QRCode from 'qrcode';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getAnalytics() {
    const [
      totalDelegates,
      totalCheckIns,
      totalEvents,
      successfulPayments,

      passTypeDistribution,
      topColleges,
      recentRegistrations,
      siteConfig,
    ] = await Promise.all([
      this.prisma.registration.count(),
      this.prisma.checkIn.count(),
      this.prisma.event.count(),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.registration.groupBy({
        by: ['passType'],
        _count: { id: true },
      }),
      this.prisma.user.groupBy({
        by: ['college'],
        where: { college: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 8,
      }),
      this.prisma.registration.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, college: true } },
          payment: { select: { status: true, amount: true } },
        },
      }),
      this.prisma.siteConfig.findFirst(),
    ]);

    let targetDelegates = 3000;
    if (siteConfig?.stats && typeof siteConfig.stats === 'object') {
      const statsObj = siteConfig.stats as Record<string, any>;
      if (statsObj.targetAttendees) {
        targetDelegates = parseInt(statsObj.targetAttendees, 10) || 3000;
      }
    }

    const totalRevenue = successfulPayments._sum.amount ?? 0;
    const targetPercentage = Math.min(100, Math.round((totalDelegates / targetDelegates) * 100));
    const checkInPercentage = totalDelegates > 0 ? Math.round((totalCheckIns / totalDelegates) * 100) : 0;

    return {
      overview: {
        totalDelegates,
        targetDelegates,
        totalRevenue,
        totalCheckIns,
        totalEvents,
        totalTeams: totalEvents, // Backwards compatibility for admin UI
        targetPercentage,
        checkInPercentage,
      },

      passTypeDistribution: passTypeDistribution.map((p) => ({
        passType: p.passType,
        count: p._count.id,
      })),
      topColleges: topColleges.map((c) => ({
        college: c.college,
        count: c._count.id,
      })),
      collegeBreakdown: topColleges.map((c) => ({
        college: c.college,
        count: c._count.id,
      })),
      recentRegistrations: recentRegistrations.map((r) => ({

        id: r.id,
        passId: r.passId,
        passType: r.passType,
        createdAt: r.createdAt,
        userName: r.user.name,
        userEmail: r.user.email,
        college: r.user.college,
        paymentStatus: r.payment?.status ?? PaymentStatus.SUCCESS,
        amount: r.payment?.amount ?? 0,
      })),
    };
  }

  async getDelegates(
    page: number = 1,
    limit: number = 50,
    search?: string,
    passType?: PassType,
    isCheckedIn?: boolean,
  ) {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;
    const where: any = {};

    if (passType) {
      where.passType = passType;
    }

    if (isCheckedIn !== undefined) {
      where.isCheckedIn = isCheckedIn;
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { passId: { contains: q, mode: 'insensitive' } },
        { user: { is: { name: { contains: q, mode: 'insensitive' } } } },
        { user: { is: { email: { contains: q, mode: 'insensitive' } } } },
        { user: { is: { college: { contains: q, mode: 'insensitive' } } } },
        { user: { is: { phone: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.registration.count({ where }),
      this.prisma.registration.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          payment: true,
        },
      }),
    ]);

    return {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
      items: items.map((i) => ({
        id: i.id,
        passId: i.passId,
        passType: i.passType,
        amountPaid: i.amountPaid,
        isCheckedIn: i.isCheckedIn,
        isRevoked: i.isRevoked ?? false,
        revokedAt: i.revokedAt ?? null,
        tracks: i.tracks,
        createdAt: i.createdAt,
        user: {
          id: i.user.id,
          name: i.user.name,
          email: i.user.email,
          phone: i.user.phone,
          college: i.user.college,
          role: i.user.role,
        },
        payment: i.payment
          ? {
              orderId: i.payment.orderId,
              transactionId: i.payment.transactionId,
              status: i.payment.status,
            }
          : null,
      })),
    };
  }

  /**
   * Prunes audit logs older than the specified retention window (default 90 days)
   * to maintain MongoDB storage limits.
   */
  async pruneAuditLogs(olderThanDays: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deleted = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return {
      prunedCount: deleted.count,
      cutoffDate: cutoffDate.toISOString(),
    };
  }

  async getCaLeaderboard() {
    const ambassadors = await this.prisma.user.findMany({
      where: {
        referralCode: { not: null },
      },
      include: {
        referrals: {
          include: {
            registrations: true,
          },
        },
      },
    });

    const ranked = ambassadors.map((ca) => {
      const totalReferrals = ca.referrals.length;
      const confirmedSignups = ca.referrals.reduce(
        (sum, ref) => sum + ref.registrations.length,
        0,
      );
      const conversionRate =
        totalReferrals > 0 ? Math.round((confirmedSignups / totalReferrals) * 100) : 0;

      let tier = 'AMBASSADOR_INITIATE';
      if (confirmedSignups >= 50) {
        tier = 'PLATINUM_AMBASSADOR';
      } else if (confirmedSignups >= 25) {
        tier = 'GOLD_AMBASSADOR';
      } else if (confirmedSignups >= 10) {
        tier = 'SILVER_AMBASSADOR';
      } else if (confirmedSignups >= 1) {
        tier = 'BRONZE_AMBASSADOR';
      }

      return {
        id: ca.id,
        name: ca.name,
        email: ca.email,
        college: ca.college,
        referralCode: ca.referralCode,
        totalReferrals,
        confirmedSignups,
        conversionRate,
        tier,
      };
    });

    ranked.sort((a, b) => b.confirmedSignups - a.confirmedSignups);

    return ranked.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
  }


  async toggleCheckInOverride(registrationId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException(`Registration ${registrationId} not found.`);
    }

    return this.prisma.registration.update({
      where: { id: registrationId },
      data: { isCheckedIn: !registration.isCheckedIn },
    });
  }


  async updateUserRole(userId: string, newRole: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
      }),
      // Revoke all active refresh tokens immediately to prevent privilege persistence (#13)
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return {
      message: `User ${updatedUser.email} role updated to ${newRole}. All active sessions invalidated.`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    };
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────

  async getAuditLogs(
    page: number = 1,
    limit: number = 30,
    search?: string,
    action?: string,
    entity?: string,
  ) {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;
    const where: any = {};

    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (entity && entity !== 'ALL') {
      where.entity = entity;
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { userEmail: { contains: q, mode: 'insensitive' } },
        { path: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
      items,
    };
  }

  // ── Full Attendees Export ──────────────────────────────────────────────────

  async exportAllDelegates() {
    const items = await this.prisma.registration.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        payment: true,
      },
    });

    return items.map((i) => ({
      id: i.id,
      passId: i.passId,
      passType: i.passType,
      amountPaid: i.amountPaid,
      isCheckedIn: i.isCheckedIn,
      isRevoked: i.isRevoked ?? false,
      tracks: i.tracks,
      createdAt: i.createdAt,
      name: i.user.name,
      email: i.user.email,
      phone: i.user.phone || 'N/A',
      college: i.user.college || 'N/A',
      paymentStatus: i.payment?.status ?? 'SUCCESS',
      orderId: i.payment?.orderId ?? 'N/A',
      transactionId: i.payment?.transactionId ?? 'N/A',
    }));
  }

  // ── Resend Pass Confirmation Email ────────────────────────────────────────

  async resendPassEmail(registrationId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { user: true, payment: true },
    });

    if (!registration) {
      throw new NotFoundException(`Registration ${registrationId} not found.`);
    }

    if (!registration.user?.email) {
      throw new BadRequestException('User has no registered email address.');
    }

    const qrDataUrl = await QRCode.toDataURL(registration.qrToken, {
      width: 240,
      margin: 2,
    });

    await this.emailService.sendPassConfirmationEmail({
      to: registration.user.email,
      recipientName: registration.user.name,
      passId: registration.passId,
      passType: registration.passType,
      qrDataUrl,
      college: registration.user.college ?? undefined,
      amountPaid: registration.amountPaid,
    });

    this.logger.log(`Resent pass email for ${registration.passId} to ${registration.user.email}`);

    return {
      success: true,
      message: `Pass confirmation email successfully resent to ${registration.user.email}`,
    };
  }
}

