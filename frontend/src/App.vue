<template>
  <router-view />
</template>

<script setup lang="ts">
// import { ElConfigProvider } from 'element-plus' // 削除（templateで使用しない）
// import ja from 'element-plus/dist/locale/ja.mjs' // ロケールインポートを削除

// const locale = ja // ロケールを削除
</script>

<style>
/* ローカルのBIZ UDゴシックフォントを使用 (main.tsでインポート済み) */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  /* BIZ UDゴシック優先のアクセシブルフォントスタック */
  font-family:
    "BIZ UDGothic",             /* BIZ UDゴシック 等幅 (最優先) */
    "BIZ UDPGothic",            /* BIZ UDPゴシック プロポーショナル */
    "UD Digi Kyokasho NP-R",    /* UDデジタル教科書体 */
    "UD Digi Kyokasho N-R",     /* UDデジタル教科書体 */
    "Yu Gothic UI",             /* Windows 標準ゴシック */
    "Yu Gothic",                /* Windows ゴシック */
    "Hiragino Kaku Gothic ProN", /* ヒラギノ角ゴ ProN */
    "Noto Sans CJK JP",         /* Noto Sans CJK JP */
    "Meiryo",                   /* メイリオ */
    sans-serif;
  font-size: 16px;              /* アクセシブルな最小サイズ */
  line-height: 1.6;             /* 読みやすい行間 */
  font-weight: 400;             /* 通常の太さ */
  -webkit-font-smoothing: antialiased; /* フォント滑らか化 */
  -moz-osx-font-smoothing: grayscale;  /* macOS フォント滑らか化 */
}

/* 全要素にBIZ UDゴシック適用 */
*,
*::before,
*::after,
.el-button,
.el-input,
.el-card,
.el-table,
.el-form,
.el-menu,
.el-dropdown {
  font-family:
    "BIZ UDGothic",             /* BIZ UDゴシック 等幅 (最優先) */
    "BIZ UDPGothic",            /* BIZ UDPゴシック プロポーショナル */
    "UD Digi Kyokasho NP-R",    /* UDデジタル教科書体 */
    "UD Digi Kyokasho N-R",     /* UDデジタル教科書体 */
    "Yu Gothic UI",             /* Windows 標準ゴシック */
    "Yu Gothic",                /* Windows ゴシック */
    "Hiragino Kaku Gothic ProN", /* ヒラギノ角ゴ ProN */
    "Noto Sans CJK JP",         /* Noto Sans CJK JP */
    "Meiryo",                   /* メイリオ */
    sans-serif !important;
}

/* Element Plus コンポーネント専用フォント設定 */
.el-button span,
.el-input__inner,
.el-card__header,
.el-card__body,
.el-table td,
.el-table th,
.el-form-item__label,
.el-menu-item,
.el-dropdown-menu__item {
  font-family: "BIZ UDGothic", "BIZ UDPGothic", sans-serif !important;
  font-weight: 400 !important;
}
</style>