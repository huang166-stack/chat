# chat

合同审查与合规助手。

## Docker 镜像自动发布

每次执行 `git push` 后，GitHub Actions 会构建并推送以下镜像到 Docker Hub：

- `<DOCKERHUB_USERNAME>/chat-backend`
- `<DOCKERHUB_USERNAME>/chat-frontend`

在 GitHub 仓库的 `Settings > Secrets and variables > Actions` 中添加：

- `DOCKERHUB_USERNAME`：Docker Hub 用户名
- `DOCKERHUB_TOKEN`：Docker Hub Access Token，不要使用账户密码

工作流会为分支、Git tag、`sha-<短提交号>` 生成镜像标签，并在默认分支推送时额外更新 `latest` 标签。
