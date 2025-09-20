#!/bin/bash

echo "==================================="
echo "ワークスペース初期化"
echo "==================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")/../.."

# Check if workspace already exists
if [ -d "workspace" ]; then
    echo -e "${YELLOW}⚠️  workspace ディレクトリが既に存在します${NC}"
    read -p "既存のソースコードを削除してテンプレートから再作成しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "初期化をスキップしました"
        exit 0
    fi
    echo "既存のworkspaceを削除しています..."
    rm -rf workspace
fi

echo -e "${BLUE}📁 workspace ディレクトリを作成しています...${NC}"
mkdir -p workspace

# Copy templates to workspace
echo -e "${BLUE}📋 テンプレートからソースコードをコピーしています...${NC}"

# Frontend
if [ -d "templates/frontend-vue" ]; then
    cp -r templates/frontend-vue workspace/frontend
    echo -e "${GREEN}✅ フロントエンドのテンプレートをコピーしました${NC}"
elif [ -d "templates/frontend" ]; then
    cp -r templates/frontend workspace/
    echo -e "${GREEN}✅ フロントエンドのテンプレートをコピーしました${NC}"
else
    echo -e "${RED}❌ フロントエンドのテンプレートが見つかりません${NC}"
    exit 1
fi

# Backend
if [ -d "templates/backend-express" ]; then
    cp -r templates/backend-express workspace/backend
    echo -e "${GREEN}✅ バックエンドのテンプレートをコピーしました${NC}"
elif [ -d "templates/backend" ]; then
    cp -r templates/backend workspace/
    echo -e "${GREEN}✅ バックエンドのテンプレートをコピーしました${NC}"
else
    echo -e "${RED}❌ バックエンドのテンプレートが見つかりません${NC}"
    exit 1
fi

# Initialize git in workspace if needed
if [ ! -d "workspace/.git" ]; then
    echo -e "${BLUE}🔧 workspace内にGitリポジトリを初期化しています...${NC}"
    cd workspace
    git init --initial-branch=main

    # Create .gitignore for workspace
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables
.env
.env.local
.env.*.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS files
.DS_Store
Thumbs.db

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Build outputs
dist/
build/
*.tsbuildinfo

# Testing
coverage/
.nyc_output

# Temporary files
*.tmp
*.temp
.cache/

# TypeScript
*.tsbuildinfo
frontend/src/auto-imports.d.ts
frontend/src/components.d.ts

# Prisma
backend/prisma/*.db
backend/prisma/*.db-journal
backend/prisma/migrations/
EOF

    echo -e "${GREEN}✅ workspace内にGitリポジトリを初期化しました${NC}"
    cd ..
fi

echo ""
echo "==================================="
echo -e "${GREEN}🎉 ワークスペース初期化完了！${NC}"
echo "==================================="
echo ""
echo -e "${BLUE}📁 作成されたディレクトリ:${NC}"
echo "  workspace/              # 開発用ソースコード"
echo "  ├── frontend/          # Vue.js + Element Plus"
echo "  └── backend/           # Express + Prisma"
echo ""
echo -e "${BLUE}次のステップ:${NC}"
echo "  1. 開発環境起動: ./infrastructure/scripts/setup-dev.sh"
echo "  2. コーディング開始: cd workspace/"
echo ""