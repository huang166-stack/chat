import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminModel,
  createAdminPayment,
  createAdminPlan,
  deleteAdminModel,
  deleteAdminPayment,
  deleteAdminPlan,
  disableAdminUser,
  getAdminDashboard,
  getAdminModels,
  getAdminOrders,
  getAdminPayments,
  getAdminPlans,
  getAdminUsers,
  updateAdminModel,
  updateAdminPayment,
  updateAdminPlan,
  updateAdminUser,
} from '@/lib/api/admin';
import type {
  AdminModelQuery,
  AdminOrderQuery,
  AdminPaymentQuery,
  AdminPlanQuery,
  AdminUserQuery,
} from '@/types/admin';

export function useAdminDashboard() {
  return useQuery({ queryKey: ['admin-dashboard'], queryFn: getAdminDashboard });
}

export function useAdminUsers(query: AdminUserQuery) {
  return useQuery({
    queryKey: ['admin-users', query],
    queryFn: () => getAdminUsers(query),
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: 'USER' | 'ADMIN'; status?: number } }) =>
      updateAdminUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useDisableAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => disableAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useAdminPlans(query: AdminPlanQuery) {
  return useQuery({
    queryKey: ['admin-plans', query],
    queryFn: () => getAdminPlans(query),
  });
}

export function useCreateAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createAdminPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['member-plans'] });
    },
  });
}

export function useUpdateAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateAdminPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['member-plans'] });
    },
  });
}

export function useDeleteAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['member-plans'] });
    },
  });
}

export function useAdminModels(query: AdminModelQuery) {
  return useQuery({
    queryKey: ['admin-models', query],
    queryFn: () => getAdminModels(query),
  });
}

export function useCreateAdminModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createAdminModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-models'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useUpdateAdminModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateAdminModel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-models'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useDeleteAdminModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-models'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useAdminPayments(query: AdminPaymentQuery) {
  return useQuery({
    queryKey: ['admin-payments', query],
    queryFn: () => getAdminPayments(query),
  });
}

export function useCreateAdminPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createAdminPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
  });
}

export function useUpdateAdminPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateAdminPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
  });
}

export function useDeleteAdminPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
  });
}

export function useAdminOrders(query: AdminOrderQuery) {
  return useQuery({
    queryKey: ['admin-orders', query],
    queryFn: () => getAdminOrders(query),
  });
}
