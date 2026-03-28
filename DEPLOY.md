# AI Router Worker 部署指南

## 本地测试（已完成 ✅）

```bash
cd /root/.openclaw/workspace-meteor/projects/ai-router-worker
npm install
npm run dev
```

访问：http://localhost:8787

### 测试命令

```bash
# 健康检查
curl http://localhost:8787/health

# 获取模型列表
curl http://localhost:8787/v1/models

# 聊天测试
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }'
```

---

## 部署到 Cloudflare Workers

### 1. 设置 Secrets

```bash
cd /root/.openclaw/workspace-meteor/projects/ai-router-worker

# 设置 GMI API Key
wrangler secret put GMI_API_KEY
# 粘贴：eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 设置 JWT 密钥（用于认证）
wrangler secret put JWT_SECRET
# 生成一个随机密钥：openssl rand -hex 32
```

### 2. 部署

```bash
# 部署到生产环境
npm run deploy
```

### 3. 验证部署

```bash
# 测试部署的 Worker
curl https://ai-router.meteor.workers.dev/health

# 查看实时日志
wrangler tail ai-router-worker
```

---

## 配置自定义域名（可选）

1. 访问：https://dash.cloudflare.com/?to=/:account/workers-and-pages
2. 选择 `ai-router-worker`
3. 点击 "Add domain"
4. 输入：`ai-router.meteor.workers.dev`
5. 确认 DNS 配置

---

## 与 ai-journal-mvp 集成

### 更新 ai-journal-mvp 环境变量

在 ai-journal-mvp 项目中添加：

```env
NEXT_PUBLIC_API_BASE=https://ai-router.meteor.workers.dev
API_KEY=your_api_key
DEFAULT_MODEL=openai/gpt-4o-mini
```

### 修改 API 调用

```typescript
// src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787';
const API_KEY = process.env.API_KEY;

export async function chat(messages: any[], model: string = 'openai/gpt-4o-mini') {
  const response = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2000,
      temperature: 1,
    }),
  });
  
  return await response.json();
}
```

---

## 速率限制配置

### 在 Cloudflare Dashboard 创建速率限制命名空间

1. 访问：https://dash.cloudflare.com/?to=/:account/rate-limits
2. 点击 "Create namespace"
3. 输入：`api-rate-limiter`
4. 记录 `namespace_id`

### 更新 wrangler.toml

```toml
[[ratelimits]]
name = "API_RATE_LIMITER"
namespace_id = "your-namespace-id"

  [ratelimits.simple]
  limit = 100  # 每分钟 100 次请求
  period = 60
```

---

## 监控和日志

### 查看实时日志

```bash
wrangler tail ai-router-worker
```

### 查看部署历史

```bash
wrangler deployment list ai-router-worker
```

### 回滚到上一个版本

```bash
wrangler rollback ai-router-worker
```

---

## 故障排查

### 问题：401 Unauthorized

**原因**: API Key 不正确

**解决**: 
```bash
wrangler secret put GMI_API_KEY
```

### 问题：429 Too Many Requests

**原因**: 触发速率限制

**解决**: 调整 `wrangler.toml` 中的速率限制配置

### 问题：模型不存在

**原因**: 模型 ID 拼写错误

**解决**: 访问 `/v1/models` 查看可用模型列表

---

## 成本估算

| 模型 | 价格 ($/1K tokens) | 100 万次请求成本* |
|------|-------------------|----------------|
| `openai/gpt-4o-mini` | $0.00015 / $0.0006 | ~$75 |
| `anthropic/claude-sonnet-4.6` | $0.003 / $0.015 | ~$1,500 |
| `bytedance/seed-2.0-mini` | $0.0001 / $0.0004 | ~$50 |

*假设每次请求 100 tokens

---

## 相关文件

- `wrangler.toml` - Workers 配置
- `src/index.ts` - 主入口
- `.dev.vars` - 本地开发环境变量
- `scripts/deploy.sh` - 部署脚本
