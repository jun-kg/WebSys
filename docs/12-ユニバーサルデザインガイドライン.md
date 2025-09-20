# ユニバーサルデザインガイドライン

## 概要

本ガイドラインは、企業システム開発プラットフォームにおけるユニバーサルデザイン（UD）の実装指針を定義します。
年齢、性別、身体能力、文化的背景に関わらず、すべてのユーザーが利用しやすいシステムを構築することを目標とします。

## フォント設計基準

### 基本フォント設定

#### 優先フォントファミリー
```css
/* 基本フォント設定 */
:root {
  /* メインフォント（本文・UI要素） */
  --font-family-primary: "BIZ UDPゴシック", "UD デジタル 教科書体",
                         "游ゴシック", "Yu Gothic", "游ゴシック体",
                         "Hiragino Sans", "メイリオ", "Meiryo",
                         "MS Pゴシック", "Helvetica Neue",
                         "Arial", sans-serif;

  /* 見出し用フォント */
  --font-family-heading: "BIZ UDPゴシック", "UD デジタル 教科書体",
                         "游ゴシック Medium", "Yu Gothic Medium",
                         "游ゴシック体", "Hiragino Sans",
                         "メイリオ", "Meiryo", "MS Pゴシック",
                         "Helvetica Neue", "Arial", sans-serif;

  /* 数字・データ表示用 */
  --font-family-numeric: "BIZ UDPゴシック", "UD デジタル 教科書体",
                         "Consolas", "Monaco", "Courier New",
                         "游ゴシック", "Yu Gothic", monospace;

  /* 英文用フォント */
  --font-family-english: "Helvetica Neue", "Arial", "Segoe UI",
                         "Roboto", "Noto Sans", sans-serif;
}
```

#### フォントサイズスケール
```css
:root {
  /* 基本サイズ（16px = 1rem） */
  --font-size-base: 16px;

  /* サイズスケール（1.25倍スケール - Major Third） */
  --font-size-xs: 0.75rem;    /* 12px - 注釈、ラベル */
  --font-size-sm: 0.875rem;   /* 14px - 小さなテキスト */
  --font-size-md: 1rem;       /* 16px - 基本テキスト */
  --font-size-lg: 1.125rem;   /* 18px - 強調テキスト */
  --font-size-xl: 1.25rem;    /* 20px - 小見出し */
  --font-size-2xl: 1.5rem;    /* 24px - 中見出し */
  --font-size-3xl: 1.875rem;  /* 30px - 大見出し */
  --font-size-4xl: 2.25rem;   /* 36px - 特大見出し */

  /* アクセシビリティ対応サイズ */
  --font-size-accessible-min: 1.125rem; /* 18px - 最小推奨サイズ */
  --font-size-accessible-preferred: 1.25rem; /* 20px - 推奨サイズ */
}

/* フォントサイズユーティリティクラス */
.text-xs { font-size: var(--font-size-xs); }
.text-sm { font-size: var(--font-size-sm); }
.text-md { font-size: var(--font-size-md); }
.text-lg { font-size: var(--font-size-lg); }
.text-xl { font-size: var(--font-size-xl); }
.text-2xl { font-size: var(--font-size-2xl); }
.text-3xl { font-size: var(--font-size-3xl); }
.text-4xl { font-size: var(--font-size-4xl); }

/* アクセシビリティ対応 */
.text-accessible { font-size: var(--font-size-accessible-preferred); }
.text-accessible-min { font-size: var(--font-size-accessible-min); }
```

#### 行間・字間設定
```css
:root {
  /* 行間（line-height） */
  --line-height-tight: 1.2;     /* 見出し用 */
  --line-height-normal: 1.5;    /* 本文用（推奨） */
  --line-height-relaxed: 1.75;  /* 読みやすさ重視 */
  --line-height-loose: 2;       /* 高齢者・視覚障害者向け */

  /* 字間（letter-spacing） */
  --letter-spacing-tight: -0.025em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.025em;  /* 日本語推奨 */
  --letter-spacing-wider: 0.05em;  /* アクセシビリティ向上 */
}

/* 行間ユーティリティ */
.leading-tight { line-height: var(--line-height-tight); }
.leading-normal { line-height: var(--line-height-normal); }
.leading-relaxed { line-height: var(--line-height-relaxed); }
.leading-loose { line-height: var(--line-height-loose); }

/* 字間ユーティリティ */
.tracking-tight { letter-spacing: var(--letter-spacing-tight); }
.tracking-normal { letter-spacing: var(--letter-spacing-normal); }
.tracking-wide { letter-spacing: var(--letter-spacing-wide); }
.tracking-wider { letter-spacing: var(--letter-spacing-wider); }
```

### UDゴシック詳細設定

#### フォント読み込み設定
```css
/* Google Fonts経由でのUDフォント読み込み */
@import url('https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap');

/* フォールバック用のローカルフォント */
@font-face {
  font-family: 'UD Gothic';
  src: local('BIZ UDPゴシック Regular'),
       local('BIZ-UDPGothic-Regular'),
       local('UD デジタル 教科書体 N-R'),
       local('UDDigiKyokashoN-R');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'UD Gothic';
  src: local('BIZ UDPゴシック Bold'),
       local('BIZ-UDPGothic-Bold'),
       local('UD デジタル 教科書体 N-B'),
       local('UDDigiKyokashoN-B');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

#### UDゴシック適用ルール
```css
/* 全体の基本設定 */
* {
  font-family: var(--font-family-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* 日本語テキスト最適化 */
.text-ja {
  font-family: var(--font-family-primary);
  letter-spacing: var(--letter-spacing-wide);
  line-height: var(--line-height-normal);
}

/* 見出し最適化 */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-family-heading);
  font-weight: 700;
  letter-spacing: var(--letter-spacing-wide);
  line-height: var(--line-height-tight);
}

/* 数字・データ表示最適化 */
.text-numeric {
  font-family: var(--font-family-numeric);
  font-variant-numeric: tabular-nums;
  letter-spacing: var(--letter-spacing-normal);
}
```

## カラーアクセシビリティ

### 色覚アクセシビリティ対応カラーパレット

```css
:root {
  /* メインカラー（色覚バリアフリー対応） */
  --color-primary: #0066CC;      /* 青（判別しやすい） */
  --color-secondary: #6B46C1;    /* 紫（区別可能） */
  --color-accent: #DC2626;       /* 赤（警告用） */

  /* 成功・警告・エラー（WCAG準拠） */
  --color-success: #059669;      /* 緑（コントラスト比4.5:1以上） */
  --color-warning: #D97706;      /* オレンジ（色覚障害者でも判別可能） */
  --color-error: #DC2626;        /* 赤（十分なコントラスト） */
  --color-info: #0284C7;         /* 水色（情報表示用） */

  /* グレースケール（十分なコントラスト確保） */
  --color-gray-50: #F9FAFB;      /* 背景用 */
  --color-gray-100: #F3F4F6;     /* 軽い背景 */
  --color-gray-200: #E5E7EB;     /* ボーダー用 */
  --color-gray-300: #D1D5DB;     /* 非活性要素 */
  --color-gray-400: #9CA3AF;     /* プレースホルダー */
  --color-gray-500: #6B7280;     /* 補助テキスト */
  --color-gray-600: #4B5563;     /* 通常テキスト */
  --color-gray-700: #374151;     /* 強調テキスト */
  --color-gray-800: #1F2937;     /* 見出し */
  --color-gray-900: #111827;     /* 最も強いテキスト */

  /* コントラスト比確保用 */
  --color-text-high-contrast: var(--color-gray-900);
  --color-text-medium-contrast: var(--color-gray-700);
  --color-text-low-contrast: var(--color-gray-500);
  --color-bg-high-contrast: var(--color-gray-50);
}
```

### コントラスト比チェック

```css
/* WCAG AAA準拠（コントラスト比7:1以上） */
.high-contrast {
  color: var(--color-gray-900);
  background-color: var(--color-gray-50);
}

/* WCAG AA準拠（コントラスト比4.5:1以上） */
.normal-contrast {
  color: var(--color-gray-700);
  background-color: var(--color-gray-100);
}

/* 大きな文字用（コントラスト比3:1以上） */
.large-text-contrast {
  color: var(--color-gray-600);
  background-color: var(--color-gray-50);
  font-size: var(--font-size-accessible-preferred);
}
```

## レスポンシブ・アクセシブルレイアウト

### ブレークポイント設定

```css
:root {
  /* モバイルファースト設計 */
  --breakpoint-xs: 320px;   /* 小型スマートフォン */
  --breakpoint-sm: 640px;   /* スマートフォン */
  --breakpoint-md: 768px;   /* タブレット */
  --breakpoint-lg: 1024px;  /* デスクトップ */
  --breakpoint-xl: 1280px;  /* 大型デスクトップ */
  --breakpoint-2xl: 1536px; /* 超大型ディスプレイ */
}

/* レスポンシブフォントサイズ */
@media (max-width: 640px) {
  :root {
    --font-size-base: 14px; /* モバイルでは基準サイズを小さく */
  }
}

@media (min-width: 1024px) {
  :root {
    --font-size-base: 16px; /* デスクトップでは標準サイズ */
  }
}

@media (min-width: 1280px) {
  :root {
    --font-size-base: 18px; /* 大画面では読みやすいサイズ */
  }
}
```

### スペーシング設計

```css
:root {
  /* 8pxベーススケール（タッチ操作に適した間隔） */
  --spacing-0: 0;
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;   /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-5: 1.25rem;  /* 20px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */
  --spacing-10: 2.5rem;  /* 40px */
  --spacing-12: 3rem;    /* 48px */
  --spacing-16: 4rem;    /* 64px */
  --spacing-20: 5rem;    /* 80px */

  /* タッチターゲットサイズ（最小44px推奨） */
  --touch-target-min: 44px;
  --touch-target-comfortable: 48px;
  --touch-target-large: 56px;
}
```

## 共通コンポーネントのUD対応

### CommonButton UD仕様

```typescript
interface CommonButtonUDProps extends CommonButtonProps {
  // アクセシビリティプロパティ
  ariaLabel?: string          // スクリーンリーダー用ラベル
  ariaDescribedBy?: string    // 説明要素のID
  tabIndex?: number          // タブ順序制御

  // ユニバーサルデザインオプション
  highContrast?: boolean     // 高コントラストモード
  largeText?: boolean        // 大文字表示モード
  touchFriendly?: boolean    // タッチ操作最適化
}
```

```vue
<!-- CommonButton UD実装例 -->
<template>
  <button
    :class="buttonClasses"
    :aria-label="ariaLabel || $slots.default"
    :aria-describedby="ariaDescribedBy"
    :tabindex="tabIndex"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space="handleClick"
  >
    <slot />
  </button>
</template>

<style scoped>
.ud-button {
  /* 基本UD設定 */
  font-family: var(--font-family-primary);
  font-size: var(--font-size-accessible-min);
  line-height: var(--line-height-normal);
  letter-spacing: var(--letter-spacing-wide);

  /* タッチターゲット */
  min-height: var(--touch-target-min);
  min-width: var(--touch-target-min);
  padding: var(--spacing-3) var(--spacing-6);

  /* アクセシビリティ */
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ud-button:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.ud-button.high-contrast {
  color: var(--color-text-high-contrast);
  background-color: var(--color-bg-high-contrast);
  border-color: var(--color-gray-900);
}

.ud-button.large-text {
  font-size: var(--font-size-accessible-preferred);
  padding: var(--spacing-4) var(--spacing-8);
}

.ud-button.touch-friendly {
  min-height: var(--touch-target-comfortable);
  min-width: var(--touch-target-comfortable);
}
</style>
```

### CommonInput UD仕様

```vue
<template>
  <div class="ud-input-wrapper">
    <label
      v-if="label"
      :for="inputId"
      class="ud-input-label"
      :class="{ 'sr-only': hideLabel }"
    >
      {{ label }}
      <span v-if="required" class="required-indicator">*</span>
    </label>

    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :aria-label="ariaLabel || label"
      :aria-describedby="errorId"
      :aria-invalid="hasError"
      class="ud-input"
      :class="inputClasses"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
    />

    <div
      v-if="hasError && errorMessage"
      :id="errorId"
      class="ud-input-error"
      role="alert"
      aria-live="polite"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.ud-input {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-accessible-min);
  line-height: var(--line-height-normal);
  letter-spacing: var(--letter-spacing-wide);

  /* サイズ・スペーシング */
  width: 100%;
  min-height: var(--touch-target-min);
  padding: var(--spacing-3) var(--spacing-4);

  /* 視覚デザイン */
  border: 2px solid var(--color-gray-300);
  border-radius: 4px;
  background-color: var(--color-gray-50);

  /* アクセシビリティ */
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ud-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(6, 102, 204, 0.1);
}

.ud-input.error {
  border-color: var(--color-error);
}

.ud-input-label {
  display: block;
  font-weight: 600;
  margin-bottom: var(--spacing-2);
  color: var(--color-text-high-contrast);
}

.ud-input-error {
  margin-top: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

.required-indicator {
  color: var(--color-error);
  margin-left: var(--spacing-1);
}

/* スクリーンリーダー専用（視覚的に隠す） */
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
</style>
```

## アクセシビリティチェックリスト

### 必須対応項目

#### キーボードアクセシビリティ
- [ ] すべてのインタラクティブ要素がキーボードで操作可能
- [ ] タブ順序が論理的
- [ ] フォーカス表示が明確
- [ ] Escキーで閉じる処理（モーダル等）
- [ ] Enter/Spaceキーでの実行

#### スクリーンリーダー対応
- [ ] 適切なaria-label設定
- [ ] ランドマーク要素の使用（main, nav, aside等）
- [ ] 見出し構造の論理性（h1→h2→h3）
- [ ] フォーム要素とラベルの関連付け
- [ ] エラーメッセージのaria-live設定

#### 色・コントラスト
- [ ] WCAG AA準拠のコントラスト比（4.5:1以上）
- [ ] 色のみに依存しない情報伝達
- [ ] ダークモード対応
- [ ] 色覚障害者への配慮

#### フォント・テキスト
- [ ] 16px以上の読みやすいフォントサイズ
- [ ] UDゴシック等の読みやすいフォント使用
- [ ] 適切な行間（1.5以上）
- [ ] ズーム200%まで対応

### チェックツール

```javascript
// アクセシビリティチェック用スクリプト
class AccessibilityChecker {
  static checkFontSize() {
    const elements = document.querySelectorAll('*')
    const violations = []

    elements.forEach(el => {
      const fontSize = parseFloat(window.getComputedStyle(el).fontSize)
      if (fontSize < 16 && el.textContent.trim()) {
        violations.push({
          element: el,
          fontSize: fontSize,
          message: `フォントサイズが16px未満です: ${fontSize}px`
        })
      }
    })

    return violations
  }

  static checkContrastRatio() {
    // コントラスト比チェックロジック
    // WebAIM Contrast Checker API等を使用
  }

  static checkKeyboardAccess() {
    // キーボードアクセシビリティチェック
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]'
    )

    return Array.from(interactiveElements).filter(el => {
      return el.tabIndex < 0 ||
             (el.offsetWidth === 0 && el.offsetHeight === 0)
    })
  }
}

// 使用例
console.log('フォントサイズ違反:', AccessibilityChecker.checkFontSize())
console.log('キーボードアクセス問題:', AccessibilityChecker.checkKeyboardAccess())
```

## 実装優先順位

### フェーズ1: 基盤整備
1. UDゴシックフォント設定
2. 基本カラーパレット（WCAG準拠）
3. フォントサイズスケール
4. レスポンシブブレークポイント

### フェーズ2: コンポーネント対応
1. CommonButton のUD対応
2. CommonInput のUD対応
3. CommonTable のUD対応
4. フォーカス管理システム

### フェーズ3: 高度な機能
1. ダークモード対応
2. ズーム機能
3. 音声読み上げ対応
4. 操作ヘルプシステム

### フェーズ4: 検証・改善
1. 自動アクセシビリティテスト
2. ユーザビリティテスト
3. 継続的改善プロセス
4. ガイドライン更新

## まとめ

このユニバーサルデザインガイドラインにより、以下を実現します：

### 主要成果
- **UDゴシック採用**による高い可読性
- **WCAG準拠**のアクセシビリティ
- **レスポンシブ対応**による幅広い端末サポート
- **キーボード操作**への完全対応

### 対象ユーザー
- 高齢者・視覚障害者
- 色覚障害者
- 運動機能障害者
- 様々な文化的背景を持つユーザー

このガイドラインの実装により、真にインクルーシブな企業システムを構築できます。