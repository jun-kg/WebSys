#!/usr/bin/env python3
"""
ドキュメント内リンクの自動更新スクリプト
移動されたファイルへのリンクを新しいパスに更新
"""

import os
import re
import glob

def update_links_in_file(file_path, link_mappings):
    """ファイル内のリンクを更新"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Markdownリンクパターン: [text](path) and [text]: path
        for old_path, new_path in link_mappings.items():
            # 相対パス形式のリンクを更新
            content = re.sub(
                rf'\((?:\./)?{re.escape(old_path)}\)',
                f'({new_path})',
                content
            )
            content = re.sub(
                rf':\s*(?:\./)?{re.escape(old_path)}',
                f': {new_path}',
                content
            )

        # 変更があった場合のみファイルを更新
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error updating {file_path}: {e}")
        return False

def main():
    """メイン処理"""
    # 移動マッピング（旧パス → 新パス）
    link_mappings = {
        # コア
        'README.md': 'core/README.md',
        'MASTER_REFERENCE.md': 'core/MASTER_REFERENCE.md',
        '00-ドキュメント読み順.md': 'core/document-reading-order.md',
        '02-環境構築手順.md': 'core/getting-started.md',
        '06-トラブルシューティング.md': 'core/troubleshooting.md',

        # アーキテクチャ
        '01-システム概要.md': 'architecture/system-overview.md',
        '04-システム設計.md': 'architecture/system-design.md',
        '07-API仕様書.md': 'architecture/api-specification.md',
        '08-コンポーネント仕様書.md': 'architecture/component-specification.md',
        '10-共通コンポーネント仕様.md': 'architecture/common-components.md',

        # その他主要ファイル
        '72-ドキュメント総合レビュー結果・改善計画書.md': 'reports/document-comprehensive-review.md',
        '75-Phase2実装完了・高度品質保証基盤稼働レポート.md': 'reports/phase2-quality-assurance-report.md',
        '76-Phase3実装計画・技術仕様書.md': 'reports/phase3-implementation-plan.md',
    }

    # すべてのMarkdownファイルを処理
    updated_files = []
    for md_file in glob.glob('docs/**/*.md', recursive=True):
        if update_links_in_file(md_file, link_mappings):
            updated_files.append(md_file)

    print(f"Updated links in {len(updated_files)} files:")
    for file in updated_files:
        print(f"  - {file}")

if __name__ == "__main__":
    main()
