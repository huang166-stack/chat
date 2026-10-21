import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl?: string;
      url?: string;
      user?: { id?: bigint | number };
    }>();
    const startedAt = Date.now();
    const method = request.method;
    const url = request.originalUrl ?? request.url ?? '';
    const userId = request.user?.id ?? null;

    return next.handle().pipe(
      tap(() => {
        this.logger.log(JSON.stringify({ method, url, userId, durationMs: Date.now() - startedAt }));
      }),
    );
  }
}