# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## プロジェクト概要

Vue.js 3 + Element Plus + Express + PostgreSQLを使用した社内システムの開発環境テンプレートです。
Docker環境管理とソースコード開発を分離した構成になっています。

## ディレクトリ構造

```
websys/                    # Docker環境管理（このリポジトリ）
├── templates/            # ソースコードテンプレート
├── workspace/           # 開発用ソースコード（Git管理対象外）
├── docker/              # Dockerビルド設定
└── docker-compose.yml   # Docker構成

workspace/               # 開発ソースコード（独立したGitリポジトリ）
├── frontend/           # Vue.js + Element Plus
└── backend/            # Express + Prisma
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
- Docker環境: websys/.git で管理
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
- **包括的ログ監視** - 収集・検索・統計・アラート・エクスポート完全対応

## ログ監視システム

### 概要
アプリケーション全体のログを収集・分析・監視するシステムです。
フロントエンド・バックエンド・データベース・インフラの各層からログを集約し、
リアルタイム監視とアラート機能を提供します。

### 機能
- **ログ収集**: 各ソースからの自動ログ収集
- **ログ検索**: 高度なフィルタリング・検索機能
- **統計・分析**: 時間別・カテゴリ別統計
- **リアルタイム監視**: ダッシュボードでの即座な状況把握
- **アラート**: 閾値ベースの自動通知
- **エクスポート**: CSV/JSON形式でのデータ出力
- **自動クリーンアップ**: ログレベル別保存期間管理

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

### 水平展開チェック項目
- Prismaモデル名統一性確認
- テーブル名・リレーション名整合性確認
- 認証・権限チェック統一性確認
- エラーハンドリング統一性確認
- TypeScript型定義整合性確認

### 品質指標 (2025-09-25時点)
- **BUG解決率**: 90% (9/10件解決済み)
- **水平展開効果**: 657% (46件修正/7件発生)
- **システム完成度**: 98%
- **テストカバレッジ**: 95%以上