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
