# AGENTS.md

本项目为单人开发的大模型对话系统，正在扩展为“合同审查与合规助手”。Codex 的所有改动必须小而完整，禁止大范围重构。

## 技术栈

- 后端：NestJS 12（ESM）+ Prisma 6 + MySQL 8 + Redis 7
- 前端：Next.js 16 App Router + React 19 + Tailwind CSS 4 + Ant Design 6
- 状态与表单：TanStack Query、Zustand、React Hook Form + Zod

## 目录约定

- `backend/src/<module>`：Controller / Service / DTO / Module
- `backend/prisma/schema.prisma`：数据模型，迁移放 `prisma/migrations`
- `frontend/src/app/<route>/page.tsx`：页面
- `frontend/src/components/<domain>`：业务组件，通用组件放 `components/common`
- `frontend/src/lib/api`、`frontend/src/lib/hooks`：接口与查询封装
- `docs/合同审查开发方案.md` 与 `docs/合同审查开发计划.md` 是当前功能的执行依据

## 编码约定

- 遵循现有响应格式 `{ code, message, data }` 与错误码
- 所有用户数据查询必须带 `userId` 条件；管理端接口必须有角色守卫
- 后端使用 DTO + class-validator，不要绕过全局 ValidationPipe
- 前端颜色只从 `globals.css` 的 `@theme` 令牌取，不写硬编码色值
- 用户端为深色科技风，管理端为浅色；合同纸面使用 `bg-paper`
- 新依赖必须说明理由，优先复用现有库

## 验证

- 后端：`cd backend && npm run build && npm run test`
- 前端：`cd frontend && npm run build`
- 只对改动文件跑 eslint，避免扫描 `.next`
- 每步结束提交一次 commit，并更新 `docs/合同审查开发计划.md` 的状态表

## 禁止

- 提交密钥、合同样本、用户数据
- 一次性大范围重写或无关格式化
- 跳过测试或把失败测试注释掉