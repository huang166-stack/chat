import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErrorCodes } from '../constants/error-codes.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: number = ErrorCodes.INTERNAL_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'object' && payload !== null) {
        const body = payload as Record<string, unknown>;
        if (typeof body.code === 'number') {
          code = body.code;
        }
        if (typeof body.message === 'string') {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = body.message.join(', ');
        } else {
          message = exception.message;
        }
      } else {
        message = String(payload);
      }

      if (!(
        typeof payload === 'object' &&
        payload !== null &&
        typeof (payload as Record<string, unknown>).code === 'number'
      )) {
        code = this.defaultCodeForStatus(status);
        if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
          message = '合同文件超过允许大小';
        }
      }
    } else {
      message = exception instanceof Error ? exception.message : message;
    }

    response.status(status).json({
      code,
      message,
      data: null,
    });
  }

  private defaultCodeForStatus(status: number): number {
    const map: Record<number, number> = {
      400: ErrorCodes.VALIDATION_ERROR,
      401: ErrorCodes.UNAUTHORIZED,
      403: ErrorCodes.FORBIDDEN,
      404: ErrorCodes.NOT_FOUND,
      413: ErrorCodes.FILE_TOO_LARGE,
      429: ErrorCodes.TOO_MANY_REQUESTS,
      500: ErrorCodes.INTERNAL_ERROR,
    };

    return map[status] ?? ErrorCodes.INTERNAL_ERROR;
  }
}
