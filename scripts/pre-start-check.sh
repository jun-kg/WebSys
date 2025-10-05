#!/bin/bash
# サーバー起動前総合チェックスクリプト

echo "🚀 サーバー起動前チェック開始..."
echo "========================================"
echo ""

# スクリプトディレクトリ取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Prismaモデル名チェック
echo "【1/2】Prismaモデル名チェック"
echo "----------------------------------------"
"$SCRIPT_DIR/check-prisma-usage.sh"
PRISMA_CHECK=$?
echo ""

# 環境設定チェック
echo "【2/2】環境設定チェック"
echo "----------------------------------------"
"$SCRIPT_DIR/check-environment.sh"
ENV_CHECK=$?
echo ""

# 総合結果
echo "========================================"
echo "📊 チェック結果サマリー"
echo "========================================"

if [ $PRISMA_CHECK -eq 0 ]; then
  echo "✅ Prismaモデル名: OK"
else
  echo "❌ Prismaモデル名: エラーあり"
fi

if [ $ENV_CHECK -eq 0 ]; then
  echo "✅ 環境設定: OK"
else
  echo "❌ 環境設定: エラーあり"
fi

echo "========================================"

if [ $PRISMA_CHECK -eq 0 ] && [ $ENV_CHECK -eq 0 ]; then
  echo ""
  echo "✅ ✅ ✅ 全チェック完了: 問題なし ✅ ✅ ✅"
  echo ""
  echo "🚀 サーバーを起動できます"
  echo ""
  echo "起動コマンド:"
  echo "  バックエンド : cd workspace/backend && npm run dev"
  echo "  フロントエンド: cd workspace/frontend && npm run dev"
  echo ""
  exit 0
else
  echo ""
  echo "❌ ❌ ❌ チェックに失敗しました ❌ ❌ ❌"
  echo ""
  echo "⚠️  上記のエラーを修正してから起動してください"
  echo ""
  echo "修正後の再チェック:"
  echo "  ./scripts/pre-start-check.sh"
  echo ""
  exit 1
fi
