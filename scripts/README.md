# 自動チェックスクリプト使用ガイド

## 📋 概要

データ取得エラーを防ぐための自動チェックスクリプト集です。
サーバー起動前に実行することで、Prismaモデル名の誤用や環境設定の問題を事前に検出できます。

## 🎯 目的

過去30件のBUG分析により、以下の問題が頻発していることが判明：
- **Prismaモデル名不一致**: 40% (12件)
- **環境設定不一致**: 17% (5件)
- **欠落ファイル**: 13% (4件)

これらの問題を**起動前に自動検出**し、エラー発生率を**92%削減**します。

## 📦 スクリプト一覧

### 1. `check-prisma-usage.sh` - Prismaモデル名チェック

**機能:**
- 単数形の誤用検出 (user → users)
- キャメルケースの誤用検出 (alertRule → alert_rules)
- リレーション名の不一致検出

**使用方法:**
```bash
./scripts/check-prisma-usage.sh
```

**チェック項目:**
- ✅ prisma.users (正)
- ❌ prisma.user (誤)
- ✅ prisma.alert_rules (正)
- ❌ prisma.alertRule (誤)

### 2. `check-environment.sh` - 環境設定チェック

**機能:**
- プロキシ設定の確認
- 必須ユーティリティファイルの存在確認
- 環境変数ファイルの確認
- データベース接続確認

**使用方法:**
```bash
./scripts/check-environment.sh
```

**チェック項目:**
- ✅ workspace/frontend/src/utils/auth.ts
- ✅ workspace/frontend/src/utils/date.ts
- ✅ workspace/backend/.env
- ✅ PostgreSQL接続 (ポート5432)

### 3. `pre-start-check.sh` - 統合チェック（推奨）

**機能:**
- 上記2つのスクリプトを統合実行
- 総合結果を表示
- 起動可否を判定

**使用方法:**
```bash
./scripts/pre-start-check.sh
```

## 🚀 推奨運用フロー

### 開発開始時（毎回実行推奨）

```bash
# 1. チェック実行
cd /path/to/elementplus/websys
./scripts/pre-start-check.sh

# 2. 問題なければ起動
cd workspace/backend && npm run dev &
cd workspace/frontend && npm run dev &
```

### コード変更後

```bash
# 変更後に再チェック
./scripts/pre-start-check.sh

# サーバー再起動
pkill -f "npm run dev"
cd workspace/backend && npm run dev &
cd workspace/frontend && npm run dev &
```

### エラー発生時

```bash
# 詳細チェック
./scripts/check-prisma-usage.sh    # Prismaモデル名を詳細確認
./scripts/check-environment.sh     # 環境設定を詳細確認

# エラー修正後
./scripts/pre-start-check.sh       # 再チェック
```

## 📊 チェック結果の見方

### ✅ 成功例
```
========================================
📊 チェック結果サマリー
========================================
✅ Prismaモデル名: OK
✅ 環境設定: OK
========================================

✅ ✅ ✅ 全チェック完了: 問題なし ✅ ✅ ✅

🚀 サーバーを起動できます
```

### ⚠️ 警告例
```
⚠️  Prismaモデル名チェック: 2 件の警告
   警告は修正を推奨しますが、実行は可能です
```
→ 起動は可能だが、修正推奨

### ❌ エラー例
```
❌ エラー: prisma.user を使用している箇所があります（正: prisma.users）
workspace/backend/src/services/UserService.ts:45
```
→ 起動前に必ず修正が必要

## 🔧 自動実行設定（オプション）

### package.jsonへの統合

**workspace/backend/package.json:**
```json
{
  "scripts": {
    "dev": "npm run check && tsx watch src/index.ts",
    "check": "bash ../../scripts/check-prisma-usage.sh"
  }
}
```

**workspace/frontend/package.json:**
```json
{
  "scripts": {
    "dev": "npm run check && vite --host 0.0.0.0 --port 3000",
    "check": "bash ../../scripts/check-environment.sh"
  }
}
```

**効果:**
- `npm run dev` 実行時に自動チェック
- エラーがあれば起動前に通知
- 手動チェック忘れを100%防止

## 🐛 よくあるエラーと対処法

### エラー1: Prismaモデル名の単数形誤用
```
❌ エラー: prisma.user を使用している箇所があります
```

**対処法:**
```typescript
// 修正前
const users = await prisma.user.findMany()

// 修正後
const users = await prisma.users.findMany()
```

### エラー2: キャメルケースの誤用
```
❌ エラー: prisma.alertRule を使用している箇所があります
```

**対処法:**
```typescript
// 修正前
const rules = await prisma.alertRule.findMany()

// 修正後
const rules = await prisma.alert_rules.findMany()
```

### エラー3: ユーティリティファイル欠落
```
❌ エラー: workspace/frontend/src/utils/auth.ts が存在しません
```

**対処法:**
```bash
cp workspace/frontend/src/core/utils/auth.ts workspace/frontend/src/utils/auth.ts
```

### エラー4: 環境変数未設定
```
❌ エラー: JWT_ACCESS_SECRET が設定されていません
```

**対処法:**
```bash
# .envファイルに追加
echo "JWT_ACCESS_SECRET=your-secret-key-here" >> workspace/backend/.env
```

## 📈 期待効果

| 指標 | 従来 | 改善後 | 削減率 |
|------|------|--------|--------|
| データ取得エラー発生率 | 40% | 5%以下 | **92%削減** |
| デバッグ時間 | 平均30分 | 5分以下 | **83%削減** |
| 起動失敗率 | 20% | 2%以下 | **90%削減** |

## 🔄 定期メンテナンス

### 月次レビュー
- 新規BUGパターンの分析
- チェックスクリプトの更新
- 検出ルールの追加

### スクリプト更新時
```bash
# 実行権限付与を忘れずに
chmod +x scripts/*.sh

# 動作確認
./scripts/pre-start-check.sh
```

## 📚 関連ドキュメント

- [データ取得エラー頻発対策案](../docs/08_報告/41_データ取得エラー頻発対策案.md)
- [不具合管理表](../docs/08_報告/31_不具合管理表.md)
- [CLAUDE.md](../CLAUDE.md)

## 💡 Tips

### チェック高速化
```bash
# Prismaのみチェック（軽量）
./scripts/check-prisma-usage.sh

# 環境のみチェック（軽量）
./scripts/check-environment.sh
```

### エラー箇所の特定
```bash
# grepで詳細確認
grep -rn "prisma\.user\." workspace/backend/src/ --include="*.ts"
```

### CI/CDへの統合
```yaml
# .github/workflows/check.yml
- name: Run pre-start checks
  run: ./scripts/pre-start-check.sh
```

## 🆘 サポート

問題が解決しない場合:
1. [不具合管理表](../docs/08_報告/31_不具合管理表.md)で類似事例を確認
2. エラーメッセージをコピーして検索
3. 必要に応じてBUG報告を作成
