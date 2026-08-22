import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

declare module 'express' {
  interface Request {
    requestId?: string;
  }
}

/**
 * Attaches a unique X-Request-ID to every incoming request.
 * Reads the client-provided header if present (useful for frontend tracing),
 * otherwise generates a fresh UUID. The ID is echoed back in the response.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingId = req.headers['x-request-id'];
    const requestId = (Array.isArray(incomingId) ? incomingId[0] : incomingId) || randomUUID();

    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
