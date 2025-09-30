#!/usr/bin/env python3
import os
import re
import glob

def update_ordered_links():
    """順序コード付きフォルダ名・ファイル名に対応したリンク更新"""

    # フォルダマッピング
    folder_mapping = {
        '基本/': '01_基本/',
        '設計/': '02_設計/',
        '機能/': '03_機能/',
        '試験/': '04_試験/',
        '運用/': '05_運用/',
        'デザイン/': '06_デザイン/',
        'ガイド/': '07_ガイド/',
        '報告/': '08_報告/'
    }

    # ファイルマッピング（基本的なパターン）
    file_mapping = {
        '概要.md': '01_概要.md',
        '技術仕様統一.md': '02_技術仕様統一.md',
        '環境構築手順.md': '03_環境構築手順.md',
        'ドキュメント読み順.md': '04_ドキュメント読み順.md',
        'トラブルシューティング.md': '05_トラブルシューティング.md',
        'システム概要.md': '02_システム概要.md',
        'システム設計.md': '03_システム設計.md',
        'API仕様書.md': '04_API仕様書.md',
        'コンポーネント仕様書.md': '05_コンポーネント仕様書.md',
        '共通コンポーネント仕様.md': '06_共通コンポーネント仕様.md',
        '企業システム共通機能仕様.md': '02_企業システム共通機能仕様.md',
        '複数プロジェクト共有機能設計書.md': '03_複数プロジェクト共有機能設計書.md',
        '申請承認ワークフロー機能設計書.md': '04_申請承認ワークフロー機能設計書.md',
        'API設計書テンプレート.md': '05_API設計書テンプレート.md',
        '機能設計書/': '06_機能設計書/',
        'テスト仕様書.md': '02_テスト仕様書.md',
        'テスト実行報告書.md': '03_テスト実行報告書.md',
        '権限テンプレート単体試験仕様書.md': '04_権限テンプレート単体試験仕様書.md',
        '単体試験実装完了報告書.md': '05_単体試験実装完了報告書.md',
        'デプロイ手順.md': '02_デプロイ手順.md',
        '運用手順書.md': '03_運用手順書.md',
        'レスポンシブデザインガイドライン.md': '02_レスポンシブデザインガイドライン.md',
        'ユニバーサルデザインガイドライン.md': '03_ユニバーサルデザインガイドライン.md',
        '開発ガイド.md': '02_開発ガイド.md',
        '開発ガイドライン.md': '03_開発ガイドライン.md'
    }

    updated_files = []

    # docsフォルダ内の全てのmdファイルを処理
    for md_file in glob.glob('docs/**/*.md', recursive=True):
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content

            # フォルダ名リンク更新
            for old_folder, new_folder in folder_mapping.items():
                # 相対パス形式のリンク更新
                content = re.sub(
                    rf'\(\.\./({re.escape(old_folder)}[^)]*)\)',
                    lambda m: f'(../{new_folder}{m.group(1)[len(old_folder):]})',
                    content
                )
                content = re.sub(
                    rf'\(({re.escape(old_folder)}[^)]*)\)',
                    lambda m: f'({new_folder}{m.group(1)[len(old_folder):]})',
                    content
                )

            # ファイル名リンク更新
            for old_file, new_file in file_mapping.items():
                content = re.sub(
                    rf'\[([^\]]+)\]\(([^)]*{re.escape(old_file)})\)',
                    lambda m: f'[{m.group(1)}]({m.group(2).replace(old_file, new_file)})',
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
    update_ordered_links()
