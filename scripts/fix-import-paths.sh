#!/bin/bash

# 3層分離アーキテクチャ対応 - インポートパス一括修正スクリプト

set -e

BACKEND_SRC="workspace/backend/src"
FRONTEND_SRC="workspace/frontend/src"

echo "========================================="
echo "インポートパス一括修正開始"
echo "========================================="

# ========================================
# バックエンド core/ の修正
# ========================================
echo ""
echo "=== バックエンド core/ 修正中 ==="

# Prisma統合パス修正
find $BACKEND_SRC/core -type f -name "*.ts" -exec sed -i "s|from ['\"]../lib/prisma['\"]|from '@core/lib/prisma'|g" {} \;
find $BACKEND_SRC/core -type f -name "*.ts" -exec sed -i "s|from ['\"]../../lib/prisma['\"]|from '@core/lib/prisma'|g" {} \;
find $BACKEND_SRC/core -type f -name "*.ts" -exec sed -i "s|from ['\"]\.\./\.\./lib/lib/prisma['\"]|from '@core/lib/prisma'|g" {} \;

# 認証ミドルウェアパス修正
find $BACKEND_SRC/core -type f -name "*.ts" -exec sed -i "s|from ['\"]../middleware/auth['\"]|from '@core/middleware/auth'|g" {} \;
find $BACKEND_SRC/core -type f -name "*.ts" -exec sed -i "s|from ['\"]../../middleware/auth['\"]|from '@core/middleware/auth'|g" {} \;

# エラーハンドラーパス修正
find $BACKEND_SRC/core -type f -name "*.ts" -exec sed -i "s|from ['\"]../middleware/errorHandler['\"]|from '@core/middleware/errorHandler'|g" {} \;

# コントローラーパス修正
find $BACKEND_SRC/core -type f -name "*.ts" -exec sed -i "s|from ['\"]../controllers/|from '@core/controllers/|g" {} \;

# サービスパス修正
find $BACKEND_SRC/core -type f -name "*.ts" -exec sed -i "s|from ['\"]../services/|from '@core/services/|g" {} \;

# 型定義パス修正
find $BACKEND_SRC/core -type f -name "*.ts" -exec sed -i "s|from ['\"]../types/|from '@core/types/|g" {} \;
find $BACKEND_SRC/core -type f -name "*.ts" -exec sed -i "s|from ['\"]../../types/|from '@core/types/|g" {} \;

echo "✓ バックエンド core/ 修正完了"

# ========================================
# バックエンド custom/ の修正
# ========================================
echo ""
echo "=== バックエンド custom/ 修正中 ==="

# core/ への参照を @core に変更
find $BACKEND_SRC/custom -type f -name "*.ts" -exec sed -i "s|from ['\"]\.\./lib/prisma['\"]|from '@core/lib/prisma'|g" {} \;
find $BACKEND_SRC/custom -type f -name "*.ts" -exec sed -i "s|from ['\"]\.\./\.\./lib/prisma['\"]|from '@core/lib/prisma'|g" {} \;
find $BACKEND_SRC/custom -type f -name "*.ts" -exec sed -i "s|from ['\"]\.\./\.\./lib/lib/prisma['\"]|from '@core/lib/prisma'|g" {} \;

find $BACKEND_SRC/custom -type f -name "*.ts" -exec sed -i "s|from ['\"]\.\./middleware/auth['\"]|from '@core/middleware/auth'|g" {} \;
find $BACKEND_SRC/custom -type f -name "*.ts" -exec sed -i "s|from ['\"]\.\./\.\./middleware/auth['\"]|from '@core/middleware/auth'|g" {} \;

# custom内部の相対パスを @custom に変更
find $BACKEND_SRC/custom -type f -name "*.ts" -exec sed -i "s|from ['\"]../services/|from '@custom/services/|g" {} \;
find $BACKEND_SRC/custom -type f -name "*.ts" -exec sed -i "s|from ['\"]../../services/|from '@custom/services/|g" {} \;

find $BACKEND_SRC/custom -type f -name "*.ts" -exec sed -i "s|from ['\"]../routes/|from '@custom/routes/|g" {} \;

find $BACKEND_SRC/custom -type f -name "*.ts" -exec sed -i "s|from ['\"]../types/|from '@custom/types/|g" {} \;

echo "✓ バックエンド custom/ 修正完了"

# ========================================
# フロントエンド core/ の修正
# ========================================
echo ""
echo "=== フロントエンド core/ 修正中 ==="

# API層パス修正
find $FRONTEND_SRC/core -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./api/|from '@core/api/|g" {} \;
find $FRONTEND_SRC/core -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./\.\./api/|from '@core/api/|g" {} \;

# Composables パス修正
find $FRONTEND_SRC/core -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./composables/|from '@core/composables/|g" {} \;
find $FRONTEND_SRC/core -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./\.\./composables/|from '@core/composables/|g" {} \;

# コンポーネントパス修正
find $FRONTEND_SRC/core -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./components/|from '@core/components/|g" {} \;

# 型定義パス修正
find $FRONTEND_SRC/core -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./types/|from '@core/types/|g" {} \;
find $FRONTEND_SRC/core -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./\.\./types/|from '@core/types/|g" {} \;

# ユーティリティパス修正
find $FRONTEND_SRC/core -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./utils/|from '@core/utils/|g" {} \;
find $FRONTEND_SRC/core -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./\.\./utils/|from '@core/utils/|g" {} \;

echo "✓ フロントエンド core/ 修正完了"

# ========================================
# フロントエンド custom/ の修正
# ========================================
echo ""
echo "=== フロントエンド custom/ 修正中 ==="

# core/ への参照を @core に変更
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./api/auth['\"]|from '@core/api/auth'|g" {} \;
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./api/logs['\"]|from '@core/api/logs'|g" {} \;
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./api/permissions['\"]|from '@core/api/permissions'|g" {} \;

find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./composables/useLogService['\"]|from '@core/composables/useLogService'|g" {} \;
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./composables/useWebSocket['\"]|from '@core/composables/useWebSocket'|g" {} \;

find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./components/log-monitoring/|from '@core/components/log-monitoring/|g" {} \;
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./components/common/|from '@core/components/common/|g" {} \;
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]\.\./components/permissions/|from '@core/components/permissions/|g" {} \;

# custom内部の相対パスを @custom に変更
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]@/api/companies['\"]|from '@custom/api/companies'|g" {} \;
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]@/api/departments['\"]|from '@custom/api/departments'|g" {} \;
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]@/api/users['\"]|from '@custom/api/users'|g" {} \;
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]@/api/features['\"]|from '@custom/api/features'|g" {} \;
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]@/api/health['\"]|from '@custom/api/health'|g" {} \;

find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]@/types/company['\"]|from '@custom/types/company'|g" {} \;
find $FRONTEND_SRC/custom -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s|from ['\"]@/types/department['\"]|from '@custom/types/department'|g" {} \;

echo "✓ フロントエンド custom/ 修正完了"

echo ""
echo "========================================="
echo "インポートパス一括修正完了"
echo "========================================="
echo ""
echo "次のステップ:"
echo "1. エントリーポイント修正 (App.vue, main.ts, router等)"
echo "2. 型チェック実行 (npm run type-check)"
echo "3. サーバ起動テスト"
