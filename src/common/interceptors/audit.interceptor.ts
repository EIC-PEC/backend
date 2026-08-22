import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../types/authenticated-user';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Maps HTTP method + path segments to a human-readable entity name. */
function inferEntity(method: string, path: string): string {
  const segments = path.split('/').filter(Boolean);
  // Take the first meaningful resource segment after /api/v1
  const apiIdx = segments.findIndex((s) => s === 'v1');
  const resource = apiIdx >= 0 ? segments[apiIdx + 1] : segments[0];
  return resource ? resource.replace(/-/g, '_').toUpperCase() : 'UNKNOWN';
}

function inferAction(method: string): string {
  switch (method) {
    case 'POST': return 'CREATE';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return method;
  }
}

/**
 * Global interceptor that writes an AuditLog row for every mutating request
 * (POST/PUT/PATCH/DELETE) that passes authentication.
 *
 * Fire-and-forget: audit failure never bubbles up to the client response.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: AuthenticatedUser }>();
    const res = http.getResponse<Response>();

    if (!MUTATION_METHODS.has(req.method)) {
      return next.handle();
    }

    const user = req.user;
    const path = req.path;
    const method = req.method;

    return next.handle().pipe(
      tap({
        next: () => this.writeLog(user, method, path, res.statusCode),
        error: (err: { status?: number }) =>
          this.writeLog(user, method, path, err?.status ?? 500),
      }),
    );
  }

  private writeLog(
    user: AuthenticatedUser | undefined,
    method: string,
    path: string,
    statusCode: number,
  ): void {
    // Intentionally non-blocking — audit log failure must never break the request.
    this.prisma.auditLog
      .create({
        data: {
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
          action: inferAction(method),
          entity: inferEntity(method, path),
          method,
          path,
          statusCode,
        },
      })
      .catch((err: Error) =>
        this.logger.error(`AuditLog write failed for ${method} ${path}: ${err.message}`),
      );
  }
}
