import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ErrorCodes } from '../constants/error-codes.js';
import type { ApiResponse } from '../interfaces/api-response.js';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: ErrorCodes.SUCCESS,
        message: 'success',
        data,
      })),
    );
  }
}