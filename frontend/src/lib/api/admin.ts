import { api } from './client';
import type { PageResult } from '@/types/api';
import type {
  AdminDashboardStats,
  AdminModelConfig,
  AdminModelQuery,
  AdminOrder,
  AdminOrderQuery,
  AdminPaymentConfig,
  AdminPaymentQuery,
  AdminPlan,
  AdminPlanQuery,
  AdminReviewQuery,
  AdminReviewRule,
  AdminReviewRuleQuery,
  AdminReviewTask,
  AdminUsageQuery,
  AdminUsageResult,
  AdminUser,
  AdminUserQuery,
} from '@/types/admin';

function toQuery(params: object) {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function getAdminDashboard() {
  return api.get<AdminDashboardStats>('/admin/dashboard');
}

export function getAdminUsers(query: AdminUserQuery = {}) {
  return api.get<PageResult<AdminUser>>(`/admin/users${toQuery(query)}`);
}

export function updateAdminUser(
  id: string | number,
  data: { role?: 'USER' | 'ADMIN'; status?: number },
) {
  return api.put<AdminUser>(`/admin/users/${id}`, data);
}

export function disableAdminUser(id: string | number) {
  return api.delete<AdminUser>(`/admin/users/${id}`);
}

export function getAdminPlans(query: AdminPlanQuery = {}) {
  return api.get<PageResult<AdminPlan>>(`/admin/member-plans${toQuery(query)}`);
}

export function createAdminPlan(data: Record<string, unknown>) {
  return api.post<AdminPlan>('/admin/member-plans', data);
}

export function updateAdminPlan(id: string | number, data: Record<string, unknown>) {
  return api.put<AdminPlan>(`/admin/member-plans/${id}`, data);
}

export function deleteAdminPlan(id: string | number) {
  return api.delete<null>(`/admin/member-plans/${id}`);
}

export function getAdminRules(query: AdminReviewRuleQuery = {}) {
  return api.get<PageResult<AdminReviewRule>>(`/admin/review-rules${toQuery(query)}`);
}

export function createAdminRule(data: Record<string, unknown>) {
  return api.post<AdminReviewRule>('/admin/review-rules', data);
}

export function updateAdminRule(id: string | number, data: Record<string, unknown>) {
  return api.put<AdminReviewRule>(`/admin/review-rules/${id}`, data);
}

export function getAdminReviews(query: AdminReviewQuery = {}) {
  return api.get<PageResult<AdminReviewTask>>(`/admin/reviews${toQuery(query)}`);
}

export function retryAdminReview(id: string | number) {
  return api.post<AdminReviewTask>(`/admin/reviews/${id}/retry`);
}

export function getAdminUsage(query: AdminUsageQuery = {}) {
  return api.get<AdminUsageResult>(`/admin/usage${toQuery(query)}`);
}

export function getAdminModels(query: AdminModelQuery = {}) {
  return api.get<PageResult<AdminModelConfig>>(`/admin/model-configs${toQuery(query)}`);
}

export function createAdminModel(data: Record<string, unknown>) {
  return api.post<AdminModelConfig>('/admin/model-configs', data);
}

export function updateAdminModel(id: string | number, data: Record<string, unknown>) {
  return api.put<AdminModelConfig>(`/admin/model-configs/${id}`, data);
}

export function deleteAdminModel(id: string | number) {
  return api.delete<null>(`/admin/model-configs/${id}`);
}

export function getAdminPayments(query: AdminPaymentQuery = {}) {
  return api.get<PageResult<AdminPaymentConfig>>(`/admin/payment-configs${toQuery(query)}`);
}

export function createAdminPayment(data: Record<string, unknown>) {
  return api.post<AdminPaymentConfig>('/admin/payment-configs', data);
}

export function updateAdminPayment(id: string | number, data: Record<string, unknown>) {
  return api.put<AdminPaymentConfig>(`/admin/payment-configs/${id}`, data);
}

export function deleteAdminPayment(id: string | number) {
  return api.delete<null>(`/admin/payment-configs/${id}`);
}

export function getAdminOrders(query: AdminOrderQuery = {}) {
  return api.get<PageResult<AdminOrder>>(`/admin/orders${toQuery(query)}`);
}

