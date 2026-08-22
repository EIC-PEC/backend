import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string }>();
    const res = http.getResponse<Response>();

    const { method, originalUrl, ip, requestId } = req;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;
          this.logger.log(
            `[${requestId || '-'}] ${method} ${originalUrl} ${statusCode} +${duration}ms - ${ip}`,
          );
        },
        error: (err: { status?: number; message?: string }) => {
          const duration = Date.now() - startTime;
          const status = err?.status || 500;
          this.logger.warn(
            `[${requestId || '-'}] ${method} ${originalUrl} ${status} +${duration}ms - ${ip} - Error: ${err?.message}`,
          );
        },
      }),
    );
  }
}
