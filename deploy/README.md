# 生产部署说明

本目录包含生产部署所需配置：

- 项目根目录 `docker-compose.yml`：MySQL、Redis、NestJS 后端、Next.js 前端、Nginx。
- `nginx.conf`：HTTP 反向代理，已关闭 `/api/` 下的代理缓冲，适配 SSE。
- `nginx.https.conf.example`：HTTPS 配置示例。
- `.env.production.example`：生产环境变量模板。

## 1. 准备环境

```bash
cp deploy/.env.production.example .env
```

至少修改以下值：

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_USER` / `MYSQL_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_ENCRYPTION_KEY`：64 位 hex
- `PUBLIC_ORIGIN`：正式域名，例如 `https://chat.example.com`

生成加密密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. 构建并启动

```bash
docker compose --env-file .env up -d --build
```

后端容器启动时会自动执行：

```bash
npx prisma migrate deploy
node dist/main
```

检查状态：

```bash
docker compose ps
docker compose logs -f backend
```

## 3. 数据库迁移

生产环境使用迁移文件，不使用 `db push`：

```bash
docker compose exec backend npx prisma migrate deploy
```

当前迁移：

- `20260912093521_init`
- `20260912101445_add_user_profile_fields`

## 4. 配置 HTTPS

将 `nginx.conf` 替换为 HTTPS 配置，并挂载证书：

```bash
cp deploy/nginx.https.conf.example deploy/nginx.conf
mkdir -p deploy/certs
# 将 fullchain.pem 和 privkey.pem 放入 deploy/certs
```

在 `docker-compose.yml` 的 nginx volumes 增加：

```yaml
- ./deploy/certs:/etc/nginx/certs:ro
```

如果使用 Let's Encrypt，可先用 HTTP 启动完成 ACME 验证，再切换为 HTTPS 配置。

## 5. 支付回调公网地址

在管理后台“支付管理”中，将回调地址配置为：

```text
https://你的域名/api/payment/callback
```

该地址由 Nginx 转发到后端容器，不需要暴露后端端口。

## 6. SSE 验证

`nginx.conf` 已配置：

```nginx
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

验证流式输出时，浏览器 Network 中 `/api/conversations/{id}/messages` 应持续收到 `text/event-stream` 分块，而不是等待完整响应。

## 7. 上线检查清单

- [ ] `PUBLIC_ORIGIN` 使用正式 HTTPS 域名。
- [ ] MySQL、Redis 数据卷已持久化。
- [ ] 数据库迁移已执行且 `_prisma_migrations` 状态正常。
- [ ] 支付回调公网可达。
- [ ] 管理后台支付配置中的 `notifyUrl` 使用 HTTPS。
- [ ] 模型和支付密钥未通过前端接口返回。
- [ ] 非管理员无法进入 `/admin`。
- [ ] 对话流式输出无缓冲。
- [ ] Docker 日志配置了轮转。
