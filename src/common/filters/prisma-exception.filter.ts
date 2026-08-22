import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Maps Prisma runtime errors to clean HTTP responses.
 * Prevents raw Prisma error messages (which contain schema/table names)
 * from leaking to the client.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientUnknownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const { status, message } = this.mapException(exception);

    this.logger.warn(
      `Prisma error [${exception instanceof Prisma.PrismaClientKnownRequestError ? exception.code : 'UNKNOWN'}]: ${exception.message}`,
    );

    res.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
    });
  }

  private mapException(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError,
  ): { status: number; message: string } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2000':
          return { status: HttpStatus.BAD_REQUEST, message: 'One or more field values are too long.' };
        case 'P2001':
          return { status: HttpStatus.NOT_FOUND, message: 'The requested record was not found.' };
        case 'P2002':
          return { status: HttpStatus.CONFLICT, message: 'A record with this value already exists.' };
        case 'P2003':
          return { status: HttpStatus.BAD_REQUEST, message: 'Related record not found (foreign key constraint).' };
        case 'P2025':
          return { status: HttpStatus.NOT_FOUND, message: 'Record not found.' };
        default:
          return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'A database error occurred.' };
      }
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unexpected database error occurred.' };
  }
}
