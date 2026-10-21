import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ConversationsService } from './conversations.service.js';
import { ConversationQueryDto } from './dto/conversation-query.dto.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { MessageQueryDto } from './dto/message-query.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { UpdateConversationDto } from './dto/update-conversation.dto.js';

@Controller('conversations')
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.conversationsService.create(user.userId, user.role, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthUser, @Query() query: ConversationQueryDto) {
    return this.conversationsService.findMine(user.userId, query);
  }

  @Put(':id')
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.rename(user.userId, BigInt(id), dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.conversationsService.remove(user.userId, user.role, BigInt(id));
  }

  @Get(':id/messages')
  findMessages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MessageQueryDto,
  ) {
    return this.conversationsService.findMessages(user.userId, BigInt(id), query);
  }

  @Post(':id/messages')
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    this.setSseHeaders(res);

    const conversationId = BigInt(id);
    const abortController = new AbortController();
    const onClose = () => abortController.abort();
    res.on('close', onClose);

    try {
      const result = await this.conversationsService.sendMessage(
        user.userId,
        user.role,
        conversationId,
        dto,
        {
          signal: abortController.signal,
          onStart: (userMessageId) => {
            this.writeEvent(res, {
              type: 'start',
              conversationId: String(conversationId),
              userMessageId: String(userMessageId),
            });
          },
          onDelta: (content) => {
            this.writeEvent(res, { type: 'delta', content });
          },
        },
      );

      this.writeEvent(res, { type: 'done', ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('SSE conversation request failed', { conversationId: String(conversationId), message, stack });
      const payload = this.toErrorPayload(error);
      this.writeEvent(res, { type: 'error', ...payload });
    } finally {
      res.off('close', onClose);
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  private setSseHeaders(res: Response) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
  }

  private writeEvent(res: Response, data: Record<string, unknown>) {
    if (!res.writableEnded) {
      res.write(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }

  private toErrorPayload(error: unknown): { code: number; message: string } {
    if (error instanceof BusinessException) {
      const response = error.getResponse();
      if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, unknown>;
        if (typeof body.code === 'number' && typeof body.message === 'string') {
          return { code: body.code, message: body.message };
        }
      }
    }

    return { code: ErrorCodes.MODEL_CALL_FAILED, message: '模型调用失败' };
  }
}
