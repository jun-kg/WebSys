#!/bin/bash
# 環境設定チェックスクリプト

echo "🔍 環境設定チェック..."

ERRORS=0
WARNINGS=0

echo ""
echo "=== プロキシ設定チェック ==="

# Docker専用設定の残存チェック
if grep -q "enterprise-commons_backend_dev" workspace/frontend/vite.config.ts 2>/dev/null; then
  echo "⚠️  警告: vite.config.tsにDocker専用設定が残っています"
  echo "   現在の設定: enterprise-commons_backend_dev:8000"
  echo "   推奨設定: process.env.VITE_API_URL || 'http://localhost:8000'"
  WARNINGS=$((WARNINGS + 1))
fi

# IPv6 localhost問題チェック
if grep -q "localhost:8000" workspace/frontend/vite.config.ts 2>/dev/null; then
  if ! grep -q "process.env" workspace/frontend/vite.config.ts 2>/dev/null; then
    echo "⚠️  警告: プロキシ設定が固定値になっています"
    echo "   環境変数対応を推奨: process.env.VITE_API_URL || 'http://localhost:8000'"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

echo ""
echo "=== 必須ユーティリティファイルチェック ==="

# auth.ts チェック
if [ ! -f "workspace/frontend/src/utils/auth.ts" ]; then
  echo "❌ エラー: workspace/frontend/src/utils/auth.ts が存在しません"
  echo "   実行: cp workspace/frontend/src/core/utils/auth.ts workspace/frontend/src/utils/auth.ts"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ auth.ts: 存在"
fi

# date.ts チェック
if [ ! -f "workspace/frontend/src/utils/date.ts" ]; then
  echo "❌ エラー: workspace/frontend/src/utils/date.ts が存在しません"
  echo "   実行: cp workspace/frontend/src/custom/utils/date.ts workspace/frontend/src/utils/date.ts"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ date.ts: 存在"
fi

echo ""
echo "=== 環境変数ファイルチェック ==="

# バックエンド.env
if [ ! -f "workspace/backend/.env" ]; then
  echo "❌ エラー: workspace/backend/.env が存在しません"
  echo "   実行: cp workspace/backend/.env.example workspace/backend/.env"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ backend/.env: 存在"

  # 必須環境変数チェック
  if ! grep -q "DATABASE_URL" workspace/backend/.env 2>/dev/null; then
    echo "❌ エラー: DATABASE_URL が設定されていません"
    ERRORS=$((ERRORS + 1))
  fi

  if ! grep -q "JWT_ACCESS_SECRET" workspace/backend/.env 2>/dev/null; then
    echo "❌ エラー: JWT_ACCESS_SECRET が設定されていません"
    ERRORS=$((ERRORS + 1))
  fi
fi

# フロントエンド.env (オプショナル)
if [ ! -f "workspace/frontend/.env" ]; then
  echo "ℹ️  情報: workspace/frontend/.env が存在しません（オプショナル）"
  echo "   環境変数が必要な場合は作成してください"
fi

echo ""
echo "=== Prismaクライアント生成チェック ==="

if [ ! -d "workspace/backend/node_modules/.prisma" ]; then
  echo "⚠️  警告: Prismaクライアントが生成されていない可能性があります"
  echo "   実行: cd workspace/backend && npx prisma generate"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ Prismaクライアント: 生成済み"
fi

echo ""
echo "=== データベース接続チェック ==="

# PostgreSQLポート確認
if command -v nc &> /dev/null; then
  if nc -z localhost 5432 2>/dev/null; then
    echo "✅ PostgreSQL: ポート5432で起動中"
  else
    echo "⚠️  警告: PostgreSQL (ポート5432) に接続できません"
    echo "   Docker起動確認: docker ps | grep postgres"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo "ℹ️  情報: nc コマンドがないためDB接続チェックをスキップ"
fi

# 結果表示
echo ""
echo "========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ 環境設定チェック: 問題なし"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  環境設定チェック: $WARNINGS 件の警告"
  echo "   警告は修正を推奨しますが、実行は可能です"
  exit 0
else
  echo "❌ 環境設定チェック: $ERRORS 件のエラー, $WARNINGS 件の警告"
  echo ""
  echo "上記のエラーを修正してから再度チェックしてください"
  exit 1
fi
