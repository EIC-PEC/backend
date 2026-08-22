import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async subscribe(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.prisma.subscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return {
        success: true,
        message: 'You are already subscribed to E-Summit 2026 updates!',
        subscriber: existing,
      };
    }

    const subscriber = await this.prisma.subscriber.create({
      data: { email: normalizedEmail },
    });

    this.logger.log(`New subscriber registered: ${normalizedEmail}`);

    return {
      success: true,
      message: 'Successfully subscribed to PEC E-Summit 2026 announcements!',
      subscriber,
    };
  }

  async getAllSubscribers() {
    return this.prisma.subscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSubscriber(id: string) {
    return this.prisma.subscriber.delete({
      where: { id },
    });
  }
}
