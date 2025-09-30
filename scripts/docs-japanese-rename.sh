#!/bin/bash

# WebSys ドキュメント日本語化スクリプト
# フォルダ名・ファイル名を日本語に変更

echo -e "\033[0;35m🇯🇵 WebSys ドキュメント日本語化開始\033[0m"
echo "英語フォルダ・ファイル名 → 日本語名に変更"

# 現在位置確認
if [ ! -d "docs" ]; then
    echo "❌ docs/ フォルダが見つかりません"
    exit 1
fi

cd docs

echo -e "\033[0;34m📦 バックアップ作成...\033[0m"
BACKUP_DIR="../docs_english_backup_$(date +%Y%m%d_%H%M%S)"
cp -r . "$BACKUP_DIR"
echo "バックアップ先: $BACKUP_DIR"

echo -e "\033[0;34m📁 フォルダ名変更...\033[0m"

# フォルダ名変更マッピング
declare -A FOLDER_MAPPING=(
    ["core"]="基本"
    ["architecture"]="設計"
    ["features"]="機能"
    ["testing"]="試験"
    ["deployment"]="運用"
    ["reports"]="報告"
    ["design"]="デザイン"
    ["guides"]="ガイド"
)

# フォルダ名変更実行
for english_name in "${!FOLDER_MAPPING[@]}"; do
    japanese_name="${FOLDER_MAPPING[$english_name]}"
    if [ -d "$english_name" ]; then
        echo "  📁 $english_name → $japanese_name"
        mv "$english_name" "$japanese_name"
    fi
done

echo -e "\033[0;36m📄 基本フォルダのファイル名変更...\033[0m"
if [ -d "基本" ]; then
    cd 基本
    [ -f "README.md" ] && mv "README.md" "概要.md" && echo "  📄 README.md → 概要.md"
    [ -f "MASTER_REFERENCE.md" ] && mv "MASTER_REFERENCE.md" "技術仕様統一.md" && echo "  📄 MASTER_REFERENCE.md → 技術仕様統一.md"
    [ -f "getting-started.md" ] && mv "getting-started.md" "環境構築手順.md" && echo "  📄 getting-started.md → 環境構築手順.md"
    [ -f "document-reading-order.md" ] && mv "document-reading-order.md" "ドキュメント読み順.md" && echo "  📄 document-reading-order.md → ドキュメント読み順.md"
    [ -f "troubleshooting.md" ] && mv "troubleshooting.md" "トラブルシューティング.md" && echo "  📄 troubleshooting.md → トラブルシューティング.md"
    cd ..
fi

echo -e "\033[0;36m🏗️ 設計フォルダのファイル名変更...\033[0m"
if [ -d "設計" ]; then
    cd 設計
    [ -f "README.md" ] && mv "README.md" "概要.md" && echo "  📄 README.md → 概要.md"
    [ -f "system-overview.md" ] && mv "system-overview.md" "システム概要.md" && echo "  📄 system-overview.md → システム概要.md"
    [ -f "system-design.md" ] && mv "system-design.md" "システム設計.md" && echo "  📄 system-design.md → システム設計.md"
    [ -f "api-specification.md" ] && mv "api-specification.md" "API仕様書.md" && echo "  📄 api-specification.md → API仕様書.md"
    [ -f "component-specification.md" ] && mv "component-specification.md" "コンポーネント仕様書.md" && echo "  📄 component-specification.md → コンポーネント仕様書.md"
    [ -f "common-components.md" ] && mv "common-components.md" "共通コンポーネント仕様.md" && echo "  📄 common-components.md → 共通コンポーネント仕様.md"
    cd ..
fi

echo -e "\033[0;36m🔧 機能フォルダのファイル名変更...\033[0m"
if [ -d "機能" ]; then
    cd 機能
    [ -f "README.md" ] && mv "README.md" "概要.md" && echo "  📄 README.md → 概要.md"
    [ -f "approval-workflow-design.md" ] && mv "approval-workflow-design.md" "申請承認ワークフロー機能設計書.md" && echo "  📄 approval-workflow-design.md → 申請承認ワークフロー機能設計書.md"
    [ -f "multi-project-sharing.md" ] && mv "multi-project-sharing.md" "複数プロジェクト共有機能設計書.md" && echo "  📄 multi-project-sharing.md → 複数プロジェクト共有機能設計書.md"
    [ -f "enterprise-common-features.md" ] && mv "enterprise-common-features.md" "企業システム共通機能仕様.md" && echo "  📄 enterprise-common-features.md → 企業システム共通機能仕様.md"
    [ -f "api-design-template.md" ] && mv "api-design-template.md" "API設計書テンプレート.md" && echo "  📄 api-design-template.md → API設計書テンプレート.md"
    [ -d "function-specs" ] && mv "function-specs" "機能設計書" && echo "  📁 function-specs → 機能設計書"
    cd ..
fi

echo -e "\033[0;36m🧪 試験フォルダのファイル名変更...\033[0m"
if [ -d "試験" ]; then
    cd 試験
    [ -f "README.md" ] && mv "README.md" "概要.md" && echo "  📄 README.md → 概要.md"
    [ -f "test-specification.md" ] && mv "test-specification.md" "テスト仕様書.md" && echo "  📄 test-specification.md → テスト仕様書.md"
    [ -f "test-execution-report.md" ] && mv "test-execution-report.md" "テスト実行報告書.md" && echo "  📄 test-execution-report.md → テスト実行報告書.md"
    [ -f "permission-template-unit-test.md" ] && mv "permission-template-unit-test.md" "権限テンプレート単体試験仕様書.md" && echo "  📄 permission-template-unit-test.md → 権限テンプレート単体試験仕様書.md"
    [ -f "unit-test-completion-report.md" ] && mv "unit-test-completion-report.md" "単体試験実装完了報告書.md" && echo "  📄 unit-test-completion-report.md → 単体試験実装完了報告書.md"
    cd ..
fi

echo -e "\033[0;36m🚀 運用フォルダのファイル名変更...\033[0m"
if [ -d "運用" ]; then
    cd 運用
    [ -f "README.md" ] && mv "README.md" "概要.md" && echo "  📄 README.md → 概要.md"
    [ -f "deployment-guide.md" ] && mv "deployment-guide.md" "デプロイ手順.md" && echo "  📄 deployment-guide.md → デプロイ手順.md"
    [ -f "operations-manual.md" ] && mv "operations-manual.md" "運用手順書.md" && echo "  📄 operations-manual.md → 運用手順書.md"
    [ -f "monitoring-health-check-report.md" ] && mv "monitoring-health-check-report.md" "システム監視・ヘルスチェック機能完成報告書.md" && echo "  📄 monitoring-health-check-report.md → システム監視・ヘルスチェック機能完成報告書.md"
    cd ..
fi

echo -e "\033[0;36m📊 報告フォルダのファイル名変更...\033[0m"
if [ -d "報告" ]; then
    cd 報告
    [ -f "README.md" ] && mv "README.md" "概要.md" && echo "  📄 README.md → 概要.md"

    # Phase関連レポート
    [ -f "phase1-completion-plan.md" ] && mv "phase1-completion-plan.md" "Phase1実装完了・次期展開計画書.md" && echo "  📄 phase1-completion-plan.md → Phase1実装完了・次期展開計画書.md"
    [ -f "phase2-quality-assurance-report.md" ] && mv "phase2-quality-assurance-report.md" "Phase2実装完了・高度品質保証基盤稼働レポート.md" && echo "  📄 phase2-quality-assurance-report.md → Phase2実装完了・高度品質保証基盤稼働レポート.md"
    [ -f "phase3-implementation-plan.md" ] && mv "phase3-implementation-plan.md" "Phase3実装計画・技術仕様書.md" && echo "  📄 phase3-implementation-plan.md → Phase3実装計画・技術仕様書.md"
    [ -f "phase3-main-features-report.md" ] && mv "phase3-main-features-report.md" "Phase3メイン機能実装完了レポート.md" && echo "  📄 phase3-main-features-report.md → Phase3メイン機能実装完了レポート.md"

    # プロジェクト関連レポート
    [ -f "project-status-board.md" ] && mv "project-status-board.md" "プロジェクトステータスボード.md" && echo "  📄 project-status-board.md → プロジェクトステータスボード.md"
    [ -f "project-comprehensive-summary.md" ] && mv "project-comprehensive-summary.md" "プロジェクト総合サマリー.md" && echo "  📄 project-comprehensive-summary.md → プロジェクト総合サマリー.md"
    [ -f "project-completion-report.md" ] && mv "project-completion-report.md" "プロジェクト完成報告書.md" && echo "  📄 project-completion-report.md → プロジェクト完成報告書.md"

    # ドキュメント関連レポート
    [ -f "document-comprehensive-review.md" ] && mv "document-comprehensive-review.md" "ドキュメント総合レビュー結果・改善計画書.md" && echo "  📄 document-comprehensive-review.md → ドキュメント総合レビュー結果・改善計画書.md"
    [ -f "document-improvement-progress.md" ] && mv "document-improvement-progress.md" "ドキュメント改善実施進捗レポート.md" && echo "  📄 document-improvement-progress.md → ドキュメント改善実施進捗レポート.md"
    [ -f "document-review-update-completion.md" ] && mv "document-review-update-completion.md" "ドキュメント総合レビュー最新化・全Phase完了報告.md" && echo "  📄 document-review-update-completion.md → ドキュメント総合レビュー最新化・全Phase完了報告.md"
    [ -f "document-structure-analysis-proposal.md" ] && mv "document-structure-analysis-proposal.md" "ドキュメント構成分析・整理提案書.md" && echo "  📄 document-structure-analysis-proposal.md → ドキュメント構成分析・整理提案書.md"
    [ -f "document-update-review-results.md" ] && mv "document-update-review-results.md" "ドキュメント更新多角的レビュー結果.md" && echo "  📄 document-update-review-results.md → ドキュメント更新多角的レビュー結果.md"

    # その他レポート
    [ -f "system-status-report-20250926.md" ] && mv "system-status-report-20250926.md" "システム総合ステータスレポート2025-09-26.md" && echo "  📄 system-status-report-20250926.md → システム総合ステータスレポート2025-09-26.md"
    [ -f "bug-management-table.md" ] && mv "bug-management-table.md" "不具合管理表.md" && echo "  📄 bug-management-table.md → 不具合管理表.md"
    [ -f "implementation-design-gap-analysis.md" ] && mv "implementation-design-gap-analysis.md" "実装設計差異分析報告書.md" && echo "  📄 implementation-design-gap-analysis.md → 実装設計差異分析報告書.md"
    [ -f "system-performance-analysis.md" ] && mv "system-performance-analysis.md" "システム性能分析レポート.md" && echo "  📄 system-performance-analysis.md → システム性能分析レポート.md"

    cd ..
fi

echo -e "\033[0;36m🎨 デザインフォルダのファイル名変更...\033[0m"
if [ -d "デザイン" ]; then
    cd デザイン
    [ -f "README.md" ] && mv "README.md" "概要.md" && echo "  📄 README.md → 概要.md"
    [ -f "responsive-design-guidelines.md" ] && mv "responsive-design-guidelines.md" "レスポンシブデザインガイドライン.md" && echo "  📄 responsive-design-guidelines.md → レスポンシブデザインガイドライン.md"
    [ -f "universal-design-guidelines.md" ] && mv "universal-design-guidelines.md" "ユニバーサルデザインガイドライン.md" && echo "  📄 universal-design-guidelines.md → ユニバーサルデザインガイドライン.md"
    [ -f "responsive-design-improvement-proposal.md" ] && mv "responsive-design-improvement-proposal.md" "レスポンシブデザイン改善提案書.md" && echo "  📄 responsive-design-improvement-proposal.md → レスポンシブデザイン改善提案書.md"
    [ -f "responsive-component-optimization.md" ] && mv "responsive-component-optimization.md" "レスポンシブ共通コンポーネント化による対策量削減案.md" && echo "  📄 responsive-component-optimization.md → レスポンシブ共通コンポーネント化による対策量削減案.md"
    [ -f "responsive-implementation-guidelines.md" ] && mv "responsive-implementation-guidelines.md" "レスポンシブ対応実装ガイドライン.md" && echo "  📄 responsive-implementation-guidelines.md → レスポンシブ対応実装ガイドライン.md"
    [ -f "system-ui-improvement-analysis.md" ] && mv "system-ui-improvement-analysis.md" "システムUI改善分析レポート.md" && echo "  📄 system-ui-improvement-analysis.md → システムUI改善分析レポート.md"
    cd ..
fi

echo -e "\033[0;36m📚 ガイドフォルダのファイル名変更...\033[0m"
if [ -d "ガイド" ]; then
    cd ガイド
    [ -f "README.md" ] && mv "README.md" "概要.md" && echo "  📄 README.md → 概要.md"
    [ -f "development-guide.md" ] && mv "development-guide.md" "開発ガイド.md" && echo "  📄 development-guide.md → 開発ガイド.md"
    [ -f "development-guidelines.md" ] && mv "development-guidelines.md" "開発ガイドライン.md" && echo "  📄 development-guidelines.md → 開発ガイドライン.md"
    [ -f "continuous-improvement-process.md" ] && mv "continuous-improvement-process.md" "継続的改善プロセス運用ガイドライン.md" && echo "  📄 continuous-improvement-process.md → 継続的改善プロセス運用ガイドライン.md"
    [ -f "feature-improvement-checklist.md" ] && mv "feature-improvement-checklist.md" "機能追加改善チェックリスト.md" && echo "  📄 feature-improvement-checklist.md → 機能追加改善チェックリスト.md"
    [ -f "implementation-risk-management.md" ] && mv "implementation-risk-management.md" "実装リスク管理計画書.md" && echo "  📄 implementation-risk-management.md → 実装リスク管理計画書.md"
    [ -f "performance-test-plan.md" ] && mv "performance-test-plan.md" "性能テスト詳細計画書.md" && echo "  📄 performance-test-plan.md → 性能テスト詳細計画書.md"
    cd ..
fi

echo -e "\033[0;34m📋 各フォルダのREADME.md（概要.md）更新...\033[0m"

# 基本フォルダの概要.md更新
cat > 基本/概要.md << 'EOF'
# 📖 基本ドキュメント

## 概要
WebSysプロジェクトの基本情報集。プロジェクト概要・環境構築・トラブルシューティングなどの基礎資料。

## ドキュメント

### 🚀 開始手順
- [技術仕様統一](技術仕様統一.md) - Single Source of Truth
- [環境構築手順](環境構築手順.md) - 開発環境セットアップ手順
- [ドキュメント読み順](ドキュメント読み順.md) - ドキュメント学習順序

### 🆘 サポート
- [トラブルシューティング](トラブルシューティング.md) - 問題解決・FAQ

## クイックリンク
- [システム設計](../設計/) - アーキテクチャ・API仕様
- [機能設計](../機能/) - 機能別詳細設計
- [開発ガイド](../ガイド/) - 開発・運用ガイドライン
EOF

# 設計フォルダの概要.md更新
cat > 設計/概要.md << 'EOF'
# 🏗️ 設計ドキュメント

## 概要
WebSysプロジェクトのシステム設計・アーキテクチャドキュメント集。API仕様・コンポーネント設計・システム概要。

## ドキュメント

### 🏗️ システム設計
- [システム概要](システム概要.md) - プロジェクト全体構成
- [システム設計](システム設計.md) - 詳細設計・アーキテクチャ
- [API仕様書](API仕様書.md) - RESTful API仕様
- [コンポーネント仕様書](コンポーネント仕様書.md) - UIコンポーネント仕様
- [共通コンポーネント仕様](共通コンポーネント仕様.md) - 共通部品仕様

## クイックリンク
- [基本情報](../基本/) - プロジェクト概要・環境構築
- [機能設計](../機能/) - 機能別詳細設計
- [試験](../試験/) - テスト仕様・試験結果
EOF

# 機能フォルダの概要.md更新
cat > 機能/概要.md << 'EOF'
# 🔧 機能ドキュメント

## 概要
WebSysプロジェクトの機能設計・仕様ドキュメント集。各機能の詳細設計・ワークフロー・企業向け機能。

## ドキュメント

### 🔧 機能設計
- [申請承認ワークフロー機能設計書](申請承認ワークフロー機能設計書.md) - ワークフロー機能
- [複数プロジェクト共有機能設計書](複数プロジェクト共有機能設計書.md) - マルチプロジェクト対応
- [企業システム共通機能仕様](企業システム共通機能仕様.md) - 企業向け共通機能
- [API設計書テンプレート](API設計書テンプレート.md) - API設計テンプレート

### 📁 詳細機能設計
- [機能設計書](機能設計書/) - 各機能の詳細設計書集

## クイックリンク
- [設計](../設計/) - システム設計・アーキテクチャ
- [試験](../試験/) - テスト仕様・試験結果
- [ガイド](../ガイド/) - 開発・実装ガイドライン
EOF

# 試験フォルダの概要.md更新
cat > 試験/概要.md << 'EOF'
# 🧪 試験ドキュメント

## 概要
WebSysプロジェクトのテスト・試験関連ドキュメント集。テスト仕様・実行結果・単体試験。

## ドキュメント

### 🧪 テスト仕様
- [テスト仕様書](テスト仕様書.md) - 全体テスト仕様
- [テスト実行報告書](テスト実行報告書.md) - テスト実行結果
- [権限テンプレート単体試験仕様書](権限テンプレート単体試験仕様書.md) - 権限テンプレート試験
- [単体試験実装完了報告書](単体試験実装完了報告書.md) - 単体試験結果

## クイックリンク
- [機能設計](../機能/) - 機能別詳細設計
- [設計](../設計/) - システム設計・アーキテクチャ
- [報告](../報告/) - 品質・性能レポート
EOF

# 運用フォルダの概要.md更新
cat > 運用/概要.md << 'EOF'
# 🚀 運用ドキュメント

## 概要
WebSysプロジェクトの運用・デプロイ関連ドキュメント集。デプロイ手順・運用手順・監視設定。

## ドキュメント

### 🚀 デプロイ・運用
- [デプロイ手順](デプロイ手順.md) - システムデプロイ手順
- [運用手順書](運用手順書.md) - 日常運用手順
- [システム監視・ヘルスチェック機能完成報告書](システム監視・ヘルスチェック機能完成報告書.md) - 監視機能

## クイックリンク
- [基本情報](../基本/) - 環境構築・トラブルシューティング
- [設計](../設計/) - システム設計・アーキテクチャ
- [報告](../報告/) - システム状況・性能レポート
EOF

# 報告フォルダの概要.md更新
cat > 報告/概要.md << 'EOF'
# 📊 報告ドキュメント

## 概要
WebSysプロジェクトの各種レポート・分析ドキュメント集。プロジェクト状況・品質・性能・Phase別報告。

## ドキュメント

### 📈 Phase別レポート
- [Phase1実装完了・次期展開計画書](Phase1実装完了・次期展開計画書.md) - Phase1完了報告
- [Phase2実装完了・高度品質保証基盤稼働レポート](Phase2実装完了・高度品質保証基盤稼働レポート.md) - Phase2完了報告
- [Phase3実装計画・技術仕様書](Phase3実装計画・技術仕様書.md) - Phase3計画
- [Phase3メイン機能実装完了レポート](Phase3メイン機能実装完了レポート.md) - Phase3完了報告

### 📊 プロジェクト状況
- [プロジェクトステータスボード](プロジェクトステータスボード.md) - 現在状況
- [プロジェクト総合サマリー](プロジェクト総合サマリー.md) - 全体サマリー
- [プロジェクト完成報告書](プロジェクト完成報告書.md) - 最終完成報告

### 📋 ドキュメント管理
- [ドキュメント総合レビュー結果・改善計画書](ドキュメント総合レビュー結果・改善計画書.md) - レビュー結果
- [ドキュメント改善実施進捗レポート](ドキュメント改善実施進捗レポート.md) - 改善進捗
- [ドキュメント総合レビュー最新化・全Phase完了報告](ドキュメント総合レビュー最新化・全Phase完了報告.md) - 最新レビュー
- [ドキュメント構成分析・整理提案書](ドキュメント構成分析・整理提案書.md) - 構成分析

### 🔍 分析・監視
- [システム総合ステータスレポート2025-09-26](システム総合ステータスレポート2025-09-26.md) - システム状況
- [不具合管理表](不具合管理表.md) - BUG管理
- [実装設計差異分析報告書](実装設計差異分析報告書.md) - 差異分析
- [システム性能分析レポート](システム性能分析レポート.md) - 性能分析

## クイックリンク
- [基本情報](../基本/) - プロジェクト概要
- [設計](../設計/) - システム設計
- [機能](../機能/) - 機能設計
EOF

# デザインフォルダの概要.md更新
cat > デザイン/概要.md << 'EOF'
# 🎨 デザインドキュメント

## 概要
WebSysプロジェクトのUI・UXデザイン関連ドキュメント集。レスポンシブ対応・デザインガイドライン・UI改善。

## ドキュメント

### 🎨 デザインガイド
- [レスポンシブデザインガイドライン](レスポンシブデザインガイドライン.md) - レスポンシブ設計
- [ユニバーサルデザインガイドライン](ユニバーサルデザインガイドライン.md) - アクセシビリティ
- [レスポンシブデザイン改善提案書](レスポンシブデザイン改善提案書.md) - UI改善提案
- [レスポンシブ共通コンポーネント化による対策量削減案](レスポンシブ共通コンポーネント化による対策量削減案.md) - コンポーネント最適化
- [レスポンシブ対応実装ガイドライン](レスポンシブ対応実装ガイドライン.md) - 実装ガイド
- [システムUI改善分析レポート](システムUI改善分析レポート.md) - UI分析

## クイックリンク
- [設計](../設計/) - システム設計・コンポーネント仕様
- [機能](../機能/) - 機能設計・UI設計
- [ガイド](../ガイド/) - 開発・実装ガイドライン
EOF

# ガイドフォルダの概要.md更新
cat > ガイド/概要.md << 'EOF'
# 📚 ガイドドキュメント

## 概要
WebSysプロジェクトの開発・運用ガイドライン集。開発手順・ベストプラクティス・改善プロセス。

## ドキュメント

### 📚 開発ガイド
- [開発ガイド](開発ガイド.md) - 基本開発手順
- [開発ガイドライン](開発ガイドライン.md) - 開発標準・規約
- [継続的改善プロセス運用ガイドライン](継続的改善プロセス運用ガイドライン.md) - 改善プロセス
- [機能追加改善チェックリスト](機能追加改善チェックリスト.md) - 品質チェック
- [実装リスク管理計画書](実装リスク管理計画書.md) - リスク管理
- [性能テスト詳細計画書](性能テスト詳細計画書.md) - 性能テスト

## クイックリンク
- [基本情報](../基本/) - 環境構築・トラブルシューティング
- [設計](../設計/) - システム設計・アーキテクチャ
- [機能](../機能/) - 機能設計・仕様
EOF

echo -e "\033[0;34m🔗 リンク更新用スクリプト作成...\033[0m"

# リンク更新スクリプト作成
cat > ../update-japanese-links.py << 'EOF'
#!/usr/bin/env python3
import os
import re
import glob

def update_japanese_links():
    """日本語フォルダ名・ファイル名に対応したリンク更新"""

    # リンクマッピング定義
    folder_mapping = {
        'core/': '基本/',
        'architecture/': '設計/',
        'features/': '機能/',
        'testing/': '試験/',
        'deployment/': '運用/',
        'reports/': '報告/',
        'design/': 'デザイン/',
        'guides/': 'ガイド/'
    }

    file_mapping = {
        'README.md': '概要.md',
        'MASTER_REFERENCE.md': '技術仕様統一.md',
        'getting-started.md': '環境構築手順.md',
        'document-reading-order.md': 'ドキュメント読み順.md',
        'troubleshooting.md': 'トラブルシューティング.md',
        'system-overview.md': 'システム概要.md',
        'system-design.md': 'システム設計.md',
        'api-specification.md': 'API仕様書.md',
        'component-specification.md': 'コンポーネント仕様書.md',
        'common-components.md': '共通コンポーネント仕様.md',
        'function-specs/': '機能設計書/',
        'approval-workflow-design.md': '申請承認ワークフロー機能設計書.md',
        'multi-project-sharing.md': '複数プロジェクト共有機能設計書.md',
        'enterprise-common-features.md': '企業システム共通機能仕様.md',
        'api-design-template.md': 'API設計書テンプレート.md',
        'test-specification.md': 'テスト仕様書.md',
        'test-execution-report.md': 'テスト実行報告書.md',
        'permission-template-unit-test.md': '権限テンプレート単体試験仕様書.md',
        'unit-test-completion-report.md': '単体試験実装完了報告書.md',
        'deployment-guide.md': 'デプロイ手順.md',
        'operations-manual.md': '運用手順書.md',
        'development-guide.md': '開発ガイド.md',
        'development-guidelines.md': '開発ガイドライン.md',
        'continuous-improvement-process.md': '継続的改善プロセス運用ガイドライン.md',
        'feature-improvement-checklist.md': '機能追加改善チェックリスト.md',
        'implementation-risk-management.md': '実装リスク管理計画書.md',
        'performance-test-plan.md': '性能テスト詳細計画書.md'
    }

    updated_files = []

    # docsフォルダ内の全てのmdファイルを処理
    for md_file in glob.glob('docs/**/*.md', recursive=True):
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content

            # フォルダ名リンク更新
            for eng_folder, jpn_folder in folder_mapping.items():
                # 相対パス形式のリンク更新
                content = re.sub(
                    rf'\(\.\./({re.escape(eng_folder)}[^)]*)\)',
                    lambda m: f'(../{jpn_folder}{m.group(1)[len(eng_folder):]})',
                    content
                )
                content = re.sub(
                    rf'\(({re.escape(eng_folder)}[^)]*)\)',
                    lambda m: f'({jpn_folder}{m.group(1)[len(eng_folder):]})',
                    content
                )

            # ファイル名リンク更新
            for eng_file, jpn_file in file_mapping.items():
                content = re.sub(
                    rf'\[([^\]]+)\]\(([^)]*{re.escape(eng_file)})\)',
                    lambda m: f'[{m.group(1)}]({m.group(2).replace(eng_file, jpn_file)})',
                    content
                )

            # 内容が変更された場合のみファイルを更新
            if content != original_content:
                with open(md_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                updated_files.append(md_file)

        except Exception as e:
            print(f"Error processing {md_file}: {e}")

    print(f"Updated links in {len(updated_files)} files:")
    for file in updated_files:
        print(f"  - {file}")

if __name__ == "__main__":
    update_japanese_links()
EOF

chmod +x ../update-japanese-links.py

echo -e "\033[0;32m🎉 ドキュメント日本語化完了！\033[0m"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "\033[0;34m📊 変更結果:\033[0m"
echo "  📁 フォルダ名: 8個すべて日本語化"
echo "  📄 ファイル名: 主要ファイルすべて日本語化"
echo "  📋 README更新: 各フォルダの概要.md作成"

echo -e "\033[0;34m📂 新フォルダ構成:\033[0m"
echo "  📖 基本/          - プロジェクト概要・環境構築・トラブルシューティング"
echo "  🏗️ 設計/          - システム設計・API仕様・コンポーネント仕様"
echo "  🔧 機能/          - 機能設計書・ワークフロー・企業機能"
echo "  🧪 試験/          - テスト仕様・実行報告・単体試験"
echo "  🚀 運用/          - デプロイ手順・運用・監視設定"
echo "  📊 報告/          - プロジェクト状況・品質・性能レポート"
echo "  🎨 デザイン/      - レスポンシブ・UI改善・デザインガイドライン"
echo "  📚 ガイド/        - 開発ガイド・ベストプラクティス・手順書"
echo "  📦 legacy/        - 既存ファイル保管"

echo -e "\033[1;33m📋 次のステップ:\033[0m"
echo "  1. リンク更新: python3 ../update-japanese-links.py"
echo "  2. 動作確認: 各フォルダの概要.md確認"
echo "  3. Git commit: 日本語化結果をコミット"

echo -e "\033[0;32m✅ 日本語化完了 - 直感的な日本語ナビゲーション実現！\033[0m"