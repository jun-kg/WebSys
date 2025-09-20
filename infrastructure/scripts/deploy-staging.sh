#!/bin/bash

echo "==================================="
echo "ステージング環境デプロイ"
echo "==================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")/../.."

# Error handling
set -e
trap 'echo -e "${RED}❌ デプロイ中にエラーが発生しました${NC}"; exit 1' ERR

# 環境変数チェック
if [ ! -f "environments/staging/.env" ]; then
    echo -e "${YELLOW}⚠️  ステージング環境設定が存在しません${NC}"
    ./infrastructure/scripts/generate-env.sh staging
fi

echo -e "${BLUE}🔍 デプロイ前チェック...${NC}"

# Git状態確認
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  コミットされていない変更があります${NC}"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "デプロイを中止しました"
        exit 1
    fi
fi

# Workspaceの確認
if [ ! -d "workspace" ]; then
    echo -e "${RED}❌ workspace ディレクトリが存在しません${NC}"
    exit 1
fi

echo -e "${BLUE}📦 アプリケーションビルド...${NC}"

# ワークスペースに移動してビルド
cd workspace

# フロントエンドビルド
echo -e "${BLUE}🎨 フロントエンドビルド中...${NC}"
cd frontend
npm ci
npm run build
cd ..

# バックエンドビルド
echo -e "${BLUE}⚙️  バックエンドビルド中...${NC}"
cd backend
npm ci
npm run build
cd ..

cd ..

echo -e "${BLUE}🐳 ステージング環境デプロイ...${NC}"

# ステージング環境起動
cd infrastructure/docker/staging
docker compose --env-file ../../../environments/staging/.env down
docker compose --env-file ../../../environments/staging/.env up -d --build

echo -e "${BLUE}⏳ サービス起動待機...${NC}"
sleep 30

# データベースマイグレーション
echo -e "${BLUE}📊 データベースマイグレーション実行...${NC}"
docker compose --env-file ../../../environments/staging/.env exec -T backend npx prisma migrate deploy

# シード実行（初回のみ）
read -p "データベースシードを実行しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker compose --env-file ../../../environments/staging/.env exec -T backend npm run prisma:seed
fi

echo -e "${BLUE}🔍 ヘルスチェック実行...${NC}"

# ヘルスチェック
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name: 正常${NC}"
            return 0
        fi
        echo -n "."
        sleep 3
        ((attempt++))
    done

    echo -e "${RED}❌ $service_name: ヘルスチェック失敗${NC}"
    return 1
}

# サービス確認
if check_service "Backend API" "http://localhost:8000/health" && \
   check_service "Frontend" "http://localhost:3000"; then
    echo ""
    echo "==================================="
    echo -e "${GREEN}🎉 ステージング環境デプロイ完了！${NC}"
    echo "==================================="
    echo ""
    echo -e "${BLUE}🌐 アクセスURL:${NC}"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo ""
    echo -e "${BLUE}📝 次のステップ:${NC}"
    echo "  1. 機能テスト実行"
    echo "  2. パフォーマンステスト"
    echo "  3. セキュリティチェック"
    echo "  4. 本番デプロイ承認"
else
    echo -e "${RED}❌ デプロイに失敗しました${NC}"
    echo "ログを確認してください:"
    echo "docker compose logs -f"
    exit 1
fi