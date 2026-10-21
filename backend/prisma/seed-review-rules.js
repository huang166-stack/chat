const DEFAULT_RULE_SET = {
  name: '默认通用审查规则集',
  description: '覆盖保密、责任、终止、付款、知识产权等通用合同风险',
  contractType: null,
  stance: 'NEUTRAL',
  version: 1,
  enabled: 1,
};

const DEFAULT_RULES = [
  {
    code: 'CONFIDENTIALITY_MISSING',
    name: '缺少保密条款',
    category: '保密',
    severity: 'HIGH',
    ruleType: 'PRESENCE',
    description: '检查合同是否约定保密义务和保密期限',
    configJson: {
      match: { keywords: ['保密', '保密义务', '保密期限'], mode: 'ANY' },
      expect: 'PRESENT',
    },
  },
  {
    code: 'LIABILITY_CAP_MISSING',
    name: '缺少责任上限',
    category: '责任',
    severity: 'HIGH',
    ruleType: 'PRESENCE',
    description: '检查是否缺少赔偿责任上限，或存在无限责任表述',
    configJson: {
      match: { keywords: ['责任上限', '赔偿责任限额', '累计赔偿限额'], mode: 'ANY' },
      expect: 'PRESENT',
    },
  },
  {
    code: 'UNILATERAL_TERMINATION',
    name: '单方无条件解除权',
    category: '终止',
    severity: 'HIGH',
    ruleType: 'KEYWORD',
    description: '检查是否赋予一方无条件单方解除权',
    configJson: {
      match: { keywords: ['随时单方解除', '无需任何理由解除', '单方终止'], mode: 'ANY' },
      expect: 'ABSENT',
    },
  },
  {
    code: 'PAYMENT_TERM_LONG',
    name: '付款周期过长',
    category: '付款',
    severity: 'MEDIUM',
    ruleType: 'THRESHOLD',
    description: '检查付款周期是否超过 60 天',
    configJson: { field: 'paymentDays', operator: '>', value: 60, unit: 'day' },
  },
  {
    code: 'AUTO_RENEWAL',
    name: '自动续约缺少退出机制',
    category: '续约',
    severity: 'MEDIUM',
    ruleType: 'KEYWORD',
    description: '检查是否自动续约且未约定合理的退出方式',
    configJson: {
      match: { keywords: ['自动续约', '自动续期', '期满自动续展'], mode: 'ANY' },
      expect: 'ABSENT',
      requiresOptOut: true,
    },
  },
  {
    code: 'JURISDICTION_UNFAVORABLE',
    name: '管辖约定不利',
    category: '争议解决',
    severity: 'HIGH',
    ruleType: 'LLM',
    description: '结合我方立场判断管辖地或争议解决方式是否明显不利',
    configJson: { requiresStance: true },
    prompt: '你是一名合同审查律师。请判断合同中的争议解决条款是否明显不利于我方立场，并指出具体条款、风险和修改建议。',
  },
  {
    code: 'IP_TRANSFER_ALL',
    name: '知识产权全部无偿转让',
    category: '知识产权',
    severity: 'HIGH',
    ruleType: 'KEYWORD',
    description: '检查是否要求无偿转让全部知识产权',
    configJson: {
      match: { keywords: ['全部知识产权归', '无偿转让', '知识产权均归'], mode: 'ANY' },
      expect: 'ABSENT',
    },
  },
  {
    code: 'DATA_PROTECTION_MISSING',
    name: '缺少数据保护条款',
    category: '数据保护',
    severity: 'HIGH',
    ruleType: 'PRESENCE',
    description: '检查是否缺少个人信息保护和数据安全条款',
    configJson: {
      match: { keywords: ['个人信息保护', '数据安全', '隐私政策', '数据泄露'], mode: 'ANY' },
      expect: 'PRESENT',
    },
  },
  {
    code: 'ACCEPTANCE_TOO_SHORT',
    name: '验收期限过短',
    category: '验收',
    severity: 'MEDIUM',
    ruleType: 'THRESHOLD',
    description: '检查验收期限是否少于 3 天或存在视为自动通过条款',
    configJson: { field: 'acceptanceDays', operator: '<', value: 3, unit: 'day', autoPass: true },
  },
  {
    code: 'PENALTY_TOO_HIGH',
    name: '违约金比例过高',
    category: '违约',
    severity: 'MEDIUM',
    ruleType: 'THRESHOLD',
    description: '检查违约金比例是否明显过高',
    configJson: { field: 'penaltyRate', operator: '>', value: 0.3, unit: 'ratio' },
  },
];

export async function seedReviewRules(prisma) {
  const ruleSet = await prisma.reviewRuleSet.upsert({
    where: {
      name_version: {
        name: DEFAULT_RULE_SET.name,
        version: DEFAULT_RULE_SET.version,
      },
    },
    update: {
      description: DEFAULT_RULE_SET.description,
      contractType: DEFAULT_RULE_SET.contractType,
      stance: DEFAULT_RULE_SET.stance,
      enabled: DEFAULT_RULE_SET.enabled,
    },
    create: DEFAULT_RULE_SET,
  });

  for (const [index, rule] of DEFAULT_RULES.entries()) {
    const savedRule = await prisma.reviewRule.upsert({
      where: { code_version: { code: rule.code, version: 1 } },
      update: {
        name: rule.name,
        category: rule.category,
        severity: rule.severity,
        ruleType: rule.ruleType,
        description: rule.description,
        configJson: rule.configJson,
        prompt: rule.prompt ?? null,
        enabled: 1,
      },
      create: {
        code: rule.code,
        name: rule.name,
        category: rule.category,
        severity: rule.severity,
        ruleType: rule.ruleType,
        description: rule.description,
        configJson: rule.configJson,
        prompt: rule.prompt ?? null,
        enabled: 1,
        version: 1,
      },
    });

    const existingItem = await prisma.reviewRuleSetItem.findFirst({
      where: { ruleSetId: ruleSet.id, ruleId: savedRule.id },
    });

    if (existingItem) {
      await prisma.reviewRuleSetItem.update({
        where: { id: existingItem.id },
        data: { enabled: 1, sort: index + 1 },
      });
    } else {
      await prisma.reviewRuleSetItem.create({
        data: { ruleSetId: ruleSet.id, ruleId: savedRule.id, enabled: 1, sort: index + 1 },
      });
    }
  }

  return ruleSet;
}
