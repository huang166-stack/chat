import { z } from 'zod';

export const adminUserEditSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
  status: z.number().int().min(0).max(1),
});

export const adminPlanSchema = z.object({
  name: z.string().trim().min(1, '请输入套餐名称').max(64, '套餐名称过长'),
  price: z.number().min(0, '价格不能小于 0'),
  durationType: z.enum(['MONTH_1', 'MONTH_3', 'CUSTOM']),
  durationDays: z.number().int('有效期天数必须为整数').min(1, '有效期至少 1 天'),
  description: z.string().trim().max(500, '说明最多 500 字').optional(),
  enabled: z.number().int().min(0).max(1),
  sort: z.number().int(),
});

export const adminModelSchema = z.object({
  name: z.string().trim().min(1, '请输入模型名称').max(64, '模型名称过长'),
  provider: z.enum(['OPENAI_COMPATIBLE', 'CUSTOM']),
  baseUrl: z.string().trim().min(1, '请输入 Base URL').max(255, 'Base URL 过长'),
  apiKey: z.string().trim().max(255, 'API Key 过长').optional(),
  modelName: z.string().trim().min(1, '请输入实际模型名').max(128, '模型名过长'),
  maxTokens: z.number().int('最大 Token 必须为整数').min(1, '最大 Token 至少为 1'),
  temperature: z.number().min(0, '温度不能小于 0').max(2, '温度不能大于 2'),
  enabled: z.number().int().min(0).max(1),
  sort: z.number().int(),
});

export const adminPaymentSchema = z.object({
  name: z.string().trim().min(1, '请输入支付渠道名称').max(64, '名称过长'),
  provider: z.string().trim().min(1, '请输入渠道标识').max(32, '渠道标识过长'),
  merchantId: z.string().trim().max(128, '商户号过长').optional(),
  appId: z.string().trim().max(128, 'App ID 过长').optional(),
  appSecret: z.string().trim().max(255, 'App Secret 过长').optional(),
  apiKey: z.string().trim().max(255, 'API Key 过长').optional(),
  gatewayUrl: z.string().trim().max(255, '网关地址过长').optional(),
  notifyUrl: z.string().trim().max(255, '回调地址过长').optional(),
  returnUrl: z.string().trim().max(255, '返回地址过长').optional(),
  enabled: z.number().int().min(0).max(1),
});

export type AdminUserEditValues = z.infer<typeof adminUserEditSchema>;
export type AdminPlanValues = z.infer<typeof adminPlanSchema>;
export type AdminModelValues = z.infer<typeof adminModelSchema>;
export type AdminPaymentValues = z.infer<typeof adminPaymentSchema>;

