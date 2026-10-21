export type OrderStatus = 'CREATED' | 'PENDING' | 'PAID' | 'CLOSED' | 'REFUNDED';

export interface CreateOrderResult {
  orderNo: string;
  amount: number;
  status: OrderStatus;
  payUrl: string;
  expireAt: string;
}

export interface OrderDetail {
  orderNo: string;
  planId: string;
  planName: string;
  durationDays: number;
  amount: number;
  status: OrderStatus;
  transactionNo?: string | null;
  paidAt?: string | null;
  expireAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
