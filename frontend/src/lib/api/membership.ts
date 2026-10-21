import { api } from './client';
import type { MemberPlan, MembershipStatus } from '@/types/membership';

export function getMemberPlans() {
  return api.get<MemberPlan[]>('/member-plans');
}

export function getMembership() {
  return api.get<MembershipStatus>('/memberships/me');
}
