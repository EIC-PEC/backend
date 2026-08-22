import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public liveness & readiness probe.
   * Returns minimal { status: 'ok' } without leaking infra details or uptime.
   */
  @Public()
  @Get()
  async check(@Res({ passthrough: true }) res?: Response) {
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch {
      if (res) res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Detailed health probe for authorized admins/monitoring services.
   */
  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Get('detailed')
  async detailedCheck() {
    let database = 'up';
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
    } catch {
      database = 'down';
    }


    return {
      status: database === 'up' ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: { database },
    };
  }
}

