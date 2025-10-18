# Gitリポジトリ構成管理ガイド

このドキュメントでは、WebSys共通ライブラリと企業プロジェクトのGitリポジトリ構成のベストプラクティスを説明します。

---

## 📋 目次

1. [現状の問題点](#現状の問題点)
2. [推奨リポジトリ構成](#推奨リポジトリ構成)
3. [移行手順](#移行手順)
4. [リポジトリ運用ルール](#リポジトリ運用ルール)
5. [トラブルシューティング](#トラブルシューティング)

---

## 現状の問題点

### ❌ 問題のある構成

```
websys/
├── .git/                           # → jun-kg/WebSys
├── workspace/                      # .gitignore で無視
│   ├── .git/                      # → jun-kg/WebSys（同じリポジトリ！）
│   ├── backend/
│   └── frontend/
├── backend/
├── frontend/
└── templates/
```

### 問題点

| 問題 | 詳細 | 影響 |
|------|------|------|
| **1. 2重Git管理** | websys/.git と workspace/.git が存在 | コミット履歴混在・混乱 |
| **2. 同一リモート** | 両方とも同じGitHubリポジトリ | 管理が煩雑 |
| **3. workspace が無視** | .gitignore で workspace/ を無視 | 変更が反映されない |
| **4. 企業間分離なし** | 全企業が同じリポジトリを見る可能性 | セキュリティリスク |

---

## 推奨リポジトリ構成

### ✅ ベストプラクティス: 完全分離型

```
プロジェクト構成:

/home/user/projects/
│
├── websys/                          # ①共通ライブラリリポジトリ
│   ├── .git/                       # → GitHub: jun-kg/WebSys
│   ├── backend/                    # 共通コア開発
│   ├── frontend/                   # 共通コア開発
│   ├── templates/                  # 配布用テンプレート
│   ├── scripts/                    # 自動化スクリプト
│   ├── docs/                       # ドキュメント
│   ├── RELEASE.md                  # リリース管理
│   └── README.md
│   （workspace/ は存在しない）
│
├── company-a-project/              # ②企業Aプロジェクト
│   ├── .git/                       # → GitHub: company-a/internal-system
│   ├── backend/
│   │   └── src/
│   │       ├── core/              # ← websys からコピー（変更禁止）
│   │       ├── extensions/        # 企業A拡張
│   │       └── custom/            # 企業A固有
│   ├── frontend/
│   │   └── src/
│   │       ├── core/              # ← websys からコピー（変更禁止）
│   │       ├── extensions/        # 企業A拡張
│   │       └── custom/            # 企業A固有
│   └── README.md
│
└── company-b-project/              # ③企業Bプロジェクト
    ├── .git/                       # → GitHub: company-b/business-app
    └── ...
```

---

## Gitリポジトリマッピング

### 推奨構成

| リポジトリ | 用途 | GitHub URL | アクセス権 | 管理者 |
|-----------|------|-----------|----------|--------|
| **websys** | 共通ライブラリ開発 | `github.com/jun-kg/WebSys` | Public or Private | 開発チーム |
| **company-a-project** | 企業A固有機能 | `github.com/company-a/internal-system` | Private | 企業A |
| **company-b-project** | 企業B固有機能 | `github.com/company-b/business-app` | Private | 企業B |

### メリット

| メリット | 説明 |
|---------|------|
| ✅ **完全独立** | 企業間でコードが分離され、情報漏洩リスクなし |
| ✅ **アクセス制御** | 企業ごとに異なるアクセス権限を設定可能 |
| ✅ **独立リリース** | 各企業が独自のリリースサイクルを持てる |
| ✅ **明確な履歴** | コミット履歴が混在せず、変更追跡が容易 |
| ✅ **セキュリティ** | 企業固有の秘密情報を分離管理 |

---

## 移行手順

### ステップ1: websys リポジトリ整理

#### オプションA: workspace を削除（推奨）

```bash
cd /path/to/websys

# workspace を完全削除
# 理由: templates/ で代替可能
rm -rf workspace/

# .gitignore から workspace/ 行を削除
sed -i '/^workspace\/$/d' .gitignore

# コミット
git add .
git commit -m "chore: remove workspace directory (use templates instead)"
git push origin master
```

#### オプションB: workspace を別リポジトリへ移行

共通コア開発専用リポジトリとして独立させる場合：

```bash
cd /path/to/websys

# workspace を移動
mv workspace ../websys-development

# .gitignore から workspace/ 行を削除
sed -i '/^workspace\/$/d' .gitignore

# コミット
git add .
git commit -m "chore: move workspace to separate repository"
git push origin master

# 別リポジトリとして初期化
cd ../websys-development
rm -rf .git
git init
git add .
git commit -m "chore: initial commit for development environment"

# GitHubで新規リポジトリ作成: jun-kg/WebSys-Development
git remote add origin https://github.com/jun-kg/WebSys-Development.git
git branch -M main
git push -u origin main
```

---

### ステップ2: 企業プロジェクトのリモート設定

#### company-a-project の設定

```bash
cd /path/to/company-a-project

# 現在のリモート確認
git remote -v
# （リモートが未設定の場合）

# GitHubで新規プライベートリポジトリ作成
# 例: company-a/internal-system

# リモート追加
git remote add origin https://github.com/company-a/internal-system.git

# ブランチ名変更（必要に応じて）
git branch -M main

# 初回プッシュ
git push -u origin main
```

#### company-b-project の設定

```bash
cd /path/to/company-b-project

# 同様にリモート設定
git remote add origin https://github.com/company-b/business-app.git
git branch -M main
git push -u origin main
```

---

### ステップ3: .gitignore 最適化

#### websys/.gitignore

```gitignore
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

# Backup
.core-backup-*/

# 注意: workspace/ は削除済み
```

#### company-a-project/.gitignore

```gitignore
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

# WebSys core backup
.core-backup-*/

# 重要: core/ はコミット対象（変更禁止だが履歴管理）
# core/ を .gitignore に入れない！
```

---

## リポジトリ運用ルール

### websys リポジトリ

#### 目的
共通ライブラリの開発・配布

#### コミット対象
- ✅ `backend/` - 共通コア開発
- ✅ `frontend/` - 共通コア開発
- ✅ `templates/` - 配布用テンプレート
- ✅ `scripts/` - 自動化スクリプト
- ✅ `docs/` - ドキュメント
- ✅ `RELEASE.md` - リリース管理
- ❌ `workspace/` - 削除済み

#### ブランチ戦略

```
master (main)
├── develop              # 開発ブランチ
│   ├── feature/xxx     # 機能開発
│   └── fix/xxx         # バグ修正
└── release/v1.0.0      # リリースブランチ
```

#### リリースフロー

```bash
# 1. 開発ブランチで機能開発
git checkout -b feature/log-export develop

# 2. 開発完了後、develop にマージ
git checkout develop
git merge feature/log-export

# 3. リリース準備
git checkout -b release/v1.0.0 develop

# 4. リリース作成
./scripts/release.sh 1.0.0 stable

# 5. master にマージ
git checkout master
git merge release/v1.0.0
git push origin master --tags

# 6. develop にマージバック
git checkout develop
git merge master
```

---

### 企業プロジェクトリポジトリ

#### 目的
企業固有機能の開発

#### コミット対象
- ✅ `backend/src/core/` - WebSysからコピー（変更禁止だが履歴管理）
- ✅ `backend/src/extensions/` - 拡張機能
- ✅ `backend/src/custom/` - 企業固有機能
- ✅ `frontend/src/core/` - WebSysからコピー（変更禁止だが履歴管理）
- ✅ `frontend/src/extensions/` - 拡張機能
- ✅ `frontend/src/custom/` - 企業固有機能
- ✅ `infrastructure/` - Docker設定
- ✅ `.env.example` - 環境変数サンプル
- ❌ `.env` - 環境変数（機密情報）

#### ブランチ戦略

```
main
├── develop              # 開発ブランチ
│   ├── feature/xxx     # 機能開発
│   └── fix/xxx         # バグ修正
├── staging             # ステージング環境
└── production          # 本番環境
```

#### WebSys更新の反映

```bash
# 1. WebSys最新版を取得
cd /path/to/websys
git pull origin master
git checkout v1.1.0-stable  # 安定版タグ

# 2. 企業プロジェクトに適用
cd /path/to/company-a-project
git checkout -b update/websys-v1.1.0 develop

# 3. update-core.sh実行
/path/to/websys/scripts/update-core.sh

# 4. 動作確認
npm run test

# 5. コミット
git add backend/src/core frontend/src/core
git commit -m "chore: update WebSys core to v1.1.0-stable"

# 6. develop にマージ
git checkout develop
git merge update/websys-v1.1.0
git push origin develop
```

---

## セキュリティベストプラクティス

### 1. アクセス権限管理

| リポジトリ | 推奨設定 | 理由 |
|-----------|---------|------|
| **websys** | Public or Private | 共通ライブラリとして配布 |
| **company-a-project** | Private（企業Aのみ） | 企業固有の機密情報を保護 |
| **company-b-project** | Private（企業Bのみ） | 企業固有の機密情報を保護 |

### 2. .env ファイル管理

```bash
# ❌ 絶対禁止: .env をコミット
git add .env

# ✅ 正しい: .env.example のみコミット
git add .env.example
```

**.env.example の例:**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT Secret（本番環境では必ず変更）
JWT_SECRET=your-secret-key-change-in-production

# API URL
VITE_API_BASE_URL=http://localhost:8000
```

### 3. 機密情報のスキャン

```bash
# git-secrets インストール（推奨）
# https://github.com/awslabs/git-secrets

# 機密情報チェック
git secrets --scan

# pre-commit hook 設定
git secrets --install
git secrets --register-aws
```

---

## トラブルシューティング

### Q1: workspace/ を削除後、共通コア開発はどこで行う？

**A:** 直接 `websys/backend/` と `websys/frontend/` で開発します。

```bash
cd /path/to/websys/backend
# 共通コア機能を開発

# テンプレート生成
cd /path/to/websys
./scripts/build-templates.sh
```

### Q2: 企業プロジェクトのリモートURLを変更したい

**A:** リモートURLを更新します。

```bash
cd /path/to/company-a-project

# 現在のリモート確認
git remote -v

# リモートURL変更
git remote set-url origin https://github.com/new-org/new-repo.git

# 確認
git remote -v
```

### Q3: 誤って core/ を変更してしまった

**A:** WebSysから再度コピーします。

```bash
cd /path/to/company-a-project

# バックアップから復元（update-core.sh実行時のバックアップ）
cp -r .core-backup-YYYYMMDD-HHMMSS/backend-core/* backend/src/core/
cp -r .core-backup-YYYYMMDD-HHMMSS/frontend-core/* frontend/src/core/

# または、WebSysから再取得
cd /path/to/websys
git checkout v1.0.0-stable

cd /path/to/company-a-project
/path/to/websys/scripts/update-core.sh
```

### Q4: 2つの企業プロジェクトで異なるWebSysバージョンを使いたい

**A:** 各企業プロジェクトで異なるタグを使用できます。

```bash
# 企業A: v1.0.0を使用
cd /path/to/websys
git checkout v1.0.0-stable
cd /path/to/company-a-project
/path/to/websys/scripts/update-core.sh

# 企業B: v1.1.0を使用
cd /path/to/websys
git checkout v1.1.0-stable
cd /path/to/company-b-project
/path/to/websys/scripts/update-core.sh
```

---

## チェックリスト

### WebSys リポジトリ整理

- [ ] workspace/ を削除 or 別リポジトリへ移行
- [ ] .gitignore から `workspace/` 行を削除
- [ ] 変更をコミット・プッシュ
- [ ] リリース管理（RELEASE.md）を確認

### 企業プロジェクトセットアップ

- [ ] GitHubでプライベートリポジトリ作成
- [ ] リモートURL設定（`git remote add origin`）
- [ ] .gitignore 設定（.env を必ず無視）
- [ ] README.md 作成
- [ ] 初回プッシュ（`git push -u origin main`）

### セキュリティチェック

- [ ] .env ファイルが .gitignore に含まれている
- [ ] .env.example のみコミット対象
- [ ] アクセス権限が正しく設定されている（Private）
- [ ] 機密情報がコミットされていない

---

## まとめ

### ✅ 推奨構成

```
リポジトリ分離:
├── websys (jun-kg/WebSys)
│   └── 共通ライブラリ開発・配布
│
├── company-a-project (company-a/internal-system)
│   └── 企業A固有機能（完全独立）
│
└── company-b-project (company-b/business-app)
    └── 企業B固有機能（完全独立）
```

### 重要な原則

1. **完全分離**: websys と 企業プロジェクト は別リポジトリ
2. **アクセス制御**: 企業プロジェクトは Private リポジトリ
3. **セキュリティ**: .env など機密情報は絶対コミットしない
4. **core/ 管理**: 変更禁止だが履歴管理のためコミット対象

---

**ドキュメントバージョン**: 1.0.0
**最終更新日**: 2025-10-18
**対象WebSysバージョン**: v1.0.0以降
