#!/bin/bash
# Prismaモデル名使用チェックスクリプト

echo "🔍 Prismaモデル名使用チェック..."

ERRORS=0
WARNINGS=0

# 単数形の誤用チェック
echo ""
echo "=== 単数形誤用チェック ==="

if grep -rn "prisma\.user\." workspace/backend/src/ --include="*.ts" 2>/dev/null | grep -v "users" | grep -v "user_sessions" | grep -v "user_departments"; then
  echo "❌ エラー: prisma.user を使用している箇所があります（正: prisma.users）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.company\." workspace/backend/src/ --include="*.ts" 2>/dev/null | grep -v "companies"; then
  echo "❌ エラー: prisma.company を使用している箇所があります（正: prisma.companies）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.department\." workspace/backend/src/ --include="*.ts" 2>/dev/null | grep -v "departments" | grep -v "department_permissions" | grep -v "user_departments"; then
  echo "❌ エラー: prisma.department を使用している箇所があります（正: prisma.departments）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.log\." workspace/backend/src/ --include="*.ts" 2>/dev/null | grep -v "logs" | grep -v "log_statistics" | grep -v "audit_logs"; then
  echo "❌ エラー: prisma.log を使用している箇所があります（正: prisma.logs）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.feature\." workspace/backend/src/ --include="*.ts" 2>/dev/null | grep -v "features"; then
  echo "❌ エラー: prisma.feature を使用している箇所があります（正: prisma.features）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.notification\." workspace/backend/src/ --include="*.ts" 2>/dev/null | grep -v "notifications"; then
  echo "❌ エラー: prisma.notification を使用している箇所があります（正: prisma.notifications）"
  ERRORS=$((ERRORS + 1))
fi

# キャメルケースの誤用チェック
echo ""
echo "=== キャメルケース誤用チェック ==="

if grep -rn "prisma\.alertRule" workspace/backend/src/ --include="*.ts" 2>/dev/null; then
  echo "❌ エラー: prisma.alertRule を使用している箇所があります（正: prisma.alert_rules）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.logStatistics" workspace/backend/src/ --include="*.ts" 2>/dev/null; then
  echo "❌ エラー: prisma.logStatistics を使用している箇所があります（正: prisma.log_statistics）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.auditLog" workspace/backend/src/ --include="*.ts" 2>/dev/null; then
  echo "❌ エラー: prisma.auditLog を使用している箇所があります（正: prisma.audit_logs）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.userSession" workspace/backend/src/ --include="*.ts" 2>/dev/null; then
  echo "❌ エラー: prisma.userSession を使用している箇所があります（正: prisma.user_sessions）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.refreshToken" workspace/backend/src/ --include="*.ts" 2>/dev/null; then
  echo "❌ エラー: prisma.refreshToken を使用している箇所があります（正: prisma.refresh_tokens）"
  ERRORS=$((ERRORS + 1))
fi

# ワークフロー関連
if grep -rn "prisma\.workflowType" workspace/backend/src/ --include="*.ts" 2>/dev/null; then
  echo "❌ エラー: prisma.workflowType を使用している箇所があります（正: prisma.workflow_types）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.workflowRequest" workspace/backend/src/ --include="*.ts" 2>/dev/null; then
  echo "❌ エラー: prisma.workflowRequest を使用している箇所があります（正: prisma.workflow_requests）"
  ERRORS=$((ERRORS + 1))
fi

if grep -rn "prisma\.approvalRoute" workspace/backend/src/ --include="*.ts" 2>/dev/null; then
  echo "❌ エラー: prisma.approvalRoute を使用している箇所があります（正: prisma.approval_routes）"
  ERRORS=$((ERRORS + 1))
fi

# リレーション名チェック
echo ""
echo "=== リレーション名チェック ==="

if grep -rn "include.*:.*{.*user.*:.*true" workspace/backend/src/ --include="*.ts" 2>/dev/null | grep -v "users" | grep -v "user_sessions" | grep -v "// " | head -3; then
  echo "⚠️  警告: リレーション名に単数形 'user' を使用している可能性があります（正: 'users'）"
  WARNINGS=$((WARNINGS + 1))
fi

if grep -rn "include.*:.*{.*company.*:.*true" workspace/backend/src/ --include="*.ts" 2>/dev/null | grep -v "companies" | grep -v "// " | head -3; then
  echo "⚠️  警告: リレーション名に単数形 'company' を使用している可能性があります（正: 'companies'）"
  WARNINGS=$((WARNINGS + 1))
fi

# 結果表示
echo ""
echo "========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ Prismaモデル名チェック: 問題なし"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Prismaモデル名チェック: $WARNINGS 件の警告"
  echo "   警告は修正を推奨しますが、実行は可能です"
  exit 0
else
  echo "❌ Prismaモデル名チェック: $ERRORS 件のエラー, $WARNINGS 件の警告"
  echo ""
  echo "修正方法:"
  echo "  1. 上記のファイルを開く"
  echo "  2. エラー箇所のモデル名を修正"
  echo "  3. 再度チェック実行"
  exit 1
fi
