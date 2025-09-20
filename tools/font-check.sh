#!/bin/bash

echo "=== UDゴシックフォント適用チェック ==="
echo ""

# App.vueでのフォント設定確認
FONT_CHECK=$(grep -n "BIZ UDPGothic\|UD Digi Kyokasho" workspace/frontend/src/App.vue 2>/dev/null)

if [ -n "$FONT_CHECK" ]; then
    echo "✅ UDゴシックフォントが設定されています"
    echo ""
    echo "設定内容:"
    echo "$FONT_CHECK"
    echo ""

    # フォントサイズチェック
    SIZE_CHECK=$(grep -n "font-size.*16px" workspace/frontend/src/App.vue 2>/dev/null)
    if [ -n "$SIZE_CHECK" ]; then
        echo "✅ アクセシブルなフォントサイズ(16px以上)が設定されています"
    else
        echo "⚠️  フォントサイズの確認が必要です"
    fi

    # 行間チェック
    LINE_HEIGHT_CHECK=$(grep -n "line-height.*1\.[5-9]" workspace/frontend/src/App.vue 2>/dev/null)
    if [ -n "$LINE_HEIGHT_CHECK" ]; then
        echo "✅ 読みやすい行間が設定されています"
    else
        echo "⚠️  行間の確認が必要です"
    fi

    exit 0
else
    echo "❌ UDゴシックフォントが設定されていません"
    echo ""
    echo "現在の設定:"
    grep -n "font-family" workspace/frontend/src/App.vue 2>/dev/null || echo "フォント設定が見つかりません"
    exit 1
fi