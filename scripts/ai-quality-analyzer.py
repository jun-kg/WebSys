#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
WebSys Phase2 AI活用品質分析システム
作成日: 2025-09-30
目的: AI/GPT統合によるコンテンツ品質分析・改善提案・自動評価
"""

import json
import os
import sys
import datetime
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple
import argparse

class AIQualityAnalyzer:
    def __init__(self, docs_dir: str = "docs", output_dir: str = "docs/quality-reports"):
        self.docs_dir = Path(docs_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.timestamp = datetime.datetime.now()

        # AI分析のシミュレーション（将来的にはGPT API統合）
        self.ai_enabled = False  # 実際のAI APIが利用可能かどうか

    def analyze_content_quality(self) -> Dict[str, Any]:
        """AI活用コンテンツ品質分析"""
        print("🤖 AI品質分析開始...")

        md_files = list(self.docs_dir.glob("**/*.md"))

        analysis_results = {
            "metadata": {
                "timestamp": self.timestamp.isoformat(),
                "analyzer": "AIQualityAnalyzer v1.0",
                "ai_enabled": self.ai_enabled,
                "total_files": len(md_files)
            },
            "content_analysis": {},
            "readability_scores": {},
            "structure_scores": {},
            "improvement_suggestions": {},
            "ai_recommendations": [],
            "quality_summary": {}
        }

        for file in md_files:
            print(f"🔍 分析中: {file.name}")
            file_analysis = self._analyze_single_file(file)
            analysis_results["content_analysis"][str(file)] = file_analysis

        # 全体サマリー生成
        analysis_results["quality_summary"] = self._generate_quality_summary(
            analysis_results["content_analysis"]
        )

        # AI推奨事項生成
        analysis_results["ai_recommendations"] = self._generate_ai_recommendations(
            analysis_results["content_analysis"]
        )

        return analysis_results

    def _analyze_single_file(self, file_path: Path) -> Dict[str, Any]:
        """単一ファイルの詳細分析"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 基本メトリクス
            lines = content.split('\n')
            words = len(content.split())
            chars = len(content)

            # 構造分析
            headers = self._analyze_headers(lines)
            links = self._analyze_links(content)
            images = self._analyze_images(content)
            code_blocks = self._analyze_code_blocks(content)
            tables = self._analyze_tables(lines)

            # 可読性分析
            readability = self._analyze_readability(content, words)

            # 構造品質スコア
            structure_score = self._calculate_structure_score(
                headers, links, images, code_blocks, tables, words
            )

            # AI品質分析（シミュレート）
            ai_analysis = self._simulate_ai_analysis(content, file_path.name)

            return {
                "basic_metrics": {
                    "lines": len(lines),
                    "words": words,
                    "characters": chars,
                    "avg_line_length": chars / len(lines) if lines else 0
                },
                "structure_analysis": {
                    "headers": headers,
                    "links": links,
                    "images": images,
                    "code_blocks": code_blocks,
                    "tables": tables
                },
                "readability": readability,
                "structure_score": structure_score,
                "ai_analysis": ai_analysis,
                "overall_score": self._calculate_overall_score(
                    structure_score, readability["score"], ai_analysis["score"]
                )
            }

        except Exception as e:
            print(f"⚠️ ファイル分析エラー {file_path}: {e}")
            return {"error": str(e)}

    def _analyze_headers(self, lines: List[str]) -> Dict[str, Any]:
        """見出し構造分析"""
        headers = []
        header_hierarchy = []

        for i, line in enumerate(lines):
            line = line.strip()
            if line.startswith('#'):
                level = len(line) - len(line.lstrip('#'))
                text = line.lstrip('#').strip()
                headers.append({
                    "level": level,
                    "text": text,
                    "line_number": i + 1
                })

        # 階層構造チェック
        hierarchy_issues = []
        for i in range(1, len(headers)):
            current_level = headers[i]["level"]
            previous_level = headers[i-1]["level"]

            if current_level > previous_level + 1:
                hierarchy_issues.append({
                    "line": headers[i]["line_number"],
                    "issue": f"見出しレベル{current_level}が{previous_level}から飛躍"
                })

        return {
            "total": len(headers),
            "hierarchy": headers,
            "hierarchy_issues": hierarchy_issues,
            "deepest_level": max([h["level"] for h in headers]) if headers else 0
        }

    def _analyze_links(self, content: str) -> Dict[str, Any]:
        """リンク分析"""
        # 内部リンク
        internal_links = re.findall(r'\[([^\]]*)\]\(\./([^)]*)\)', content)

        # 外部リンク
        external_links = re.findall(r'\[([^\]]*)\]\((https?://[^)]*)\)', content)

        # 空リンク
        empty_links = re.findall(r'\[\]\([^)]*\)', content)

        return {
            "total": len(internal_links) + len(external_links),
            "internal": len(internal_links),
            "external": len(external_links),
            "empty": len(empty_links),
            "internal_details": internal_links,
            "external_details": external_links
        }

    def _analyze_images(self, content: str) -> Dict[str, Any]:
        """画像分析"""
        images = re.findall(r'!\[([^\]]*)\]\(([^)]*)\)', content)
        images_without_alt = re.findall(r'!\[\]\([^)]*\)', content)

        return {
            "total": len(images),
            "with_alt": len([img for img in images if img[0]]),
            "without_alt": len(images_without_alt),
            "details": images
        }

    def _analyze_code_blocks(self, content: str) -> Dict[str, Any]:
        """コードブロック分析"""
        # バッククォート3つのコードブロック
        code_blocks = re.findall(r'```(\w+)?\n(.*?)\n```', content, re.DOTALL)

        # インラインコード
        inline_code = re.findall(r'`([^`]+)`', content)

        languages = [block[0] for block in code_blocks if block[0]]
        language_count = {}
        for lang in languages:
            language_count[lang] = language_count.get(lang, 0) + 1

        return {
            "total_blocks": len(code_blocks),
            "inline_code": len(inline_code),
            "languages": language_count,
            "details": code_blocks
        }

    def _analyze_tables(self, lines: List[str]) -> Dict[str, Any]:
        """テーブル分析"""
        table_lines = [line for line in lines if '|' in line and line.strip().startswith('|')]

        # テーブル数をカウント（連続する表形式行をグループ化）
        tables = 0
        in_table = False

        for line in lines:
            is_table_line = '|' in line and line.strip().startswith('|')
            if is_table_line and not in_table:
                tables += 1
                in_table = True
            elif not is_table_line:
                in_table = False

        return {
            "total": tables,
            "total_rows": len(table_lines)
        }

    def _analyze_readability(self, content: str, word_count: int) -> Dict[str, Any]:
        """可読性分析"""
        # 文の数（ピリオド、感嘆符、疑問符で区切り）
        sentences = re.split(r'[.!?。！？]', content)
        sentence_count = len([s for s in sentences if s.strip()])

        # 平均文長
        avg_words_per_sentence = word_count / sentence_count if sentence_count > 0 else 0

        # 長い文の数（20単語以上）
        long_sentences = 0
        for sentence in sentences:
            if len(sentence.split()) > 20:
                long_sentences += 1

        # 可読性スコア計算（簡易版）
        readability_score = 100

        # 長い文が多いとペナルティ
        if sentence_count > 0:
            long_sentence_ratio = long_sentences / sentence_count
            readability_score -= long_sentence_ratio * 30

        # 平均文長が長すぎるとペナルティ
        if avg_words_per_sentence > 15:
            readability_score -= (avg_words_per_sentence - 15) * 2

        readability_score = max(0, min(100, readability_score))

        return {
            "score": round(readability_score, 2),
            "sentences": sentence_count,
            "avg_words_per_sentence": round(avg_words_per_sentence, 2),
            "long_sentences": long_sentences,
            "readability_level": self._get_readability_level(readability_score)
        }

    def _get_readability_level(self, score: float) -> str:
        """可読性レベル判定"""
        if score >= 90:
            return "非常に読みやすい"
        elif score >= 80:
            return "読みやすい"
        elif score >= 70:
            return "やや読みやすい"
        elif score >= 60:
            return "普通"
        elif score >= 50:
            return "やや読みにくい"
        else:
            return "読みにくい"

    def _calculate_structure_score(self, headers, links, images, code_blocks, tables, words) -> float:
        """構造品質スコア計算"""
        score = 0

        # 見出し構造 (0-25点)
        if headers["total"] > 0:
            score += min(headers["total"] * 5, 25)
            # 階層問題があればペナルティ
            if headers["hierarchy_issues"]:
                score -= len(headers["hierarchy_issues"]) * 3

        # リンク (0-20点)
        if links["total"] > 0:
            score += min(links["total"] * 2, 20)
            # 空リンクがあればペナルティ
            score -= links["empty"] * 2

        # 視覚要素 (0-20点)
        if images["total"] > 0:
            score += min(images["total"] * 3, 15)
            # altテキストなしはペナルティ
            score -= images["without_alt"] * 2

        if tables["total"] > 0:
            score += min(tables["total"] * 2, 5)

        # コード例 (0-15点)
        if code_blocks["total_blocks"] > 0:
            score += min(code_blocks["total_blocks"] * 3, 15)

        # コンテンツ量 (0-20点)
        if words > 0:
            score += min(words / 50, 20)

        return min(score, 100)

    def _simulate_ai_analysis(self, content: str, filename: str) -> Dict[str, Any]:
        """AI分析のシミュレーション（将来的にはGPT API統合）"""
        # 簡易AI分析シミュレーション
        ai_score = 75  # デフォルトスコア

        suggestions = []

        # ルールベースの分析
        if len(content.split()) < 100:
            suggestions.append("コンテンツが短すぎます。より詳細な説明を追加することを推奨します。")
            ai_score -= 10

        if not re.search(r'```', content):
            if 'api' in filename.lower() or 'code' in filename.lower():
                suggestions.append("技術ドキュメントにコード例があると理解しやすくなります。")
                ai_score -= 5

        if not re.search(r'!\[.*\]\(.*\)', content):
            if 'guide' in filename.lower() or 'tutorial' in filename.lower():
                suggestions.append("ガイドドキュメントには図表があると分かりやすくなります。")
                ai_score -= 5

        # 見出し構造チェック
        if not re.search(r'^#+ ', content, re.MULTILINE):
            suggestions.append("適切な見出し構造を追加することで文書の構造が明確になります。")
            ai_score -= 15

        return {
            "score": max(0, ai_score),
            "suggestions": suggestions,
            "ai_enabled": self.ai_enabled,
            "analysis_method": "rule_based_simulation" if not self.ai_enabled else "gpt_analysis"
        }

    def _calculate_overall_score(self, structure_score: float, readability_score: float, ai_score: float) -> float:
        """総合スコア計算"""
        # 重み付き平均
        weights = {
            "structure": 0.4,
            "readability": 0.3,
            "ai": 0.3
        }

        overall = (
            structure_score * weights["structure"] +
            readability_score * weights["readability"] +
            ai_score * weights["ai"]
        )

        return round(overall, 2)

    def _generate_quality_summary(self, content_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """品質サマリー生成"""
        scores = []
        for file_data in content_analysis.values():
            if "overall_score" in file_data:
                scores.append(file_data["overall_score"])

        avg_score = sum(scores) / len(scores) if scores else 0

        # スコア分布
        score_distribution = {
            "excellent": len([s for s in scores if s >= 90]),
            "good": len([s for s in scores if 80 <= s < 90]),
            "fair": len([s for s in scores if 70 <= s < 80]),
            "poor": len([s for s in scores if s < 70])
        }

        return {
            "average_score": round(avg_score, 2),
            "total_files": len(scores),
            "score_distribution": score_distribution,
            "quality_level": self._get_quality_level(avg_score)
        }

    def _get_quality_level(self, score: float) -> str:
        """品質レベル判定"""
        if score >= 90:
            return "優秀"
        elif score >= 80:
            return "良好"
        elif score >= 70:
            return "普通"
        else:
            return "要改善"

    def _generate_ai_recommendations(self, content_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """AI推奨事項生成"""
        recommendations = []

        # 低スコアファイルの分析
        low_score_files = []
        for file_path, file_data in content_analysis.items():
            if "overall_score" in file_data and file_data["overall_score"] < 70:
                low_score_files.append((file_path, file_data))

        if low_score_files:
            recommendations.append({
                "priority": "high",
                "category": "content_quality",
                "title": "低品質ファイルの改善",
                "description": f"{len(low_score_files)}件のファイルが品質基準を下回っています",
                "action": "見出し構造、リンク、視覚要素の追加・改善",
                "affected_files": [file for file, _ in low_score_files[:5]]  # 最初の5件
            })

        # 構造改善推奨
        structure_issues = 0
        for file_data in content_analysis.values():
            if "structure_analysis" in file_data:
                if file_data["structure_analysis"]["headers"]["hierarchy_issues"]:
                    structure_issues += 1

        if structure_issues > 0:
            recommendations.append({
                "priority": "medium",
                "category": "structure",
                "title": "見出し階層の改善",
                "description": f"{structure_issues}件のファイルで見出し階層に問題があります",
                "action": "適切な見出しレベル（h1→h2→h3）の使用",
                "impact": "文書構造の明確化・アクセシビリティ向上"
            })

        return recommendations

    def generate_detailed_report(self, analysis_data: Dict[str, Any]) -> str:
        """詳細HTMLレポート生成"""
        html_template = f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI品質分析レポート - WebSys</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f8fafc; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }}
        .container {{ max-width: 1400px; margin: 0 auto; padding: 30px; }}
        .dashboard {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 25px; margin-bottom: 40px; }}
        .widget {{ background: white; border-radius: 16px; padding: 30px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); transition: transform 0.2s; }}
        .widget:hover {{ transform: translateY(-2px); }}
        .widget h3 {{ margin-top: 0; color: #2d3748; font-size: 1.3em; }}
        .score-circle {{ width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 20px auto; font-size: 2em; font-weight: bold; }}
        .score-excellent {{ background: linear-gradient(135deg, #48bb78, #38a169); color: white; }}
        .score-good {{ background: linear-gradient(135deg, #4299e1, #3182ce); color: white; }}
        .score-fair {{ background: linear-gradient(135deg, #ed8936, #dd6b20); color: white; }}
        .score-poor {{ background: linear-gradient(135deg, #f56565, #e53e3e); color: white; }}
        .file-analysis {{ background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }}
        .file-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }}
        .file-name {{ font-size: 1.2em; font-weight: 600; color: #2d3748; }}
        .metrics-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }}
        .metric {{ background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center; }}
        .metric-value {{ font-size: 1.5em; font-weight: bold; color: #667eea; }}
        .metric-label {{ color: #718096; font-size: 0.9em; margin-top: 5px; }}
        .suggestions {{ margin-top: 20px; }}
        .suggestion {{ background: #ebf8ff; border-left: 4px solid #4299e1; padding: 15px; margin: 10px 0; border-radius: 0 8px 8px 0; }}
        .recommendations {{ background: white; border-radius: 16px; padding: 30px; margin-top: 30px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }}
        .recommendation {{ background: #f0fff4; border-left: 4px solid #48bb78; padding: 20px; margin: 15px 0; border-radius: 0 8px 8px 0; }}
        .recommendation h4 {{ margin: 0 0 10px 0; color: #2d3748; }}
        .chart-placeholder {{ background: #edf2f7; height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #718096; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI品質分析レポート</h1>
        <p>WebSys Phase2 高度品質分析システム</p>
        <p>生成日時: {self.timestamp.strftime('%Y年%m月%d日 %H:%M:%S')}</p>
    </div>

    <div class="container">
        <div class="dashboard">
            <div class="widget">
                <h3>📊 総合品質スコア</h3>
                <div class="score-circle score-{self._get_score_class(analysis_data['quality_summary']['average_score'])}">
                    {analysis_data['quality_summary']['average_score']}
                </div>
                <div style="text-align: center; color: #718096;">
                    {analysis_data['quality_summary']['quality_level']}
                </div>
            </div>

            <div class="widget">
                <h3>📚 分析対象</h3>
                <div class="metric-value">{analysis_data['quality_summary']['total_files']}</div>
                <div class="metric-label">ファイル</div>
            </div>

            <div class="widget">
                <h3>🏆 優秀ファイル</h3>
                <div class="metric-value">{analysis_data['quality_summary']['score_distribution']['excellent']}</div>
                <div class="metric-label">90点以上</div>
            </div>

            <div class="widget">
                <h3>⚠️ 要改善ファイル</h3>
                <div class="metric-value">{analysis_data['quality_summary']['score_distribution']['poor']}</div>
                <div class="metric-label">70点未満</div>
            </div>
        </div>

        <div class="recommendations">
            <h2>💡 AI推奨改善事項</h2>
        """

        for rec in analysis_data['ai_recommendations']:
            html_template += f"""
            <div class="recommendation">
                <h4>{rec['title']}</h4>
                <p><strong>説明:</strong> {rec['description']}</p>
                <p><strong>推奨アクション:</strong> {rec['action']}</p>
            </div>
            """

        html_template += """
        </div>

        <h2>📋 ファイル別詳細分析</h2>
        """

        # 上位・下位ファイルのみ表示（表示量制限）
        sorted_files = sorted(
            analysis_data['content_analysis'].items(),
            key=lambda x: x[1].get('overall_score', 0),
            reverse=True
        )

        for file_path, file_data in sorted_files[:10]:  # 上位10件
            if 'overall_score' in file_data:
                score_class = self._get_score_class(file_data['overall_score'])
                html_template += f"""
                <div class="file-analysis">
                    <div class="file-header">
                        <div class="file-name">{Path(file_path).name}</div>
                        <div class="score-circle score-{score_class}" style="width: 60px; height: 60px; font-size: 1.2em;">
                            {file_data['overall_score']}
                        </div>
                    </div>

                    <div class="metrics-grid">
                        <div class="metric">
                            <div class="metric-value">{file_data['basic_metrics']['words']}</div>
                            <div class="metric-label">単語数</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">{file_data['structure_analysis']['headers']['total']}</div>
                            <div class="metric-label">見出し数</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">{file_data['structure_analysis']['links']['total']}</div>
                            <div class="metric-label">リンク数</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">{file_data['readability']['readability_level']}</div>
                            <div class="metric-label">可読性</div>
                        </div>
                    </div>

                    {f'<div class="suggestions"><h4>AI改善提案:</h4>' + ''.join([f'<div class="suggestion">{suggestion}</div>' for suggestion in file_data['ai_analysis']['suggestions']]) + '</div>' if file_data['ai_analysis']['suggestions'] else ''}
                </div>
                """

        html_template += """
    </div>
</body>
</html>
        """

        return html_template

    def _get_score_class(self, score: float) -> str:
        """スコアに基づくCSSクラス取得"""
        if score >= 90:
            return "excellent"
        elif score >= 80:
            return "good"
        elif score >= 70:
            return "fair"
        else:
            return "poor"

def main():
    parser = argparse.ArgumentParser(description='WebSys AI Quality Analyzer')
    parser.add_argument('--docs-dir', default='docs', help='ドキュメントディレクトリ')
    parser.add_argument('--output-dir', default='docs/quality-reports', help='出力ディレクトリ')
    parser.add_argument('--format', choices=['json', 'html', 'both'], default='both', help='出力形式')
    parser.add_argument('--ai-enabled', action='store_true', help='実際のAI分析を有効化')

    args = parser.parse_args()

    print("🤖 WebSys AI品質分析システム開始")
    print(f"ドキュメントディレクトリ: {args.docs_dir}")
    print(f"出力ディレクトリ: {args.output_dir}")
    print(f"AI分析: {'有効' if args.ai_enabled else '無効（シミュレーション）'}")
    print()

    analyzer = AIQualityAnalyzer(args.docs_dir, args.output_dir)
    analyzer.ai_enabled = args.ai_enabled

    analysis_data = analyzer.analyze_content_quality()

    timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')

    # JSON出力
    if args.format in ['json', 'both']:
        json_file = Path(args.output_dir) / f"ai-quality-{timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(analysis_data, f, ensure_ascii=False, indent=2)
        print(f"✅ AI分析JSON出力: {json_file}")

    # HTML出力
    if args.format in ['html', 'both']:
        html_content = analyzer.generate_detailed_report(analysis_data)
        html_file = Path(args.output_dir) / f"ai-quality-{timestamp}.html"
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"✅ AI分析HTML出力: {html_file}")

    print("\n🎉 AI品質分析完了！")
    print(f"🤖 総合スコア: {analysis_data['quality_summary']['average_score']}/100")
    print(f"📚 分析ファイル: {analysis_data['quality_summary']['total_files']}件")
    print(f"🏆 品質レベル: {analysis_data['quality_summary']['quality_level']}")
    print(f"💡 改善提案: {len(analysis_data['ai_recommendations'])}項目")

if __name__ == "__main__":
    main()