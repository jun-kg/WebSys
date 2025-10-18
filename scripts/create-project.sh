#!/bin/bash

##############################################################################
# create-project.sh
#
# 目的: templates/ から新規企業プロジェクトを作成
#
# 実行方法:
#   ./scripts/create-project.sh <project-name>
#   例: ./scripts/create-project.sh company-a-project
#
# 処理内容:
#   1. templates/ を指定ディレクトリにコピー
#   2. プロジェクト名で package.json, docker-compose.yml をカスタマイズ
#   3. Git初期化
#   4. 環境ファイル(.env)作成
#   5. 依存関係インストール（オプション）
##############################################################################

set -e  # エラー時に即座終了

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 使用方法表示
usage() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  企業プロジェクト作成スクリプト${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 <project-name> [options]"
    echo ""
    echo "引数:"
    echo "  project-name    プロジェクト名（例: company-a-project）"
    echo ""
    echo "オプション:"
    echo "  --no-git        Git初期化をスキップ"
    echo "  --no-install    npm installをスキップ"
    echo "  --target-dir    作成先ディレクトリ（デフォルト: ../）"
    echo ""
    echo "例:"
    echo "  $0 company-a-project"
    echo "  $0 company-b-project --no-install"
    echo "  $0 my-project --target-dir /path/to/projects"
    echo ""
    exit 1
}

# 引数チェック
if [ $# -lt 1 ]; then
    usage
fi

PROJECT_NAME=$1
shift

# オプション解析
SKIP_GIT=false
SKIP_INSTALL=false
TARGET_DIR_BASE="../"

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-git)
            SKIP_GIT=true
            shift
            ;;
        --no-install)
            SKIP_INSTALL=true
            shift
            ;;
        --target-dir)
            TARGET_DIR_BASE="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}エラー:${NC} 不明なオプション: $1"
            usage
            ;;
    esac
done

# ディレクトリパス設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES_DIR="$ROOT_DIR/templates"
TARGET_DIR="$(cd "$TARGET_DIR_BASE" && pwd)/$PROJECT_NAME"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  企業プロジェクト作成: ${YELLOW}$PROJECT_NAME${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}[INFO]${NC} プロジェクト名: $PROJECT_NAME"
echo -e "${GREEN}[INFO]${NC} 作成先: $TARGET_DIR"
echo -e "${GREEN}[INFO]${NC} テンプレート: $TEMPLATES_DIR"
echo ""

# 既存チェック
if [ -d "$TARGET_DIR" ]; then
    echo -e "${RED}[エラー]${NC} ディレクトリが既に存在します: $TARGET_DIR"
    echo -e "${YELLOW}上書きしますか？ (y/N): ${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}[中止]${NC} プロジェクト作成をキャンセルしました"
        exit 0
    fi
    echo -e "${YELLOW}[警告]${NC} 既存ディレクトリを削除します..."
    rm -rf "$TARGET_DIR"
fi

##############################################################################
# 1. ディレクトリ構造作成
##############################################################################

echo -e "${BLUE}[1/7]${NC} ディレクトリ構造作成中..."

mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/backend"
mkdir -p "$TARGET_DIR/frontend"
mkdir -p "$TARGET_DIR/infrastructure/docker/development"
mkdir -p "$TARGET_DIR/docs"

echo -e "${GREEN}  ✓${NC} ディレクトリ作成完了"
echo ""

##############################################################################
# 2. Backend コピー
##############################################################################

echo -e "${BLUE}[2/7]${NC} Backend テンプレートコピー中..."

if [ ! -d "$TEMPLATES_DIR/backend-express" ]; then
    echo -e "${RED}[エラー]${NC} テンプレートが見つかりません: $TEMPLATES_DIR/backend-express"
    echo -e "${YELLOW}[ヒント]${NC} 先に ./scripts/build-templates.sh を実行してください"
    exit 1
fi

cp -r "$TEMPLATES_DIR/backend-express"/* "$TARGET_DIR/backend/"
echo -e "${GREEN}  ✓${NC} Backend コピー完了"
echo ""

##############################################################################
# 3. Frontend コピー
##############################################################################

echo -e "${BLUE}[3/7]${NC} Frontend テンプレートコピー中..."

if [ ! -d "$TEMPLATES_DIR/frontend-vue" ]; then
    echo -e "${RED}[エラー]${NC} テンプレートが見つかりません: $TEMPLATES_DIR/frontend-vue"
    exit 1
fi

cp -r "$TEMPLATES_DIR/frontend-vue"/* "$TARGET_DIR/frontend/"
echo -e "${GREEN}  ✓${NC} Frontend コピー完了"
echo ""

##############################################################################
# 4. package.json カスタマイズ
##############################################################################

echo -e "${BLUE}[4/7]${NC} package.json カスタマイズ中..."

# Backend package.json
if [ -f "$TARGET_DIR/backend/package.json" ]; then
    sed -i "s/\"name\": \".*\"/\"name\": \"$PROJECT_NAME-backend\"/" "$TARGET_DIR/backend/package.json"
    echo -e "${GREEN}  ✓${NC} Backend package.json 更新完了"
fi

# Frontend package.json
if [ -f "$TARGET_DIR/frontend/package.json" ]; then
    sed -i "s/\"name\": \".*\"/\"name\": \"$PROJECT_NAME-frontend\"/" "$TARGET_DIR/frontend/package.json"
    echo -e "${GREEN}  ✓${NC} Frontend package.json 更新完了"
fi

echo ""

##############################################################################
# 5. Docker Compose 設定
##############################################################################

echo -e "${BLUE}[5/7]${NC} Docker Compose 設定作成中..."

cat > "$TARGET_DIR/infrastructure/docker/development/docker-compose.yml" <<EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: ${PROJECT_NAME}_postgres_dev
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${PROJECT_NAME}_dev
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ../../../backend
      dockerfile: Dockerfile.dev
    container_name: ${PROJECT_NAME}_backend_dev
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/${PROJECT_NAME}_dev
      - PORT=8000
      - JWT_SECRET=your-secret-key-change-in-production
      - FRONTEND_URL=http://localhost:3000
    ports:
      - "8000:8000"
    volumes:
      - ../../../backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ../../../frontend
      dockerfile: Dockerfile.dev
    container_name: ${PROJECT_NAME}_frontend_dev
    environment:
      - NODE_ENV=development
      - VITE_API_BASE_URL=http://backend:8000
    ports:
      - "3000:3000"
    volumes:
      - ../../../frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
EOF

echo -e "${GREEN}  ✓${NC} docker-compose.yml 作成完了"
echo ""

##############################################################################
# 6. 環境変数ファイル作成
##############################################################################

echo -e "${BLUE}[6/7]${NC} 環境変数ファイル作成中..."

# Backend .env
cat > "$TARGET_DIR/backend/.env" <<EOF
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/${PROJECT_NAME}_dev

# Server
PORT=8000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-change-in-production-$(openssl rand -hex 16)
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
EOF

echo -e "${GREEN}  ✓${NC} Backend .env 作成完了"

# Frontend .env
cat > "$TARGET_DIR/frontend/.env" <<EOF
# API
VITE_API_BASE_URL=http://localhost:8000

# Environment
VITE_APP_ENV=development
EOF

echo -e "${GREEN}  ✓${NC} Frontend .env 作成完了"
echo ""

##############################################################################
# 7. Git 初期化
##############################################################################

if [ "$SKIP_GIT" = false ]; then
    echo -e "${BLUE}[7/7]${NC} Git 初期化中..."

    cd "$TARGET_DIR"
    git init

    cat > .gitignore <<'EOF'
# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.sqlite
EOF

    git add .
    git commit -m "chore: initial commit from websys templates

Project: $PROJECT_NAME
Template version: $(cat backend/src/core/VERSION 2>/dev/null || echo 'unknown')

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

    echo -e "${GREEN}  ✓${NC} Git 初期化完了"
    echo ""
else
    echo -e "${YELLOW}[7/7]${NC} Git 初期化をスキップしました"
    echo ""
fi

##############################################################################
# 8. 依存関係インストール（オプション）
##############################################################################

if [ "$SKIP_INSTALL" = false ]; then
    echo -e "${BLUE}[オプション]${NC} 依存関係インストール中..."
    echo -e "${YELLOW}この処理には数分かかる場合があります...${NC}"
    echo ""

    # Backend
    echo -e "${GREEN}  Backend:${NC}"
    cd "$TARGET_DIR/backend"
    npm install
    echo ""

    # Frontend
    echo -e "${GREEN}  Frontend:${NC}"
    cd "$TARGET_DIR/frontend"
    npm install
    echo ""

    echo -e "${GREEN}  ✓${NC} 依存関係インストール完了"
    echo ""
else
    echo -e "${YELLOW}[スキップ]${NC} 依存関係インストールをスキップしました"
    echo -e "${YELLOW}後で手動で実行してください:${NC}"
    echo -e "  cd $TARGET_DIR/backend && npm install"
    echo -e "  cd $TARGET_DIR/frontend && npm install"
    echo ""
fi

##############################################################################
# 完了メッセージ
##############################################################################

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ プロジェクト作成完了: ${YELLOW}$PROJECT_NAME${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📁 プロジェクトディレクトリ:"
echo -e "   ${BLUE}$TARGET_DIR${NC}"
echo ""
echo -e "📋 次のステップ:"
echo ""
echo -e "  1️⃣  プロジェクトディレクトリに移動"
echo -e "     ${YELLOW}cd $TARGET_DIR${NC}"
echo ""
echo -e "  2️⃣  Docker環境起動"
echo -e "     ${YELLOW}cd infrastructure/docker/development${NC}"
echo -e "     ${YELLOW}docker compose up -d${NC}"
echo ""
echo -e "  3️⃣  データベースマイグレーション"
echo -e "     ${YELLOW}docker compose exec backend npx prisma migrate dev${NC}"
echo ""
echo -e "  4️⃣  アクセス確認"
echo -e "     Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "     Backend:  ${BLUE}http://localhost:8000${NC}"
echo ""
echo -e "📚 ディレクトリ構造:"
echo -e "   backend/"
echo -e "   ├── src/"
echo -e "   │   ├── ${GREEN}core/${NC}        ← 共通コア（変更禁止）"
echo -e "   │   ├── ${YELLOW}extensions/${NC} ← 拡張機能"
echo -e "   │   └── ${BLUE}custom/${NC}     ← 企業固有機能（ここに実装）"
echo -e "   frontend/"
echo -e "   ├── src/"
echo -e "   │   ├── ${GREEN}core/${NC}        ← 共通コア（変更禁止）"
echo -e "   │   ├── ${YELLOW}extensions/${NC} ← 拡張機能"
echo -e "   │   └── ${BLUE}custom/${NC}     ← 企業固有機能（ここに実装）"
echo ""
echo -e "${YELLOW}重要な原則:${NC}"
echo -e "  ✅ ${GREEN}core/${NC} は変更禁止（共通ライブラリ更新で上書き）"
echo -e "  ✅ 企業固有機能は ${BLUE}custom/${NC} に実装"
echo -e "  ✅ 共通機能の拡張は ${YELLOW}extensions/${NC} に実装"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
