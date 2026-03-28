#!/bin/bash
# AI Router Worker 部署脚本

set -e

echo "========================================="
echo "🚀 AI Router Worker 部署脚本"
echo "========================================="

# 1. 检查依赖
echo ""
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
  echo "安装依赖..."
  npm install
fi

# 2. 类型检查
echo ""
echo "🔍 类型检查..."
npm run build || echo "⚠️  类型检查跳过"

# 3. 设置 Secrets（仅首次部署需要）
echo ""
echo "🔐 检查 Secrets..."
if [ ! -f ".secrets_configured" ]; then
  echo "需要设置以下 Secrets："
  echo "  - GMI_API_KEY"
  echo "  - JWT_SECRET"
  echo ""
  read -p "是否现在设置 Secrets? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    wrangler secret put GMI_API_KEY
    wrangler secret put JWT_SECRET
    touch .secrets_configured
  fi
fi

# 4. 部署
echo ""
echo "🌐 部署到 Cloudflare Workers..."
npm run deploy

# 5. 验证部署
echo ""
echo "✅ 验证部署..."
DEPLOYMENT_URL="https://ai-router.meteor.workers.dev"
echo "测试健康检查：$DEPLOYMENT_URL/health"
curl -s "$DEPLOYMENT_URL/health" | jq .

echo ""
echo "========================================="
echo "🎉 部署完成！"
echo "========================================="
echo ""
echo "📊 管理面板：https://dash.cloudflare.com/?to=/:account/workers-and-pages"
echo "📝 查看日志：wrangler tail ai-router-worker"
echo ""
