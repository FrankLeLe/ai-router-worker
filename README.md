# AI Router Worker

GMI Cloud 模型路由服务，部署在 Cloudflare Workers 上。

## 功能

- ✅ OpenAI 兼容格式 (`/v1/chat/completions`)
- ✅ 支持 42 个 GMI Cloud 模型
- ✅ 速率限制（官方 Rate Limiting API）
- ✅ API Key 认证
- ✅ CORS 支持
- ✅ 流式响应
- ✅ 自动日志

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
npm run dev
```

访问：http://localhost:8787

### 3. 测试 API

```bash
# 健康检查
curl http://localhost:8787/health

# 获取模型列表
curl http://localhost:8787/v1/models

# 聊天完成
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'
```

### 4. 部署

```bash
# 设置 Secrets
wrangler secret put GMI_API_KEY
wrangler secret put JWT_SECRET

# 部署到生产环境
npm run deploy
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/v1/models` | GET | 获取可用模型列表 |
| `/v1/chat/completions` | POST | 聊天完成（OpenAI 兼容） |

## 可用模型

### 推荐模型

| 模型 ID | 用途 | 价格 ($/1K) |
|--------|------|------------|
| `openai/gpt-4o-mini` | 性价比首选 | $0.00015 / $0.0006 |
| `anthropic/claude-sonnet-4.6` | 日常主力 | $0.003 / $0.015 |
| `anthropic/claude-opus-4.6` | 最强推理 | $0.005 / $0.025 |
| `bytedance/seed-2.0-mini` | 全网最低价 | $0.0001 / $0.0004 |
| `deepseek-ai/DeepSeek-V3.2` | 极致性价比 | $0.0002 / $0.00032 |

完整模型列表：`/v1/models`

## 与 ai-journal-mvp 集成

在 ai-journal-mvp 中配置：

```env
NEXT_PUBLIC_API_BASE=https://ai-router.meteor.workers.dev
API_KEY=your_api_key
DEFAULT_MODEL=openai/gpt-4o-mini
```

调用示例：

```typescript
const response = await fetch('https://ai-router.meteor.workers.dev/v1/chat/completions', {
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

## 开发说明

### 添加新模型

编辑 `src/index.ts` 中的 `MODELS` 对象：

```typescript
const MODELS = {
  'new-model': { 
    id: 'provider/model-name', 
    context: 128000, 
    price: { prompt: 0.001, completion: 0.005 } 
  },
};
```

### 速率限制配置

在 `wrangler.toml` 中调整：

```toml
[[ratelimits]]
name = "API_RATE_LIMITER"
namespace_id = "1001"

  [ratelimits.simple]
  limit = 100  # 每分钟请求数
  period = 60
```

## 相关文件

- `wrangler.toml` - Cloudflare Workers 配置
- `src/index.ts` - 主入口文件
- `.dev.vars` - 本地开发环境变量（不要提交）
- `package.json` - 依赖配置

## 部署检查清单

- [ ] 本地测试通过
- [ ] 设置 Secrets (`wrangler secret put`)
- [ ] 配置速率限制命名空间
- [ ] 部署并验证
- [ ] 更新 ai-journal-mvp 配置
