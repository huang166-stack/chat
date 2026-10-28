import type { PlanDurationType } from './membership';
import type { OrderStatus } from './order';
import type { UserRole } from './auth';

export interface AdminDashboardStats {
  userCount: number;
  memberCount: number;
  orderCount: number;
  paidAmount: number;
  todayPaidAmount: number;
  monitoring: {
    windowDays: number;
    reviewTotal: number;
    reviewSuccess: number;
    reviewFailed: number;
    reviewCancelled: number;
    reviewActive: number;
    successRate: number;
    averageDurationMs: number;
    averageDurationSeconds: number;
    tokensIn: number;
    tokensOut: number;
    modelCallCount: number;
    estimatedModelCost: number;
    pricingConfigured: boolean;
  };
}

export interface AdminUser {
  id: string;
  username: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  status: number;
  createdAt: string;
  updatedAt: string;
  membershipExpireAt?: string | null;
}

export interface AdminPlan {
  id: string;
  name: string;
  price: number;
  durationType: PlanDurationType;
  durationDays: number;
  description?: string | null;
  enabled: number;
  sort: number;
  reviewQuota: number;
  maxContractPages: number;
  maxFileSizeMb: number;
  createdAt: string;
  updatedAt: string;
}

export type AdminRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type AdminRuleType = 'PRESENCE' | 'REGEX' | 'KEYWORD' | 'THRESHOLD' | 'LLM';

export interface AdminReviewRule {
  id: string;
  code: string;
  name: string;
  category: string;
  severity: AdminRiskLevel;
  ruleType: AdminRuleType;
  description?: string | null;
  configJson: unknown;
  prompt?: string | null;
  enabled: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReviewRuleQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
  ruleType?: AdminRuleType;
  enabled?: number;
}

export type AdminReviewStatus =
  | 'PENDING'
  | 'PARSING'
  | 'RULE_CHECK'
  | 'MODEL_REVIEW'
  | 'AGGREGATING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export interface AdminReviewTask {
  id: string;
  projectId: string;
  projectName: string;
  filename: string;
  username: string;
  pageCount: number;
  ruleSetName: string | null;
  ruleSetVersion: number | null;
  modelName: string | null;
  status: AdminReviewStatus;
  progress: number;
  errorMessage: string | null;
  findingCount: number;
  durationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canRetry: boolean;
}

export interface AdminReviewQuery {
  page?: number;
  pageSize?: number;
  status?: AdminReviewStatus;
  keyword?: string;
}

export interface AdminUsageRow {
  userId: string;
  username: string;
  nickname: string | null;
  credits: number;
  tokensIn: number;
  tokensOut: number;
  entries: number;
}

export interface AdminUsageQuery {
  page?: number;
  pageSize?: number;
  month?: string;
  keyword?: string;
}

export interface AdminUsageResult {
  list: AdminUsageRow[];
  total: number;
  page: number;
  pageSize: number;
  month: string;
  totals: {
    credits: number;
    tokensIn: number;
    tokensOut: number;
    entries: number;
  };
}

export interface AdminModelConfig {
  id: string;
  name: string;
  provider: 'OPENAI_COMPATIBLE' | 'CUSTOM';
  baseUrl: string;
  hasApiKey: boolean;
  modelName: string;
  maxTokens: number;
  temperature: number;
  enabled: number;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentConfig {
  id: string;
  name: string;
  provider: string;
  merchantId?: string | null;
  appId?: string | null;
  hasAppSecret: boolean;
  hasApiKey: boolean;
  gatewayUrl?: string | null;
  notifyUrl?: string | null;
  returnUrl?: string | null;
  enabled: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrder {
  orderNo: string;
  username: string;
  planId: string;
  planName: string;
  durationDays: number;
  amount: number;
  status: OrderStatus;
  paymentConfigName?: string | null;
  transactionNo?: string | null;
  paidAt?: string | null;
  expireAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: UserRole;
  status?: number;
}

export interface AdminPlanQuery {
  page?: number;
  pageSize?: number;
}

export interface AdminModelQuery {
  page?: number;
  pageSize?: number;
}

export interface AdminPaymentQuery {
  page?: number;
  pageSize?: number;
}

export interface AdminOrderQuery {
  page?: number;
  pageSize?: number;
  orderNo?: string;
  username?: string;
  status?: OrderStatus;
}
