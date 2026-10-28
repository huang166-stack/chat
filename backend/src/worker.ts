import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('ContractWorker');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  logger.log('Contract worker started');

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down contract worker`);
    await app.close();
    process.exit(0);
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('ContractWorker');
  logger.error('Failed to start contract worker', error);
  process.exit(1);
});
