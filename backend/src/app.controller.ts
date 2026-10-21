import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator.js';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'chat-backend',
      time: new Date().toISOString(),
    };
  }
}