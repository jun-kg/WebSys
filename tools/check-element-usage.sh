#!/bin/bash

echo "=== Element Plus 直接使用チェック ==="
echo "対象ディレクトリ: workspace/frontend/src"
echo ""

# Element Plus使用箇所を検索
VIOLATIONS=$(grep -r "el-" workspace/frontend/src/ --include="*.vue" 2>/dev/null | wc -l)
echo "Element Plus直接使用件数: $VIOLATIONS"

if [ $VIOLATIONS -eq 0 ]; then
    echo "✅ Element Plus直接使用なし"
    exit 0
else
    echo "❌ Element Plus直接使用あり"
    echo ""
    echo "詳細:"
    grep -r "el-" workspace/frontend/src/ --include="*.vue" 2>/dev/null | head -10
    if [ $VIOLATIONS -gt 10 ]; then
        echo "... (他 $((VIOLATIONS - 10)) 件)"
    fi
    echo ""
    echo "修正が必要です"
    exit 1
fi