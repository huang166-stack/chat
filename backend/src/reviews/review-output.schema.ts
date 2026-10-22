import { z } from 'zod';

export const MODEL_REVIEW_OUTPUT_SCHEMA = z.object({
  findings: z
    .array(
      z.object({
        category: z.string().trim().min(1).max(64),
        riskLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']),
        clauseOrder: z.coerce.number().int().positive(),
        quote: z.string().max(1000).optional().nullable(),
        title: z.string().trim().min(1).max(255),
        analysis: z.string().trim().min(1).max(4000),
        suggestion: z.string().max(4000).optional().nullable(),
        legalBasis: z.string().max(2000).optional().nullable(),
        confidence: z.coerce.number().min(0).max(1).default(0.7),
      }),
    )
    .max(20),
});

export type ModelReviewOutput = z.infer<typeof MODEL_REVIEW_OUTPUT_SCHEMA>;
