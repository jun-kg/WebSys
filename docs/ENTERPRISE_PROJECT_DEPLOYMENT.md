# 企業プロジェクト展開ガイド

このドキュメントでは、Enterprise Commons共通ライブラリから企業向けプロジェクトを作成・展開する方法を説明します。

---

## 📋 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [ディレクトリ構成](#ディレクトリ構成)
3. [テンプレート生成](#テンプレート生成)
4. [企業プロジェクト作成](#企業プロジェクト作成)
5. [開発ガイド](#開発ガイド)
6. [共通ライブラリ更新](#共通ライブラリ更新)
7. [ベストプラクティス](#ベストプラクティス)

---

## アーキテクチャ概要

### 3層分離アーキテクチャ

Enterprise Commonsは**共通ライブラリ型アーキテクチャ**を採用しており、以下の3層に明確に分離されています：

```
┌─────────────────────────────────────────────────────┐
│ core/ （共通コア）                                    │
│ - 認証・権限管理・ログ監視・WebSocket                  │
│ - ✅ 全企業プロジェクトで共有                         │
│ - ❌ 変更禁止（共通ライブラリ更新で上書き）            │
├─────────────────────────────────────────────────────┤
│ extensions/ （拡張機能）                             │
│ - カスタム認証・追加バリデーション                     │
│ - ✅ 共通機能の拡張のみ                              │
│ - ✅ 企業ごとにカスタマイズ可能                       │
├─────────────────────────────────────────────────────┤
│ custom/ （企業固有機能）                              │
│ - 営業管理・在庫管理・ワークフロー等                   │
│ - ✅ 完全に自由な実装が可能                           │
│ - ✅ 企業ごとに独立                                  │
└─────────────────────────────────────────────────────┘
```

### 設計原則

| レイヤー | 変更可否 | 影響範囲 | 用途 |
|---------|---------|---------|------|
| **core/** | ❌ 変更禁止 | 全プロジェクト | 共通基盤機能 |
| **extensions/** | ✅ 拡張可能 | 個別プロジェクト | 共通機能の拡張 |
| **custom/** | ✅ 自由実装 | 個別プロジェクト | 企業固有ロジック |

---

## ディレクトリ構成

### 全体構成

```
/home/user/projects/
│
├── enterprise-commons/                          # ①共通ライブラリリポジトリ
│   ├── .git/                       # Gitリポジトリ（共通ライブラリ管理）
│   ├── workspace/                  # 統合テスト・開発環境
│   │   ├── backend/src/
│   │   │   ├── core/              # ✅ 共通コア開発
│   │   │   ├── extensions/        # サンプル拡張
│   │   │   └── custom/            # サンプルカスタム
│   │   └── frontend/src/
│   │       ├── core/              # ✅ 共通コア開発
│   │       ├── extensions/        # サンプル拡張
│   │       └── custom/            # サンプルカスタム
│   │
│   ├── templates/                  # ②配布用テンプレート
│   │   ├── backend-express/
│   │   │   └── src/
│   │   │       ├── core/          # workspace からコピー
│   │   │       ├── extensions/    # 空（.gitkeep + README.md）
│   │   │       └── custom/        # 空（.gitkeep + README.md）
│   │   └── frontend-vue/
│   │       └── src/
│   │           ├── core/          # workspace からコピー
│   │           ├── extensions/    # 空（.gitkeep + README.md）
│   │           └── custom/        # 空（.gitkeep + README.md）
│   │
│   └── scripts/
│       ├── build-templates.sh     # テンプレート生成
│       └── create-project.sh      # プロジェクト作成
│
├── company-a-project/              # ③企業Aプロジェクト
│   ├── .git/                      # 独立Gitリポジトリ
│   ├── backend/src/
│   │   ├── core/                  # ← templates からコピー（変更禁止）
│   │   ├── extensions/            # 企業A拡張機能
│   │   └── custom/                # 企業A固有機能
│   └── frontend/src/
│       ├── core/                  # ← templates からコピー（変更禁止）
│       ├── extensions/            # 企業A拡張機能
│       └── custom/                # 企業A固有機能
│
└── company-b-project/              # ③企業Bプロジェクト
    └── （同様の構成）
```

---

## テンプレート生成

### 1. テンプレート生成スクリプト実行

共通コアの開発・更新後、配布用テンプレートを生成します。

```bash
cd /path/to/enterprise-commons
./scripts/build-templates.sh
```

**処理内容:**
1. `workspace/backend/src/core` → `templates/backend-express/src/core` へコピー
2. `workspace/frontend/src/core` → `templates/frontend-vue/src/core` へコピー
3. `extensions/` と `custom/` を初期化（.gitkeep + README.md）
4. バージョン情報埋め込み

**出力例:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  テンプレート生成完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📦 バージョン: 2025.10.18-da3bb70

  📁 Backend テンプレート:
     core/       : 35 ファイル
     extensions/ : 初期化済み (.gitkeep + README.md)
     custom/     : 初期化済み (.gitkeep + README.md)

  📁 Frontend テンプレート:
     core/       : 39 ファイル
     extensions/ : 初期化済み (.gitkeep + README.md)
     custom/     : 初期化済み (.gitkeep + README.md)
```

### 2. テンプレートをコミット

```bash
git add templates/
git commit -m "build: update templates to version 2025.10.18-da3bb70"
git tag v2025.10.18-da3bb70
git push origin main --tags
```

---

## 企業プロジェクト作成

### 1. 新規プロジェクト作成

```bash
cd /path/to/enterprise-commons
./scripts/create-project.sh company-a-project
```

**オプション:**
- `--no-git`: Git初期化をスキップ
- `--no-install`: npm installをスキップ（高速化）
- `--target-dir <path>`: 作成先ディレクトリ指定

**例:**
```bash
# 基本的な使用
./scripts/create-project.sh company-a-project

# npm installをスキップして高速作成
./scripts/create-project.sh company-a-project --no-install

# 特定ディレクトリに作成
./scripts/create-project.sh my-project --target-dir /path/to/projects
```

### 2. 作成されるファイル

```
company-a-project/
├── .git/                          # Git自動初期化済み
├── .gitignore                     # 標準的な.gitignore
├── backend/
│   ├── .env                       # 環境変数（自動生成）
│   ├── package.json              # プロジェクト名でカスタマイズ済み
│   └── src/
│       ├── core/                 # 共通コア（35ファイル）
│       ├── extensions/           # .gitkeep + README.md
│       └── custom/               # .gitkeep + README.md
├── frontend/
│   ├── .env                       # 環境変数（自動生成）
│   ├── package.json              # プロジェクト名でカスタマイズ済み
│   └── src/
│       ├── core/                 # 共通コア（39ファイル）
│       ├── extensions/           # .gitkeep + README.md
│       └── custom/               # .gitkeep + README.md
└── infrastructure/docker/development/
    └── docker-compose.yml        # プロジェクト名でコンテナ命名済み
```

### 3. 環境起動

```bash
cd ../company-a-project
cd infrastructure/docker/development
docker compose up -d
```

### 4. データベースマイグレーション

```bash
docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma db seed
```

### 5. アクセス確認

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **ヘルスチェック**: http://localhost:8000/health

---

## 開発ガイド

### 企業固有機能の実装

#### Backend API実装例

```bash
cd company-a-project/backend/src/custom
```

**ディレクトリ構造:**
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
└── utils/
    └── salesHelpers.ts
```

**実装例:**

```typescript
// custom/routes/sales.ts
import { Router } from 'express'
import { authenticate, authorize } from '@core/middleware/auth'
import { SalesController } from '@custom/controllers/SalesController'

const router = Router()
const controller = new SalesController()

// 認証必須 + 権限チェック
router.get('/sales', authenticate, authorize('sales', 'read'), controller.getSales)
router.post('/sales', authenticate, authorize('sales', 'create'), controller.createSale)

export default router
```

**メインアプリに登録:**

```typescript
// src/index.ts
import salesRoutes from '@custom/routes/sales'

app.use('/api/sales', salesRoutes)
```

#### Frontend UI実装例

```bash
cd company-a-project/frontend/src/custom
```

**ディレクトリ構造:**
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
│   └── inventory.ts
├── stores/
│   └── sales.ts            # Pinia store
└── types/
    └── sales.ts
```

**実装例:**

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

**ルーター登録:**

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

### 共通コア機能の活用

#### 認証機能

```typescript
// Backend
import { authenticate, authorize } from '@core/middleware/auth'

router.get('/data', authenticate, authorize('feature', 'read'), handler)
```

```typescript
// Frontend
import { getAuthHeaders } from '@core/utils/auth'

const response = await fetch('/api/data', {
  headers: getAuthHeaders()
})
```

#### ログ監視

```typescript
// Backend
import { LogService } from '@core/services/LogService'

const logService = new LogService()
await logService.log({
  level: 30, // INFO
  category: 'USER',
  message: 'ユーザーがログインしました',
  userId: 1
})
```

```vue
<!-- Frontend -->
<script setup>
import { LogMonitoring } from '@core/components/log-monitoring'
</script>

<template>
  <LogMonitoring />
</template>
```

#### 権限管理

```typescript
// Backend
import { PermissionController } from '@core/controllers/PermissionController'

// 権限マトリクス取得
const matrix = await permissionController.getMatrix(companyId)
```

```vue
<!-- Frontend -->
<script setup>
import { PermissionMatrix } from '@core/components/permissions'
</script>

<template>
  <PermissionMatrix />
</template>
```

---

## 共通ライブラリ更新

### 1. 共通ライブラリで新機能開発

```bash
cd /path/to/enterprise-commons/workspace
# backend/src/core または frontend/src/core で開発
```

### 2. 開発完了後、リリース作成

#### 方法1: リリーススクリプト使用（推奨）

```bash
cd /path/to/enterprise-commons
./scripts/release.sh 1.0.0 stable
```

**スクリプトの機能:**
- ✅ バージョンバリデーション
- ✅ テンプレート自動生成
- ✅ RELEASE.md自動更新
- ✅ Gitタグ自動作成
- ✅ リリースノート表示

**ステータス:**
- `stable` - 安定版（本番環境推奨）
- `rc.1` - リリース候補（テスト環境推奨）
- `beta.1` - ベータ版（開発環境のみ）
- `alpha.1` - アルファ版（内部開発のみ）

**出力例:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ リリース作成完了: v1.0.0-stable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 リリース情報:
   バージョン: v1.0.0-stable
   ステータス: 🟢 STABLE
   Gitタグ: v1.0.0-stable
   リリース日: 2025-10-18
```

#### 方法2: 手動リリース（上級者向け）

```bash
cd /path/to/enterprise-commons
./scripts/build-templates.sh
git add templates/
git commit -m "feat(core): add new export feature"
git tag v1.0.0-stable
git push origin main --tags
```

### 3. リリース確認

リリースが完了したら、企業プロジェクトで使用可能かを確認します。

```bash
# RELEASE.mdでステータス確認
cat /path/to/enterprise-commons/RELEASE.md
```

**ステータスの意味:**
- 🟢 **STABLE**: 本番環境での使用を推奨
- 🟡 **RC**: テスト環境での検証を推奨
- 🔴 **DEVELOPMENT**: 本番環境使用禁止

### 4. 企業プロジェクトへ適用

#### 方法1: 自動更新スクリプト使用（推奨）

```bash
# 安定版タグにチェックアウト
cd /path/to/enterprise-commons
git checkout v1.0.0-stable

# 企業プロジェクトに適用
cd /path/to/company-a-project
/path/to/enterprise-commons/scripts/update-core.sh
```

**スクリプトの機能:**
- ✅ 自動的にEnterprise Commons最新版を取得
- ✅ バージョン確認（現在→最新）
- ✅ 自動バックアップ作成
- ✅ backend/src/core と frontend/src/core を更新
- ✅ 変更内容表示（git diff）

**出力例:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ 共通ライブラリ更新完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 バージョン:
   2025.10.18 → 2025.11.01 (Backend)
   2025.10.18 → 2025.11.01 (Frontend)

📁 バックアップ:
   /path/to/company-a-project/.core-backup-20251101-120000

📋 次のステップ:

  1️⃣  動作確認
     npm run test

  2️⃣  問題なければコミット
     git add backend/src/core frontend/src/core
     git commit -m "chore: update core libraries to 2025.11.01"

  3️⃣  問題があればロールバック
     cp -r .core-backup-20251101-120000/backend-core/* backend/src/core/
     cp -r .core-backup-20251101-120000/frontend-core/* frontend/src/core/
```

#### 方法2: 手動更新（上級者向け）

```bash
cd /path/to/company-a-project

# 最新テンプレート取得
cd /path/to/enterprise-commons
git pull origin main

# 企業プロジェクトへ反映
cd /path/to/company-a-project
rsync -av --delete \
  /path/to/enterprise-commons/templates/backend-express/src/core/ \
  ./backend/src/core/

rsync -av --delete \
  /path/to/enterprise-commons/templates/frontend-vue/src/core/ \
  ./frontend/src/core/

# 動作確認後コミット
npm run test
git add backend/src/core frontend/src/core
git commit -m "chore: update core libraries to v2025.11.01"
```

---

## ベストプラクティス

### ✅ 推奨事項

#### 1. core/ は絶対に変更しない

```bash
# ❌ 絶対禁止
vim backend/src/core/middleware/auth.ts

# ✅ 正しい方法
# 1. enterprise-commons/workspace で修正
# 2. build-templates.sh 実行
# 3. rsync で企業プロジェクトに反映
```

#### 2. extensions/ で共通機能を拡張

```typescript
// extensions/middleware/customAuth.ts
import { authenticate } from '@core/middleware/auth'

export const customAuthMiddleware = (req, res, next) => {
  // OAuth, SAML等のカスタム認証ロジック
  authenticate(req, res, next)
}
```

#### 3. custom/ で企業固有機能を実装

```typescript
// custom/routes/sales.ts
import { authenticate } from '@core/middleware/auth'

router.get('/sales', authenticate, getSales)
```

#### 4. パスエイリアスを活用

```typescript
// ✅ 推奨: パスエイリアス使用
import { authenticate } from '@core/middleware/auth'
import { SalesService } from '@custom/services/SalesService'

// ❌ 非推奨: 相対パス
import { authenticate } from '../../core/middleware/auth'
```

### ❌ 避けるべき事項

#### 1. core/ の直接編集

```bash
# ❌ 絶対禁止
vim backend/src/core/middleware/auth.ts
```

**理由:** 共通ライブラリ更新時に上書きされ、変更が失われます

#### 2. core/ のインポートパス変更

```typescript
// ❌ 絶対禁止
// backend/src/core/middleware/auth.ts
import { prisma } from '../../../lib/prisma'  // 相対パス変更
```

**理由:** テンプレート更新時にパスが壊れます

#### 3. custom/ のコードを core/ に配置

```typescript
// ❌ 絶対禁止
// backend/src/core/routes/sales.ts （企業固有機能をcoreに配置）
```

**理由:** 他企業プロジェクトに不要なコードが混入します

---

## トラブルシューティング

### Q: テンプレート更新後にビルドエラー

**A:** 依存関係の再インストールが必要です

```bash
cd backend && npm install
cd frontend && npm install
```

### Q: core/ 更新後に型エラー

**A:** Prismaクライアントの再生成が必要です

```bash
cd backend
npx prisma generate
```

### Q: Docker環境で接続エラー

**A:** 環境変数を確認してください

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/company_a_dev

# frontend/.env
VITE_API_BASE_URL=http://backend:8000
```

---

## まとめ

### 開発フロー

```
┌─────────────────────────────────────────────────────┐
│ 1. 共通機能開発（enterprise-commons/workspace）                   │
│    └─ core/ で認証・ログ監視等を実装                  │
├─────────────────────────────────────────────────────┤
│ 2. テンプレート生成（build-templates.sh）             │
│    └─ workspace/core → templates/core へコピー       │
├─────────────────────────────────────────────────────┤
│ 3. 企業プロジェクト作成（create-project.sh）          │
│    └─ templates → company-a-project へコピー        │
├─────────────────────────────────────────────────────┤
│ 4. 企業固有機能実装（custom/）                        │
│    └─ 営業管理・在庫管理等を実装                      │
├─────────────────────────────────────────────────────┤
│ 5. 共通ライブラリ更新適用                             │
│    └─ rsync で最新 core/ を取得                     │
└─────────────────────────────────────────────────────┘
```

### 重要な原則

1. **core/ は変更禁止** - 共通ライブラリ更新で上書き
2. **extensions/ で拡張** - 共通機能のカスタマイズ
3. **custom/ で実装** - 企業固有ロジックの完全独立
4. **パスエイリアス使用** - @core, @extensions, @custom
5. **バージョン管理** - テンプレートにバージョン埋め込み

---

**ドキュメントバージョン:** 1.0.0
**最終更新日:** 2025-10-18
**対象Enterprise Commonsバージョン:** 2025.10.18-da3bb70
