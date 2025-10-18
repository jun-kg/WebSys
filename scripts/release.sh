#!/bin/bash

##############################################################################
# release.sh
#
# 目的: WebSys共通ライブラリの安定版リリースを作成
#
# 実行方法:
#   ./scripts/release.sh <version> <status>
#
#   例:
#   ./scripts/release.sh 1.0.0 stable
#   ./scripts/release.sh 1.1.0 rc.1
#   ./scripts/release.sh 1.0.1 stable
#
# 処理内容:
#   1. バージョンとステータスのバリデーション
#   2. テンプレート生成（build-templates.sh）
#   3. RELEASE.md更新
#   4. CHANGELOG.md生成
#   5. Git tag作成
#   6. リリースノート表示
##############################################################################

set -e  # エラー時に即座終了

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 使用方法表示
usage() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  WebSys リリーススクリプト${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 <version> <status>"
    echo ""
    echo "引数:"
    echo "  version    バージョン番号（例: 1.0.0, 1.1.0, 2.0.0）"
    echo "  status     リリースステータス"
    echo ""
    echo "ステータス:"
    echo "  stable     安定版（本番環境推奨）"
    echo "  rc.N       リリース候補（テスト環境推奨）"
    echo "  beta.N     ベータ版（開発環境のみ）"
    echo "  alpha.N    アルファ版（内部開発のみ）"
    echo ""
    echo "例:"
    echo "  $0 1.0.0 stable      # 初回安定版リリース"
    echo "  $0 1.1.0 rc.1        # v1.1.0のリリース候補1"
    echo "  $0 1.0.1 stable      # v1.0.0のパッチリリース"
    echo ""
    exit 1
}

# 引数チェック
if [ $# -ne 2 ]; then
    usage
fi

VERSION=$1
STATUS=$2
TAG="v${VERSION}-${STATUS}"

# ルートディレクトリ
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  WebSys リリース作成: ${YELLOW}v${VERSION}-${STATUS}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$ROOT_DIR"

##############################################################################
# 1. バリデーション
##############################################################################

echo -e "${BLUE}[1/7]${NC} バージョンバリデーション中..."

# バージョン形式チェック (X.Y.Z)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}[エラー]${NC} バージョン形式が不正です: $VERSION"
    echo -e "${YELLOW}[ヒント]${NC} 正しい形式: X.Y.Z (例: 1.0.0, 1.2.3)"
    exit 1
fi

# ステータスチェック
case "$STATUS" in
    stable|rc.*|beta.*|alpha.*)
        ;;
    *)
        echo -e "${RED}[エラー]${NC} ステータスが不正です: $STATUS"
        echo -e "${YELLOW}[ヒント]${NC} 有効なステータス: stable, rc.N, beta.N, alpha.N"
        exit 1
        ;;
esac

# タグ重複チェック
if git tag | grep -q "^${TAG}$"; then
    echo -e "${RED}[エラー]${NC} タグが既に存在します: $TAG"
    echo -e "${YELLOW}[ヒント]${NC} 異なるバージョンまたはステータスを指定してください"
    exit 1
fi

# 未コミット変更チェック
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${RED}[エラー]${NC} 未コミットの変更があります"
    echo -e "${YELLOW}[ヒント]${NC} 先に変更をコミットしてください"
    git status --short
    exit 1
fi

echo -e "${GREEN}  ✓${NC} バージョン: v${VERSION}-${STATUS}"
echo -e "${GREEN}  ✓${NC} Gitタグ: $TAG"
echo -e "${GREEN}  ✓${NC} バリデーション完了"
echo ""

##############################################################################
# 2. テンプレート生成
##############################################################################

echo -e "${BLUE}[2/7]${NC} テンプレート生成中..."

if [ ! -f "$ROOT_DIR/scripts/build-templates.sh" ]; then
    echo -e "${RED}[エラー]${NC} build-templates.sh が見つかりません"
    exit 1
fi

# build-templates.sh実行
"$ROOT_DIR/scripts/build-templates.sh" > /dev/null 2>&1

echo -e "${GREEN}  ✓${NC} テンプレート生成完了"
echo ""

##############################################################################
# 3. RELEASE.md更新
##############################################################################

echo -e "${BLUE}[3/7]${NC} RELEASE.md更新中..."

# ステータス絵文字
STATUS_EMOJI="🔴"
STATUS_TEXT="DEVELOPMENT"
case "$STATUS" in
    stable)
        STATUS_EMOJI="🟢"
        STATUS_TEXT="STABLE"
        ;;
    rc.*)
        STATUS_EMOJI="🟡"
        STATUS_TEXT="RC (Release Candidate)"
        ;;
    beta.*)
        STATUS_EMOJI="🟠"
        STATUS_TEXT="BETA"
        ;;
    alpha.*)
        STATUS_EMOJI="🔴"
        STATUS_TEXT="ALPHA"
        ;;
esac

# 最近のコミット取得（リリースノート用）
RECENT_COMMITS=$(git log --oneline -10 --pretty=format:"- %s")

cat > "$ROOT_DIR/RELEASE.md" <<EOF
# WebSys リリース管理

このファイルは、共通ライブラリの安定版リリース情報を管理します。

---

## 📋 リリースステータス

| ステータス | 説明 | 企業プロジェクトでの使用 |
|-----------|------|------------------------|
| **🟢 STABLE** | 安定版リリース | ✅ 推奨 |
| **🟡 RC (Release Candidate)** | リリース候補 | ⚠️ テスト環境で検証推奨 |
| **🔴 DEVELOPMENT** | 開発中 | ❌ 本番環境使用禁止 |

---

## 🚀 最新リリース

### バージョン: **v${VERSION}-${STATUS}**
**ステータス**: ${STATUS_EMOJI} ${STATUS_TEXT}

**リリース日**: $(date '+%Y-%m-%d')

**Gitタグ**: \`${TAG}\`

**説明**:
$(if [ "$STATUS" = "stable" ]; then
    echo "安定版リリースです。本番環境での使用を推奨します。"
elif [[ "$STATUS" =~ ^rc\. ]]; then
    echo "リリース候補版です。テスト環境での検証を推奨します。"
else
    echo "開発版です。本番環境での使用は推奨しません。"
fi)

**含まれる機能**:
- core/extensions/custom 3層アーキテクチャ
- 企業プロジェクト作成スクリプト (create-project.sh)
- テンプレート生成スクリプト (build-templates.sh)
- 自動更新スクリプト (update-core.sh)
- ログ監視システム（マイクロフロントエンド分割済み）
- 権限管理システム（RBAC）

**最近の変更**:
${RECENT_COMMITS}

**既知の問題**:
- なし

---

## 📚 リリース履歴

### v${VERSION}-${STATUS}
**リリース日**: $(date '+%Y-%m-%d')
**ステータス**: ${STATUS_EMOJI} ${STATUS_TEXT}

**変更内容**:
${RECENT_COMMITS}

---

## 🔄 リリースプロセス

### 1. 開発中 (DEVELOPMENT)
\`\`\`
🔴 DEVELOPMENT
└─ 機能開発・バグ修正
\`\`\`

### 2. リリース候補 (RC)
\`\`\`
🟡 RC
├─ 機能凍結
├─ 統合テスト
├─ ドキュメント確認
└─ セキュリティ監査
\`\`\`

### 3. 安定版リリース (STABLE)
\`\`\`
🟢 STABLE
├─ Git tag作成
├─ CHANGELOG.md更新
├─ テンプレート生成
└─ 企業プロジェクトへ配布可能
\`\`\`

---

## 📦 バージョニング規則

WebSysは **Semantic Versioning 2.0.0** に従います。

\`\`\`
v{MAJOR}.{MINOR}.{PATCH}-{STATUS}

例:
- v1.0.0-stable     # 初回安定版
- v1.1.0-rc.1       # v1.1.0のリリース候補1
- v1.1.0-stable     # v1.1.0安定版
- v2.0.0-stable     # メジャーアップデート
\`\`\`

### バージョン番号の意味

| 番号 | 変更内容 | 例 |
|------|---------|-----|
| **MAJOR** | 破壊的変更（後方互換性なし） | 1.x.x → 2.0.0 |
| **MINOR** | 新機能追加（後方互換性あり） | 1.0.x → 1.1.0 |
| **PATCH** | バグ修正（後方互換性あり） | 1.0.0 → 1.0.1 |

---

## 🛡️ 企業プロジェクトでの使用ガイドライン

### ✅ 推奨

- **🟢 STABLE** バージョンのみ本番環境で使用
- リリースノートを必ず確認
- テスト環境で事前検証

### ⚠️ 注意

- **🟡 RC** バージョンはテスト環境でのみ使用
- 既知の問題を確認
- フィードバックを開発チームに報告

### ❌ 禁止

- **🔴 DEVELOPMENT** を本番環境で使用
- タグなしのコミットを直接使用
- 未リリース機能に依存

---

**最終更新**: $(date '+%Y-%m-%d')
**管理者**: WebSys開発チーム
EOF

echo -e "${GREEN}  ✓${NC} RELEASE.md更新完了"
echo ""

##############################################################################
# 4. Gitコミット（RELEASE.md + templates）
##############################################################################

echo -e "${BLUE}[4/7]${NC} 変更をコミット中..."

git add RELEASE.md templates/
git commit -m "release: v${VERSION}-${STATUS}

📦 リリース情報:
- バージョン: v${VERSION}-${STATUS}
- ステータス: ${STATUS_EMOJI} ${STATUS_TEXT}
- リリース日: $(date '+%Y-%m-%d')

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo -e "${GREEN}  ✓${NC} コミット完了"
echo ""

##############################################################################
# 5. Gitタグ作成
##############################################################################

echo -e "${BLUE}[5/7]${NC} Gitタグ作成中..."

git tag -a "$TAG" -m "Release v${VERSION}-${STATUS}

Status: ${STATUS_EMOJI} ${STATUS_TEXT}
Date: $(date '+%Y-%m-%d')

$(if [ "$STATUS" = "stable" ]; then
    echo "This is a stable release recommended for production use."
elif [[ "$STATUS" =~ ^rc\. ]]; then
    echo "This is a release candidate. Testing in staging environments is recommended."
else
    echo "This is a development release. Not recommended for production use."
fi)

Recent changes:
${RECENT_COMMITS}"

echo -e "${GREEN}  ✓${NC} タグ作成完了: $TAG"
echo ""

##############################################################################
# 6. リモートプッシュ確認
##############################################################################

echo -e "${BLUE}[6/7]${NC} リモートプッシュ確認..."

echo -e "${YELLOW}リモートリポジトリにプッシュしますか？ (y/N): ${NC}"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    git push origin master
    git push origin "$TAG"
    echo -e "${GREEN}  ✓${NC} リモートプッシュ完了"
else
    echo -e "${YELLOW}  ⊘${NC} リモートプッシュをスキップしました"
    echo -e "${YELLOW}後で手動でプッシュしてください:${NC}"
    echo -e "  git push origin master"
    echo -e "  git push origin $TAG"
fi
echo ""

##############################################################################
# 7. リリースノート表示
##############################################################################

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ リリース作成完了: ${YELLOW}v${VERSION}-${STATUS}${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📦 リリース情報:"
echo -e "   バージョン: ${MAGENTA}v${VERSION}-${STATUS}${NC}"
echo -e "   ステータス: ${STATUS_EMOJI} ${STATUS_TEXT}"
echo -e "   Gitタグ: ${BLUE}$TAG${NC}"
echo -e "   リリース日: $(date '+%Y-%m-%d')"
echo ""
echo -e "📋 企業プロジェクトでの使用方法:"
echo ""
echo -e "  1️⃣  WebSys最新版を取得"
echo -e "     ${YELLOW}cd /path/to/websys${NC}"
echo -e "     ${YELLOW}git pull origin master${NC}"
echo -e "     ${YELLOW}git checkout $TAG${NC}"
echo ""
echo -e "  2️⃣  企業プロジェクトに適用"
echo -e "     ${YELLOW}cd /path/to/company-project${NC}"
echo -e "     ${YELLOW}/path/to/websys/scripts/update-core.sh${NC}"
echo ""
echo -e "  3️⃣  動作確認・コミット"
echo -e "     ${YELLOW}npm run test${NC}"
echo -e "     ${YELLOW}git add backend/src/core frontend/src/core${NC}"
echo -e "     ${YELLOW}git commit -m \"chore: update core to v${VERSION}-${STATUS}\"${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
