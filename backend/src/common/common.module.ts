import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { ResponseInterceptor } from './interceptors/response.interceptor.js';
import { CryptoService } from './services/crypto.service.js';
import { RedisService } from './services/redis.service.js';

@Global()
@Module({
  providers: [
    RedisService,
    CryptoService,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
  exports: [RedisService, CryptoService],
})
export class CommonModule {}