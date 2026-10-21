import type { PlanDurationType } from './membership';
import type { OrderStatus } from './order';
import type { UserRole } from './auth';

export interface AdminDashboardStats {
  userCount: number;
  memberCount: number;
  orderCount: number;
  paidAmount: number;
  todayPaidAmount: number;
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
  createdAt: string;
  updatedAt: string;
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
