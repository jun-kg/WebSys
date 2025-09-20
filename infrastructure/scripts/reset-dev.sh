#!/bin/bash

echo "==================================="
echo "開発環境リセット"
echo "==================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")/../.."

# Confirmation
echo -e "${YELLOW}⚠️  警告: この操作は以下を実行します:${NC}"
echo "  • Dockerコンテナとボリュームの削除"
echo "  • workspaceディレクトリの削除"
echo "  • 環境設定ファイルの削除"
echo ""
read -p "本当に環境をリセットしますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "リセットをキャンセルしました"
    exit 0
fi

# Stop and remove Docker containers
echo -e "${BLUE}🐳 Dockerコンテナを停止・削除しています...${NC}"
cd infrastructure/docker/development
docker compose down -v --remove-orphans 2>/dev/null || true
cd ../../..

# Remove workspace
if [ -d "workspace" ]; then
    echo -e "${BLUE}📁 workspaceディレクトリを削除しています...${NC}"
    rm -rf workspace
    echo -e "${GREEN}✅ workspaceを削除しました${NC}"
fi

# Remove environment files
if [ -d "environments/development" ]; then
    echo -e "${BLUE}🔐 環境設定ファイルを削除しています...${NC}"
    rm -f environments/development/.env
    rm -f environments/development/.env.local
    echo -e "${GREEN}✅ 環境設定を削除しました${NC}"
fi

# Clean Docker system (optional)
echo ""
read -p "Dockerシステムをクリーンアップしますか？（未使用のイメージ等を削除） (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🧹 Dockerシステムをクリーンアップしています...${NC}"
    docker system prune -f
    echo -e "${GREEN}✅ クリーンアップ完了${NC}"
fi

echo ""
echo "==================================="
echo -e "${GREEN}🎉 開発環境リセット完了！${NC}"
echo "==================================="
echo ""
echo -e "${BLUE}次のステップ:${NC}"
echo "  環境を再構築: ./infrastructure/scripts/setup-dev.sh"
echo ""