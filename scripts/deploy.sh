#!/bin/bash
# ============================================
# WAYFIND MVP - DEPLOYMENT SCRIPT
# Deploys API and Web to Railway
# ============================================

set -e

echo "🚀 Wayfind MVP Deployment"
echo "========================="

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install with: npm install -g @railway/cli"
    exit 1
fi

# Check arguments
ENVIRONMENT=${1:-"staging"}
echo "📦 Deploying to: $ENVIRONMENT"

# Build shared package
echo ""
echo "📦 Building shared package..."
cd packages/shared
pnpm build
cd ../..

# Build API
echo ""
echo "🔧 Building API..."
cd packages/api
pnpm build

# Deploy API to Railway
echo ""
echo "🚂 Deploying API to Railway..."
railway up --service api-$ENVIRONMENT
cd ../..

# Build Web
echo ""
echo "🔧 Building Web..."
cd packages/web
pnpm build

# Deploy Web to Railway
echo ""
echo "🚂 Deploying Web to Railway..."
railway up --service web-$ENVIRONMENT
cd ../..

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run database migrations: railway run -s api-$ENVIRONMENT -- pnpm prisma migrate deploy"
echo "   2. Seed demo data: railway run -s api-$ENVIRONMENT -- pnpm seed"
echo "   3. Verify health: curl https://api-$ENVIRONMENT.wayfind.xyz/health"
