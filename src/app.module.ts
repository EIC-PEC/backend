import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { PaymentsModule } from './payments/payments.module';
import { CheckinModule } from './checkin/checkin.module';
import { CmsModule } from './cms/cms.module';

import { ConciergeModule } from './concierge/concierge.module';
import { AdminModule } from './admin/admin.module';
import { StorageModule } from './storage/storage.module';
import { SubscribersModule } from './subscribers/subscribers.module';
import { EmailModule } from './email/email.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ContentTypeMiddleware } from './common/middleware/content-type.middleware';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 3000 },
      { name: 'auth', ttl: 60_000, limit: 30 },
    ]),

    PrismaModule,
    EmailModule,
    AuthModule,
    RegistrationsModule,
    PaymentsModule,
    CheckinModule,
    CmsModule,
    ConciergeModule,
    AdminModule,
    StorageModule,
    SubscribersModule,
  ],

  controllers: [HealthController],
  providers: [
    // Order: authenticate, then authorize, then rate-limit.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Observability & logging for every request
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    // Writes an immutable audit row for every POST/PUT/PATCH/DELETE.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    // Maps Prisma error codes to clean HTTP errors — no schema leakage.
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, ContentTypeMiddleware).forRoutes('*');
  }
}

