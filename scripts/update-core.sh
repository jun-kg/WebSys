#!/bin/bash

##############################################################################
# update-core.sh
#
# 目的: 企業プロジェクトの core/ を最新の templates/ に更新
#
# 実行方法:
#   cd /path/to/company-project
#   /path/to/enterprise-commons/scripts/update-core.sh
#
#   または:
#   /path/to/enterprise-commons/scripts/update-core.sh /path/to/company-project
#
# 処理内容:
#   1. enterprise-commons リポジトリから最新テンプレート取得
#   2. backend/src/core を更新
#   3. frontend/src/core を更新
#   4. バージョン情報表示
#   5. 変更内容確認（git diff）
##############################################################################

set -e  # エラー時に即座終了

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# スクリプトディレクトリ
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBSYS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 企業プロジェクトディレクトリ
if [ $# -eq 1 ]; then
    PROJECT_DIR="$(cd "$1" && pwd)"
else
    PROJECT_DIR="$(pwd)"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  共通ライブラリ更新スクリプト${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}[INFO]${NC} Enterprise Commonsディレクトリ: $WEBSYS_DIR"
echo -e "${GREEN}[INFO]${NC} プロジェクトディレクトリ: $PROJECT_DIR"
echo ""

##############################################################################
# 1. 事前チェック
##############################################################################

echo -e "${BLUE}[1/6]${NC} 事前チェック中..."

# Enterprise Commonsディレクトリチェック
if [ ! -d "$WEBSYS_DIR/templates" ]; then
    echo -e "${RED}[エラー]${NC} Enterprise Commonsリポジトリが見つかりません: $WEBSYS_DIR"
    echo -e "${YELLOW}[ヒント]${NC} スクリプトはEnterprise Commonsリポジトリの scripts/ 内に配置してください"
    exit 1
fi

# 企業プロジェクトディレクトリチェック
if [ ! -d "$PROJECT_DIR/backend/src/core" ] || [ ! -d "$PROJECT_DIR/frontend/src/core" ]; then
    echo -e "${RED}[エラー]${NC} 企業プロジェクトディレクトリが正しくありません: $PROJECT_DIR"
    echo -e "${YELLOW}[ヒント]${NC} backend/src/core と frontend/src/core が必要です"
    exit 1
fi

# Gitリポジトリチェック
if [ ! -d "$PROJECT_DIR/.git" ]; then
    echo -e "${YELLOW}[警告]${NC} Gitリポジトリが見つかりません"
    echo -e "${YELLOW}続行しますか？ (y/N): ${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}[中止]${NC} 更新をキャンセルしました"
        exit 0
    fi
fi

echo -e "${GREEN}  ✓${NC} 事前チェック完了"
echo ""

##############################################################################
# 2. 現在のバージョン確認
##############################################################################

echo -e "${BLUE}[2/6]${NC} 現在のバージョン確認中..."

CURRENT_BACKEND_VERSION="unknown"
CURRENT_FRONTEND_VERSION="unknown"

if [ -f "$PROJECT_DIR/backend/src/core/VERSION" ]; then
    CURRENT_BACKEND_VERSION=$(head -n 1 "$PROJECT_DIR/backend/src/core/VERSION" | cut -d' ' -f2)
fi

if [ -f "$PROJECT_DIR/frontend/src/core/VERSION" ]; then
    CURRENT_FRONTEND_VERSION=$(head -n 1 "$PROJECT_DIR/frontend/src/core/VERSION" | cut -d' ' -f2)
fi

echo -e "${GREEN}  現在のバージョン:${NC}"
echo -e "    Backend:  ${YELLOW}$CURRENT_BACKEND_VERSION${NC}"
echo -e "    Frontend: ${YELLOW}$CURRENT_FRONTEND_VERSION${NC}"
echo ""

##############################################################################
# 3. Enterprise Commons最新版取得
##############################################################################

echo -e "${BLUE}[3/6]${NC} Enterprise Commons最新版取得中..."

cd "$WEBSYS_DIR"

# Gitステータス確認
if [ -d ".git" ]; then
    # 未コミット変更チェック
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}[警告]${NC} Enterprise Commonsリポジトリに未コミット変更があります"
        echo -e "${YELLOW}続行しますか？ (y/N): ${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}[中止]${NC} 更新をキャンセルしました"
            exit 0
        fi
    fi

    echo -e "${GREEN}  ✓${NC} git pull 実行中..."
    git pull origin master || {
        echo -e "${YELLOW}[警告]${NC} git pull に失敗しました。ローカルのテンプレートを使用します"
    }
else
    echo -e "${YELLOW}[スキップ]${NC} Enterprise CommonsはGitリポジトリではありません"
fi

# 新しいバージョン確認
NEW_BACKEND_VERSION="unknown"
NEW_FRONTEND_VERSION="unknown"

if [ -f "$WEBSYS_DIR/templates/backend-express/src/core/VERSION" ]; then
    NEW_BACKEND_VERSION=$(head -n 1 "$WEBSYS_DIR/templates/backend-express/src/core/VERSION" | cut -d' ' -f2)
fi

if [ -f "$WEBSYS_DIR/templates/frontend-vue/src/core/VERSION" ]; then
    NEW_FRONTEND_VERSION=$(head -n 1 "$WEBSYS_DIR/templates/frontend-vue/src/core/VERSION" | cut -d' ' -f2)
fi

echo -e "${GREEN}  最新バージョン:${NC}"
echo -e "    Backend:  ${MAGENTA}$NEW_BACKEND_VERSION${NC}"
echo -e "    Frontend: ${MAGENTA}$NEW_FRONTEND_VERSION${NC}"
echo ""

# バージョン比較
if [ "$CURRENT_BACKEND_VERSION" = "$NEW_BACKEND_VERSION" ] && [ "$CURRENT_FRONTEND_VERSION" = "$NEW_FRONTEND_VERSION" ]; then
    echo -e "${GREEN}[情報]${NC} 既に最新バージョンです"
    echo -e "${YELLOW}強制更新しますか？ (y/N): ${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}[完了]${NC} 更新をスキップしました"
        exit 0
    fi
fi

##############################################################################
# 4. Backend core/ 更新
##############################################################################

echo -e "${BLUE}[4/6]${NC} Backend core/ 更新中..."

BACKEND_TEMPLATE="$WEBSYS_DIR/templates/backend-express/src/core"
BACKEND_TARGET="$PROJECT_DIR/backend/src/core"

if [ ! -d "$BACKEND_TEMPLATE" ]; then
    echo -e "${RED}[エラー]${NC} テンプレートが見つかりません: $BACKEND_TEMPLATE"
    exit 1
fi

# バックアップ作成
BACKUP_DIR="$PROJECT_DIR/.core-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$BACKEND_TARGET" "$BACKUP_DIR/backend-core"
echo -e "${GREEN}  ✓${NC} バックアップ作成: $BACKUP_DIR/backend-core"

# rsync実行（エラーを無視して続行）
rsync -av --delete "$BACKEND_TEMPLATE/" "$BACKEND_TARGET/" 2>/dev/null || true
BACKEND_FILES=$(find "$BACKEND_TARGET" -type f | wc -l)
echo -e "${GREEN}  ✓${NC} Backend core/ 更新完了 (${BACKEND_FILES}ファイル)"
echo ""

##############################################################################
# 5. Frontend core/ 更新
##############################################################################

echo -e "${BLUE}[5/6]${NC} Frontend core/ 更新中..."

FRONTEND_TEMPLATE="$WEBSYS_DIR/templates/frontend-vue/src/core"
FRONTEND_TARGET="$PROJECT_DIR/frontend/src/core"

if [ ! -d "$FRONTEND_TEMPLATE" ]; then
    echo -e "${RED}[エラー]${NC} テンプレートが見つかりません: $FRONTEND_TEMPLATE"
    exit 1
fi

# バックアップ作成
cp -r "$FRONTEND_TARGET" "$BACKUP_DIR/frontend-core"
echo -e "${GREEN}  ✓${NC} バックアップ作成: $BACKUP_DIR/frontend-core"

# rsync実行（エラーを無視して続行）
rsync -av --delete "$FRONTEND_TEMPLATE/" "$FRONTEND_TARGET/" 2>/dev/null || true
FRONTEND_FILES=$(find "$FRONTEND_TARGET" -type f | wc -l)
echo -e "${GREEN}  ✓${NC} Frontend core/ 更新完了 (${FRONTEND_FILES}ファイル)"
echo ""

##############################################################################
# 6. 変更内容確認
##############################################################################

echo -e "${BLUE}[6/6]${NC} 変更内容確認..."

cd "$PROJECT_DIR"

if [ -d ".git" ]; then
    echo ""
    echo -e "${MAGENTA}━━━ 変更ファイル一覧 ━━━${NC}"
    git status --short backend/src/core frontend/src/core || true
    echo ""

    echo -e "${YELLOW}変更の詳細を確認しますか？ (git diff) (y/N): ${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        git diff backend/src/core frontend/src/core | head -100
        echo ""
        echo -e "${YELLOW}（最初の100行のみ表示）${NC}"
        echo ""
    fi
fi

##############################################################################
# 完了メッセージ
##############################################################################

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ 共通ライブラリ更新完了${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📦 バージョン:"
echo -e "   ${YELLOW}$CURRENT_BACKEND_VERSION${NC} → ${MAGENTA}$NEW_BACKEND_VERSION${NC} (Backend)"
echo -e "   ${YELLOW}$CURRENT_FRONTEND_VERSION${NC} → ${MAGENTA}$NEW_FRONTEND_VERSION${NC} (Frontend)"
echo ""
echo -e "📁 バックアップ:"
echo -e "   ${BLUE}$BACKUP_DIR${NC}"
echo ""
echo -e "📋 次のステップ:"
echo ""
echo -e "  1️⃣  動作確認"
echo -e "     ${YELLOW}cd $PROJECT_DIR${NC}"
echo -e "     ${YELLOW}npm run test${NC}"
echo ""
echo -e "  2️⃣  問題なければコミット"
echo -e "     ${YELLOW}git add backend/src/core frontend/src/core${NC}"
echo -e "     ${YELLOW}git commit -m \"chore: update core libraries to $NEW_BACKEND_VERSION\"${NC}"
echo ""
echo -e "  3️⃣  問題があればロールバック"
echo -e "     ${YELLOW}cp -r $BACKUP_DIR/backend-core/* backend/src/core/${NC}"
echo -e "     ${YELLOW}cp -r $BACKUP_DIR/frontend-core/* frontend/src/core/${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
