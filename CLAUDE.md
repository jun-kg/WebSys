# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- ログ監視システム実装済み

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