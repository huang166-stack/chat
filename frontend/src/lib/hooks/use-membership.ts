'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOrder, getOrder } from '@/lib/api/orders';
import { getMemberPlans, getMembership } from '@/lib/api/membership';

export function useMemberPlans() {
  return useQuery({
    queryKey: ['member-plans'],
    queryFn: getMemberPlans,
  });
}

export function useMembership() {
  return useQuery({
    queryKey: ['membership'],
    queryFn: getMembership,
  });
}

export function useOrder(orderNo: string | null) {
  return useQuery({
    queryKey: ['order', orderNo],
    queryFn: () => getOrder(orderNo as string),
    enabled: Boolean(orderNo),
    refetchInterval: (query) => (query.state.data?.status === 'PAID' ? false : 3000),
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (planId: string | number) => createOrder(planId),
  });
}

export function useRefreshMembership() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['membership'] });
}
