#!/bin/bash

echo "==================================="
echo "開発環境セットアップ"
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
trap 'echo -e "${RED}❌ セットアップ中にエラーが発生しました${NC}"; exit 1' ERR

# Check prerequisites
echo -e "${BLUE}🔍 前提条件をチェックしています...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Dockerがインストールされていません${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Composeがインストールされていません${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Dockerデーモンが起動していません${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 前提条件OK${NC}"

# Initialize workspace if needed
if [ ! -d "workspace" ]; then
    echo -e "${YELLOW}⚠️  workspaceが存在しません。初期化します...${NC}"
    ./infrastructure/scripts/init-workspace.sh
fi

# Generate environment config
if [ ! -f "environments/development/.env" ]; then
    echo -e "${BLUE}🔐 開発環境設定を生成しています...${NC}"
    ./infrastructure/scripts/generate-env.sh development
fi

# Check port conflicts
echo -e "${BLUE}🔍 ポート使用状況をチェックしています...${NC}"
for port in 3000 8000 5432; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  ポート $port が使用中です${NC}"
        read -p "続行しますか？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "セットアップを中止しました"
            exit 1
        fi
    fi
done

# Start services
echo -e "${BLUE}🐳 開発環境を起動しています...${NC}"
cd infrastructure/docker/development
docker-compose --env-file ../../../environments/development/.env down --remove-orphans
docker-compose --env-file ../../../environments/development/.env up -d --build

# Health checks
echo -e "${BLUE}⏳ サービスの起動を待っています...${NC}"
sleep 15

# Check services
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo -n "${service_name}の起動を確認中"
    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 3 "$url" > /dev/null 2>&1; then
            echo -e "\n${GREEN}✅ $service_name: 正常${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done

    echo -e "\n${RED}❌ $service_name: タイムアウト${NC}"
    return 1
}

# Check PostgreSQL
if docker-compose --env-file ../../../environments/development/.env exec -T postgres pg_isready -U admin > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL: 正常${NC}"
else
    echo -e "${RED}❌ PostgreSQL: 起動失敗${NC}"
fi

# Check services
check_service "Backend API" "http://localhost:8000/health"
check_service "Frontend" "http://localhost:3000"

# Run migrations
echo -e "${BLUE}📊 データベースマイグレーションを実行しています...${NC}"
docker-compose --env-file ../../../environments/development/.env exec backend npx prisma migrate dev --name init || echo -e "${YELLOW}⚠️  マイグレーションは後で実行してください${NC}"

echo ""
echo "==================================="
echo -e "${GREEN}🎉 開発環境セットアップ完了！${NC}"
echo "==================================="
echo ""
echo -e "${BLUE}🌐 アクセスURL:${NC}"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  PostgreSQL: localhost:5432"
echo ""
echo -e "${BLUE}📁 開発ディレクトリ:${NC}"
echo "  workspace/                    # 👈 ここでコーディング"
echo ""
echo -e "${BLUE}📝 よく使うコマンド:${NC}"
echo "  停止: cd infrastructure/docker/development && docker-compose down"
echo "  ログ: cd infrastructure/docker/development && docker-compose logs -f [service]"
echo "  リセット: ./infrastructure/scripts/reset-dev.sh"
echo ""