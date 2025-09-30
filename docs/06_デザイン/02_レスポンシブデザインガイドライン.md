# レスポンシブデザインガイドライン

## 概要

本ドキュメントは、PC・スマートフォン・タブレットなど、あらゆるデバイスで最適な表示と操作性を提供するためのレスポンシブデザインガイドラインを定めます。
すべての開発においてモバイルファースト設計を採用し、ユーザビリティとアクセシビリティを最優先とします。

## 基本原則

### 1. モバイルファースト設計
- **最小デバイス（320px）から設計開始**
- プログレッシブエンハンスメント手法の採用
- コンテンツの優先順位を明確化

### 2. フレキシブルレイアウト
- 固定幅ではなく相対単位（%、vw、vh、rem）を使用
- CSS Grid と Flexbox を活用した柔軟な配置
- コンテナクエリによる適応的デザイン

### 3. タッチフレンドリー
- 最小タップ領域: 44×44px（iOS）/ 48×48dp（Android）
- 適切な余白とスペーシング
- ホバー依存の機能を避ける

## ブレークポイント定義

### 標準ブレークポイント

```scss
// ブレークポイント変数
$breakpoint-xs: 320px;   // スマートフォン（小）
$breakpoint-sm: 576px;   // スマートフォン（大）
$breakpoint-md: 768px;   // タブレット（縦向き）
$breakpoint-lg: 992px;   // タブレット（横向き）/ ノートPC
$breakpoint-xl: 1200px;  // デスクトップ
$breakpoint-xxl: 1920px; // 大型ディスプレイ

// メディアクエリミックスイン
@mixin mobile-only {
  @media (max-width: #{$breakpoint-sm - 1px}) { @content; }
}

@mixin tablet-up {
  @media (min-width: #{$breakpoint-md}) { @content; }
}

@mixin desktop-up {
  @media (min-width: #{$breakpoint-lg}) { @content; }
}

@mixin large-desktop-up {
  @media (min-width: #{$breakpoint-xl}) { @content; }
}
```

### デバイス分類

| デバイス | 幅範囲 | 主な用途 | レイアウト |
|---------|--------|----------|------------|
| モバイル（XS） | 320px〜575px | スマートフォン縦向き | 1カラム |
| モバイル（SM） | 576px〜767px | スマートフォン横向き | 1カラム |
| タブレット（MD） | 768px〜991px | タブレット縦向き | 2カラム |
| デスクトップ（LG） | 992px〜1199px | タブレット横向き・小型PC | 2-3カラム |
| デスクトップ（XL） | 1200px〜1919px | 標準的なPC | 3-4カラム |
| ワイド（XXL） | 1920px〜 | 大型ディスプレイ | 4カラム+ |

## レイアウトパターン

### 1. グリッドシステム

```vue
<template>
  <el-row :gutter="spacing" class="responsive-grid">
    <el-col
      :xs="24"
      :sm="12"
      :md="8"
      :lg="6"
      :xl="4"
    >
      <div class="grid-content">コンテンツ</div>
    </el-col>
  </el-row>
</template>

<script setup>
import { computed } from 'vue'
import { useWindowSize } from '@/composables/useWindowSize'

const { width } = useWindowSize()
const spacing = computed(() => {
  if (width.value < 768) return 8
  if (width.value < 1200) return 16
  return 24
})
</script>
```

### 2. ナビゲーションパターン

#### モバイルナビゲーション
```vue
<template>
  <!-- モバイル: ハンバーガーメニュー -->
  <div v-if="isMobile" class="mobile-nav">
    <el-button @click="drawerVisible = true" class="menu-trigger">
      <el-icon><Menu /></el-icon>
    </el-button>

    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      size="280px"
      :with-header="false"
    >
      <nav class="mobile-menu">
        <ul>
          <li v-for="item in menuItems" :key="item.id">
            <router-link :to="item.path">{{ item.label }}</router-link>
          </li>
        </ul>
      </nav>
    </el-drawer>
  </div>

  <!-- デスクトップ: 水平メニュー -->
  <nav v-else class="desktop-nav">
    <el-menu mode="horizontal" :default-active="activeIndex">
      <el-menu-item
        v-for="item in menuItems"
        :key="item.id"
        :index="item.id"
      >
        {{ item.label }}
      </el-menu-item>
    </el-menu>
  </nav>
</template>
```

### 3. コンテンツ配置パターン

```scss
// モバイルファーストの段階的レイアウト
.content-container {
  padding: 16px;
  max-width: 100%;

  // モバイル: 縦積み
  .content-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr;
  }

  // タブレット: 2カラム
  @include tablet-up {
    padding: 24px;

    .content-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }
  }

  // デスクトップ: 3カラム + サイドバー
  @include desktop-up {
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;

    .content-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }
  }
}
```

## コンポーネント別ガイドライン

### テーブルコンポーネント

```vue
<template>
  <!-- モバイル: カード形式 -->
  <div v-if="isMobile" class="mobile-table">
    <div v-for="row in data" :key="row.id" class="table-card">
      <div v-for="col in columns" :key="col.prop" class="card-row">
        <span class="label">{{ col.label }}:</span>
        <span class="value">{{ row[col.prop] }}</span>
      </div>
    </div>
  </div>

  <!-- デスクトップ: 通常のテーブル -->
  <el-table v-else :data="data" class="desktop-table">
    <el-table-column
      v-for="col in columns"
      :key="col.prop"
      :prop="col.prop"
      :label="col.label"
      :width="col.width"
    />
  </el-table>
</template>

<style lang="scss" scoped>
.mobile-table {
  .table-card {
    background: white;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    .card-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .label {
        font-weight: 600;
        color: #666;
        flex-shrink: 0;
      }

      .value {
        text-align: right;
        color: #333;
      }
    }
  }
}
</style>
```

### フォームコンポーネント

```vue
<template>
  <el-form
    :model="formData"
    :label-position="labelPosition"
    :label-width="labelWidth"
    class="responsive-form"
  >
    <el-row :gutter="formGutter">
      <el-col :xs="24" :sm="24" :md="12" :lg="8">
        <el-form-item label="ユーザー名" required>
          <el-input v-model="formData.username" />
        </el-form-item>
      </el-col>

      <el-col :xs="24" :sm="24" :md="12" :lg="8">
        <el-form-item label="メールアドレス" required>
          <el-input v-model="formData.email" type="email" />
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>

<script setup>
import { computed } from 'vue'
import { useWindowSize } from '@/composables/useWindowSize'

const { width } = useWindowSize()

const labelPosition = computed(() =>
  width.value < 768 ? 'top' : 'right'
)

const labelWidth = computed(() =>
  width.value < 768 ? 'auto' : '120px'
)

const formGutter = computed(() =>
  width.value < 768 ? 0 : 20
)
</script>
```

### モーダル・ダイアログ

```vue
<template>
  <el-dialog
    v-model="dialogVisible"
    :width="dialogWidth"
    :fullscreen="isFullscreen"
    :close-on-click-modal="false"
    class="responsive-dialog"
  >
    <template #header>
      <div class="dialog-header">
        <h3>{{ title }}</h3>
        <el-button
          v-if="isMobile"
          type="text"
          @click="dialogVisible = false"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </template>

    <div class="dialog-content">
      <slot />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button
          @click="dialogVisible = false"
          :size="buttonSize"
        >
          キャンセル
        </el-button>
        <el-button
          type="primary"
          @click="handleConfirm"
          :size="buttonSize"
        >
          確認
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useWindowSize } from '@/composables/useWindowSize'

const { width } = useWindowSize()

const dialogWidth = computed(() => {
  if (width.value < 576) return '95%'
  if (width.value < 768) return '90%'
  if (width.value < 992) return '70%'
  return '50%'
})

const isFullscreen = computed(() => width.value < 576)
const buttonSize = computed(() => width.value < 768 ? 'small' : 'default')
const isMobile = computed(() => width.value < 768)
</script>
```

## タッチインタラクション

### ジェスチャー対応

```javascript
// スワイプ操作の実装
import { useSwipe } from '@vueuse/core'

const { direction, lengthX, lengthY } = useSwipe(target, {
  threshold: 50,
  onSwipeEnd(e, direction) {
    if (direction === 'left') {
      // 左スワイプ: 次のページ
      nextPage()
    } else if (direction === 'right') {
      // 右スワイプ: 前のページ
      prevPage()
    }
  }
})
```

### タップ領域の最適化

```scss
// タップしやすいボタンサイズ
.touch-button {
  min-height: 44px;  // iOS推奨
  min-width: 44px;
  padding: 12px 16px;

  @include desktop-up {
    min-height: 36px;
    min-width: auto;
    padding: 8px 16px;
  }
}

// リンクの間隔確保
.touch-list {
  li {
    padding: 12px 0;

    a {
      display: block;
      padding: 8px;

      @include desktop-up {
        display: inline;
        padding: 0;
      }
    }
  }
}
```

## パフォーマンス最適化

### 画像の最適化

```vue
<template>
  <picture>
    <!-- モバイル用: 軽量版 -->
    <source
      media="(max-width: 767px)"
      :srcset="`${imagePath}-mobile.webp`"
      type="image/webp"
    >
    <source
      media="(max-width: 767px)"
      :srcset="`${imagePath}-mobile.jpg`"
    >

    <!-- タブレット用: 中解像度 -->
    <source
      media="(max-width: 1199px)"
      :srcset="`${imagePath}-tablet.webp`"
      type="image/webp"
    >
    <source
      media="(max-width: 1199px)"
      :srcset="`${imagePath}-tablet.jpg`"
    >

    <!-- デスクトップ用: 高解像度 -->
    <source
      :srcset="`${imagePath}-desktop.webp`"
      type="image/webp"
    >

    <!-- フォールバック -->
    <img
      :src="`${imagePath}.jpg`"
      :alt="altText"
      loading="lazy"
    >
  </picture>
</template>
```

### コード分割と遅延読み込み

```javascript
// デバイス別コンポーネントの遅延読み込み
const MobileTable = () => import('@/components/mobile/MobileTable.vue')
const DesktopTable = () => import('@/components/desktop/DesktopTable.vue')

// 条件付きインポート
const component = computed(() => {
  return isMobile.value ? MobileTable : DesktopTable
})
```

## アクセシビリティ

### キーボードナビゲーション

```vue
<template>
  <nav
    role="navigation"
    :aria-label="navLabel"
  >
    <button
      v-if="isMobile"
      :aria-expanded="menuOpen"
      aria-controls="mobile-menu"
      @click="toggleMenu"
      @keydown.enter="toggleMenu"
      @keydown.space.prevent="toggleMenu"
    >
      <span class="sr-only">メニューを開く</span>
      <el-icon><Menu /></el-icon>
    </button>

    <ul
      :id="isMobile ? 'mobile-menu' : 'desktop-menu'"
      :hidden="isMobile && !menuOpen"
    >
      <li v-for="item in menuItems" :key="item.id">
        <a
          :href="item.path"
          :aria-current="item.active ? 'page' : undefined"
        >
          {{ item.label }}
        </a>
      </li>
    </ul>
  </nav>
</template>
```

### スクリーンリーダー対応

```scss
// スクリーンリーダー専用テキスト
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// フォーカス時に表示
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

## テスト要件

### デバイステスト

必須テスト環境:
- **iOS**: Safari (最新版)、Chrome
- **Android**: Chrome (最新版)、Samsung Internet
- **タブレット**: iPad (Safari)、Android Tablet (Chrome)
- **デスクトップ**: Chrome、Firefox、Safari、Edge (すべて最新版)

### レスポンシブテストツール

```javascript
// Cypress でのレスポンシブテスト
describe('レスポンシブデザインテスト', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ]

  viewports.forEach(viewport => {
    it(`${viewport.name}での表示確認`, () => {
      cy.viewport(viewport.width, viewport.height)
      cy.visit('/')

      if (viewport.width < 768) {
        // モバイル用のテスト
        cy.get('[data-testid="mobile-menu-trigger"]').should('be.visible')
        cy.get('[data-testid="desktop-menu"]').should('not.be.visible')
      } else {
        // デスクトップ用のテスト
        cy.get('[data-testid="desktop-menu"]').should('be.visible')
        cy.get('[data-testid="mobile-menu-trigger"]').should('not.exist')
      }
    })
  })
})
```

## チェックリスト

### 開発時確認事項

- [ ] **320px**の最小幅で表示崩れがないか
- [ ] 縦向き・横向きの切り替えで問題ないか
- [ ] タップ領域が**44px以上**確保されているか
- [ ] ホバー依存の機能がタッチデバイスで動作するか
- [ ] フォントサイズが読みやすいか（最小14px）
- [ ] 画像が適切なサイズで配信されているか
- [ ] 横スクロールが発生していないか
- [ ] フォーム要素が適切なサイズか
- [ ] モーダルがモバイルで操作しやすいか
- [ ] ページ読み込み速度が3秒以内か

### リリース前確認事項

- [ ] 実機でのテスト完了
- [ ] タッチ操作の動作確認
- [ ] オフライン時の挙動確認
- [ ] 低速回線での動作確認
- [ ] アクセシビリティテスト合格
- [ ] パフォーマンステスト合格
- [ ] ブラウザ互換性テスト完了

## 参考リソース

- [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Can I Use](https://caniuse.com/)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

## まとめ

レスポンシブデザインは単なる画面サイズの対応ではなく、ユーザーの利用環境と状況を考慮した総合的な設計です。
本ガイドラインに従うことで、あらゆるデバイスで快適なユーザー体験を提供できます。

**重要**: 新機能開発時は必ずモバイルファーストで設計し、段階的に大画面対応を行ってください。