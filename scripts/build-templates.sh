#!/bin/bash

##############################################################################
# build-templates.sh
#
# 目的: workspace/ の core/ を templates/ にコピーして配布用テンプレートを生成
#
# 実行方法:
#   ./scripts/build-templates.sh
#
# 処理内容:
#   1. workspace/backend/src/core → templates/backend-express/src/core
#   2. workspace/frontend/src/core → templates/frontend-vue/src/core
#   3. extensions/ と custom/ を空ディレクトリ + README.md で初期化
#   4. バージョン情報をREADME.mdに埋め込み
##############################################################################

set -e  # エラー時に即座終了

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ルートディレクトリ
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  共通ライブラリテンプレート生成スクリプト${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# バージョン情報取得
VERSION=$(date +%Y.%m.%d)
if [ -d "$ROOT_DIR/.git" ]; then
    GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    VERSION="$VERSION-$GIT_HASH"
fi

echo -e "${GREEN}[INFO]${NC} バージョン: $VERSION"
echo -e "${GREEN}[INFO]${NC} ルートディレクトリ: $ROOT_DIR"
echo ""

##############################################################################
# 1. Backend テンプレート生成
##############################################################################

echo -e "${BLUE}[1/4]${NC} Backend テンプレート生成中..."

WORKSPACE_BACKEND="$ROOT_DIR/workspace/backend/src"
TEMPLATE_BACKEND="$ROOT_DIR/templates/backend-express/src"

# core ディレクトリコピー
if [ -d "$WORKSPACE_BACKEND/core" ]; then
    echo -e "${GREEN}  ✓${NC} core/ をコピー: $WORKSPACE_BACKEND/core → $TEMPLATE_BACKEND/core"
    mkdir -p "$TEMPLATE_BACKEND"
    rm -rf "$TEMPLATE_BACKEND/core"
    cp -r "$WORKSPACE_BACKEND/core" "$TEMPLATE_BACKEND/core"
else
    echo -e "${RED}  ✗ エラー:${NC} $WORKSPACE_BACKEND/core が見つかりません"
    exit 1
fi

# extensions/ 初期化
echo -e "${GREEN}  ✓${NC} extensions/ を初期化"
mkdir -p "$TEMPLATE_BACKEND/extensions"
rm -rf "$TEMPLATE_BACKEND/extensions"/*
touch "$TEMPLATE_BACKEND/extensions/.gitkeep"

cat > "$TEMPLATE_BACKEND/extensions/README.md" <<'EOF'
# Extensions（拡張機能）

このディレクトリは、共通コア機能を拡張するためのディレクトリです。

## 使用方法

### 拡張可能な項目
- カスタム認証方式（OAuth, SAML等）
- 追加バリデーション
- カスタムミドルウェア
- 共通機能の拡張

### 実装例

```typescript
// extensions/middleware/customAuth.ts
import { Request, Response, NextFunction } from 'express'

export const customAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // カスタム認証ロジック
  next()
}
```

### インポート方法

```typescript
// tsconfig.json のパスエイリアス使用
import { customAuthMiddleware } from '@extensions/middleware/customAuth'
```

## 重要な原則

- ✅ core/ の機能を拡張する目的のみ使用
- ✅ 企業固有ロジックは custom/ に配置
- ❌ core/ のファイルは変更しない（共通ライブラリ更新で上書きされます）
EOF

# custom/ 初期化
echo -e "${GREEN}  ✓${NC} custom/ を初期化"
mkdir -p "$TEMPLATE_BACKEND/custom"
rm -rf "$TEMPLATE_BACKEND/custom"/*
touch "$TEMPLATE_BACKEND/custom/.gitkeep"

cat > "$TEMPLATE_BACKEND/custom/README.md" <<'EOF'
# Custom（企業固有機能）

このディレクトリは、企業固有のビジネスロジックを実装するディレクトリです。

## 使用方法

### 実装可能な項目
- 業務API（営業管理、在庫管理、顧客管理等）
- 独自ワークフロー
- レポート生成
- データ可視化
- 外部システム連携

### ディレクトリ構造例

```
custom/
├── routes/
│   ├── sales.ts          # 営業管理API
│   ├── inventory.ts      # 在庫管理API
│   └── customers.ts      # 顧客管理API
├── services/
│   ├── SalesService.ts
│   ├── InventoryService.ts
│   └── CustomerService.ts
├── controllers/
│   └── SalesController.ts
├── models/
│   └── SalesModel.ts
└── utils/
    └── salesHelpers.ts
```

### 実装例

```typescript
// custom/routes/sales.ts
import { Router } from 'express'
import { authenticate } from '@core/middleware/auth'
import { SalesController } from '@custom/controllers/SalesController'

const router = Router()
const controller = new SalesController()

router.get('/sales', authenticate, controller.getSales)
router.post('/sales', authenticate, controller.createSale)

export default router
```

### メインアプリに登録

```typescript
// src/index.ts
import salesRoutes from '@custom/routes/sales'

app.use('/api/sales', salesRoutes)
```

## 重要な原則

- ✅ 完全に自由な実装が可能
- ✅ core/ の機能を活用（認証、ログ、権限管理等）
- ❌ core/ のファイルは変更しない（共通ライブラリ更新で上書きされます）
EOF

echo -e "${GREEN}[✓]${NC} Backend テンプレート生成完了"
echo ""

##############################################################################
# 2. Frontend テンプレート生成
##############################################################################

echo -e "${BLUE}[2/4]${NC} Frontend テンプレート生成中..."

WORKSPACE_FRONTEND="$ROOT_DIR/workspace/frontend/src"
TEMPLATE_FRONTEND="$ROOT_DIR/templates/frontend-vue/src"

# core ディレクトリコピー
if [ -d "$WORKSPACE_FRONTEND/core" ]; then
    echo -e "${GREEN}  ✓${NC} core/ をコピー: $WORKSPACE_FRONTEND/core → $TEMPLATE_FRONTEND/core"
    mkdir -p "$TEMPLATE_FRONTEND"
    rm -rf "$TEMPLATE_FRONTEND/core"
    cp -r "$WORKSPACE_FRONTEND/core" "$TEMPLATE_FRONTEND/core"
else
    echo -e "${RED}  ✗ エラー:${NC} $WORKSPACE_FRONTEND/core が見つかりません"
    exit 1
fi

# extensions/ 初期化
echo -e "${GREEN}  ✓${NC} extensions/ を初期化"
mkdir -p "$TEMPLATE_FRONTEND/extensions"
rm -rf "$TEMPLATE_FRONTEND/extensions"/*
touch "$TEMPLATE_FRONTEND/extensions/.gitkeep"

cat > "$TEMPLATE_FRONTEND/extensions/README.md" <<'EOF'
# Extensions（拡張機能）

このディレクトリは、共通コア機能を拡張するためのディレクトリです。

## 使用方法

### 拡張可能な項目
- カスタム認証フロー
- 共通コンポーネントの拡張
- グローバルプラグイン
- カスタムディレクティブ

### 実装例

```vue
<!-- extensions/components/CustomAuthForm.vue -->
<template>
  <div class="custom-auth">
    <h2>企業向けSSO認証</h2>
    <!-- カスタム認証UI -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// カスタム認証ロジック
</script>
```

### インポート方法

```typescript
// vite.config.ts のパスエイリアス使用
import CustomAuthForm from '@extensions/components/CustomAuthForm.vue'
```

## 重要な原則

- ✅ core/ の機能を拡張する目的のみ使用
- ✅ 企業固有UIは custom/ に配置
- ❌ core/ のファイルは変更しない（共通ライブラリ更新で上書きされます）
EOF

# custom/ 初期化
echo -e "${GREEN}  ✓${NC} custom/ を初期化"
mkdir -p "$TEMPLATE_FRONTEND/custom"
rm -rf "$TEMPLATE_FRONTEND/custom"/*
touch "$TEMPLATE_FRONTEND/custom/.gitkeep"

cat > "$TEMPLATE_FRONTEND/custom/README.md" <<'EOF'
# Custom（企業固有機能）

このディレクトリは、企業固有のUIとビジネスロジックを実装するディレクトリです。

## 使用方法

### 実装可能な項目
- 業務画面（営業管理、在庫管理、顧客管理等）
- カスタムダッシュボード
- レポートビュー
- データ可視化コンポーネント
- 企業固有ワークフロー画面

### ディレクトリ構造例

```
custom/
├── views/
│   ├── Sales.vue           # 営業管理画面
│   ├── Inventory.vue       # 在庫管理画面
│   └── Dashboard.vue       # カスタムダッシュボード
├── components/
│   ├── SalesChart.vue
│   ├── InventoryTable.vue
│   └── CustomerCard.vue
├── api/
│   ├── sales.ts
│   ├── inventory.ts
│   └── customers.ts
├── stores/
│   ├── sales.ts            # Pinia store
│   └── inventory.ts
├── types/
│   ├── sales.ts
│   └── inventory.ts
└── utils/
    └── salesHelpers.ts
```

### 実装例

```vue
<!-- custom/views/Sales.vue -->
<template>
  <div class="sales-management">
    <h1>営業管理</h1>
    <SalesChart :data="salesData" />
    <SalesTable :items="salesList" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSales } from '@custom/api/sales'
import SalesChart from '@custom/components/SalesChart.vue'
import SalesTable from '@custom/components/SalesTable.vue'

const salesData = ref([])
const salesList = ref([])

onMounted(async () => {
  salesList.value = await getSales()
})
</script>
```

### ルーター登録

```typescript
// router/index.ts
import Sales from '@custom/views/Sales.vue'

const routes = [
  {
    path: '/sales',
    name: 'Sales',
    component: Sales,
    meta: { requiresAuth: true }
  }
]
```

## 重要な原則

- ✅ 完全に自由な実装が可能
- ✅ core/ の機能を活用（認証、ログ監視、権限管理等）
- ❌ core/ のファイルは変更しない（共通ライブラリ更新で上書きされます）
EOF

echo -e "${GREEN}[✓]${NC} Frontend テンプレート生成完了"
echo ""

##############################################################################
# 3. バージョン情報埋め込み
##############################################################################

echo -e "${BLUE}[3/4]${NC} バージョン情報埋め込み中..."

cat > "$TEMPLATE_BACKEND/core/VERSION" <<EOF
Version: $VERSION
Generated: $(date '+%Y-%m-%d %H:%M:%S')
Source: workspace/backend/src/core
EOF

cat > "$TEMPLATE_FRONTEND/core/VERSION" <<EOF
Version: $VERSION
Generated: $(date '+%Y-%m-%d %H:%M:%S')
Source: workspace/frontend/src/core
EOF

echo -e "${GREEN}  ✓${NC} Backend VERSION: $TEMPLATE_BACKEND/core/VERSION"
echo -e "${GREEN}  ✓${NC} Frontend VERSION: $TEMPLATE_FRONTEND/core/VERSION"
echo -e "${GREEN}[✓]${NC} バージョン情報埋め込み完了"
echo ""

##############################################################################
# 4. 統計情報表示
##############################################################################

echo -e "${BLUE}[4/4]${NC} 生成統計..."
echo ""

BACKEND_CORE_FILES=$(find "$TEMPLATE_BACKEND/core" -type f | wc -l)
FRONTEND_CORE_FILES=$(find "$TEMPLATE_FRONTEND/core" -type f | wc -l)

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  テンプレート生成完了${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  📦 バージョン: ${YELLOW}$VERSION${NC}"
echo ""
echo -e "  📁 Backend テンプレート:"
echo -e "     core/       : ${BLUE}$BACKEND_CORE_FILES${NC} ファイル"
echo -e "     extensions/ : 初期化済み (.gitkeep + README.md)"
echo -e "     custom/     : 初期化済み (.gitkeep + README.md)"
echo ""
echo -e "  📁 Frontend テンプレート:"
echo -e "     core/       : ${BLUE}$FRONTEND_CORE_FILES${NC} ファイル"
echo -e "     extensions/ : 初期化済み (.gitkeep + README.md)"
echo -e "     custom/     : 初期化済み (.gitkeep + README.md)"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo -e "  1. git add templates/"
echo -e "  2. git commit -m \"build: update templates to version $VERSION\""
echo -e "  3. git tag v$VERSION"
echo -e "  4. git push origin main --tags"
echo ""
