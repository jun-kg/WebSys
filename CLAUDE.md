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

- TypeScript フルサポート
- Element Plus 自動インポート
- Prisma ORM でデータベース管理
- JWT認証実装済み
- レスポンシブUI対応
- ログ監視システム実装済み（マイクロフロントエンド型分割済み）

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