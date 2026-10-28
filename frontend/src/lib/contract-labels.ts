import type {
  ContractStance,
  ContractStatus,
  ContractType,
  ParseStatus,
} from '@/lib/api/contracts';
import type {
  ReviewFindingStatus,
  ReviewRiskLevel,
  ReviewTaskStatus,
} from '@/lib/api/reviews';

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  SALES: '销售合同',
  PURCHASE: '采购合同',
  NDA: 'NDA',
  EMPLOYMENT: '劳动合同',
  LEASE: '租赁合同',
  SERVICE: '服务合同',
  OTHER: '其他合同',
};

export const CONTRACT_STANCE_LABELS: Record<ContractStance, string> = {
  PARTY_A: '甲方立场',
  PARTY_B: '乙方立场',
  NEUTRAL: '中立审查',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  PARSING: '解析中',
  READY: '待审查',
  REVIEWING: '审查中',
  COMPLETED: '已完成',
  FAILED: '失败',
  ARCHIVED: '已归档',
};

export const PARSE_STATUS_LABELS: Record<ParseStatus, string> = {
  PENDING: '等待解析',
  PROCESSING: '解析中',
  SUCCESS: '解析完成',
  FAILED: '解析失败',
};

export const TASK_STATUS_LABELS: Record<ReviewTaskStatus, string> = {
  PENDING: '排队中',
  PARSING: '解析条款',
  RULE_CHECK: '规则预审',
  MODEL_REVIEW: '模型审查',
  AGGREGATING: '汇总结果',
  SUCCESS: '审查完成',
  FAILED: '审查失败',
  CANCELLED: '已取消',
};

export const RISK_LEVEL_LABELS: Record<ReviewRiskLevel, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
};

export const FINDING_STATUS_LABELS: Record<ReviewFindingStatus, string> = {
  OPEN: '待处理',
  ACCEPTED: '已接受',
  IGNORED: '已忽略',
  NEEDS_REVIEW: '需人工复核',
};

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
