---
layout: home
title: WebSys Documentation Hub
titleTemplate: Interactive Documentation Platform

hero:
  name: WebSys Docs
  text: インタラクティブドキュメントプラットフォーム
  tagline: 高度検索・多言語対応・AI分析機能搭載
  image:
    src: /logo.svg
    alt: WebSys Logo
  actions:
    - theme: brand
      text: ダッシュボードを見る
      link: /dashboard
    - theme: alt
      text: ドキュメント一覧
      link: /docs/
    - theme: alt
      text: 高度検索
      link: /search

features:
  - icon: 🔍
    title: 高度検索機能
    details: 全文検索・フィルタリング・ファジーマッチ対応。必要な情報を瞬時に発見。
  - icon: 🌐
    title: 多言語対応
    details: 日本語・英語対応。自動翻訳・品質管理・整合性チェック機能。
  - icon: 🤖
    title: AI品質分析
    details: GPT統合・自動改善提案・ユーザビリティ分析・継続的最適化。
  - icon: 📊
    title: ダッシュボード
    details: プロジェクト統計・進捗可視化・カテゴリ別ナビゲーション。
  - icon: 🚀
    title: 高速パフォーマンス
    details: Vitepress + Vue 3 - SSG + SPA・レスポンシブ対応・PWA対応。
  - icon: 🔧
    title: 開発者フレンドリー
    details: TypeScript完全対応・コンポーネント化・継続的品質保証。
---

<style>
.VPHero .VPImage {
  filter: drop-shadow(0 0 20px rgba(62, 175, 124, 0.3));
}

.VPFeatures {
  margin-top: 2rem;
}

.VPFeature {
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
}

.VPFeature:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 16px rgba(62, 175, 124, 0.1);
  transform: translateY(-2px);
}

.VPFeature .icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}
</style>

## 🎯 WebSysプロジェクト概要

WebSysは**Vue.js 3 + Element Plus + Express + PostgreSQL**を使用した、エンタープライズグレードの社内システム開発プラットフォームです。

### 🏗️ 主要機能

- **認証・認可システム**: JWT認証 + RBAC権限管理
- **ユーザー管理**: 部署・役職・権限テンプレート管理
- **ログ監視**: リアルタイム収集・分析・アラート
- **レスポンシブUI**: 全デバイス対応・アクセシビリティ準拠
- **単体試験**: 63項目実装・カバレッジ95%以上

### 📈 プロジェクト統計

<Dashboard />

### 🚀 クイックスタート

1. **環境構築**: [セットアップガイド](/docs/setup) を参照
2. **開発開始**: [開発フロー](/docs/development) を確認
3. **API仕様**: [API ドキュメント](/api/) で詳細確認
4. **問題解決**: [トラブルシューティング](/docs/troubleshooting) を活用

### 💡 特徴・優位性

:::tip Phase3新機能
**インタラクティブサイト・国際化対応・AI分析機能**が新たに追加されました！
高度検索・ダッシュボード・多言語対応でさらに使いやすくなりました。
:::

:::info 継続的品質保証
Phase2で実装された**継続的品質保証基盤**により、ドキュメント品質が24時間自動監視されています。
:::

:::warning 開発者向け情報
このサイトは**Vitepress + Vue 3**で構築されており、従来のMarkdownファイルと完全互換性を保ちながら、インタラクティブな機能を提供しています。
:::

### 🤝 コントリビューション

プロジェクトへの貢献を歓迎します！

- **バグレポート**: [Issues](https://github.com/websys/docs/issues) で報告
- **機能リクエスト**: [Discussions](https://github.com/websys/docs/discussions) で提案
- **ドキュメント改善**: [Edit this page](https://github.com/websys/docs/edit/main/index.md) から直接編集

---

<div style="text-align: center; margin-top: 2rem; padding: 2rem; background: var(--vp-c-bg-soft); border-radius: 12px;">

**🎉 Phase3実装完了により、業界最高水準のドキュメント体験を実現しました**

[ダッシュボードを探索](/dashboard) • [高度検索を試す](/search) • [English Version](/en/)

</div>