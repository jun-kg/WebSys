#!/bin/bash

# Enterprise Commons Phase2 高度品質チェック・自動修正システム
# 作成日: 2025-09-30
# 目的: AI活用品質分析・クロスリファレンス・自動修正機能

set -e

# 色付き出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 設定
AUTO_FIX=${1:-false}  # 自動修正モード
ANALYSIS_LEVEL=${2:-comprehensive}  # 分析レベル: basic, comprehensive, ai-enhanced
OUTPUT_DIR="docs/quality-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$OUTPUT_DIR/advanced-quality-$TIMESTAMP.json"

echo -e "${PURPLE}🔮 Enterprise Commons Phase2 高度品質チェックシステム${NC}"
echo "自動修正モード: $AUTO_FIX"
echo "分析レベル: $ANALYSIS_LEVEL"
echo "レポート出力: $REPORT_FILE"
echo ""

# レポートディレクトリ作成
mkdir -p "$OUTPUT_DIR"

# JSON レポート初期化
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "analysis_level": "$ANALYSIS_LEVEL",
  "auto_fix_enabled": $AUTO_FIX,
  "checks": {
    "cross_reference": {
      "status": "running",
      "broken_links": [],
      "suggestions": [],
      "auto_fixes": []
    },
    "terminology": {
      "status": "running",
      "inconsistencies": [],
      "suggestions": []
    },
    "content_quality": {
      "status": "running",
      "issues": [],
      "scores": {}
    },
    "accessibility": {
      "status": "running",
      "issues": [],
      "recommendations": []
    }
  },
  "summary": {
    "total_files": 0,
    "total_issues": 0,
    "auto_fixed": 0,
    "quality_score": 0
  }
}
EOF

# エラーカウンター
TOTAL_FILES=0
TOTAL_ISSUES=0
AUTO_FIXED=0
QUALITY_SCORE=0

# 1. 高度クロスリファレンスチェック
echo -e "${BLUE}🔗 高度クロスリファレンス分析...${NC}"

MARKDOWN_FILES=$(find docs -name "*.md" | sort)
TOTAL_FILES=$(echo "$MARKDOWN_FILES" | wc -l)

declare -A FILE_EXISTS
declare -a BROKEN_LINKS
declare -a SUGGESTIONS

# ファイル存在マップ作成
while IFS= read -r file; do
    if [ -f "$file" ]; then
        basename=$(basename "$file")
        FILE_EXISTS["$basename"]="$file"
    fi
done <<< "$MARKDOWN_FILES"

# 壊れたリンクを検出・修正候補提案
for file in $MARKDOWN_FILES; do
    echo -n "クロスリファレンス分析: $(basename "$file")..."

    # 相対リンク抽出
    LINKS=$(grep -oE '\[.*?\]\(\./[^)]*\.md\)' "$file" 2>/dev/null || true)

    if [ -n "$LINKS" ]; then
        while IFS= read -r link; do
            if [ -n "$link" ]; then
                LINK_PATH=$(echo "$link" | sed -n 's/.*(\.\//docs\//p' | sed 's/).*$//')

                if [ ! -f "$LINK_PATH" ]; then
                    LINK_BASENAME=$(basename "$LINK_PATH")

                    # 修正候補検索
                    SUGGESTION=""
                    if [[ -n "${FILE_EXISTS[$LINK_BASENAME]}" ]]; then
                        SUGGESTION="${FILE_EXISTS[$LINK_BASENAME]}"
                    else
                        # ファジーマッチング（部分文字列検索）
                        for existing_file in "${!FILE_EXISTS[@]}"; do
                            if [[ "$existing_file" == *"$(echo "$LINK_BASENAME" | cut -d'.' -f1)"* ]]; then
                                SUGGESTION="${FILE_EXISTS[$existing_file]}"
                                break
                            fi
                        done
                    fi

                    BROKEN_LINKS+=("$file → $LINK_PATH")

                    if [ -n "$SUGGESTION" ]; then
                        SUGGESTIONS+=("$file → $LINK_PATH | 修正候補: $SUGGESTION")

                        # 自動修正実行
                        if [ "$AUTO_FIX" = "true" ]; then
                            RELATIVE_SUGGESTION=$(echo "$SUGGESTION" | sed 's|^docs/|./|')
                            sed -i "s|(\.\/${LINK_PATH#docs/}|($RELATIVE_SUGGESTION|g" "$file"
                            echo -e " ${GREEN}[自動修正]${NC}"
                            ((AUTO_FIXED++))
                        else
                            echo -e " ${YELLOW}[修正候補あり]${NC}"
                        fi
                        ((TOTAL_ISSUES++))
                    else
                        echo -e " ${RED}[要確認]${NC}"
                        ((TOTAL_ISSUES++))
                    fi
                fi
            fi
        done <<< "$LINKS"
    fi

    if [ ${#BROKEN_LINKS[@]} -eq 0 ]; then
        echo " ✓"
    fi
done

echo -e "${GREEN}✅ クロスリファレンス分析完了${NC}"
echo "壊れたリンク: ${#BROKEN_LINKS[@]}件"
echo "修正候補: ${#SUGGESTIONS[@]}件"
echo "自動修正: $AUTO_FIXED件"
echo ""

# 2. 用語統一チェック
echo -e "${BLUE}📝 用語統一チェック...${NC}"

declare -A TERM_INCONSISTENCIES

# 技術用語の表記統一チェック
TECH_TERMS=(
    "Vue\.js|Vue\.JS|VueJS:Vue.js"
    "TypeScript|Typescript|typescript:TypeScript"
    "JavaScript|Javascript|javascript:JavaScript"
    "GitHub|Github|github:GitHub"
    "PostgreSQL|Postgres|postgres:PostgreSQL"
    "API|api:API"
    "JSON|json:JSON"
    "HTTP|http:HTTP"
    "HTTPS|https:HTTPS"
    "Docker|docker:Docker"
)

for file in $MARKDOWN_FILES; do
    echo -n "用語チェック: $(basename "$file")..."

    for term_rule in "${TECH_TERMS[@]}"; do
        IFS=':' read -r patterns correct_term <<< "$term_rule"
        IFS='|' read -ra PATTERN_ARRAY <<< "$patterns"

        for pattern in "${PATTERN_ARRAY[@]}"; do
            if [ "$pattern" != "$correct_term" ]; then
                if grep -q "$pattern" "$file" 2>/dev/null; then
                    TERM_INCONSISTENCIES["$file"]="${TERM_INCONSISTENCIES["$file"]} $pattern→$correct_term"
                    ((TOTAL_ISSUES++))

                    if [ "$AUTO_FIX" = "true" ]; then
                        sed -i "s/$pattern/$correct_term/g" "$file"
                        ((AUTO_FIXED++))
                    fi
                fi
            fi
        done
    done

    echo " ✓"
done

echo -e "${GREEN}✅ 用語統一チェック完了${NC}"
echo ""

# 3. コンテンツ品質分析
echo -e "${BLUE}📊 コンテンツ品質分析...${NC}"

declare -A CONTENT_SCORES

for file in $MARKDOWN_FILES; do
    echo -n "品質分析: $(basename "$file")..."

    # 基本品質指標計算
    LINES=$(wc -l < "$file")
    WORDS=$(wc -w < "$file")
    HEADERS=$(grep -c '^#' "$file" 2>/dev/null || echo 0)
    LINKS=$(grep -c '\[.*\](' "$file" 2>/dev/null || echo 0)
    IMAGES=$(grep -c '!\[.*\](' "$file" 2>/dev/null || echo 0)

    # 品質スコア計算（100点満点）
    STRUCTURE_SCORE=$((HEADERS > 0 ? 20 : 0))
    CONTENT_SCORE=$((WORDS > 100 ? 30 : WORDS * 30 / 100))
    LINK_SCORE=$((LINKS > 0 ? 25 : 0))
    IMAGE_SCORE=$((IMAGES > 0 ? 15 : 0))

    # 特別加点
    SPECIAL_SCORE=0
    if grep -q "```" "$file"; then SPECIAL_SCORE=$((SPECIAL_SCORE + 5)); fi
    if grep -q "| .* |" "$file"; then SPECIAL_SCORE=$((SPECIAL_SCORE + 5)); fi

    TOTAL_SCORE=$((STRUCTURE_SCORE + CONTENT_SCORE + LINK_SCORE + IMAGE_SCORE + SPECIAL_SCORE))
    CONTENT_SCORES["$file"]="$TOTAL_SCORE"

    echo " スコア: ${TOTAL_SCORE}/100"
done

# 全体品質スコア計算
TOTAL_SCORE_SUM=0
for score in "${CONTENT_SCORES[@]}"; do
    TOTAL_SCORE_SUM=$((TOTAL_SCORE_SUM + score))
done
QUALITY_SCORE=$((TOTAL_SCORE_SUM / TOTAL_FILES))

echo -e "${GREEN}✅ コンテンツ品質分析完了${NC}"
echo "全体品質スコア: ${QUALITY_SCORE}/100"
echo ""

# 4. アクセシビリティチェック
echo -e "${BLUE}♿ アクセシビリティチェック...${NC}"

declare -a ACCESSIBILITY_ISSUES

for file in $MARKDOWN_FILES; do
    echo -n "アクセシビリティ: $(basename "$file")..."

    # 画像altテキストチェック
    IMAGES_WITHOUT_ALT=$(grep -c '!\[\](' "$file" 2>/dev/null || echo 0)
    if [ $IMAGES_WITHOUT_ALT -gt 0 ]; then
        ACCESSIBILITY_ISSUES+=("$file: 画像にaltテキストが設定されていません ($IMAGES_WITHOUT_ALT件)")
        ((TOTAL_ISSUES++))
    fi

    # 見出し階層チェック
    if grep -q '^####' "$file" && ! grep -q '^###' "$file"; then
        ACCESSIBILITY_ISSUES+=("$file: 見出し階層が不正です（h4がh3なしで使用）")
        ((TOTAL_ISSUES++))
    fi

    # リンクテキストチェック
    EMPTY_LINKS=$(grep -c '\[\](' "$file" 2>/dev/null || echo 0)
    if [ $EMPTY_LINKS -gt 0 ]; then
        ACCESSIBILITY_ISSUES+=("$file: 空のリンクテキストがあります ($EMPTY_LINKS件)")
        ((TOTAL_ISSUES++))
    fi

    echo " ✓"
done

echo -e "${GREEN}✅ アクセシビリティチェック完了${NC}"
echo "アクセシビリティ問題: ${#ACCESSIBILITY_ISSUES[@]}件"
echo ""

# 5. AI品質分析（分析レベルがai-enhancedの場合）
if [ "$ANALYSIS_LEVEL" = "ai-enhanced" ]; then
    echo -e "${PURPLE}🤖 AI品質分析...${NC}"
    echo "注意: この機能は将来の実装予定です（GPT API統合）"
    echo ""
fi

# レポート更新
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "analysis_level": "$ANALYSIS_LEVEL",
  "auto_fix_enabled": $AUTO_FIX,
  "checks": {
    "cross_reference": {
      "status": "completed",
      "broken_links": $(printf '%s\n' "${BROKEN_LINKS[@]}" | jq -R . | jq -s .),
      "suggestions": $(printf '%s\n' "${SUGGESTIONS[@]}" | jq -R . | jq -s .),
      "auto_fixes": $AUTO_FIXED
    },
    "terminology": {
      "status": "completed",
      "inconsistencies": $(printf '%s\n' "${!TERM_INCONSISTENCIES[@]}" | jq -R . | jq -s .),
      "auto_fixes": $AUTO_FIXED
    },
    "content_quality": {
      "status": "completed",
      "average_score": $QUALITY_SCORE,
      "scores": $(for file in "${!CONTENT_SCORES[@]}"; do echo "\"$file\": ${CONTENT_SCORES[$file]}"; done | jq -s 'add')
    },
    "accessibility": {
      "status": "completed",
      "issues": $(printf '%s\n' "${ACCESSIBILITY_ISSUES[@]}" | jq -R . | jq -s .),
      "total_issues": ${#ACCESSIBILITY_ISSUES[@]}
    }
  },
  "summary": {
    "total_files": $TOTAL_FILES,
    "total_issues": $TOTAL_ISSUES,
    "auto_fixed": $AUTO_FIXED,
    "quality_score": $QUALITY_SCORE,
    "improvement_rate": $((AUTO_FIXED * 100 / (TOTAL_ISSUES > 0 ? TOTAL_ISSUES : 1)))
  }
}
EOF

# 結果出力
echo -e "${PURPLE}📊 Phase2 高度品質チェック結果${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "対象ファイル数: $TOTAL_FILES"
echo "検出問題数: $TOTAL_ISSUES"
echo "自動修正数: $AUTO_FIXED"
echo "全体品質スコア: ${QUALITY_SCORE}/100"

if [ $AUTO_FIXED -gt 0 ]; then
    IMPROVEMENT_RATE=$((AUTO_FIXED * 100 / TOTAL_ISSUES))
    echo "改善率: ${IMPROVEMENT_RATE}%"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "詳細レポート: $REPORT_FILE"

if [ $TOTAL_ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 すべての品質チェックをパスしました！${NC}"
    exit 0
elif [ $AUTO_FIXED -eq $TOTAL_ISSUES ]; then
    echo -e "${GREEN}🔧 すべての問題が自動修正されました！${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️ 手動対応が必要な問題があります${NC}"
    exit 1
fi