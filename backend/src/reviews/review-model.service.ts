import { Injectable, Logger } from '@nestjs/common';
import type { RiskLevel } from '@prisma/client';
import type { AiMessage, AiModelParams } from '../ai/ai-client.service.js';
import { StructuredOutputService } from '../ai/structured-output.service.js';
import type {
  EvaluationClause,
  LlmRuleRequest,
  ReviewFindingDraft,
  RuleSummary,
} from '../rules/rules.types.js';
import { MODEL_REVIEW_OUTPUT_SCHEMA } from './review-output.schema.js';
import {
  buildGeneralReviewMessages,
  buildLlmRuleMessages,
} from './review-prompt.js';

const MAX_CHUNK_CHARS = 3000;
const MODEL_CONCURRENCY = 3;
const MODEL_CALL_TIMEOUT_MS = 90_000;

export interface ReviewModelConfig {
  baseUrl: string;
  apiKey: string | null;
  modelName: string;
  maxTokens: number;
  temperature: number;
}

export interface ReviewModelInput {
  documentName: string;
  contractType: string;
  stance: string;
  clauses: EvaluationClause[];
  rules: RuleSummary[];
  llmRequests: LlmRuleRequest[];
  modelConfig: ReviewModelConfig;
  deadline: number;
  isCancelled: () => Promise<boolean>;
  onProgress: (completed: number, total: number) => Promise<void> | void;
}

export interface ReviewModelResult {
  findings: ReviewFindingDraft[];
  usage: { tokensIn: number; tokensOut: number; calls: number };
  failedCalls: number;
  attemptedCalls: number;
}

interface ClauseChunk {
  text: string;
  clauses: Map<number, EvaluationClause>;
}

interface ModelTask {
  key: string;
  messages: AiMessage[];
  clausesByOrder: Map<number, EvaluationClause>;
  ruleCode?: string;
  fallbackCategory?: string;
}

@Injectable()
export class ReviewModelService {
  private readonly logger = new Logger(ReviewModelService.name);

  constructor(private readonly structuredOutput: StructuredOutputService) {}

  async review(input: ReviewModelInput): Promise<ReviewModelResult> {
    const tasks = this.buildTasks(input);
    let completed = 0;
    let failedCalls = 0;
    const findings: ReviewFindingDraft[] = [];
    const usage = { tokensIn: 0, tokensOut: 0, calls: 0 };

    await mapWithConcurrency(tasks, MODEL_CONCURRENCY, async (task) => {
      if (await input.isCancelled()) {
        return;
      }
      if (Date.now() >= input.deadline) {
        failedCalls += 1;
        return;
      }

      try {
        const result = await this.structuredOutput.complete(
          this.toModelParams(input.modelConfig),
          task.messages,
          MODEL_REVIEW_OUTPUT_SCHEMA,
          AbortSignal.timeout(
            Math.max(
              1,
              Math.min(MODEL_CALL_TIMEOUT_MS, input.deadline - Date.now()),
            ),
          ),
        );
        usage.tokensIn += result.usage.tokensIn;
        usage.tokensOut += result.usage.tokensOut;
        usage.calls += 1;

        findings.push(
          ...result.data.findings
            .map((finding) => {
              const clause = task.clausesByOrder.get(finding.clauseOrder);
              if (!clause) {
                return null;
              }
              return toFindingDraft(
                finding,
                clause,
                task.ruleCode,
                task.fallbackCategory,
              );
            })
            .filter((finding): finding is ReviewFindingDraft =>
              Boolean(finding),
            ),
        );
      } catch (error) {
        failedCalls += 1;
        this.logger.warn('Model review chunk failed', {
          task: task.key,
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        completed += 1;
        await input.onProgress(completed, tasks.length);
      }
    });

    return {
      findings: dedupeFindings(findings),
      usage,
      failedCalls,
      attemptedCalls: tasks.length,
    };
  }

  private buildTasks(input: ReviewModelInput): ModelTask[] {
    const tasks: ModelTask[] = [];
    const generalChunks = chunkClauses(input.clauses, MAX_CHUNK_CHARS);

    generalChunks.forEach((chunk, index) => {
      tasks.push({
        key: `general-${index + 1}`,
        messages: buildGeneralReviewMessages({
          documentName: input.documentName,
          contractType: input.contractType,
          stance: input.stance,
          rules: input.rules,
          clauses: [...chunk.clauses.values()],
        }),
        clausesByOrder: chunk.clauses,
      });
    });

    for (const request of input.llmRequests) {
      const chunks = chunkClauses(request.clauses, MAX_CHUNK_CHARS);
      chunks.forEach((chunk, index) => {
        tasks.push({
          key: `rule-${request.ruleCode}-${index + 1}`,
          messages: buildLlmRuleMessages({
            documentName: input.documentName,
            contractType: input.contractType,
            stance: input.stance,
            ruleCode: request.ruleCode,
            rulePrompt: request.prompt,
            clauses: [...chunk.clauses.values()],
          }),
          clausesByOrder: chunk.clauses,
          ruleCode: request.ruleCode,
          fallbackCategory: request.category,
        });
      });
    }

    return tasks;
  }

  private toModelParams(config: ReviewModelConfig): AiModelParams {
    return {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      modelName: config.modelName,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    };
  }
}

function chunkClauses(
  clauses: EvaluationClause[],
  maxChars: number,
): ClauseChunk[] {
  const chunks: ClauseChunk[] = [];
  let current: ClauseChunk = { text: '', clauses: new Map() };

  const flush = () => {
    if (current.text.trim()) {
      chunks.push(current);
    }
    current = { text: '', clauses: new Map() };
  };

  for (const clause of clauses) {
    const pieces = splitText(
      clause.content || clause.heading || `第${clause.orderNo}条`,
      Math.max(500, maxChars - 100),
    );
    pieces.forEach((piece, index) => {
      const suffix =
        pieces.length > 1 ? `（片段 ${index + 1}/${pieces.length}）` : '';
      const block = `[第${clause.orderNo}条] ${clause.heading ?? ''}${suffix}\n${piece}`;
      if (current.text && current.text.length + block.length + 2 > maxChars) {
        flush();
      }
      current.text += `${current.text ? '\n\n' : ''}${block}`;
      current.clauses.set(clause.orderNo, clause);
    });
  }

  flush();
  return chunks;
}

function splitText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const pieces: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const limit = Math.min(cursor + maxChars, text.length);
    if (limit === text.length) {
      pieces.push(text.slice(cursor));
      break;
    }

    const window = text.slice(cursor, limit);
    const minimum = Math.floor(maxChars * 0.5);
    const candidates = [
      window.lastIndexOf('\n\n'),
      window.lastIndexOf('。'),
      window.lastIndexOf('；'),
      window.lastIndexOf('\n'),
    ].filter((index) => index >= minimum);
    const splitOffset =
      candidates.length > 0 ? Math.max(...candidates) + 1 : maxChars;
    pieces.push(text.slice(cursor, cursor + splitOffset).trim());
    cursor += splitOffset;
  }

  return pieces.filter(Boolean);
}

function toFindingDraft(
  finding: {
    category: string;
    riskLevel: RiskLevel;
    quote?: string | null;
    title: string;
    analysis: string;
    suggestion?: string | null;
    legalBasis?: string | null;
    confidence: number;
  },
  clause: EvaluationClause,
  ruleCode: string | undefined,
  fallbackCategory: string | undefined,
): ReviewFindingDraft {
  const page = clause.pageStart ? `第 ${clause.pageStart} 页` : '页码未知';
  const quote = (finding.quote?.trim() || clause.content)
    .replace(/\s+/g, ' ')
    .slice(0, 500);

  return {
    clauseId: clause.id,
    source: 'MODEL',
    ruleCode: ruleCode ?? null,
    category: finding.category || fallbackCategory || '其他',
    riskLevel: finding.riskLevel,
    title: finding.title,
    analysis: finding.analysis,
    suggestion: finding.suggestion?.trim() || null,
    legalBasis: finding.legalBasis?.trim() || null,
    evidence: `第 ${clause.orderNo} 条（${page}）：${quote}`,
    confidence: finding.confidence,
  };
}

function dedupeFindings(findings: ReviewFindingDraft[]) {
  const unique = new Map<string, ReviewFindingDraft>();
  for (const finding of findings) {
    const key = `${finding.ruleCode ?? 'model'}:${finding.clauseId ?? 'document'}:${finding.category.toLowerCase()}`;
    const existing = unique.get(key);
    if (!existing || finding.confidence > existing.confidence) {
      unique.set(key, finding);
    }
  }
  return [...unique.values()];
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, limit), items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        await worker(items[index]);
      }
    },
  );
  await Promise.all(workers);
}
