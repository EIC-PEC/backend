import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

interface CachedEntry {
  status: 'IN_FLIGHT' | 'COMPLETED';
  response?: unknown;
  statusCode?: number;
  timestamp: number;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private static readonly cache = new Map<string, CachedEntry>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!rawKey || typeof rawKey !== 'string') {
      return next.handle();
    }

    const key = `idem:${req.method}:${req.path}:${rawKey.trim()}`;
    const now = Date.now();
    const existing = IdempotencyInterceptor.cache.get(key);

    if (existing) {
      if (existing.status === 'IN_FLIGHT') {
        throw new ConflictException(
          'A request with this Idempotency-Key is currently being processed. Please retry shortly.',
        );
      }

      if (existing.status === 'COMPLETED' && existing.response !== undefined) {
        this.logger.log(`Idempotency cache HIT for key: ${key}`);
        res.setHeader('x-cache-idempotent', 'HIT');
        if (existing.statusCode) {
          res.status(existing.statusCode);
        }
        return of(existing.response);
      }
    }

    // Mark as in-flight
    IdempotencyInterceptor.cache.set(key, {
      status: 'IN_FLIGHT',
      timestamp: now,
    });
    res.setHeader('x-cache-idempotent', 'MISS');

    return next.handle().pipe(
      tap({
        next: (data) => {
          IdempotencyInterceptor.cache.set(key, {
            status: 'COMPLETED',
            response: data,
            statusCode: res.statusCode,
            timestamp: Date.now(),
          });
          this.cleanupStale(now);
        },
        error: () => {
          // On error, allow retrying with the same key
          IdempotencyInterceptor.cache.delete(key);
        },
      }),
    );
  }

  private cleanupStale(now: number) {
    if (IdempotencyInterceptor.cache.size > 5000) {
      IdempotencyInterceptor.cache.forEach((entry, key) => {
        if (now - entry.timestamp > IDEMPOTENCY_TTL_MS) {
          IdempotencyInterceptor.cache.delete(key);
        }
      });
    }
  }
}
