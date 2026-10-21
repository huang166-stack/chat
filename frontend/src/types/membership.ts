export type PlanDurationType = 'MONTH_1' | 'MONTH_3' | 'CUSTOM';

export interface MemberPlan {
  id: string;
  name: string;
  price: number;
  durationType: PlanDurationType;
  durationDays: number;
  description?: string | null;
  sort: number;
}

export interface MembershipStatus {
  isMember: boolean;
  expireAt: string | null;
}
