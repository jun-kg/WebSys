#!/bin/bash
# templates/workspace 同期チェッカー
# 共通ライブラリ（templates）の更新が workspace に反映されているかチェック

echo "🔍 templates/workspace 同期チェック..."
echo ""

ERRORS=0
WARNINGS=0

# 色定義
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# チェック対象ディレクトリ
TEMPLATE_CORE_FRONTEND="templates/frontend/src/core"
WORKSPACE_CORE_FRONTEND="workspace/frontend/src/core"
TEMPLATE_CORE_BACKEND="templates/backend/src/core"
WORKSPACE_CORE_BACKEND="workspace/backend/src/core"

# フロントエンド共通コアチェック
echo "=== フロントエンド共通コア同期チェック ==="

if [ ! -d "$TEMPLATE_CORE_FRONTEND" ]; then
  echo -e "${YELLOW}⚠️  警告: $TEMPLATE_CORE_FRONTEND が存在しません${NC}"
  WARNINGS=$((WARNINGS + 1))
elif [ ! -d "$WORKSPACE_CORE_FRONTEND" ]; then
  echo -e "${RED}❌ エラー: $WORKSPACE_CORE_FRONTEND が存在しません${NC}"
  echo "   実行: cp -r $TEMPLATE_CORE_FRONTEND $WORKSPACE_CORE_FRONTEND"
  ERRORS=$((ERRORS + 1))
else
  # ファイル数比較
  TEMPLATE_COUNT=$(find "$TEMPLATE_CORE_FRONTEND" -type f | wc -l)
  WORKSPACE_COUNT=$(find "$WORKSPACE_CORE_FRONTEND" -type f | wc -l)

  if [ "$TEMPLATE_COUNT" -ne "$WORKSPACE_COUNT" ]; then
    echo -e "${YELLOW}⚠️  警告: ファイル数が一致しません${NC}"
    echo "   templates: $TEMPLATE_COUNT ファイル"
    echo "   workspace: $WORKSPACE_COUNT ファイル"
    WARNINGS=$((WARNINGS + 1))
  fi

  # 主要ファイルの存在チェック
  CORE_FILES=(
    "utils/auth.ts"
    "utils/request.ts"
    "api/index.ts"
    "composables/useLogService.ts"
  )

  for file in "${CORE_FILES[@]}"; do
    if [ -f "$TEMPLATE_CORE_FRONTEND/$file" ] && [ ! -f "$WORKSPACE_CORE_FRONTEND/$file" ]; then
      echo -e "${RED}❌ エラー: $file が workspace に存在しません${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  done

  # ハッシュ比較（主要ファイル）
  for file in "${CORE_FILES[@]}"; do
    if [ -f "$TEMPLATE_CORE_FRONTEND/$file" ] && [ -f "$WORKSPACE_CORE_FRONTEND/$file" ]; then
      TEMPLATE_HASH=$(md5sum "$TEMPLATE_CORE_FRONTEND/$file" | awk '{print $1}')
      WORKSPACE_HASH=$(md5sum "$WORKSPACE_CORE_FRONTEND/$file" | awk '{print $1}')

      if [ "$TEMPLATE_HASH" != "$WORKSPACE_HASH" ]; then
        echo -e "${YELLOW}⚠️  警告: $file の内容が異なります（カスタマイズされている可能性あり）${NC}"
        WARNINGS=$((WARNINGS + 1))
      fi
    fi
  done
fi

echo ""

# バックエンド共通コアチェック
echo "=== バックエンド共通コア同期チェック ==="

if [ ! -d "$TEMPLATE_CORE_BACKEND" ]; then
  echo -e "${YELLOW}⚠️  警告: $TEMPLATE_CORE_BACKEND が存在しません${NC}"
  WARNINGS=$((WARNINGS + 1))
elif [ ! -d "$WORKSPACE_CORE_BACKEND" ]; then
  echo -e "${RED}❌ エラー: $WORKSPACE_CORE_BACKEND が存在しません${NC}"
  echo "   実行: cp -r $TEMPLATE_CORE_BACKEND $WORKSPACE_CORE_BACKEND"
  ERRORS=$((ERRORS + 1))
else
  # ファイル数比較
  TEMPLATE_COUNT=$(find "$TEMPLATE_CORE_BACKEND" -type f | wc -l)
  WORKSPACE_COUNT=$(find "$WORKSPACE_CORE_BACKEND" -type f | wc -l)

  if [ "$TEMPLATE_COUNT" -ne "$WORKSPACE_COUNT" ]; then
    echo -e "${YELLOW}⚠️  警告: ファイル数が一致しません${NC}"
    echo "   templates: $TEMPLATE_COUNT ファイル"
    echo "   workspace: $WORKSPACE_COUNT ファイル"
    WARNINGS=$((WARNINGS + 1))
  fi

  # 主要ファイルの存在チェック
  CORE_FILES=(
    "lib/prisma.ts"
    "middleware/auth.ts"
    "controllers/LogController.ts"
  )

  for file in "${CORE_FILES[@]}"; do
    if [ -f "$TEMPLATE_CORE_BACKEND/$file" ] && [ ! -f "$WORKSPACE_CORE_BACKEND/$file" ]; then
      echo -e "${RED}❌ エラー: $file が workspace に存在しません${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  done

  # ハッシュ比較（主要ファイル）
  for file in "${CORE_FILES[@]}"; do
    if [ -f "$TEMPLATE_CORE_BACKEND/$file" ] && [ -f "$WORKSPACE_CORE_BACKEND/$file" ]; then
      TEMPLATE_HASH=$(md5sum "$TEMPLATE_CORE_BACKEND/$file" | awk '{print $1}')
      WORKSPACE_HASH=$(md5sum "$WORKSPACE_CORE_BACKEND/$file" | awk '{print $1}')

      if [ "$TEMPLATE_HASH" != "$WORKSPACE_HASH" ]; then
        echo -e "${YELLOW}⚠️  警告: $file の内容が異なります（カスタマイズされている可能性あり）${NC}"
        WARNINGS=$((WARNINGS + 1))
      fi
    fi
  done
fi

echo ""

# package.json バージョンチェック
echo "=== package.json バージョン同期チェック ==="

check_package_version() {
  local template_pkg=$1
  local workspace_pkg=$2
  local pkg_name=$3

  if [ -f "$template_pkg" ] && [ -f "$workspace_pkg" ]; then
    TEMPLATE_VERSION=$(grep '"version"' "$template_pkg" | head -1 | awk -F'"' '{print $4}')
    WORKSPACE_VERSION=$(grep '"version"' "$workspace_pkg" | head -1 | awk -F'"' '{print $4}')

    if [ "$TEMPLATE_VERSION" != "$WORKSPACE_VERSION" ]; then
      echo -e "${YELLOW}⚠️  警告: $pkg_name のバージョンが異なります${NC}"
      echo "   templates: $TEMPLATE_VERSION"
      echo "   workspace: $WORKSPACE_VERSION"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
}

check_package_version "templates/frontend/package.json" "workspace/frontend/package.json" "frontend"
check_package_version "templates/backend/package.json" "workspace/backend/package.json" "backend"

echo ""

# Prismaスキーマ同期チェック
echo "=== Prismaスキーマ同期チェック ==="

TEMPLATE_SCHEMA="templates/backend/prisma/schema.prisma"
WORKSPACE_SCHEMA="workspace/backend/prisma/schema.prisma"

if [ -f "$TEMPLATE_SCHEMA" ] && [ -f "$WORKSPACE_SCHEMA" ]; then
  # コアモデル数チェック（users, companies, departments等）
  TEMPLATE_MODELS=$(grep -E "^model (users|companies|departments|features|logs|audit_logs)" "$TEMPLATE_SCHEMA" | wc -l)
  WORKSPACE_MODELS=$(grep -E "^model (users|companies|departments|features|logs|audit_logs)" "$WORKSPACE_SCHEMA" | wc -l)

  if [ "$TEMPLATE_MODELS" -ne "$WORKSPACE_MODELS" ]; then
    echo -e "${RED}❌ エラー: コアモデル数が一致しません${NC}"
    echo "   templates: $TEMPLATE_MODELS モデル"
    echo "   workspace: $WORKSPACE_MODELS モデル"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}✅ コアモデル数: 一致${NC}"
  fi

  # スキーマハッシュ比較（警告のみ）
  TEMPLATE_HASH=$(md5sum "$TEMPLATE_SCHEMA" | awk '{print $1}')
  WORKSPACE_HASH=$(md5sum "$WORKSPACE_SCHEMA" | awk '{print $1}')

  if [ "$TEMPLATE_HASH" != "$WORKSPACE_HASH" ]; then
    echo -e "${YELLOW}⚠️  警告: schema.prisma の内容が異なります（カスタムモデル追加の可能性あり）${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

echo ""

# 結果表示
echo "========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ templates/workspace 同期チェック: 問題なし${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  templates/workspace 同期チェック: $WARNINGS 件の警告${NC}"
  echo ""
  echo "推奨対応:"
  echo "  1. 警告内容を確認"
  echo "  2. 意図的なカスタマイズの場合は無視可能"
  echo "  3. 共通ライブラリ更新の場合は再同期を検討"
  echo ""
  echo "再同期コマンド（必要に応じて実行）:"
  echo "  rsync -av --delete templates/frontend/src/core/ workspace/frontend/src/core/"
  echo "  rsync -av --delete templates/backend/src/core/ workspace/backend/src/core/"
  exit 0
else
  echo -e "${RED}❌ templates/workspace 同期チェック: $ERRORS 件のエラー, $WARNINGS 件の警告${NC}"
  echo ""
  echo "修正方法:"
  echo "  1. 上記のエラーを確認"
  echo "  2. 不足ファイルをコピー"
  echo "  3. 再度チェック実行"
  echo ""
  echo "自動修正コマンド:"
  echo "  # フロントエンド"
  echo "  cp -r templates/frontend/src/core workspace/frontend/src/"
  echo ""
  echo "  # バックエンド"
  echo "  cp -r templates/backend/src/core workspace/backend/src/"
  exit 1
fi
