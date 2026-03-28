/**
 * AI Router Worker - GMI Cloud 模型路由服务
 * 
 * 功能：
 * - 支持 OpenAI 兼容格式
 * - 路由到 GMI Cloud 42 个模型
 * - 速率限制、认证、日志
 * - 无缝兼容 ai-journal-mvp
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bearerAuth } from 'hono/bearer-auth';

// 类型定义
type Bindings = {
  GMI_API_KEY: string;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
  GMI_API_BASE: string;
  API_RATE_LIMITER: RateLimit.RateLimiter;
};

type Variables = {
  userId: string;
};

// 创建 Hono 应用
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 中间件
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// 模型配置（从 GMI-API-Models-List.md 同步）
const MODELS = {
  // Claude 系列
  'claude-haiku-4.5': { id: 'anthropic/claude-haiku-4.5', context: 409600, price: { prompt: 0.001, completion: 0.005 } },
  'claude-sonnet-4.6': { id: 'anthropic/claude-sonnet-4.6', context: 409600, price: { prompt: 0.003, completion: 0.015 } },
  'claude-opus-4.6': { id: 'anthropic/claude-opus-4.6', context: 409600, price: { prompt: 0.005, completion: 0.025 } },
  
  // GPT 系列
  'gpt-4o-mini': { id: 'openai/gpt-4o-mini', context: 128000, price: { prompt: 0.00015, completion: 0.0006 } },
  'gpt-4o': { id: 'openai/gpt-4o', context: 128000, price: { prompt: 0.0025, completion: 0.01 } },
  'gpt-5': { id: 'openai/gpt-5', context: 409600, price: { prompt: 0.00125, completion: 0.01 } },
  'gpt-5.4': { id: 'openai/gpt-5.4', context: 409600, price: { prompt: 0.0025, completion: 0.015 } },
  'gpt-5.4-nano': { id: 'openai/gpt-5.4-nano', context: 409600, price: { prompt: 0.0002, completion: 0.00125 } },
  
  // DeepSeek 系列
  'deepseek-v3.2': { id: 'deepseek-ai/DeepSeek-V3.2', context: 163840, price: { prompt: 0.0002, completion: 0.00032 } },
  'deepseek-r1': { id: 'deepseek-ai/DeepSeek-R1-0528', context: 163840, price: { prompt: 0.0004, completion: 0.0018 } },
  
  // Qwen 系列
  'qwen-next-80b': { id: 'Qwen/Qwen3-Next-80B-A3B-Instruct', context: 262144, price: { prompt: 0.00015, completion: 0.0015 } },
  'qwen-coder-480b': { id: 'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8', context: 262128, price: { prompt: 0.00035, completion: 0.0016 } },
  
  // Gemini 系列
  'gemini-flash-lite': { id: 'google/gemini-3.1-flash-lite-preview', context: 1048576, price: { prompt: 0.00025, completion: 0.0015 } },
  
  // 性价比之王
  'seed-mini': { id: 'bytedance/seed-2.0-mini', context: 262144, price: { prompt: 0.0001, completion: 0.0004 } },
} as const;

type ModelKey = keyof typeof MODELS;

// 公开端点：获取模型列表
app.get('/v1/models', async (c) => {
  const models = Object.entries(MODELS).map(([key, config]) => ({
    id: config.id,
    object: 'model',
    created: Date.now(),
    owned_by: 'gmi-cloud',
    context_length: config.context,
    pricing: config.price,
  }));
  
  return c.json({
    object: 'list',
    data: models,
  });
});

// 公开端点：健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
  });
});

// 认证中间件（仅用于 /v1/chat/completions）
const authMiddleware = async (c: any, next: any) => {
  // 开发环境跳过认证
  if (c.env.JWT_SECRET === 'dev-secret') {
    c.set('userId', 'dev-user');
    await next();
    return;
  }
  
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }
  
  // 简单的 Token 验证（生产环境使用 JWT）
  const token = authHeader.substring(7);
  if (token !== c.env.GMI_API_KEY) {
    return c.json({ error: 'Invalid API key' }, 401);
  }
  
  c.set('userId', 'api-user');
  await next();
};

// 速率限制中间件
const rateLimitMiddleware = async (c: any, next: any) => {
  const identifier = c.req.header('CF-Connecting-IP') || 'unknown';
  
  try {
    const { success, limit, remaining, reset } = await c.env.API_RATE_LIMITER.limit(
      { key: identifier }
    );
    
    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', reset.toString());
    
    if (!success) {
      return c.json({ 
        error: 'Rate limit exceeded',
        retry_after: reset - Date.now() 
      }, 429);
    }
  } catch (e) {
    // 速率限制未配置时跳过
    console.warn('Rate limiter not configured:', e);
  }
  
  await next();
};

// 主要端点：聊天完成（OpenAI 兼容格式）
app.post('/v1/chat/completions', authMiddleware, rateLimitMiddleware, async (c) => {
  const startTime = Date.now();
  
  try {
    // 解析请求体
    const body = await c.req.json();
    const { model, messages, max_tokens = 2000, temperature = 1, stream = false } = body;
    
    // 验证模型
    const modelConfig = Object.values(MODELS).find(m => m.id === model);
    if (!modelConfig) {
      return c.json({ 
        error: `Invalid model: ${model}`,
        available_models: Object.values(MODELS).map(m => m.id)
      }, 400);
    }
    
    // 验证消息
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: 'messages must be a non-empty array' }, 400);
    }
    
    // 转发到 GMI Cloud API
    const gmiResponse = await fetch(`${c.env.GMI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.GMI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature,
        stream,
      }),
    });
    
    // 处理流式响应
    if (stream) {
      return new Response(gmiResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // 处理普通响应
    const data = await gmiResponse.json();
    
    // 添加自定义头部
    c.header('X-Model-Id', model);
    c.header('X-Model-Context', modelConfig.context.toString());
    c.header('X-Response-Time', (Date.now() - startTime).toString());
    
    return c.json(data);
    
  } catch (error: any) {
    console.error('Chat completion error:', error);
    return c.json({ 
      error: error.message || 'Internal server error'
    }, 500);
  }
});

// 404 处理
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    paths: {
      models: '/v1/models',
      chat: '/v1/chat/completions',
      health: '/health',
    }
  }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message,
  }, 500);
});

export default app;
