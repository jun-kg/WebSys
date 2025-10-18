# Git運用ワークフローガイド

このドキュメントでは、Enterprise Commons共通ライブラリの開発からリリースまでのGit運用ルールを説明します。

---

## 📋 目次

1. [ブランチ戦略](#ブランチ戦略)
2. [リリース管理](#リリース管理)
3. [開発フロー](#開発フロー)
4. [緊急修正フロー](#緊急修正フロー)
5. [企業プロジェクトへのリリース配布](#企業プロジェクトへのリリース配布)
6. [Pull Request運用](#pull-request運用)
7. [コミットメッセージ規約](#コミットメッセージ規約)

---

## ブランチ戦略

### GitHub Flow 簡易版を採用

```
main (トランク)
├── 常に本番リリース可能な状態
├── タグ: v1.0.0-stable, v1.1.0-stable
│
develop (開発統合ブランチ)
├── 次期リリース候補の統合
├── タグ: v1.1.0-rc.1, v1.1.0-rc.2
│
feature/log-export (機能開発)
feature/permission-enhancement (機能開発)
hotfix/critical-bug (緊急修正)
```

### ブランチ定義

| ブランチ | 用途 | 保護設定 | リリース対象 | マージ先 |
|---------|------|---------|------------|---------|
| **main** | 本番リリース済み | ✅ 必須 | ✅ stable | - |
| **develop** | 次期リリース統合 | ✅ 推奨 | ⚠️ rc/beta | main |
| **feature/** | 新機能開発 | - | ❌ 不可 | develop |
| **bugfix/** | バグ修正 | - | ❌ 不可 | develop |
| **hotfix/** | 緊急修正 | - | ✅ stable | main, develop |
| **release/** | リリース準備 | - | ✅ rc | main |

### ブランチ命名規則

```bash
# 機能開発
feature/log-export           # ログエクスポート機能
feature/permission-template  # 権限テンプレート機能

# バグ修正
bugfix/fix-login-redirect    # ログインリダイレクト修正
bugfix/typo-in-docs         # ドキュメント誤字修正

# 緊急修正
hotfix/critical-security     # セキュリティ緊急修正
hotfix/production-crash      # 本番クラッシュ修正

# リリース準備
release/1.1.0               # v1.1.0 リリース準備
```

---

## リリース管理

### セマンティックバージョニング + ステータス

```
v{MAJOR}.{MINOR}.{PATCH}-{STATUS}

例:
- v1.0.0-stable      # 本番環境推奨
- v1.1.0-rc.1        # リリース候補1
- v1.1.0-rc.2        # リリース候補2（修正版）
- v1.2.0-beta.1      # ベータ版
- v2.0.0-alpha.1     # アルファ版（破壊的変更）
```

### バージョン番号の更新ルール

| 変更種別 | バージョン | 例 | 説明 |
|---------|-----------|-------|------|
| **破壊的変更** | MAJOR | 1.0.0 → 2.0.0 | API変更、後方互換性なし |
| **新機能追加** | MINOR | 1.0.0 → 1.1.0 | 後方互換性あり |
| **バグ修正** | PATCH | 1.0.0 → 1.0.1 | 後方互換性あり |

### リリースステータス

| ステータス | 意味 | 企業での使用 | ブランチ | アイコン |
|-----------|------|-------------|---------|---------|
| **stable** | 安定版 | ✅ 本番環境推奨 | main | 🟢 |
| **rc.N** | リリース候補 | ⚠️ ステージング推奨 | release/* | 🟡 |
| **beta.N** | ベータ版 | ⚠️ 開発環境のみ | develop | 🟠 |
| **alpha.N** | アルファ版 | ❌ 内部開発のみ | feature/* | 🔴 |

---

## 開発フロー

### 1. 新機能開発

```bash
# ステップ1: feature ブランチ作成
git checkout develop
git pull origin develop
git checkout -b feature/log-export

# ステップ2: 開発・コミット
# ファイル編集...
git add .
git commit -m "feat(logs): add CSV export feature"
git commit -m "test(logs): add export tests"

# ステップ3: develop にマージ（Pull Request推奨）
git push origin feature/log-export
# GitHub で Pull Request 作成
# レビュー承認後、develop にマージ

# ステップ4: RC版リリース（テスト環境で検証）
git checkout develop
git pull origin develop
./scripts/release.sh 1.1.0 rc.1

# ステップ5: 企業プロジェクトでテスト
# company-a-project で v1.1.0-rc.1 を適用してテスト
# フィードバック収集

# ステップ6: 修正があれば rc.2 リリース
# なければ次のステップへ

# ステップ7: release ブランチ作成（オプション）
git checkout -b release/1.1.0

# ステップ8: main にマージ
git checkout main
git merge release/1.1.0  # または develop
git push origin main

# ステップ9: 安定版リリース
./scripts/release.sh 1.1.0 stable

# ステップ10: develop にバックマージ
git checkout develop
git merge main
git push origin develop
```

### 2. バグ修正

```bash
# ステップ1: bugfix ブランチ作成
git checkout develop
git checkout -b bugfix/fix-login-redirect

# ステップ2: 修正・コミット
git add .
git commit -m "fix(auth): correct login redirect URL"

# ステップ3: develop にマージ
git push origin bugfix/fix-login-redirect
# Pull Request 経由で develop にマージ
```

---

## 緊急修正フロー

### Hotfix（本番環境の緊急修正）

```bash
# ステップ1: main から hotfix ブランチ作成
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# ステップ2: 修正・コミット
git add .
git commit -m "fix(security): patch CVE-2025-XXXX vulnerability"

# ステップ3: テスト実行
npm test
npm run build

# ステップ4: main に直接マージ
git checkout main
git merge hotfix/critical-security-fix
git push origin main

# ステップ5: 緊急リリース（パッチバージョンアップ）
./scripts/release.sh 1.0.1 stable

# ステップ6: develop にもバックマージ（同期）
git checkout develop
git merge main
git push origin develop

# ステップ7: 企業プロジェクトに緊急通知
# Slack/メール等で緊急アップデート告知
```

---

## 企業プロジェクトへのリリース配布

### A. RC版での事前テスト（推奨フロー）

#### enterprise-commons 側

```bash
# 1. develop で RC 版リリース
cd /path/to/enterprise-commons
git checkout develop
./scripts/release.sh 1.1.0 rc.1

# 2. RELEASE.md 確認
cat RELEASE.md
# → 🟡 RC (Release Candidate) と表示されることを確認

# 3. GitHub で告知
# Release Notes に「テスト協力のお願い」を記載
```

#### company-a-project 側（テスト環境）

```bash
# 1. テスト用ブランチ作成
cd /path/to/company-a-project
git checkout -b test/update-core-1.1.0-rc.1

# 2. 共通ライブラリ更新
/path/to/enterprise-commons/scripts/update-core.sh

# 3. テスト実行
npm test
npm run build
npm run e2e  # E2Eテスト（あれば）

# 4. ステージング環境デプロイ
# デプロイして動作確認

# 5. フィードバック
# 問題なし → GitHub で承認コメント
# 問題あり → Issue 作成して報告
```

#### フィードバック対応（enterprise-commons）

```bash
# Issue #45: RC版で発見されたバグ修正
git checkout develop
git checkout -b bugfix/fix-rc-issue-45

# 修正・コミット
git add .
git commit -m "fix(logs): resolve export timeout issue (#45)"

# develop にマージ
git checkout develop
git merge bugfix/fix-rc-issue-45

# RC.2 リリース
./scripts/release.sh 1.1.0 rc.2

# 再テスト依頼
```

### B. 安定版での本番適用

#### enterprise-commons 側

```bash
# 1. main にマージ
git checkout main
git merge develop
git push origin main

# 2. 安定版リリース
./scripts/release.sh 1.1.0 stable

# 3. リリースノート作成
# GitHub Releases で詳細な変更内容を記載
```

#### company-a-project 側（本番環境）

```bash
# 1. 本番適用用ブランチ作成
cd /path/to/company-a-project
git checkout main
git pull origin main
git checkout -b feature/update-core-1.1.0

# 2. 共通ライブラリ更新
/path/to/enterprise-commons/scripts/update-core.sh

# 3. 本番前テスト
npm test
npm run build

# 4. Pull Request 作成
git push origin feature/update-core-1.1.0
# GitHub で PR 作成 → レビュー → 承認

# 5. main にマージ
git checkout main
git merge feature/update-core-1.1.0
git push origin main

# 6. 本番デプロイ
# CI/CD パイプライン経由でデプロイ
```

---

## Pull Request運用

### PR作成ルール

| マージ方向 | PR必須 | レビュー必須 | テスト必須 | 承認者数 |
|-----------|-------|------------|----------|---------|
| feature → develop | ✅ | ✅ | ✅ | 1名以上 |
| bugfix → develop | ✅ | ✅ | ✅ | 1名以上 |
| develop → main | ✅ | ✅ | ✅ | 2名以上 |
| hotfix → main | ⚠️ 緊急時は事後 | ⚠️ 事後可 | ✅ | 1名以上 |
| release → main | ✅ | ✅ | ✅ | 2名以上 |

### PRテンプレート

```markdown
## 変更概要
<!-- 何を変更したか、なぜ変更したかを簡潔に記載 -->

## 変更種別
- [ ] 新機能 (feature)
- [ ] バグ修正 (bugfix)
- [ ] 破壊的変更 (breaking change)
- [ ] パフォーマンス改善 (performance)
- [ ] リファクタリング (refactor)
- [ ] ドキュメント (docs)
- [ ] テスト (test)

## テスト
- [ ] 単体テスト追加済み
- [ ] 統合テスト実施済み
- [ ] E2Eテスト実施済み（該当する場合）
- [ ] 企業プロジェクトでの動作確認（RC版リリース時）

## 影響範囲
<!-- 変更したファイル・機能を列挙 -->
- backend/src/core/controllers/LogController.ts
- frontend/src/core/components/log-monitoring/LogExportDialog.vue

## スクリーンショット（該当する場合）
<!-- UIに変更がある場合はスクリーンショットを添付 -->

## 破壊的変更の詳細（該当する場合）
<!-- API変更、設定変更等の詳細 -->

## 関連 Issue
<!-- Closes #123 形式で記載 -->

## チェックリスト
- [ ] コードレビュー完了
- [ ] テスト合格
- [ ] ドキュメント更新済み
- [ ] CHANGELOG.md 更新済み（該当する場合）
```

### レビューチェックポイント

**機能面:**
- [ ] 要件を満たしているか
- [ ] エッジケースを考慮しているか
- [ ] エラーハンドリングは適切か

**コード品質:**
- [ ] CLAUDE.md のガイドラインに準拠しているか
- [ ] Prismaモデル名は正しいか（複数形・snake_case）
- [ ] パスエイリアス（@core, @extensions, @custom）を使用しているか
- [ ] TypeScript型定義は適切か

**テスト:**
- [ ] 単体テストがあるか
- [ ] テストカバレッジは十分か
- [ ] テストが合格しているか

**ドキュメント:**
- [ ] README.md 更新が必要か
- [ ] API仕様書更新が必要か
- [ ] コメントは適切か

---

## コミットメッセージ規約

### Conventional Commits を採用

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type（必須）

| Type | 説明 | 例 |
|------|------|-----|
| **feat** | 新機能 | feat(logs): add CSV export feature |
| **fix** | バグ修正 | fix(auth): correct login redirect URL |
| **docs** | ドキュメント | docs(readme): update setup instructions |
| **style** | コードスタイル | style(lint): fix formatting issues |
| **refactor** | リファクタリング | refactor(api): simplify user controller |
| **perf** | パフォーマンス | perf(db): optimize query performance |
| **test** | テスト | test(auth): add login flow tests |
| **chore** | ビルド・ツール | chore(deps): update dependencies |

### Scope（推奨）

```
auth, logs, permissions, ui, api, db, docs, test, build
```

### Subject（必須）

- 50文字以内
- 命令形（"add" not "added"）
- 先頭小文字
- 末尾にピリオド不要

### Body（オプション）

- 72文字で改行
- 「何を」ではなく「なぜ」を説明

### Footer（オプション）

- Breaking Change: 破壊的変更の詳細
- Closes #123: 関連Issueのクローズ

### 例

```bash
# Good ✅
git commit -m "feat(logs): add CSV export feature

Implement CSV export functionality for log monitoring system.
Users can now export filtered logs to CSV format.

Closes #123"

# Good ✅
git commit -m "fix(auth): correct login redirect URL"

# Bad ❌
git commit -m "update files"
git commit -m "Fix bug"
git commit -m "Added new feature for logs"
```

---

## まとめ

### 開発フローの全体像

```
┌─────────────────────────────────────────────────────┐
│ 1. feature ブランチで開発                             │
│    git checkout -b feature/new-feature              │
├─────────────────────────────────────────────────────┤
│ 2. develop にマージ（PR経由）                         │
│    Pull Request → レビュー → マージ                  │
├─────────────────────────────────────────────────────┤
│ 3. RC版リリース（テスト環境）                         │
│    ./scripts/release.sh 1.1.0 rc.1                  │
├─────────────────────────────────────────────────────┤
│ 4. 企業プロジェクトでテスト                           │
│    フィードバック収集・問題修正                        │
├─────────────────────────────────────────────────────┤
│ 5. main にマージ                                     │
│    develop → main（PR経由）                         │
├─────────────────────────────────────────────────────┤
│ 6. 安定版リリース（本番環境）                         │
│    ./scripts/release.sh 1.1.0 stable                │
├─────────────────────────────────────────────────────┤
│ 7. 企業プロジェクトに配布                             │
│    update-core.sh で各企業に展開                     │
└─────────────────────────────────────────────────────┘
```

### 重要な原則

1. **main は常にリリース可能**: 本番環境に即座にデプロイできる状態を維持
2. **develop で統合**: 全機能を統合してテスト
3. **RC版で事前検証**: 企業プロジェクトで十分にテスト
4. **Pull Request 必須**: コードレビューで品質確保
5. **セマンティックバージョニング**: バージョン番号で影響範囲を明示

---

**ドキュメントバージョン**: 1.0.0
**最終更新日**: 2025-10-18
**対象プロジェクト**: enterprise-commons
