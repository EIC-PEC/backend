import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const isProd = config.get<string>('NODE_ENV') === 'production';

  // 1MB cap for all JSON payloads. The upload route uses multipart — not JSON.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.setGlobalPrefix('api/v1');

  // ── Helmet: CSP + HSTS (#11) ──────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // allow inline styles for Swagger UI in dev
          imgSrc: ["'self'", 'data:', '*.r2.dev', '*.cloudflare.com'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      // HSTS: enforce HTTPS for 1 year in production
      hsts: isProd
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
      // Don't advertise that we're Express/Node
      hidePoweredBy: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(cookieParser());

  // Behind Nginx/Cloudflare, so req.ip must come from X-Forwarded-For.
  app.set('trust proxy', 1);

  // ── CORS (#12) ────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      // In dev: allow all localhost ports and no-origin (curl, mobile apps).
      if (!isProd) {
        if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }

      // In production: no-origin requests are server-to-server — reject them
      // from CORS perspective (they still reach the API but bypass origin header).
      // Legitimate no-origin internal calls should come via trusted network, not CORS.
      if (!origin) return callback(new Error('Origin header required in production'), false);

      const allowed = config.get<string[]>('CORS_ORIGINS') || [];
      if (allowed.includes(origin)) return callback(null, true);

      // Also allow localhost in dev
      if (!isProd && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true, // required for the HttpOnly refresh cookie
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger (#24) — never expose API docs in production ───────────────────
  if (!isProd) {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const doc = new DocumentBuilder()
      .setTitle('E-Summit 2026 API')
      .setDescription('Internal API — for development use only.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, doc));
    logger.log('Swagger UI available at http://localhost:4000/api (dev only)');
  }

  app.enableShutdownHooks();

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);

  logger.log(`E_Summit_Backend listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
