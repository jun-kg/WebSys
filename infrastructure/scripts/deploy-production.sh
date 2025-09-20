#!/bin/bash

echo "==================================="
echo "🚀 本番環境デプロイ"
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
trap 'echo -e "${RED}❌ 本番デプロイ中にエラーが発生しました${NC}"; exit 1' ERR

echo -e "${RED}⚠️  本番環境デプロイを開始します${NC}"
echo -e "${YELLOW}この操作は本番サービスに影響します${NC}"
read -p "続行しますか？ (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "本番デプロイを中止しました"
    exit 1
fi

# 管理者確認
echo -e "${BLUE}管理者確認が必要です${NC}"
read -p "管理者パスワードを入力してください: " -s ADMIN_PASSWORD
echo

# 簡易パスワード確認（実際は適切な認証システムを使用）
if [ "$ADMIN_PASSWORD" != "deploy2024!" ]; then
    echo -e "${RED}❌ 認証に失敗しました${NC}"
    exit 1
fi

# 本番環境設定確認
if [ ! -f "environments/production/.env" ]; then
    echo -e "${RED}❌ 本番環境設定が存在しません${NC}"
    echo "environments/production/.env を作成してください"
    exit 1
fi

echo -e "${BLUE}🔍 本番デプロイ前チェック...${NC}"

# Git状態確認
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ コミットされていない変更があります${NC}"
    echo "すべての変更をコミットしてから再実行してください"
    exit 1
fi

# 現在のブランチ確認
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}⚠️  現在のブランチ: $CURRENT_BRANCH${NC}"
    read -p "mainブランチ以外からデプロイしますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "デプロイを中止しました"
        exit 1
    fi
fi

# タグ作成
VERSION=$(date +"%Y%m%d-%H%M%S")
git tag -a "v$VERSION" -m "Production deployment $VERSION"
echo -e "${GREEN}✅ デプロイタグ作成: v$VERSION${NC}"

echo -e "${BLUE}💾 本番バックアップ作成...${NC}"

# 既存データベースバックアップ
if docker ps | grep -q websys_postgres_prod; then
    echo -e "${BLUE}📊 データベースバックアップ中...${NC}"
    docker exec websys_postgres_prod pg_dump -U admin -d websys_db_prod > "backup_pre_deploy_$VERSION.sql"
    echo -e "${GREEN}✅ バックアップ完了: backup_pre_deploy_$VERSION.sql${NC}"
fi

echo -e "${BLUE}📦 本番アプリケーションビルド...${NC}"

# ワークスペースでビルド
cd workspace

# フロントエンド本番ビルド
echo -e "${BLUE}🎨 フロントエンド本番ビルド中...${NC}"
cd frontend
npm ci --production
NODE_ENV=production npm run build
cd ..

# バックエンド本番ビルド
echo -e "${BLUE}⚙️  バックエンド本番ビルド中...${NC}"
cd backend
npm ci --production
NODE_ENV=production npm run build
cd ..

cd ..

echo -e "${BLUE}🐳 本番環境デプロイ開始...${NC}"

# Blue-Green デプロイ準備
cd infrastructure/docker/production

# 現在の環境をBlueとして保存
if [ -f "docker-compose.yml" ]; then
    cp docker-compose.yml docker-compose.blue.yml
fi

# Green環境でデプロイ
cp docker-compose.yml docker-compose.green.yml

echo -e "${BLUE}🟢 Green環境起動中...${NC}"
docker-compose -f docker-compose.green.yml --env-file ../../../environments/production/.env up -d --build

echo -e "${BLUE}⏳ Green環境起動待機...${NC}"
sleep 60

# Green環境ヘルスチェック
echo -e "${BLUE}🔍 Green環境ヘルスチェック...${NC}"

GREEN_HEALTHY=true

check_green_service() {
    local service_name=$1
    local url=$2
    local max_attempts=20
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Green $service_name: 正常${NC}"
            return 0
        fi
        echo -n "."
        sleep 5
        ((attempt++))
    done

    echo -e "${RED}❌ Green $service_name: ヘルスチェック失敗${NC}"
    GREEN_HEALTHY=false
    return 1
}

# Green環境の各サービスチェック
check_green_service "Backend API" "http://localhost:8001/health"
check_green_service "Frontend" "http://localhost:3001"

if [ "$GREEN_HEALTHY" = true ]; then
    echo -e "${BLUE}📊 データベースマイグレーション実行...${NC}"
    docker-compose -f docker-compose.green.yml --env-file ../../../environments/production/.env exec -T backend npx prisma migrate deploy

    echo -e "${BLUE}🔄 トラフィック切り替え...${NC}"

    # ロードバランサー設定更新（実際の環境では適切な方法を使用）
    # ここではシンボリックリンクで切り替えをシミュレート
    if [ -f "docker-compose.blue.yml" ]; then
        echo -e "${YELLOW}⚠️  Blue環境停止中...${NC}"
        docker-compose -f docker-compose.blue.yml down
    fi

    # Green環境をアクティブにする
    cp docker-compose.green.yml docker-compose.yml

    echo ""
    echo "==================================="
    echo -e "${GREEN}🎉 本番環境デプロイ完了！${NC}"
    echo "==================================="
    echo ""
    echo -e "${BLUE}📊 デプロイ情報:${NC}"
    echo "  バージョン: v$VERSION"
    echo "  デプロイ時刻: $(date)"
    echo "  バックアップ: backup_pre_deploy_$VERSION.sql"
    echo ""
    echo -e "${BLUE}🌐 本番URL:${NC}"
    echo "  Frontend: https://websys.company.com"
    echo "  Backend API: https://api.websys.company.com"
    echo ""
    echo -e "${BLUE}📝 デプロイ後タスク:${NC}"
    echo "  1. 本番動作確認"
    echo "  2. 監視ダッシュボード確認"
    echo "  3. ログ監視"
    echo "  4. パフォーマンス確認"
    echo ""
    echo -e "${YELLOW}⚠️  ロールバック方法:${NC}"
    echo "  docker-compose -f docker-compose.blue.yml up -d"

else
    echo -e "${RED}❌ Green環境のヘルスチェックに失敗しました${NC}"
    echo -e "${YELLOW}🔄 ロールバック実行中...${NC}"

    # Green環境停止
    docker-compose -f docker-compose.green.yml down

    # Blue環境復旧（存在する場合）
    if [ -f "docker-compose.blue.yml" ]; then
        docker-compose -f docker-compose.blue.yml up -d
        echo -e "${GREEN}✅ Blue環境に復旧しました${NC}"
    fi

    echo -e "${RED}❌ 本番デプロイに失敗しました${NC}"
    echo "ログを確認してください:"
    echo "docker-compose -f docker-compose.green.yml logs"
    exit 1
fi