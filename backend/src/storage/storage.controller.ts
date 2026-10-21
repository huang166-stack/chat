import {
  Controller,
  Get,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { LocalSignedUrlQueryDto } from './dto/local-signed-url.query.js';
import { StorageService } from './storage.service.js';

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Get('local')
  async getLocalObject(
    @Query() query: LocalSignedUrlQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    if (
      !this.storage.verifySignedUrl(query.key, query.expires, query.signature)
    ) {
      throw new UnauthorizedException('Invalid or expired storage signature');
    }

    const object = await this.storage.get(query.key);
    const remainingSeconds = Math.max(
      0,
      query.expires - Math.floor(Date.now() / 1000),
    );

    response.setHeader('Content-Type', object.contentType);
    response.setHeader('Content-Length', object.size);
    response.setHeader('Cache-Control', `private, max-age=${remainingSeconds}`);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(object.body);
  }
}
