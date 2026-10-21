import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { seedReviewRules } from './seed-review-rules.js';

const prisma = new PrismaClient();

async function ensurePlan(data) {
  const existing = await prisma.memberPlan.findFirst({ where: { name: data.name } });
  if (existing) {
    return prisma.memberPlan.update({ where: { id: existing.id }, data });
  }
  return prisma.memberPlan.create({ data });
}

async function ensureModel(data) {
  const existing = await prisma.modelConfig.findFirst({ where: { name: data.name } });
  if (existing) {
    return prisma.modelConfig.update({ where: { id: existing.id }, data });
  }
  return prisma.modelConfig.create({ data });
}

async function main() {
  const adminPassword = await bcrypt.hash('Admin123456', 10);
  const userPassword = await bcrypt.hash('User123456', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { role: 'ADMIN', status: 1 },
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 1,
    },
  });

  const normalUser = await prisma.user.upsert({
    where: { username: 'user1' },
    update: { status: 1 },
    create: {
      username: 'user1',
      passwordHash: userPassword,
      role: 'USER',
      status: 1,
    },
  });

  await prisma.userMembership.upsert({
    where: { userId: normalUser.id },
    update: {},
    create: {
      userId: normalUser.id,
      expireAt: new Date(0),
    },
  });

  await ensurePlan({
    name: '月度会员',
    price: 19.9,
    durationType: 'MONTH_1',
    durationDays: 30,
    description: '有效期一个月',
    enabled: 1,
    sort: 1,
    reviewQuota: 20,
    maxContractPages: 30,
    maxFileSizeMb: 20,
  });

  await ensurePlan({
    name: '季度会员',
    price: 49.9,
    durationType: 'MONTH_3',
    durationDays: 90,
    description: '有效期三个月',
    enabled: 1,
    sort: 2,
    reviewQuota: 80,
    maxContractPages: 60,
    maxFileSizeMb: 30,
  });

  await ensurePlan({
    name: '年度会员',
    price: 99.9,
    durationType: 'CUSTOM',
    durationDays: 365,
    description: '有效期一年',
    enabled: 1,
    sort: 3,
    reviewQuota: 400,
    maxContractPages: 100,
    maxFileSizeMb: 50,
  });

  await ensureModel({
    name: 'GPT 对话模型',
    provider: 'OPENAI_COMPATIBLE',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelName: 'gpt-4o-mini',
    maxTokens: 2048,
    temperature: 0.7,
    enabled: 1,
    sort: 1,
  });

  await ensureModel({
    name: '本地模型',
    provider: 'CUSTOM',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    modelName: 'qwen2.5',
    maxTokens: 2048,
    temperature: 0.7,
    enabled: 1,
    sort: 2,
  });

  const paymentConfig = await prisma.paymentConfig.findFirst({ where: { name: '默认支付渠道' } });
  if (paymentConfig) {
    await prisma.paymentConfig.update({
      where: { id: paymentConfig.id },
      data: {
        provider: 'playoffer',
        merchantId: '',
        appId: '',
        appSecret: '',
        apiKey: '',
        gatewayUrl: 'https://pay.playoffer.cn',
        notifyUrl: '',
        returnUrl: '',
        enabled: 1,
      },
    });
  } else {
    await prisma.paymentConfig.create({
      data: {
        name: '默认支付渠道',
        provider: 'playoffer',
        merchantId: '',
        appId: '',
        appSecret: '',
        apiKey: '',
        gatewayUrl: 'https://pay.playoffer.cn',
        notifyUrl: '',
        returnUrl: '',
        enabled: 1,
      },
    });
  }

  const ruleSet = await seedReviewRules(prisma);

  console.log(
    `Seed completed. admin.id=${admin.id}, user.id=${normalUser.id}, ruleSet.id=${ruleSet.id}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
