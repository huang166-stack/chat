import {
  Body,
  Controller,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ContractChatService } from './contract-chat.service.js';
import { ContractChatDto } from './dto/contract-chat.dto.js';

@Controller('contracts')
export class ContractChatController {
  private readonly logger = new Logger(ContractChatController.name);

  constructor(private readonly contractChatService: ContractChatService) {}

  @Post(':id/chat')
  async chat(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ContractChatDto,
    @Res() res: Response,
  ): Promise<void> {
    this.setSseHeaders(res);

    const contractId = BigInt(id);
    const abortController = new AbortController();
    const onClose = () => abortController.abort();
    res.on('close', onClose);

    try {
      const result = await this.contractChatService.sendMessage(
        user.userId,
        user.role,
        contractId,
        dto,
        {
          signal: abortController.signal,
          onStart: (start) => {
            this.writeEvent(res, { type: 'start', ...start });
          },
          onDelta: (content) => {
            this.writeEvent(res, { type: 'delta', content });
          },
        },
      );

      this.writeEvent(res, {
        type: 'done',
        contractId: result.contractId,
        requestId: result.requestId,
        assistantMessageId: result.assistantMessageId,
        citations: result.citations,
        modelName: result.modelName,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      });
    } catch (error) {
      if (!abortController.signal.aborted) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error('Contract chat stream failed', {
          contractId: String(contractId),
          requestId: dto.requestId,
          message,
        });
        this.writeEvent(res, {
          type: 'error',
          ...this.toErrorPayload(error),
        });
      }
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
