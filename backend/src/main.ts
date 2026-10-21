import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { pinoHttp } from 'pino-http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(pinoHttp({ level: process.env.LOG_LEVEL ?? 'info' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
  console.log(`NestJS backend running at http://localhost:${port}/api`);
}

await bootstrap();