# Cloudflare Workers 部署指南

## 🚀 部署方式

### 方式 1: GitHub Actions 自动部署（推荐）

#### 1. 在 Cloudflare Dashboard 创建 API Token

1. 访问：https://dash.cloudflare.com/?to=/:account/api-tokens
2. 点击 **"Create Token"**
3. 选择模板：**"Edit Cloudflare Workers"**
4. 限定 Account: `c1dffa5530fd843da6b513fed73ff46c`
5. 复制 Token

#### 2. 在 GitHub 添加 Secrets

访问：https://github.com/FrankLeLe/ai-router-worker/settings/secrets/actions

添加两个 Secrets：

| Name | Value |
|------|-------|
| `CLOUDFLARE_ACCOUNT_ID` | `c1dffa5530fd843da6b513fed73ff46c` |
| `CLOUDFLARE_API_TOKEN` | 你刚创建的 Token |

#### 3. 自动部署

推送代码到 `main` 分支后，GitHub Actions 会自动部署：

```
push to main → GitHub Actions → wrangler deploy → ai-router-worker.zdjingji.workers.dev
```

---

### 方式 2: Wrangler CLI 手动部署

```bash
cd /root/.openclaw/workspace-meteor/projects/ai-router-worker

# 登录 Cloudflare
wrangler login

# 部署
npx wrangler deploy
```

---

### 方式 3: Cloudflare Dashboard 手动部署

1. 访问：https://dash.cloudflare.com/?to=/:account/workers-and-pages
2. 点击 **"Create application"** → **"Workers"**
3. 选择 **"Upload"** 或 **"Import from GitHub"**
4. 配置环境变量

---

## 📊 部署后验证

### 健康检查
```bash
curl https://ai-router-worker.zdjingji.workers.dev/health
```

### 获取模型列表
```bash
curl https://ai-router-worker.zdjingji.workers.dev/v1/models
```

### 聊天测试
```bash
curl -X POST https://ai-router-worker.zdjingji.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }'
```

---

## 🔐 配置 Secrets

### 必需的环境变量

通过 `wrangler secret` 命令设置：

```bash
# GMI Cloud API Key
wrangler secret put GMI_API_KEY

# JWT 认证密钥（用于 API 认证）
wrangler secret put JWT_SECRET
```

---

## 📁 项目结构

```
ai-router-worker/
├── src/
│   └── index.ts          # 主入口（Hono 框架）
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions 配置
├── wrangler.toml         # Workers 配置
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
├── .dev.vars             # 本地开发环境变量（不提交）
├── .gitignore            # Git 忽略文件
├── README.md             # 使用说明
├── DEPLOY.md             # 部署指南
└── DEPLOY_WORKERS.md     # 本文档
```

---

## 🎯 与 ai-journal-mvp 集成

在 `ai-journal-mvp` 项目中配置：

```env
NEXT_PUBLIC_API_BASE=https://ai-router-worker.zdjingji.workers.dev
API_KEY=your_api_key
DEFAULT_MODEL=openai/gpt-4o-mini
```

调用示例：

```typescript
const response = await fetch('https://ai-router-worker.zdjingji.workers.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  },
  body: JSON.stringify({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'Hello!' }],
  }),
});
```

---

## 📝 部署检查清单

- [ ] GitHub 仓库已创建
- [ ] 代码已推送到 main 分支
- [ ] GitHub Actions workflow 已配置
- [ ] Cloudflare API Token 已创建
- [ ] GitHub Secrets 已添加
- [ ] 首次部署成功
- [ ] 健康检查通过
- [ ] ai-journal-mvp 已更新配置

---

## 🔗 相关链接

- **GitHub 仓库**: https://github.com/FrankLeLe/ai-router-worker
- **Cloudflare Dashboard**: https://dash.cloudflare.com/?to=/:account/workers-and-pages
- **Worker URL**: https://ai-router-worker.zdjingji.workers.dev
