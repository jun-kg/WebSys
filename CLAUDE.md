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