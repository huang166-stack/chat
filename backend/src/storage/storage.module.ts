import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageDriver } from './local-storage.driver.js';
import { S3StorageDriver } from './s3-storage.driver.js';
import { StorageController } from './storage.controller.js';
import { StorageService } from './storage.service.js';
import type { StorageConfig } from './storage.types.js';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<StorageConfig>('storage');
        if (!config) {
          throw new Error('Storage configuration is missing');
        }

        return config.driver === 's3'
          ? new S3StorageDriver(config)
          : new LocalStorageDriver(config);
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
