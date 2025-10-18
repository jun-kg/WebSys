# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔄 継続的改善プロセス

### 必須実施事項
機能の追加・改善を行う際は、必ず以下のプロセスを実施してください：

1. **事前チェック**: 「53-機能追加改善チェックリスト.md」を使用して全項目をチェック
2. **問題記録**: 発見された問題は「52-継続的改善プロセス運用ガイドライン.md」に従って記録
3. **タスク管理**: 改善が必要な項目は「51-改善実装タスク管理表.md」に登録して追跡
4. **品質確保**: ユーザビリティ・セキュリティ・パフォーマンスの観点から総合的に評価

### 重要文書
- **50-システムUI改善分析レポート.md**: 現在の改善課題一覧
- **51-改善実装タスク管理表.md**: 全改善タスクの進捗管理（23タスク登録済み）
- **52-継続的改善プロセス運用ガイドライン.md**: 品質管理プロセス定義
- **53-機能追加改善チェックリスト.md**: 機能追加時の必須チェック項目

## 🚨 重要: Prismaクライアント使用ガイドライン

### 必須ルール（違反厳禁）

#### ✅ 正しい使用方法
```typescript
// ✅ 必ず統一Prismaシングルトンを使用
import { prisma } from '../lib/prisma';

// 全てのデータベース操作はこのインスタンスを使用
const users = await prisma.users.findMany();
const companies = await prisma.companies.findMany();
const departments = await prisma.departments.findMany();
```

#### ❌ 絶対禁止事項
```typescript
// ❌ 個別インスタンス作成は絶対禁止
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient(); // これは使用不可

// ❌ クラス内での個別作成も禁止
export class Service {
  private prisma = new PrismaClient(); // 絶対禁止
  constructor() {
    this.prisma = new PrismaClient(); // これも禁止
  }
}
```

### 必須チェック項目

**新規ファイル作成時:**
- [ ] `import { prisma } from '../lib/prisma'` を使用
- [ ] `new PrismaClient()` は絶対に使用しない
- [ ] テーブル名は複数形を使用（users, companies, departments）
- [ ] プライベートプロパティでのPrisma保持は禁止

**既存ファイル修正時:**
- [ ] `new PrismaClient()` を全て削除
- [ ] `this.prisma` を `prisma` に置換
- [ ] プライベートプロパティの削除
- [ ] 正しいインポート文への変更

**重要な理由:**
- 複数インスタンス作成による接続プール枯渇防止
- メモリリーク防止とリソース効率化
- 水平展開での安定動作確保
- グレースフルシャットダウン対応

### 違反時の典型的エラー
```
TypeError: Cannot read properties of undefined (reading 'findMany')
```

このエラーが発生した場合は、必ず上記ガイドラインに従ってPrismaシングルトンに修正してください。

---

## 🗄️ データベーススキーマ分離ガイドライン

### 基本方針
Prismaは単一`schema.prisma`ファイルを使用しますが、**コメントブロックによる論理的分離**を採用します。
これは業界標準のプラクティスで、管理性と明確性を両立します。

### スキーマ構造

```prisma
// ============================================
// 🔒 CORE MODELS (共通コア - 変更禁止)
// ============================================
// システム基盤モデル。全プロジェクトで共有。

// --- Authentication & Authorization ---
model users { ... }
model companies { ... }
model departments { ... }

// --- Audit & Logging ---
model audit_logs { ... }
model logs { ... }

// ============================================
// 🔌 EXTENSION MODELS (拡張可能)
// ============================================
// 企業がカスタマイズ可能なモデル。

// model ext_user_profiles { ... }

// ============================================
// 🏢 CUSTOM MODELS (企業固有)
// ============================================
// 完全に企業独自のモデル。

// --- Workflow Management ---
model workflow_types { ... }
model workflow_requests { ... }
```

### モデル分類ルール

#### 🔒 共通コアモデル（CORE MODELS）
**対象テーブル**:
- 認証・権限: users, companies, departments, user_departments, user_sessions
- 権限管理: features, department_permissions, permission_templates, permission_template_features, permission_inheritance_rules
- 監査: audit_logs
- ログ監視: logs, log_statistics, alert_rules
- 通知: notifications

**ルール**:
- ❌ 既存カラムの削除・型変更禁止
- ❌ リレーションの削除禁止
- ✅ 新規カラム追加は可能（オプショナル）
- ✅ 新規インデックス追加は可能

#### 🔌 拡張可能モデル（EXTENSION MODELS）
**推奨プレフィックス**: `ext_` （任意）

**ルール**:
- ✅ 新規モデル追加自由
- ✅ カラム追加自由
- ✅ 共通コアモデルへのリレーション追加可能
- ❌ 共通コアモデルの既存カラム変更禁止

#### 🏢 企業固有モデル（CUSTOM MODELS）
**ルール**:
- ✅ 完全に自由
- ✅ モデル追加・削除・変更すべて可能

### マイグレーション管理

**共通コアモデル変更時**:
```bash
# templates ディレクトリで実施
cd enterprise-commons/backend
npx prisma migrate dev --name core_update_users
```

**企業固有モデル変更時**:
```bash
# プロジェクトディレクトリで実施
cd workspace/backend
npx prisma migrate dev --name custom_add_feature
```

### 互換性確認チェックリスト

共通ライブラリ更新時は以下を確認:
- [ ] 既存カラムの型が変更されていないか
- [ ] 既存リレーションが削除されていないか
- [ ] NOT NULL制約が追加されていないか
- [ ] ユニーク制約が追加されていないか
- [ ] デフォルト値が変更されていないか

---

## プロジェクト概要

Vue.js 3 + Element Plus + Express + PostgreSQLを使用した**共通ライブラリ型社内システム開発環境**です。
企業固有機能と共通機能を完全分離し、相互影響なく安全に拡張できる構成を採用しています。

## 🎯 共通ライブラリ・企業固有機能分離アーキテクチャ

### 設計原則
このプロジェクトは**共通ライブラリ**として他プロジェクトに提供されます。
以下の3層分離により、共通機能更新時に企業固有機能への影響ゼロ、逆も同様に影響ゼロを実現します。

### 📁 ディレクトリ構造

```
enterprise-commons/                           # 共通ライブラリリポジトリ
├── templates/                    # 共通テンプレート（配布用）
│   ├── frontend/                # フロントエンド共通コード
│   │   ├── src/
│   │   │   ├── core/            # ✅ 共通コアモジュール（変更禁止）
│   │   │   │   ├── components/  # 共通UIコンポーネント
│   │   │   │   │   └── log-monitoring/  # ログ監視システム
│   │   │   │   ├── composables/ # 共通ロジック（useLogService等）
│   │   │   │   ├── utils/       # 共通ユーティリティ
│   │   │   │   ├── api/         # 共通API基盤
│   │   │   │   └── types/       # 共通型定義
│   │   │   │
│   │   │   ├── extensions/      # 🔌 拡張ポイント（カスタマイズ可能）
│   │   │   │   ├── .gitkeep
│   │   │   │   └── README.md    # 拡張方法ガイド
│   │   │   │
│   │   │   └── custom/          # 🏢 企業固有機能（完全独立）
│   │   │       ├── .gitkeep
│   │   │       └── README.md    # カスタマイズガイド
│   │   │
│   │   └── vite.config.ts       # エイリアス設定
│   │
│   └── backend/                 # バックエンド共通コード
│       ├── src/
│       │   ├── core/            # ✅ 共通コアモジュール（変更禁止）
│       │   │   ├── middleware/  # 共通ミドルウェア（auth等）
│       │   │   ├── services/    # 共通サービス
│       │   │   ├── routes/      # 共通ルート基盤
│       │   │   ├── controllers/ # 共通コントローラー
│       │   │   ├── lib/         # 共通ライブラリ（prisma等）
│       │   │   └── types/       # 共通型定義
│       │   │
│       │   ├── extensions/      # 🔌 拡張ポイント（カスタマイズ可能）
│       │   │   ├── .gitkeep
│       │   │   └── README.md    # 拡張方法ガイド
│       │   │
│       │   └── custom/          # 🏢 企業固有機能（完全独立）
│       │       ├── .gitkeep
│       │       └── README.md    # カスタマイズガイド
│       │
│       └── tsconfig.json        # パスエイリアス設定
│
└── workspace/                   # 実装プロジェクト（企業固有）
    ├── frontend/
    │   └── src/
    │       ├── core/            # → templates からコピー（参照のみ・変更禁止）
    │       ├── extensions/      # 拡張機能実装
    │       │   ├── components/  # 拡張コンポーネント
    │       │   ├── composables/ # 拡張ロジック
    │       │   └── services/    # 拡張サービス
    │       └── custom/          # 企業固有機能実装
    │           ├── components/  # カスタムコンポーネント
    │           ├── views/       # カスタム画面
    │           ├── api/         # カスタムAPI
    │           └── types/       # カスタム型定義
    │
    └── backend/
        └── src/
            ├── core/            # → templates からコピー（参照のみ・変更禁止）
            ├── extensions/      # 拡張機能実装
            │   ├── middleware/  # 拡張ミドルウェア
            │   ├── services/    # 拡張サービス
            │   └── routes/      # 拡張ルート
            └── custom/          # 企業固有機能実装
                ├── routes/      # カスタムルート
                ├── services/    # カスタムサービス
                └── models/      # カスタムモデル
```

### 🔐 分離原則と影響範囲

| レイヤー | 変更可否 | 影響範囲 | 用途 | 具体例 |
|---------|---------|---------|------|--------|
| **core/** | ❌ 変更禁止 | 全プロジェクト | 共通基盤機能 | ログ監視・認証・権限管理・RBAC |
| **extensions/** | ✅ 拡張可能 | 個別プロジェクト | 共通機能の拡張 | カスタム認証・追加バリデーション |
| **custom/** | ✅ 自由実装 | 個別プロジェクト | 企業固有ロジック | 営業管理・在庫管理・顧客管理 |

### 📋 パスエイリアス設定

#### フロントエンド vite.config.ts
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),           // 共通コア（変更禁止）
      '@extensions': path.resolve(__dirname, 'src/extensions'), // 拡張機能
      '@custom': path.resolve(__dirname, 'src/custom'),       // 企業固有
      '@': path.resolve(__dirname, 'src')                     // ルート
    }
  }
})
```

#### バックエンド tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@core/*": ["src/core/*"],           // 共通コア
      "@extensions/*": ["src/extensions/*"], // 拡張機能
      "@custom/*": ["src/custom/*"],       // 企業固有
      "@/*": ["src/*"]                     // ルート
    }
  }
}
```

### 🔧 使用例

#### フロントエンド
```typescript
// ✅ 共通コア: ログ監視コンポーネント（変更禁止）
import { LogMonitoring } from '@core/components/log-monitoring'
import { useLogService } from '@core/composables/useLogService'
import type { Log } from '@core/types/log'

// ✅ 拡張機能: カスタムログフィルター
import { CustomLogFilter } from '@extensions/components/CustomLogFilter'

// ✅ 企業固有: 特定業務ロジック
import { SalesAnalytics } from '@custom/components/SalesAnalytics'
```

#### バックエンド
```typescript
// ✅ 共通コア: 認証・ログ収集（変更禁止）
import { authenticate, authorize } from '@core/middleware/auth'
import { LogController } from '@core/controllers/LogController'
import { prisma } from '@core/lib/prisma'

// ✅ 拡張機能: カスタム認証拡張
import { customAuthMiddleware } from '@extensions/middleware/customAuth'

// ✅ 企業固有: 業務API
import { SalesReportService } from '@custom/services/SalesReportService'
```

### 🔄 更新フロー

#### 共通ライブラリ更新時
```bash
# 1. templates/ 更新（共通リポジトリ）
cd enterprise-commons/templates/frontend/src/core
git commit -m "feat(core): add new log export feature"

# 2. 各プロジェクトで更新適用
cd workspace/frontend/src/core
rsync -av --delete ../../../../templates/frontend/src/core/ ./

# 3. extensions/ と custom/ は影響なし（独立）
```

#### 企業固有機能実装時
```bash
# custom/ 内で完全独立実装
cd workspace/frontend/src/custom
# core/ に影響なし
# extensions/ に影響なし
```

### 🛡️ 自動保護設定

#### eslint.config.js
```javascript
export default {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../core/*', '../../core/*'],
            message: 'core/ は @core エイリアスを使用してください（変更禁止）'
          }
        ]
      }
    ]
  }
}
```

## 主要コマンド

### 環境セットアップ
```bash
# 初回セットアップ（テンプレートコピー + 環境起動）
./setup.sh

# テンプレートの再コピー
./init.sh

# 環境操作
docker-compose up -d     # 起動
docker-compose down      # 停止
docker-compose logs -f   # ログ確認
```

### 開発コマンド
```bash
# workspace 内で作業
cd workspace/frontend    # フロントエンド開発
cd workspace/backend     # バックエンド開発

# 開発サーバーはDocker内で自動起動
# ファイル変更でホットリロード
```

## 重要な設計原則

### 1. ソースコード分離
- `templates/`: ひな形（編集禁止）
- `workspace/`: 実際の開発ソース（編集対象）
- 初回のみテンプレートから workspace にコピー

### 2. Git管理の分離
- Docker環境: enterprise-commons/.git で管理
- 開発ソース: workspace/.git で独立管理
- workspace/ は Docker環境のコミット対象外

### 3. 開発フロー
1. `./setup.sh` で環境構築
2. `workspace/` 内でソースコード編集
3. `workspace/` 内で独自にGit管理
4. Docker環境更新時は templates/ のみ更新

## アーキテクチャ

### 3層構造 (各ポート)
- Frontend: 3000 (Vue.js + Element Plus)
- Backend: 8000 (Express + Prisma)
- PostgreSQL: 5432

### ホットリロード
- frontend/backend 両方でファイル変更を自動検知
- Docker volumeマウントで workspace/ と連携

## 編集時の注意

### 編集対象
- `workspace/frontend/`: フロントエンド開発
- `workspace/backend/`: バックエンド開発
- `docker-compose.yml`: 環境設定
- `templates/`: テンプレート更新

### 編集禁止
- `workspace/` は自動生成（編集する場合は workspace/ 内で直接編集）

## 開発環境の特徴

- **TypeScript フルサポート** - フロントエンド〜バックエンド〜データベース完全型安全
- **Element Plus 自動インポート** - Vue 3 Composition API・カスタマイズUI
- **Prisma ORM** - 統一データベース管理・マイグレーション・型安全操作
- **JWT認証・RBAC** - 権限テンプレート・権限継承・監査ログ完全実装
- **レスポンシブUI** - 全ブレークポイント・アクセシビリティ・BIZ UDゴシック
- **WebSocketリアルタイム** - アラート・統計・ログ監視即座更新
- **単体試験完備** - Jest (バックエンド) ・Vitest (フロントエンド) ・63項目実装
- **包括的ログ監視** - 収集・検索・統計・アラート・エクスポート完全対応（マイクロフロントエンド型分割済み）

## ログ監視システム

### 概要
アプリケーション全体のログを収集・分析・監視するシステムです。
フロントエンド・バックエンド・データベース・インフラの各層からログを集約し、
リアルタイム監視とアラート機能を提供します。

### アーキテクチャ - マイクロフロントエンド型分割
性能最適化のため、LogMonitoring.vueは8つの独立コンポーネントに分割済み：

```
LogMonitoring.vue (メインコンテナ: 150行)
├── LogMonitoringHeader (80行) - WebSocket状態・更新ボタン
├── LogStatsDashboard (120行) - 統計カード・リアルタイム数値
├── LogRealtimePanel (150行) - リアルタイムログ・WebSocket連携
├── LogSearchPanel (200行) - 検索フォーム・フィルター
├── LogDetailDialog (100行) - ログ詳細モーダル
├── LogAlertPanel (120行) - アラート一覧・通知管理
├── LogExportDialog (80行) - エクスポート設定
└── LogSidebar (100行) - クイックフィルター
```

### 性能改善効果
- **初回読み込み**: 36KB → 4KB（89%削減）
- **遅延読み込み**: 必要な機能のみ動的ロード
- **メモリ使用量**: 50%削減（未使用コンポーネント解放）
- **再レンダリング**: 局所的更新で90%削減

### 機能コンポーネント
- **ログ収集** (LogMonitoringHeader): 各ソースからの自動ログ収集
- **ログ検索** (LogSearchPanel): 高度なフィルタリング・検索機能
- **統計・分析** (LogStatsDashboard): 時間別・カテゴリ別統計
- **リアルタイム監視** (LogRealtimePanel): ダッシュボードでの即座な状況把握
- **アラート** (LogAlertPanel): 閾値ベースの自動通知
- **エクスポート** (LogExportDialog): CSV/JSON形式でのデータ出力
- **ログ詳細** (LogDetailDialog): 個別ログ表示・スタックトレース
- **クイックフィルター** (LogSidebar): エラー/警告フィルタ

### ログレベル
```
FATAL: 60 - 致命的エラー (保存期間: 1年)
ERROR: 50 - エラー (保存期間: 1年)
WARN:  40 - 警告 (保存期間: 6ヶ月)
INFO:  30 - 情報 (保存期間: 3ヶ月)
DEBUG: 20 - デバッグ (保存期間: 1ヶ月)
TRACE: 10 - トレース (保存期間: 1ヶ月)
```

### ログカテゴリ
- **AUTH**: 認証関連
- **API**: API呼び出し
- **DB**: データベース操作
- **SEC**: セキュリティ
- **SYS**: システム
- **USER**: ユーザー操作
- **PERF**: パフォーマンス
- **ERR**: エラー処理

### API エンドポイント
```
POST /api/logs           - ログ収集 (認証不要)
GET  /api/logs/search    - ログ検索 (認証必要)
GET  /api/logs/statistics - 統計データ (認証必要)
GET  /api/logs/realtime  - リアルタイム統計 (認証必要)
GET  /api/logs/:id       - ログ詳細 (認証必要)
POST /api/logs/cleanup   - ログクリーンアップ (管理者のみ)
GET  /api/logs/export    - ログエクスポート (管理者のみ)
```

### データベーススキーマ
- **Log**: メインログテーブル
- **LogStatistics**: 統計集計テーブル
- **AlertRule**: アラートルール設定

### 使用方法
```typescript
// フロントエンドからのログ送信
const logs = [{
  timestamp: new Date().toISOString(),
  level: 30,
  category: 'USER',
  source: 'frontend',
  message: 'ユーザーがログインしました',
  userId: 1,
  environment: 'development'
}]

await fetch('/api/logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ logs })
})
```

## データベース管理

### Prismaコマンド
```bash
# スキーマからマイグレーション生成・適用
npx prisma migrate dev --name [migration_name]

# スキーマを直接データベースに反映
npx prisma db push

# Prisma Client 再生成
npx prisma generate

# データベース管理画面起動
npx prisma studio

# データベースリセット (開発環境のみ)
npx prisma migrate reset --force
```

### 本番環境での注意
- `npx prisma migrate reset` は本番環境で実行禁止
- マイグレーションは事前テスト必須
- バックアップ取得後にスキーマ変更実行

## API認証システム

### JWT認証
- ヘッダー: `Authorization: Bearer <token>`
- 有効期限: 7日間
- リフレッシュトークン対応

### 権限レベル
- **USER**: 一般ユーザー
- **ADMIN**: 管理者 (全機能アクセス可能)

### 保護されたエンドポイント
- 認証必要: ログ検索・統計・詳細表示
- 管理者のみ: ログクリーンアップ・エクスポート

## 権限テンプレート・RBAC システム

### 概要
Role-Based Access Control (RBAC) による細かい権限制御システムです。
権限テンプレート機能により、部署・役職ごとの権限設定を効率化し、
監査ログによる権限変更の完全追跡を実現しています。

### 主要機能
- **権限テンプレート管理**: カスタム・プリセットテンプレートの作成・管理
- **権限マトリクス表示**: 部署×機能の権限一覧・視覚的権限確認
- **一括権限適用**: テンプレートの部署一括適用・効率的権限設定
- **プリセット保護**: ADMIN・GENERAL・READONLYテンプレートの変更保護
- **監査ログ**: 権限変更履歴の完全記録・コンプライアンス対応

### 権限テンプレートAPI
```
GET    /api/permissions/templates              - テンプレート一覧取得
POST   /api/permissions/templates              - テンプレート作成
PUT    /api/permissions/templates/:id          - テンプレート更新
DELETE /api/permissions/templates/:id          - テンプレート削除
POST   /api/permissions/templates/:id/apply    - テンプレート適用
GET    /api/permissions/matrix                 - 権限マトリクス取得
```

### データベーススキーマ
- **permission_templates**: 権限テンプレートマスタ
- **permission_template_features**: テンプレート機能権限設定

### 使用例
```typescript
// 権限テンプレート作成
const template = {
  companyId: 1,
  name: "営業部権限",
  description: "営業部向けの標準権限設定",
  category: "CUSTOM",
  features: [
    { featureId: 1, canView: true, canCreate: true, canEdit: false }
  ]
}

await fetch('/api/permissions/templates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(template)
})
```

## 単体試験システム

### テスト構成
- **バックエンド**: Jest + Supertest + 30項目のAPI試験
- **フロントエンド**: Vitest + Vue Test Utils + 18項目のコンポーネント試験
- **統合・性能・セキュリティ**: 15項目の包括的試験
- **テストカバレッジ**: バックエンド100%・フロントエンド95%

### 実装済み試験
- **認証・認可試験**: JWT・権限チェック・セキュリティ
- **バリデーション試験**: 入力検証・エラーハンドリング
- **データベース試験**: CRUD操作・トランザクション・制約チェック
- **UI試験**: コンポーネント・イベント・プロップス・リアクティブデータ

### 試験実行コマンド
```bash
# バックエンド試験
cd workspace/backend
npm test                    # 全試験実行
npm run test:coverage       # カバレッジ付き実行
npm test -- __tests__/permissionTemplate.test.ts  # 特定試験実行

# フロントエンド試験
cd workspace/frontend
npm test                    # 全試験実行
npm run test:coverage       # カバレッジ付き実行
npm test -- src/views/__tests__/PermissionTemplate.test.ts  # 特定試験実行
```

## 品質管理・BUG管理

### BUG管理プロセス
1. **発見・記録**: 不具合管理表への詳細記録
2. **修正・対策**: 根本原因分析・修正実装
3. **水平展開チェック**: 同様問題の予防的発見・修正
4. **再発防止**: プロセス改善・チェックリスト更新

### 緊急対応フロー（2025-09-26追加）
1. **CRITICAL級**: 1時間以内の緊急対応・即座修正
2. **原因分析**: ログ確認・エラー特定・影響範囲調査
3. **迅速修正**: 最小限の変更で確実な修正実施
4. **動作確認**: 全APIエンドポイントの動作検証
5. **水平展開**: 類似問題の予防的修正

### 水平展開チェック項目
- Prismaモデル名統一性確認
- テーブル名・リレーション名整合性確認
- 認証・権限チェック統一性確認
- エラーハンドリング統一性確認
- TypeScript型定義整合性確認
- **APIルーティング順序確認** (新規追加)
- **フロントエンドAPIコール正確性確認** (新規追加)

### 品質指標 (2025-09-26時点)
- **BUG解決率**: 87.5% (7/8件解決済み) - CRITICAL級100%解決
- **緊急対応時間**: 1時間以内 (CRITICAL級BUG対応)
- **水平展開効果**: 675% (52件修正/8件発生)
- **システム完成度**: 99% ⬆️ (+1%向上)
- **API稼働率**: 100% (全エンドポイント正常動作)
- **テストカバレッジ**: 95%以上

### 最新修正実績
- **BUG #011 (CRITICAL)**: APIエンドポイント404エラー - 1時間以内修正完了
- **影響範囲**: ログ監視システム全機能復旧
- **修正効果**: 52件の潜在的問題を予防修正
---

## 🗄️ Prismaデータベース操作の絶対ルール（拡張）

### 背景
過去30件の不具合分析の結果、**Prismaモデル名エラーが全体の40%（12件）** を占めることが判明しました。
単数形/複数形、camelCase/snake_caseの混在により、システム全体で66箇所の潜在的問題が発見されています。

### ✅ 必須チェックリスト

#### 1. モデル名の正確性

**実装前に必ず `backend/prisma/schema.prisma` を確認してください。**

```typescript
// ❌ 絶対禁止: 単数形・typo・存在しないモデル名
prisma.user.findMany()           // 誤: user
prisma.log.findMany()            // 誤: log
prisma.company.findMany()        // 誤: company
prisma.feature.findMany()        // 誤: feature
prisma.department.findMany()     // 誤: department
prisma.userss.findMany()         // 誤: typo

// ✅ 正しい: schema.prismaで定義された正確なモデル名
prisma.users.findMany()          // 正: users（複数形）
prisma.logs.findMany()           // 正: logs（複数形）
prisma.companies.findMany()      // 正: companies（複数形）
prisma.features.findMany()       // 正: features（複数形）
prisma.departments.findMany()    // 正: departments（複数形）
prisma.user_sessions.findMany()  // 正: user_sessions（snake_case）
prisma.alert_rules.findMany()    // 正: alert_rules（snake_case）
prisma.log_statistics.findMany() // 正: log_statistics（snake_case）
prisma.audit_logs.findMany()     // 正: audit_logs（snake_case）
```

#### 2. リレーション名の正確性

```typescript
// ❌ 絶対禁止: 推測・省略形・単数形
include: {
  user: true,              // 誤: リレーション名は users
  company: true,           // 誤: リレーション名は companies
  primaryDepartment: true  // 誤: リレーション名は departments
}

// ✅ 正しい: schema.prismaで定義された正確なリレーション名
include: {
  users: true,       // 正: schema.prismaのリレーション名を使用
  companies: true,   // 正: schema.prismaのリレーション名を使用
  departments: true  // 正: schema.prismaのリレーション名を使用
}
```

#### 3. 必須フィールドの確認

```typescript
// ❌ 絶対禁止: 必須フィールドの欠落
await prisma.permission_templates.create({
  data: {
    name: "テンプレート",
    companyId: 1
    // updatedAt が欠落している場合エラーになる可能性
  }
})

// ✅ 正しい: schema.prismaで@defaultがない必須フィールドは明示的に設定
await prisma.permission_templates.create({
  data: {
    name: "テンプレート",
    companyId: 1,
    updatedAt: new Date()  // 必須フィールドを明示的に設定
  }
})
```

### 🔍 実装前の必須確認手順

**ステップ1: schema.prismaを開く**
```bash
# backend/prisma/schema.prisma を必ず確認
```

**ステップ2: 使用するモデル定義を確認**
```prisma
model users {  // ← これが正確なモデル名
  id           Int       @id @default(autoincrement())
  username     String    @unique
  companies    companies @relation(fields: [companyId], references: [id])  // ← リレーション名
  // ...
}
```

**ステップ3: コード内で正確に使用**
```typescript
// モデル名: users（複数形）
const user = await prisma.users.findUnique({
  where: { id: 1 },
  include: {
    companies: true  // リレーション名: companies
  }
})
```

### 🚨 典型的エラーパターンと対処法

#### エラー1: "Cannot read properties of undefined (reading 'findMany')"
```
原因: モデル名が間違っている
対処: schema.prismaで正確なモデル名を確認
実例: prisma.user.findMany() → prisma.users.findMany()
```

#### エラー2: "Argument `updatedAt` is missing"
```
原因: 必須フィールドが欠落している
対処: schema.prismaで必須フィールド(@defaultなし)を確認
実例: data: { name, companyId, updatedAt: new Date() }
```

#### エラー3: "Unknown field 'user' for select statement"
```
原因: リレーション名が間違っている
対処: schema.prismaで正確なリレーション名を確認
実例: include: { user: true } → include: { users: true }
```

### 📝 水平展開チェック（必須実施）

Prisma操作を1箇所修正した場合、以下のコマンドで全体をチェック：

```bash
# 水平展開チェックコマンド（コピペ可能）
grep -r "prisma\.user\." backend/src/     # 単数形userの誤用チェック
grep -r "prisma\.log\." backend/src/      # 単数形logの誤用チェック
grep -r "prisma\.company\." backend/src/  # 単数形companyの誤用チェック
grep -r "prisma\.feature\." backend/src/  # 単数形featureの誤用チェック
```

**水平展開チェックリスト**:
- [ ] 同じモデルを使用する全ファイルをgrep検索
- [ ] 単数形・複数形の統一性を確認
- [ ] camelCaseとsnake_caseの混在をチェック
- [ ] typo（userss等）の有無を確認
- [ ] リレーション名の一致を確認

**実績**: 水平展開チェックにより347%の予防効果（66件の潜在的問題を事前修正）

---

## 🔌 API実装の統一パターン

### 背景
APIエンドポイント問題が全体の23%（7件）を占め、ルーティング順序・環境変数対応の不備が主な原因です。

### 1. バックエンドAPIルーティング順序の厳守

**ルール**: 動的ルート（`:id`）は必ず静的ルートの後に配置

```typescript
// ❌ 絶対禁止: 動的ルートが先
router.get('/logs/:id', getLogById)           // 先に動的ルート
router.get('/logs/statistics', getStatistics) // 後に静的ルート
// 結果: /logs/statistics が /logs/:id にマッチしてしまう（404エラー）

// ✅ 正しい: 静的ルートを先に配置
router.get('/logs/statistics', getStatistics) // 先に静的ルート
router.get('/logs/realtime', getRealtime)     // 先に静的ルート
router.get('/logs/search', searchLogs)        // 先に静的ルート
router.get('/logs/:id', getLogById)           // 最後に動的ルート
```

**水平展開チェック**: 新規APIルート追加時は全ルートファイルで順序を確認
```bash
grep -A 5 "router\.get.*:id" backend/src/routes/*.ts
```

### 2. フロントエンドAPI基底URL設定

**ルール**: 環境変数対応のプロキシ設定を必ず使用

```typescript
// ❌ 絶対禁止: ハードコードされた基底URL
const API_BASE_URL = 'http://localhost:8000/api'

// ✅ 正しい: 環境変数対応の設定
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://backend:8000',
        changeOrigin: true
      }
    }
  }
})

// .env.local (ローカル環境)
VITE_API_BASE_URL=http://localhost:8000

// .env.docker (Docker環境)
VITE_API_BASE_URL=http://backend:8000
```

### 3. API呼び出しの統一パターン

```typescript
// ✅ 正しい: 相対パスでAPI呼び出し（プロキシ経由）
await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

// ❌ 禁止: 絶対URLの直接指定（環境依存になる）
await fetch('http://localhost:8000/api/users')
```

### 4. エラーハンドリングの統一

```typescript
// ✅ 必須パターン
try {
  const response = await fetch('/api/users')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  const data = await response.json()
  return data
} catch (error) {
  console.error('[API Error]', error)
  ElMessage.error(error.message || 'システムエラーが発生しました')
  throw error
}
```

**水平展開チェック**:
```bash
grep -r "http://localhost" frontend/src/  # ハードコードチェック
grep -r "http://backend" frontend/src/    # ハードコードチェック
```

---

## 🎨 フロントエンド品質保証ガイドライン

### 背景
フロントエンド実装問題が全体の20%（6件）を占め、リアクティブデータ・モバイル対応の不備が主な原因です。

### 1. Vueリアクティブデータの正しい使用

```typescript
// ❌ 絶対禁止: 非リアクティブデータの使用
let count = 0  // 画面更新されない

// ✅ 正しい: ref/reactiveの使用
import { ref, reactive } from 'vue'
const count = ref(0)
const state = reactive({ count: 0 })
```

### 2. 条件分岐でのnull/undefinedチェック

```vue
<!-- ❌ 絶対禁止: チェックなしのプロパティアクセス -->
<div>{{ user.name }}</div>

<!-- ✅ 正しい: オプショナルチェーン使用 -->
<div>{{ user?.name }}</div>

<!-- ✅ 正しい: v-ifでのnullチェック -->
<div v-if="user">{{ user.name }}</div>
```

### 3. レスポンシブ対応の必須実装

```vue
<template>
  <!-- ✅ 必須: モバイル・デスクトップ両対応 -->
  <el-row :gutter="isMobile ? 10 : 20">
    <el-col :xs="24" :sm="12" :md="8">
      <!-- コンテンツ -->
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)
</script>
```

### 4. ユーティリティファイルの必須配置

**必須ファイル（欠落防止）**:
- `src/utils/auth.ts` - 認証ヘルパー
- `src/utils/date.ts` - 日付フォーマット
- `src/utils/validation.ts` - バリデーション
- `src/utils/format.ts` - データフォーマット

```typescript
// src/utils/auth.ts（必須）
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

// src/utils/date.ts（必須）
export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleString('ja-JP')
}
```

**水平展開チェック**:
```bash
ls -la frontend/src/utils/auth.ts        # 必須ファイル存在確認
ls -la frontend/src/utils/date.ts        # 必須ファイル存在確認
ls -la frontend/src/utils/validation.ts  # 必須ファイル存在確認
```

---

## 🔒 認証・権限実装の絶対ルール

### 背景
認証・権限問題が全体の13%（4件）を占め、トークンリフレッシュ・複数タブ同期の不備がUX低下を招いています。

### 1. トークンリフレッシュの必須実装

```typescript
// ✅ 必須: 401エラー時の自動トークンリフレッシュ
async function apiCall(url: string, options: RequestInit) {
  try {
    let response = await fetch(url, options)

    // 401エラー時: トークンリフレッシュを試行
    if (response.status === 401) {
      const refreshed = await refreshToken()
      if (refreshed) {
        // リトライ
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${getNewToken()}`
          }
        })
      } else {
        // リフレッシュ失敗: ログイン画面へ
        router.push('/login')
      }
    }

    return response
  } catch (error) {
    console.error('[API Error]', error)
    throw error
  }
}
```

### 2. 複数タブ認証状態同期の必須実装

```typescript
// ✅ 必須: localStorage変更イベント監視
// stores/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)

  // 他タブでのログアウト検知
  window.addEventListener('storage', (e) => {
    if (e.key === 'token' && !e.newValue) {
      // トークン削除検知: 自動ログアウト
      isAuthenticated.value = false
      router.push('/login')
    }
  })

  return { isAuthenticated }
})
```

### 3. エラーメッセージの重複抑制

```typescript
// ✅ 必須: 同一メッセージの重複表示防止（3秒間）
const lastErrorMessage = ref('')
const lastErrorTime = ref(0)

function showError(message: string) {
  const now = Date.now()
  if (message === lastErrorMessage.value && now - lastErrorTime.value < 3000) {
    return // 3秒以内の同一メッセージは表示しない
  }

  lastErrorMessage.value = message
  lastErrorTime.value = now
  ElMessage.error(message)
}
```

### 4. 権限チェックの3層防御（必須）

```typescript
// ✅ Layer 1: ルートガード（フロントエンド）
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return next('/login')
  }
  next()
})

// ✅ Layer 2: バックエンドミドルウェア（サーバー側）
router.get('/api/users', authenticate, authorize('ADMIN'), getUsers)

// ✅ Layer 3: UIコンポーネント（表示制御）
<el-button v-if="hasPermission('users', 'create')">
  ユーザー追加
</el-button>
```

---

## 🔄 水平展開チェックの絶対実施

### 背景
水平展開チェックにより**347%の予防効果**（66件の潜在的問題を事前修正）を実現しています。

### 必須実施タイミング

1. **不具合修正完了時** - 必ず同様問題を全体検索
2. **新機能実装時** - 既存の類似実装との整合性確認
3. **コードレビュー時** - パターンの統一性確認

### 水平展開チェックコマンド（必須実行）

```bash
# 1. Prismaモデル名チェック（最重要・40%のBUG原因）
grep -r "prisma\.user\." backend/src/     # 単数形userの誤用
grep -r "prisma\.log\." backend/src/      # 単数形logの誤用
grep -r "prisma\.company\." backend/src/  # 単数形companyの誤用
grep -r "prisma\.feature\." backend/src/  # 単数形featureの誤用

# 2. CLAUDE.mdガイドライン違反チェック
grep -r "new PrismaClient()" backend/src/ # 個別PrismaClient作成禁止

# 3. APIルーティング順序チェック
grep -A 5 "router\.get.*:id" backend/src/routes/*.ts

# 4. 環境変数ハードコードチェック
grep -r "http://localhost" frontend/src/
grep -r "http://backend" frontend/src/

# 5. ユーティリティファイル存在チェック
ls -la frontend/src/utils/auth.ts
ls -la frontend/src/utils/date.ts
```

### チェックリスト形式での記録（必須）

```markdown
## 水平展開チェック実施記録

**対象BUG/機能**: BUG-XXX / T-XXX
**実施日**: YYYY-MM-DD
**実施者**:

### チェック項目

- [ ] 同じファイル内の類似コード確認
- [ ] 同じディレクトリ内の類似ファイル確認
- [ ] 同じPrismaモデルを使用する全ファイル確認
- [ ] 同じAPIパターンを使用する全エンドポイント確認
- [ ] 関連するフロントエンドコンポーネント確認
- [ ] CLAUDE.mdガイドライン違反チェック
- [ ] 環境変数ハードコードチェック

### 発見・修正した問題

| ファイル | 問題内容 | 修正内容 |
|---------|---------|---------|
|         |         |         |

### 予防効果

- 直接修正: X箇所
- 水平展開で予防: Y箇所
- 予防率: Z%
```

---

## 📊 ガイドライン適用による期待効果

### 定量的効果予測

| 指標 | 現状 | 目標 | 改善率 |
|------|------|------|--------|
| Prismaエラー発生率 | 40% | 5%以下 | -87.5% |
| APIエンドポイント問題 | 23% | 5%以下 | -78% |
| フロントエンドバグ | 20% | 5%以下 | -75% |
| 水平展開予防率 | 347% | 500%以上 | +44% |
| 初回実装成功率 | 60% | 95%以上 | +58% |

### 定性的効果

- ✅ **開発速度向上**: チェックリストにより迷わず実装
- ✅ **レビュー時間短縮**: パターン統一により確認容易
- ✅ **新規メンバーオンボーディング**: 明確なガイドラインで学習容易
- ✅ **本番環境トラブル削減**: 環境変数対応・エラー処理の徹底

---

**ガイドライン更新日**: 2025-10-06
**元データ**: 不具合管理表30件・改善タスク23件の実績分析
**水平展開実績**: 347%（66件の潜在的問題を予防）
