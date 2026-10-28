# 生产部署与上线

> 状态：部署代码与运维脚本已完成，并通过本地前后端构建。Docker / Nginx 实机、真实合同全流程、监控实跑和回滚演练仍须在生产/预发环境执行，不能仅凭本机结果判定上线完成。

## 1. 部署组成

- 根目录 `docker-compose.yml`：MySQL、Redis、NestJS API、独立 Worker、Next.js、Nginx。
- `deploy/nginx.conf`：HTTP 反代，上传上限 100MB，关闭 SSE 缓冲。
- `deploy/nginx.https.conf.example`：HTTPS 示例，切换前同步核对上传和 SSE 参数。
- `deploy/.env.production.example`：生产环境变量模板。
- `deploy/scripts/ops.sh`：静态/运行时预检、备份校验、分阶段发布和回滚。
- `uploads` 为 Docker 命名卷，挂载到 API 与 Worker 的 `/app/uploads`。

## 2. 首次部署

服务器需要 Docker Compose v2、Bash、curl、gzip 和 sha256sum。

```bash
cp deploy/.env.production.example .env
# 编辑 .env，至少替换全部密码、密钥、域名和模型单价
bash deploy/scripts/ops.sh preflight
bash deploy/scripts/ops.sh deploy <release-tag>
```

发布脚本按以下顺序执行：

1. 静态预检环境变量、弱默认值、Nginx 上传上限和 SSE 配置。
2. 若已有服务，备份 MySQL 和 uploads，并校验 SHA256。
3. 构建 `chat-backend:<tag>`、`chat-frontend:<tag>`。
4. 先更新 API，等待 `/api/health` 就绪。
5. 再更新 Worker、前端和 Nginx，逐段等待健康检查。
6. 执行运行时预检，包括 MySQL、Redis、迁移状态、上传卷写入、磁盘空间和重启策略。

当前实现是容器级分批发布，不做按百分比导流；单机单人部署优先保证可观察和可回滚。

## 3. 必需环境变量

`preflight` 会拒绝缺失值、示例值、短密钥和弱默认值：

- `MYSQL_ROOT_PASSWORD`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE`
- `JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`：至少 32 字符且互不相同
- `APP_ENCRYPTION_KEY`：64 位十六进制，用于 AES-256-GCM
- `STORAGE_SIGNING_SECRET`：至少 32 字符
- `PUBLIC_ORIGIN`、`STORAGE_PUBLIC_BASE_URL`：必须为 HTTPS
- `MODEL_COST_INPUT_PER_MILLION_TOKENS`、`MODEL_COST_OUTPUT_PER_MILLION_TOKENS`：元/百万 token，用于管理端成本估算
- `MIN_UPLOAD_FREE_GB`：上传卷最低剩余空间，默认 5GB

生成加密密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

不要提交 `.env`、证书、真实合同或用户数据。

## 4. 备份与回滚

手动备份：

```bash
bash deploy/scripts/ops.sh backup
bash deploy/scripts/ops.sh verify-backup
```

默认备份目录为 `$HOME/chat-backups`，保留 30 天，可通过 `BACKUP_ROOT`、`BACKUP_RETENTION_DAYS` 覆盖。每次备份包含：

- `database.sql.gz`
- `uploads.tar.gz`
- `SHA256SUMS`
- `metadata.txt`

发布记录默认保存在 `$HOME/.chat-deploy`，可用 `DEPLOY_STATE_DIR` 覆盖。`deploy` 会把上一个版本写入 `previous`，回滚命令为：

```bash
bash deploy/scripts/ops.sh rollback
# 或显式指定保留的镜像标签
bash deploy/scripts/ops.sh rollback <previous-tag>
```

回滚会先校验最近一次备份，再切回旧镜像并重跑健康检查。脚本不会自动恢复数据库，因为恢复会覆盖生产数据；若迁移不兼容且必须恢复，应先停止写入，再由负责人按备份目录中的 `database.sql.gz` 和 `uploads.tar.gz` 手工恢复。

## 5. Nginx、Worker 与日志

- Nginx `client_max_body_size` 为 `100m`，高于当前最高套餐 50MB 和后端 100MB 安全上限。
- `/api/` 已设置 `proxy_buffering off`、`proxy_request_buffering off`、`proxy_read_timeout 3600s`，用于 SSE。
- API 使用 `APP_ROLE=api`，Worker 使用 `APP_ROLE=worker`；Worker 独立容器运行，异常由 `restart: unless-stopped` 拉起。
- 所有容器日志由 Docker `json-file` 驱动轮转，单文件 10MB、保留 3 份；Nginx 访问/错误日志输出到容器标准流。

查看日志：

```bash
docker compose logs -f backend
docker compose logs -f worker
docker compose logs -f nginx
```

## 6. HTTPS 与数据库迁移

后端容器启动时执行 `npx prisma migrate deploy`。禁止在生产使用 `db push`。

切换 HTTPS：

```bash
cp deploy/nginx.https.conf.example deploy/nginx.conf
mkdir -p deploy/certs
# 将 fullchain.pem、privkey.pem 放入 deploy/certs
```

在 `docker-compose.yml` 的 nginx volumes 增加：

```yaml
- ./deploy/certs:/etc/nginx/certs:ro
```

同时在 nginx `ports` 增加 `- '${HTTPS_PORT:-443}:443'`，核对证书路径，并重新执行预检。

## 7. 上线后监控

管理端首页显示最近 7 天：

- 任务成功率（成功 / 成功+失败）
- 成功任务平均审查耗时
- 成功、失败、进行中、取消数量
- 输入/输出 token、模型调用账本条目
- 按环境变量单价计算的模型成本估算

`GET /api/health` 同时检查数据库和 Redis；任一依赖不可用时返回 503。监控展示依赖管理员登录，不能暴露为公开接口。

## 8. 生产验收清单

- [ ] 复制并完成 `.env`，预检无占位值。
- [ ] MySQL、Redis、uploads 卷持久化，上传卷可写且剩余空间达标。
- [ ] Nginx 上传上限不小于最高套餐，SSE 无缓冲。
- [ ] API、Worker、前端、Nginx 健康检查通过，日志轮转生效。
- [ ] 生产完成一次真实合同上传、解析、审查、追问和报告下载。
- [ ] 管理端可见成功率、平均耗时和模型成本。
- [ ] 完成一次迁移前备份和回滚演练，确认镜像与备份均可恢复。
- [ ] 真机移动端、匿名合同误报率、真实模型 30 页耗时按联调记录复核。
