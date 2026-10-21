import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { Conversation, Message } from '@prisma/client';
import { AiClientService, AiMessage } from '../ai/ai-client.service.js';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { CryptoService } from '../common/services/crypto.service.js';
import { RedisService } from '../common/services/redis.service.js';
import { getPagination, toPage } from '../common/utils/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConversationQueryDto } from './dto/conversation-query.dto.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { MessageQueryDto } from './dto/message-query.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { UpdateConversationDto } from './dto/update-conversation.dto.js';

const SYSTEM_PROMPT = '你是一个友好的中文大模型助手，请用简洁准确的语言回答用户。';
const CONTEXT_TTL_SECONDS = 600;

export interface StreamMessageCallbacks {
  signal: AbortSignal;
  onStart?: (userMessageId: bigint) => void;
  onDelta?: (content: string) => void;
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly cryptoService: CryptoService,
    private readonly aiClient: AiClientService,
  ) {}

  async create(userId: bigint, role: string, dto: CreateConversationDto) {
    await this.assertCanChat(userId, role);

    const modelConfig = await this.prisma.modelConfig.findUnique({
      where: { id: BigInt(dto.modelConfigId) },
    });

    if (!modelConfig || modelConfig.enabled !== 1) {
      throw new BusinessException('模型配置不存在或已下架', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        userId,
        modelConfigId: modelConfig.id,
        title: dto.title?.trim() || '新对话',
      },
    });

    return this.serializeConversation(conversation, modelConfig.modelName);
  }

  async findMine(userId: bigint, query: ConversationQueryDto) {
    const { page, pageSize, skip, take } = getPagination(query.page, query.pageSize);
    const where = {
      userId,
      deletedAt: null,
      ...(query.keyword ? { title: { contains: query.keyword } } : {}),
    };

    const [conversations, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        include: { modelConfig: { select: { modelName: true } } },
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return toPage(
      conversations.map((conversation) =>
        this.serializeConversation(conversation, conversation.modelConfig?.modelName),
      ),
      total,
      page,
      pageSize,
    );
  }

  async rename(userId: bigint, conversationId: bigint, dto: UpdateConversationDto) {
    await this.requireOwnedConversation(conversationId, userId);

    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title: dto.title.trim() },
    });

    return this.serializeConversation(conversation);
  }

  async remove(userId: bigint, role: string, conversationId: bigint) {
    await this.requireOwnedConversation(conversationId, userId, true, role);

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { deletedAt: new Date() },
    });
    await this.redis.del(this.contextKey(conversationId));

    return null;
  }

  async findMessages(userId: bigint, conversationId: bigint, query: MessageQueryDto) {
    await this.requireOwnedConversation(conversationId, userId);

    const limit = query.limit ?? 50;
    const where = {
      conversationId,
      ...(query.beforeId ? { id: { lt: BigInt(query.beforeId) } } : {}),
    };

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const pageMessages = hasMore ? messages.slice(0, limit) : messages;
    const nextBeforeId = hasMore ? pageMessages[pageMessages.length - 1].id : null;

    return {
      list: pageMessages.reverse().map((message) => this.serializeMessage(message)),
      nextBeforeId: nextBeforeId ? String(nextBeforeId) : null,
    };
  }

  async sendMessage(
    userId: bigint,
    role: string,
    conversationId: bigint,
    dto: SendMessageDto,
    callbacks: StreamMessageCallbacks,
  ) {
    const conversation = await this.requireOwnedConversation(conversationId, userId);
    await this.assertCanChat(userId, role);

    const content = dto.content.trim();
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content,
      },
    });

    await this.updateConversationAfterUserMessage(conversation, content);
    callbacks.onStart?.(userMessage.id);

    const modelConfig = await this.prisma.modelConfig.findUnique({
      where: { id: conversation.modelConfigId },
    });
    if (!modelConfig || modelConfig.enabled !== 1) {
      throw new BusinessException('模型配置不存在或已下架', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const contextKey = this.contextKey(conversation.id);
    const history = await this.getRecentContext(conversation.id, userMessage.id, contextKey);
    const messages: AiMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content },
    ];

    this.logger.log('Preparing model stream request', {
      conversationId: String(conversationId),
      modelConfigId: String(modelConfig.id),
      modelName: modelConfig.modelName,
      baseUrl: modelConfig.baseUrl,
      maxTokens: modelConfig.maxTokens,
      temperature: Number(modelConfig.temperature),
      messageCount: messages.length,
    });

    const apiKey = this.cryptoService.decrypt(modelConfig.apiKey);
    let fullContent = '';

    try {
      fullContent = await this.aiClient.streamChat(
        {
          baseUrl: modelConfig.baseUrl,
          apiKey,
          modelName: modelConfig.modelName,
          maxTokens: modelConfig.maxTokens,
          temperature: Number(modelConfig.temperature),
        },
        messages,
        callbacks.signal,
        (delta) => {
          fullContent += delta;
          callbacks.onDelta?.(delta);
        },
      );

      if (!fullContent.trim()) {
        throw new BusinessException('模型返回内容为空', ErrorCodes.MODEL_CALL_FAILED, HttpStatus.BAD_GATEWAY);
      }

      const assistantMessage = await this.saveAssistantMessage(
        conversation.id,
        fullContent,
        modelConfig.modelName,
      );
      await this.redis.del(contextKey);

      return {
        conversationId: String(conversation.id),
        assistantMessageId: String(assistantMessage.id),
        modelName: modelConfig.modelName,
        tokenCount: this.estimateTokens(fullContent),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Model stream request failed', {
        conversationId: String(conversationId),
        modelConfigId: String(modelConfig.id),
        modelName: modelConfig.modelName,
        baseUrl: modelConfig.baseUrl,
        message,
        stack,
      });
      if (fullContent.trim()) {
        await this.saveAssistantMessage(conversation.id, fullContent, modelConfig.modelName);
      }
      await this.redis.del(contextKey);
      throw error;
    }
  }

  private async assertCanChat(userId: bigint, role: string) {
    if (role === 'ADMIN') {
      return;
    }

    const membership = await this.prisma.userMembership.findUnique({ where: { userId } });
    if (!membership || membership.expireAt.getTime() <= Date.now()) {
      throw new BusinessException('请先开通会员', ErrorCodes.NON_MEMBER, HttpStatus.FORBIDDEN);
    }
  }

  private async requireOwnedConversation(
    conversationId: bigint,
    userId: bigint,
    allowAdmin = false,
    role = 'USER',
  ): Promise<Conversation> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
    });

    if (!conversation) {
      throw new BusinessException('会话不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (conversation.userId !== userId && !(allowAdmin && role === 'ADMIN')) {
      throw new BusinessException('无权限', ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    return conversation;
  }

  private async updateConversationAfterUserMessage(conversation: Conversation, content: string) {
    const data: { lastMessageAt: Date; title?: string } = {
      lastMessageAt: new Date(),
    };

    if (conversation.title === '新对话') {
      data.title = this.normalizeTitle(content);
    }

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data,
    });
  }

  private async saveAssistantMessage(conversationId: bigint, content: string, modelName: string) {
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content,
        modelName,
        tokenCount: this.estimateTokens(content),
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  private async getRecentContext(
    conversationId: bigint,
    excludeMessageId: bigint,
    contextKey: string,
  ): Promise<AiMessage[]> {
    const cached = await this.redis.get(contextKey);
    if (cached) {
      return this.limitToFiveRounds(JSON.parse(cached) as AiMessage[]);
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        role: { in: ['USER', 'ASSISTANT'] },
        id: { not: excludeMessageId },
      },
      orderBy: { id: 'desc' },
      take: 10,
    });

    messages.reverse();
    const context = this.limitToFiveRounds(
      messages.map((message) => ({
        role: message.role === 'USER' ? 'user' : 'assistant',
        content: message.content,
      })),
    );

    await this.redis.set(contextKey, JSON.stringify(context), CONTEXT_TTL_SECONDS);
    return context;
  }

  private limitToFiveRounds(messages: AiMessage[]): AiMessage[] {
    const rounds: AiMessage[][] = [];
    let index = messages.length - 1;

    while (rounds.length < 5 && index >= 0) {
      while (index >= 0 && messages[index].role !== 'assistant') {
        index -= 1;
      }
      if (index < 0) {
        break;
      }

      const assistantIndex = index;
      let userIndex = assistantIndex - 1;
      while (userIndex >= 0 && messages[userIndex].role !== 'user') {
        userIndex -= 1;
      }
      if (userIndex < 0) {
        break;
      }

      rounds.push([messages[userIndex], messages[assistantIndex]]);
      index = userIndex - 1;
    }

    return rounds.reverse().flat();
  }

  private contextKey(conversationId: bigint): string {
    return `context:${conversationId}`;
  }

  private normalizeTitle(content: string): string {
    const normalized = content.replace(/\s+/g, ' ').trim();
    return normalized.slice(0, 30) || '新对话';
  }

  private estimateTokens(content: string): number {
    return Math.max(1, Math.ceil(Buffer.byteLength(content, 'utf8') / 4));
  }

  private serializeConversation(conversation: Conversation, modelName?: string) {
    return {
      id: String(conversation.id),
      title: conversation.title,
      modelConfigId: String(conversation.modelConfigId),
      ...(modelName ? { modelName } : {}),
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    };
  }

  private serializeMessage(message: Message) {
    return {
      id: String(message.id),
      conversationId: String(message.conversationId),
      role: message.role,
      content: message.content,
      modelName: message.modelName,
      tokenCount: message.tokenCount,
      createdAt: message.createdAt,
    };
  }
}
