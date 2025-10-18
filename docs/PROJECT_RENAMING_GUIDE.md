# プロジェクト名称変更ガイド

> **✅ 実施ステータス: ローカル変更完了（2025-10-18）**
>
> - ✅ ローカルディレクトリ名: `websys` → `enterprise-commons`
> - ✅ ドキュメント内の名称: すべて `Enterprise Commons` に統一
> - ✅ スクリプト出力: `Enterprise Commons` に更新
> - ✅ テンプレート名: `enterprise-commons-backend/frontend` に更新
> - ⏸️ GitHubリポジトリ名: `WebSys`（現状維持）
>
> **GitHubリポジトリ名は将来的に変更可能です。**

このドキュメントでは、「websys」から「enterprise-commons」への名称変更手順と、実施済みの変更内容を説明します。

---

## 📋 目次

1. [名称変更の背景](#名称変更の背景)
2. [推奨プロジェクト名](#推奨プロジェクト名)
3. [影響範囲](#影響範囲)
4. [変更手順](#変更手順)
5. [変更後の構成](#変更後の構成)
6. [チェックリスト](#チェックリスト)

---

## 名称変更の背景

### 現在の問題点

| 問題 | 詳細 |
|------|------|
| **汎用的すぎる** | "Web System"の略称で、具体的な役割が不明確 |
| **区別が曖昧** | 共通ライブラリであることが名前から分からない |
| **説明が必要** | 日本語での補足説明が常に必要 |

### 改善目標

- ✅ 企業向け共通基盤であることが名前から理解できる
- ✅ GitHubでの検索性が高い（業界標準用語使用）
- ✅ 短く覚えやすい
- ✅ 日本語訳がシンプル

---

## 推奨プロジェクト名

### 最優先案: **enterprise-commons**

**理由**:
- 「企業向け共通基盤」という役割が明確
- commons = 共通ライブラリという業界標準用語
- GitHubでの検索性が高い
- 短く覚えやすい
- 日本語訳: 「企業共通基盤」（きぎょうきょうつうきばん）

**リポジトリURL例**:
```
github.com/jun-kg/enterprise-commons
```

### 代替案

| 名称 | 日本語訳 | 特徴 |
|------|---------|------|
| **bizcore-framework** | ビジネス基盤 | Business Core = ビジネス基盤 |
| **platform-commons** | プラットフォーム共通基盤 | 複数プロジェクトの土台という役割が明確 |
| **foundation-lib** | 基盤ライブラリ | Foundation = 基礎・土台 |
| **ent-commons** | 企業共通基盤（短縮形） | enterprise-commons の短縮版 |

---

## 影響範囲

### 1. ディレクトリ名変更

```bash
# 現在
/home/user/projects/enterprise-commons/

# 変更後
/home/user/projects/enterprise-commons/
```

### 2. GitHubリポジトリ名変更

```
# 現在
github.com/jun-kg/Enterprise Commons

# 変更後
github.com/jun-kg/enterprise-commons
```

### 3. ドキュメント更新（全ファイル）

| ファイル | 変更箇所 | 変更内容 |
|---------|---------|---------|
| **README.md** | プロジェクト名・説明 | enterprise-commons → enterprise-commons |
| **CLAUDE.md** | 全体的な説明 | enterprise-commons → enterprise-commons |
| **RELEASE.md** | タイトル・説明 | Enterprise Commons → Enterprise Commons |
| **docs/ENTERPRISE_PROJECT_DEPLOYMENT.md** | 全体的な説明 | enterprise-commons → enterprise-commons |
| **docs/GIT_REPOSITORY_STRUCTURE.md** | リポジトリURL・説明 | enterprise-commons → enterprise-commons |

### 4. スクリプト更新

| スクリプト | 変更箇所 | 変更内容 |
|-----------|---------|---------|
| **scripts/build-templates.sh** | ヘッダー・出力メッセージ | Enterprise Commons → Enterprise Commons |
| **scripts/create-project.sh** | ヘッダー・出力メッセージ | enterprise-commons → enterprise-commons |
| **scripts/update-core.sh** | ヘッダー・説明 | Enterprise Commons → Enterprise Commons |
| **scripts/release.sh** | ヘッダー・出力メッセージ | Enterprise Commons → Enterprise Commons |

### 5. テンプレートファイル

| ファイル | 変更箇所 |
|---------|---------|
| **templates/backend-express/package.json** | name フィールド |
| **templates/frontend-vue/package.json** | name フィールド |
| **templates/backend-express/src/core/VERSION** | Source フィールド |

---

## 変更手順

### ステップ1: ローカルディレクトリ名変更

```bash
# 現在のディレクトリ
cd /home/typho/src/elementplus

# ディレクトリ名変更
mv enterprise-commons enterprise-commons

# 確認
ls -la enterprise-commons
```

### ステップ2: GitHubリポジトリ名変更

#### GitHub Web UIでの変更

1. GitHubリポジトリページを開く: `https://github.com/jun-kg/Enterprise Commons`
2. **Settings** タブをクリック
3. **Repository name** セクションで `enterprise-commons` に変更
4. **Rename** ボタンをクリック

#### ローカルリモートURL更新

```bash
cd /home/typho/src/elementplus/enterprise-commons

# 現在のリモートURL確認
git remote -v

# リモートURL更新
git remote set-url origin https://github.com/jun-kg/enterprise-commons.git

# 確認
git remote -v
```

### ステップ3: ドキュメント更新

#### README.md 更新

```bash
cd /home/typho/src/elementplus/enterprise-commons

# README.md 内の enterprise-commons を enterprise-commons に一括置換
sed -i 's/enterprise-commons/enterprise-commons/g' README.md
sed -i 's/Enterprise Commons/Enterprise Commons/g' README.md
```

#### CLAUDE.md 更新

```bash
sed -i 's/enterprise-commons/enterprise-commons/g' CLAUDE.md
sed -i 's/Enterprise Commons/Enterprise Commons/g' CLAUDE.md
```

#### RELEASE.md 更新

```bash
sed -i 's/Enterprise Commons/Enterprise Commons/g' RELEASE.md
sed -i 's/enterprise-commons/enterprise-commons/g' RELEASE.md
```

#### ドキュメントディレクトリ更新

```bash
# 全ドキュメント一括更新
find docs/ -name "*.md" -exec sed -i 's/enterprise-commons/enterprise-commons/g' {} \;
find docs/ -name "*.md" -exec sed -i 's/Enterprise Commons/Enterprise Commons/g' {} \;
```

### ステップ4: スクリプト更新

```bash
# 全スクリプト一括更新
find scripts/ -name "*.sh" -exec sed -i 's/enterprise-commons/enterprise-commons/g' {} \;
find scripts/ -name "*.sh" -exec sed -i 's/Enterprise Commons/Enterprise Commons/g' {} \;
```

### ステップ5: テンプレート更新

#### backend package.json

```bash
# templates/backend-express/package.json
sed -i 's/"name": "enterprise-commons-backend"/"name": "enterprise-commons-backend"/g' \
  templates/backend-express/package.json
```

#### frontend package.json

```bash
# templates/frontend-vue/package.json
sed -i 's/"name": "enterprise-commons-frontend"/"name": "enterprise-commons-frontend"/g' \
  templates/frontend-vue/package.json
```

#### VERSION ファイル

```bash
# templates/backend-express/src/core/VERSION
sed -i 's|Source: workspace/backend/src/core|Source: enterprise-commons/workspace/backend/src/core|g' \
  templates/backend-express/src/core/VERSION
```

### ステップ6: コミット・プッシュ

```bash
cd /home/typho/src/elementplus/enterprise-commons

# 全変更をステージング
git add .

# コミット
git commit -m "refactor: rename project from enterprise-commons to enterprise-commons

📦 変更内容:
- プロジェクト名: enterprise-commons → enterprise-commons
- リポジトリURL: jun-kg/Enterprise Commons → jun-kg/enterprise-commons
- ドキュメント全面更新
- スクリプト出力メッセージ更新
- テンプレートpackage.json更新

🎯 目的:
- 企業向け共通基盤であることを明確化
- GitHubでの検索性向上
- 理解しやすい名称への変更

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# プッシュ（新しいリモートURL）
git push origin master
```

### ステップ7: 既存企業プロジェクト更新（該当する場合）

既存の企業プロジェクト（company-a-project等）で共通ライブラリパスを更新します。

```bash
# 企業プロジェクトディレクトリで実行
cd /path/to/company-a-project

# README.mdやドキュメント内のパス更新
find . -name "*.md" -exec sed -i 's|/path/to/enterprise-commons|/path/to/enterprise-commons|g' {} \;

# update-core.sh実行時のパス確認
# /path/to/enterprise-commons/scripts/update-core.sh
```

---

## 変更後の構成

### ディレクトリ構成

```
/home/user/projects/
│
├── enterprise-commons/              # 共通ライブラリリポジトリ
│   ├── .git/                       # → github.com/jun-kg/enterprise-commons
│   ├── workspace/
│   ├── templates/
│   ├── scripts/
│   ├── docs/
│   ├── README.md
│   ├── CLAUDE.md
│   └── RELEASE.md
│
├── company-a-project/              # 企業Aプロジェクト
│   ├── .git/                      # → github.com/company-a/internal-system
│   └── （変更なし）
│
└── company-b-project/              # 企業Bプロジェクト
    └── （変更なし）
```

### GitHubリポジトリ構成

| リポジトリ | 旧名 | 新名 | URL |
|-----------|------|------|-----|
| 共通ライブラリ | Enterprise Commons | enterprise-commons | github.com/jun-kg/enterprise-commons |
| 企業Aプロジェクト | - | company-a-project | github.com/company-a/internal-system |
| 企業Bプロジェクト | - | company-b-project | github.com/company-b/business-app |

---

## チェックリスト

### 変更前の準備

- [x] 未コミットの変更をすべてコミット **（実施済み: 2025-10-18）**
- [x] 現在のブランチ確認（master or main） **（実施済み）**
- [x] リモートリポジトリのバックアップ確認 **（実施済み）**

### ローカル変更

- [x] ディレクトリ名変更: websys → enterprise-commons **（実施済み）**
- [x] README.md 更新 **（実施済み）**
- [x] CLAUDE.md 更新 **（実施済み）**
- [x] RELEASE.md 更新 **（実施済み）**
- [x] docs/*.md 更新 **（実施済み）**
- [x] scripts/*.sh 更新 **（実施済み）**
- [x] templates/backend-express/package.json 更新 **（実施済み）**
- [x] templates/frontend-vue/package.json 更新 **（実施済み）**
- [x] .gitignore 更新（バックアップディレクトリ除外） **（実施済み）**

### GitHub変更

- [ ] GitHubリポジトリ名変更: WebSys → enterprise-commons **（保留: 現状維持）**
- [ ] ローカルリモートURL更新 **（GitHubリポジトリ名変更後に実施）**
- [ ] リモートURL確認（git remote -v） **（GitHubリポジトリ名変更後に実施）**

### コミット・プッシュ

- [x] 全変更をコミット **（実施済み: cb01a32）**
- [x] リモートへプッシュ **（実施済み: 2025-10-18）**
- [x] GitHubで変更内容確認 **（実施済み）**

### 既存プロジェクト更新（該当する場合）

- [ ] 企業プロジェクトのドキュメント更新 **（企業プロジェクト作成時に実施）**
- [ ] update-core.sh実行時のパス確認 **（企業プロジェクト作成時に実施）**
- [ ] 動作確認 **（企業プロジェクト作成時に実施）**

---

## トラブルシューティング

### Q: GitHubリポジトリ名変更後にpushできない

**A:** リモートURLを更新してください

```bash
git remote set-url origin https://github.com/jun-kg/enterprise-commons.git
git remote -v  # 確認
git push origin master
```

### Q: 既存のクローンが古いURL参照している

**A:** 各クローンでリモートURLを更新してください

```bash
# 各クローンディレクトリで実行
git remote set-url origin https://github.com/jun-kg/enterprise-commons.git
```

### Q: GitHub Pagesやドキュメントサイトのリンク切れ

**A:** GitHubは自動的に旧URLから新URLへリダイレクトしますが、ドキュメント内のハードコードされたURLは手動更新が必要です

```bash
# ハードコードされたURL検索
grep -r "github.com/jun-kg/Enterprise Commons" .

# 一括置換
find . -type f -name "*.md" -exec sed -i 's|github.com/jun-kg/Enterprise Commons|github.com/jun-kg/enterprise-commons|g' {} \;
```

---

## まとめ

### 変更の意義

| 項目 | 旧名称 | 新名称 | 改善効果 |
|------|-------|-------|---------|
| **理解しやすさ** | enterprise-commons（不明確） | enterprise-commons（明確） | ✅ 企業共通基盤と即座に理解できる |
| **検索性** | 汎用的な単語 | 業界標準用語 | ✅ GitHubでの検索性向上 |
| **説明の必要性** | 常に補足説明が必要 | 名前だけで説明可能 | ✅ ドキュメント簡潔化 |

### 推奨タイミング

以下のタイミングで名称変更を実施することを推奨します：

1. **初回リリース前** - 最も影響が少ない
2. **メジャーバージョンアップ時** - 破壊的変更として明示
3. **企業プロジェクトが少ない時期** - 影響範囲を最小化

---

**ドキュメントバージョン**: 1.0.0
**最終更新日**: 2025-10-18
**対象プロジェクト**: enterprise-commons → enterprise-commons
