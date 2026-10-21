import { api } from './client';
import type { CreateOrderResult, OrderDetail } from '@/types/order';

export function createOrder(planId: string | number) {
  return api.post<CreateOrderResult>('/orders', { planId });
}

export function getOrder(orderNo: string) {
  return api.get<OrderDetail>(`/orders/${encodeURIComponent(orderNo)}`);
}

export function getPaymentReturn(orderNo: string) {
  return api.get<{ orderNo: string; status: OrderDetail['status']; amount: number; paidAt: string | null }>(
    `/payment/return?orderNo=${encodeURIComponent(orderNo)}`,
  );
}
