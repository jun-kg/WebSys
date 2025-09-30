#!/bin/bash

# WebSys リンクチェッカー
# 作成日: 2025-09-30
# 目的: Markdownファイル内のリンクの詳細検証

set -e

# 色付き出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 設定
CHECK_EXTERNAL=${1:-false}  # 外部リンクチェックするかどうか（デフォルト：false）
OUTPUT_FORMAT=${2:-console} # 出力形式: console, json, html

echo -e "${BLUE}🔗 WebSys リンクチェッカー${NC}"
echo "外部リンクチェック: $CHECK_EXTERNAL"
echo "出力形式: $OUTPUT_FORMAT"
echo ""

# 結果格納用
declare -a BROKEN_LINKS
declare -a EXTERNAL_LINKS
declare -a VALID_LINKS
TOTAL_LINKS=0
BROKEN_COUNT=0
EXTERNAL_COUNT=0

# Markdownファイル取得
MARKDOWN_FILES=$(find docs -name "*.md" | sort)

echo -e "${BLUE}📂 対象ファイル:${NC}"
echo "$MARKDOWN_FILES" | sed 's/^/  - /'
echo ""

# 各ファイルのリンクチェック
for file in $MARKDOWN_FILES; do
    echo -e "${BLUE}🔍 チェック中: $(basename "$file")${NC}"

    # 内部リンク抽出（相対パス）
    INTERNAL_LINKS=$(grep -oE '\[.*?\]\(\./[^)]*\)' "$file" 2>/dev/null || true)

    # 外部リンク抽出（http/https）
    if [ "$CHECK_EXTERNAL" = "true" ]; then
        EXTERNAL_FOUND=$(grep -oE '\[.*?\]\(https?://[^)]*\)' "$file" 2>/dev/null || true)
    fi

    # 内部リンクチェック
    if [ -n "$INTERNAL_LINKS" ]; then
        while IFS= read -r link; do
            if [ -n "$link" ]; then
                ((TOTAL_LINKS++))

                # リンクテキストとパスを分離
                LINK_TEXT=$(echo "$link" | sed -n 's/\[\(.*\)\](.*/\1/p')
                LINK_PATH=$(echo "$link" | sed -n 's/.*(\.\//docs\//p' | sed 's/).*$//')

                if [ -f "$LINK_PATH" ]; then
                    VALID_LINKS+=("✅ $file → $LINK_PATH ($LINK_TEXT)")
                    echo -e "  ${GREEN}✅ $LINK_TEXT → $(basename "$LINK_PATH")${NC}"
                else
                    BROKEN_LINKS+=("❌ $file → $LINK_PATH ($LINK_TEXT)")
                    echo -e "  ${RED}❌ $LINK_TEXT → $LINK_PATH${NC}"
                    ((BROKEN_COUNT++))
                fi
            fi
        done <<< "$INTERNAL_LINKS"
    fi

    # 外部リンクチェック（有効な場合）
    if [ "$CHECK_EXTERNAL" = "true" ] && [ -n "$EXTERNAL_FOUND" ]; then
        while IFS= read -r ext_link; do
            if [ -n "$ext_link" ]; then
                ((TOTAL_LINKS++))
                ((EXTERNAL_COUNT++))

                LINK_TEXT=$(echo "$ext_link" | sed -n 's/\[\(.*\)\](.*/\1/p')
                LINK_URL=$(echo "$ext_link" | sed -n 's/.*(\(.*\)).*/\1/p')

                # 外部リンクの簡易チェック（HEADリクエスト）
                if command -v curl >/dev/null 2>&1; then
                    if curl -s --head --fail "$LINK_URL" >/dev/null 2>&1; then
                        EXTERNAL_LINKS+=("✅ $file → $LINK_URL ($LINK_TEXT)")
                        echo -e "  ${GREEN}🌐 $LINK_TEXT → $(echo "$LINK_URL" | cut -c1-50)...${NC}"
                    else
                        EXTERNAL_LINKS+=("❌ $file → $LINK_URL ($LINK_TEXT)")
                        echo -e "  ${RED}🌐 $LINK_TEXT → $LINK_URL${NC}"
                        ((BROKEN_COUNT++))
                    fi
                else
                    EXTERNAL_LINKS+=("⚠️ $file → $LINK_URL ($LINK_TEXT) [curl未インストール]")
                    echo -e "  ${YELLOW}🌐 $LINK_TEXT → $LINK_URL [curl未インストール]${NC}"
                fi
            fi
        done <<< "$EXTERNAL_FOUND"
    fi
done

echo ""
echo -e "${BLUE}📊 チェック結果${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "総リンク数: $TOTAL_LINKS"
echo "有効リンク数: $((TOTAL_LINKS - BROKEN_COUNT))"
echo "壊れたリンク数: $BROKEN_COUNT"

if [ "$CHECK_EXTERNAL" = "true" ]; then
    echo "外部リンク数: $EXTERNAL_COUNT"
fi

# 結果出力
if [ $BROKEN_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 すべてのリンクが有効です！${NC}"
    RESULT_STATUS="success"
else
    echo -e "${RED}❌ 壊れたリンクが見つかりました:${NC}"
    for broken in "${BROKEN_LINKS[@]}"; do
        echo -e "  ${RED}$broken${NC}"
    done
    RESULT_STATUS="failure"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 出力形式に応じた詳細出力
case $OUTPUT_FORMAT in
    json)
        # JSON形式で結果出力
        JSON_OUTPUT="docs/link-check-$(date +%Y%m%d-%H%M%S).json"
        cat > "$JSON_OUTPUT" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "status": "$RESULT_STATUS",
  "summary": {
    "total_links": $TOTAL_LINKS,
    "valid_links": $((TOTAL_LINKS - BROKEN_COUNT)),
    "broken_links": $BROKEN_COUNT,
    "external_links": $EXTERNAL_COUNT
  },
  "broken_links": [
EOF
        for i in "${!BROKEN_LINKS[@]}"; do
            if [ $i -gt 0 ]; then echo "    ," >> "$JSON_OUTPUT"; fi
            echo "    \"${BROKEN_LINKS[$i]}\"" >> "$JSON_OUTPUT"
        done
        cat >> "$JSON_OUTPUT" << EOF
  ],
  "valid_links": [
EOF
        for i in "${!VALID_LINKS[@]}"; do
            if [ $i -gt 0 ]; then echo "    ," >> "$JSON_OUTPUT"; fi
            echo "    \"${VALID_LINKS[$i]}\"" >> "$JSON_OUTPUT"
        done
        echo "  ]" >> "$JSON_OUTPUT"
        echo "}" >> "$JSON_OUTPUT"
        echo "JSON出力: $JSON_OUTPUT"
        ;;

    html)
        # HTML形式で結果出力
        HTML_OUTPUT="docs/link-check-$(date +%Y%m%d-%H%M%S).html"
        cat > "$HTML_OUTPUT" << EOF
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebSys リンクチェック結果</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .info { color: #007bff; }
        .link-list { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .link-item { padding: 8px 0; border-bottom: 1px solid #eee; }
        .link-item:last-child { border-bottom: none; }
        .broken { color: #dc3545; }
        .valid { color: #28a745; }
        .external { color: #007bff; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔗 WebSys リンクチェック結果</h1>
        <p>実行日時: $(date)</p>
        <p>ステータス: <span class="$([ "$RESULT_STATUS" = "success" ] && echo "success" || echo "danger")">$RESULT_STATUS</span></p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value info">$TOTAL_LINKS</div>
            <div>総リンク数</div>
        </div>
        <div class="metric">
            <div class="metric-value success">$((TOTAL_LINKS - BROKEN_COUNT))</div>
            <div>有効リンク数</div>
        </div>
        <div class="metric">
            <div class="metric-value danger">$BROKEN_COUNT</div>
            <div>壊れたリンク数</div>
        </div>
EOF
        if [ "$CHECK_EXTERNAL" = "true" ]; then
            cat >> "$HTML_OUTPUT" << EOF
        <div class="metric">
            <div class="metric-value info">$EXTERNAL_COUNT</div>
            <div>外部リンク数</div>
        </div>
EOF
        fi

        cat >> "$HTML_OUTPUT" << EOF
    </div>

    <div class="link-list">
        <h2>壊れたリンク</h2>
EOF
        if [ ${#BROKEN_LINKS[@]} -eq 0 ]; then
            echo "        <p class=\"success\">壊れたリンクはありません 🎉</p>" >> "$HTML_OUTPUT"
        else
            for broken in "${BROKEN_LINKS[@]}"; do
                echo "        <div class=\"link-item broken\">$broken</div>" >> "$HTML_OUTPUT"
            done
        fi

        cat >> "$HTML_OUTPUT" << EOF
    </div>

    <div class="link-list">
        <h2>有効なリンク（サンプル）</h2>
EOF
        # 有効なリンクの最初の10件を表示
        for i in $(seq 0 $((${#VALID_LINKS[@]} > 10 ? 9 : ${#VALID_LINKS[@]}-1))); do
            if [ $i -lt ${#VALID_LINKS[@]} ]; then
                echo "        <div class=\"link-item valid\">${VALID_LINKS[$i]}</div>" >> "$HTML_OUTPUT"
            fi
        done

        cat >> "$HTML_OUTPUT" << EOF
        <p><small>※ 有効なリンクの最初の10件を表示</small></p>
    </div>
</body>
</html>
EOF
        echo "HTML出力: $HTML_OUTPUT"
        ;;

    console)
        # コンソール出力（デフォルト）は既に完了
        ;;
esac

# 終了コード
if [ $BROKEN_COUNT -gt 0 ]; then
    exit 1
else
    exit 0
fi