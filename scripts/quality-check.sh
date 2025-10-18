#!/bin/bash

# Enterprise Commons ドキュメント品質チェックスクリプト
# 作成日: 2025-09-30
# 目的: ドキュメントの自動品質チェック・リンク検証

set -e

# 色付き出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログファイル
LOG_FILE="docs/quality-check-$(date +%Y%m%d-%H%M%S).log"

echo -e "${BLUE}🔍 Enterprise Commons ドキュメント品質チェック開始${NC}"
echo "実行時間: $(date)"
echo "ログファイル: $LOG_FILE"
echo ""

# ログファイル初期化
cat > "$LOG_FILE" << EOF
# Enterprise Commons ドキュメント品質チェックレポート
実行日時: $(date)
実行ディレクトリ: $(pwd)

## チェック概要
EOF

# エラーカウンター
TOTAL_ERRORS=0
TOTAL_WARNINGS=0
TOTAL_FILES=0

# 1. Markdownファイル存在チェック
echo -e "${BLUE}📂 Markdownファイル検索...${NC}"
MARKDOWN_FILES=$(find docs -name "*.md" | sort)
FILE_COUNT=$(echo "$MARKDOWN_FILES" | wc -l)
TOTAL_FILES=$FILE_COUNT

echo "検出ファイル数: $FILE_COUNT"
echo "- Markdownファイル数: $FILE_COUNT" >> "$LOG_FILE"
echo ""

# 2. リンクチェック
echo -e "${BLUE}🔗 内部リンクチェック...${NC}"
BROKEN_LINKS=0

echo "## 内部リンクチェック結果" >> "$LOG_FILE"

for file in $MARKDOWN_FILES; do
    echo -n "チェック中: $(basename "$file")..."

    # 相対リンク抽出（.md, .png, .jpg, .jpeg, .gif, .svg）
    LINKS=$(grep -oE '\[.*?\]\(\.\/[^)]*\.(md|png|jpg|jpeg|gif|svg)\)' "$file" 2>/dev/null || true)

    if [ -n "$LINKS" ]; then
        while IFS= read -r link; do
            # リンクパス抽出
            LINK_PATH=$(echo "$link" | sed -n 's/.*(\.\//docs\//p' | sed 's/).*$//')

            if [ ! -f "$LINK_PATH" ]; then
                echo -e "${RED}❌ 壊れたリンク: $file → $LINK_PATH${NC}"
                echo "- 壊れたリンク: $file → $LINK_PATH" >> "$LOG_FILE"
                ((BROKEN_LINKS++))
                ((TOTAL_ERRORS++))
            fi
        done <<< "$LINKS"
    fi

    echo " ✓"
done

if [ $BROKEN_LINKS -eq 0 ]; then
    echo -e "${GREEN}✅ 内部リンクチェック: エラーなし${NC}"
    echo "- 内部リンクエラー: 0件" >> "$LOG_FILE"
else
    echo -e "${RED}❌ 内部リンクエラー: ${BROKEN_LINKS}件${NC}"
    echo "- 内部リンクエラー: ${BROKEN_LINKS}件" >> "$LOG_FILE"
fi
echo ""

# 3. MASTER_REFERENCE.md参照チェック
echo -e "${BLUE}📋 MASTER_REFERENCE.md参照チェック...${NC}"
MASTER_REF_MISSING=0

echo "## MASTER_REFERENCE.md参照チェック" >> "$LOG_FILE"

for file in $MARKDOWN_FILES; do
    if [ "$(basename "$file")" != "MASTER_REFERENCE.md" ] && [ "$(basename "$file")" != "README.md" ]; then
        # 技術仕様に関するキーワードを含むファイルをチェック
        if grep -q -E "(技術スタック|バージョン|アーキテクチャ|API|データベース)" "$file"; then
            if ! grep -q "MASTER_REFERENCE.md" "$file"; then
                echo -e "${YELLOW}⚠️ MASTER_REFERENCE.md参照なし: $file${NC}"
                echo "- MASTER_REFERENCE.md参照なし: $file" >> "$LOG_FILE"
                ((MASTER_REF_MISSING++))
                ((TOTAL_WARNINGS++))
            fi
        fi
    fi
done

if [ $MASTER_REF_MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ MASTER_REFERENCE.md参照: 問題なし${NC}"
    echo "- MASTER_REFERENCE.md参照不備: 0件" >> "$LOG_FILE"
else
    echo -e "${YELLOW}⚠️ MASTER_REFERENCE.md参照不備: ${MASTER_REF_MISSING}件${NC}"
    echo "- MASTER_REFERENCE.md参照不備: ${MASTER_REF_MISSING}件" >> "$LOG_FILE"
fi
echo ""

# 4. 日付形式チェック
echo -e "${BLUE}📅 日付形式チェック...${NC}"
DATE_FORMAT_ERRORS=0

echo "## 日付形式チェック" >> "$LOG_FILE"

for file in $MARKDOWN_FILES; do
    # YYYY-MM-DD形式以外の日付を検出
    INVALID_DATES=$(grep -n -E "[0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}" "$file" | grep -v -E "[0-9]{4}-[0-9]{2}-[0-9]{2}" || true)

    if [ -n "$INVALID_DATES" ]; then
        echo -e "${YELLOW}⚠️ 日付形式エラー: $file${NC}"
        echo "$INVALID_DATES" | while IFS= read -r line; do
            echo "  $line"
            echo "  - 日付形式エラー: $file:$line" >> "$LOG_FILE"
        done
        ((DATE_FORMAT_ERRORS++))
        ((TOTAL_WARNINGS++))
    fi
done

if [ $DATE_FORMAT_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ 日付形式: 問題なし${NC}"
    echo "- 日付形式エラー: 0件" >> "$LOG_FILE"
else
    echo -e "${YELLOW}⚠️ 日付形式エラー: ${DATE_FORMAT_ERRORS}件${NC}"
    echo "- 日付形式エラー: ${DATE_FORMAT_ERRORS}件" >> "$LOG_FILE"
fi
echo ""

# 5. 重複ファイル名チェック
echo -e "${BLUE}📂 重複ファイル名チェック...${NC}"
DUPLICATE_FILES=0

echo "## 重複ファイル名チェック" >> "$LOG_FILE"

DUPLICATE_NAMES=$(basename -a $MARKDOWN_FILES | sort | uniq -d)

if [ -n "$DUPLICATE_NAMES" ]; then
    while IFS= read -r dup_name; do
        if [ -n "$dup_name" ]; then
            echo -e "${RED}❌ 重複ファイル名: $dup_name${NC}"
            echo "- 重複ファイル名: $dup_name" >> "$LOG_FILE"
            find docs -name "$dup_name" | while IFS= read -r dup_file; do
                echo "  → $dup_file"
                echo "    → $dup_file" >> "$LOG_FILE"
            done
            ((DUPLICATE_FILES++))
            ((TOTAL_ERRORS++))
        fi
    done <<< "$DUPLICATE_NAMES"
else
    echo -e "${GREEN}✅ 重複ファイル名: なし${NC}"
    echo "- 重複ファイル名: 0件" >> "$LOG_FILE"
fi
echo ""

# 6. 文字コードチェック
echo -e "${BLUE}📝 文字コードチェック...${NC}"
ENCODING_ERRORS=0

echo "## 文字コードチェック" >> "$LOG_FILE"

for file in $MARKDOWN_FILES; do
    ENCODING=$(file -b --mime-encoding "$file")
    if [ "$ENCODING" != "utf-8" ] && [ "$ENCODING" != "us-ascii" ]; then
        echo -e "${RED}❌ 文字コードエラー: $file ($ENCODING)${NC}"
        echo "- 文字コードエラー: $file ($ENCODING)" >> "$LOG_FILE"
        ((ENCODING_ERRORS++))
        ((TOTAL_ERRORS++))
    fi
done

if [ $ENCODING_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ 文字コード: 問題なし${NC}"
    echo "- 文字コードエラー: 0件" >> "$LOG_FILE"
else
    echo -e "${RED}❌ 文字コードエラー: ${ENCODING_ERRORS}件${NC}"
    echo "- 文字コードエラー: ${ENCODING_ERRORS}件" >> "$LOG_FILE"
fi
echo ""

# 総合結果
echo "## 総合結果" >> "$LOG_FILE"
echo "- 検査ファイル数: $TOTAL_FILES" >> "$LOG_FILE"
echo "- エラー総数: $TOTAL_ERRORS" >> "$LOG_FILE"
echo "- 警告総数: $TOTAL_WARNINGS" >> "$LOG_FILE"
echo "- 品質スコア: $((100 - (TOTAL_ERRORS * 10) - (TOTAL_WARNINGS * 2)))%" >> "$LOG_FILE"

echo -e "${BLUE}📊 総合結果${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "検査ファイル数: $TOTAL_FILES"
echo "エラー総数: $TOTAL_ERRORS"
echo "警告総数: $TOTAL_WARNINGS"

QUALITY_SCORE=$((100 - (TOTAL_ERRORS * 10) - (TOTAL_WARNINGS * 2)))
if [ $QUALITY_SCORE -lt 0 ]; then
    QUALITY_SCORE=0
fi

echo "品質スコア: ${QUALITY_SCORE}%"

if [ $TOTAL_ERRORS -eq 0 ] && [ $TOTAL_WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 ドキュメント品質: 完璧です！${NC}"
elif [ $TOTAL_ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️ ドキュメント品質: 良好（軽微な警告あり）${NC}"
else
    echo -e "${RED}❌ ドキュメント品質: 改善が必要です${NC}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "詳細ログ: $LOG_FILE"
echo ""

# 終了コード設定
if [ $TOTAL_ERRORS -gt 0 ]; then
    exit 1
else
    exit 0
fi