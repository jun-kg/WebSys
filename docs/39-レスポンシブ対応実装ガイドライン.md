# レスポンシブ対応実装ガイドライン

## 📋 概要

**作成日**: 2025-09-27
**対象**: 開発チーム全員
**目的**: 共通コンポーネントを活用したレスポンシブ対応の統一

---

## 🎯 基本原則

### 1. モバイルファースト設計
- 最小画面（320px）から設計開始
- デスクトップ向けに段階的に拡張
- コンテンツ優先度に基づく表示制御

### 2. 共通コンポーネント優先
- **個別対応は禁止** - 必ず共通コンポーネントを使用
- 新しいパターンが必要な場合は共通コンポーネントを拡張
- Element Plusの直接使用を避け、Responsiveコンポーネントを活用

### 3. パフォーマンス重視
- 不要な要素は非表示ではなく、条件付き描画
- 画像の最適化とレスポンシブ対応
- 遅延読み込みの積極活用

---

## 🧩 コンポーネント使用方法

### 新規CRUD画面作成時

#### ❌ 従来の方法（禁止）
```vue
<template>
  <div class="users-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>ユーザー管理</span>
          <el-button type="primary" @click="handleAdd">
            新規追加
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm">
        <!-- 検索フォーム（20行） -->
      </el-form>

      <el-table :data="tableData">
        <!-- テーブル定義（25行） -->
      </el-table>

      <el-pagination>
        <!-- ページネーション（5行） -->
      </el-pagination>
    </el-card>

    <el-dialog width="500px">
      <!-- ダイアログ（20行） -->
    </el-dialog>
  </div>
</template>

<style scoped>
/* レスポンシブCSS（50行） */
@media (max-width: 768px) {
  /* モバイル対応 */
}
</style>
```

#### ✅ 推奨方法
```vue
<template>
  <ResponsiveCrudPage
    title="ユーザー管理"
    :columns="userColumns"
    :data="users"
    :total="total"
    :loading="loading"
    @add="addUser"
    @edit="editUser"
    @delete="deleteUser"
  >
    <template #search>
      <el-input
        v-model="searchQuery"
        placeholder="検索..."
        clearable
      />
    </template>

    <template #dialog-content>
      <ResponsiveForm :model="userForm" :rules="userRules">
        <el-form-item label="名前" prop="name">
          <el-input v-model="userForm.name" />
        </el-form-item>
      </ResponsiveForm>
    </template>
  </ResponsiveCrudPage>
</template>

<script setup lang="ts">
// 設定のみ（10行程度）
const userColumns = ref([
  { prop: 'name', label: '名前', minWidth: 150, important: true },
  { prop: 'email', label: 'メール', minWidth: 200 }
])
</script>
```

**効果**: 120行 → 25行（79%削減）

---

## 📱 デバイス別対応指針

### スマートフォン (〜768px)
```typescript
// 表示優先度設定
const columns = [
  { prop: 'name', label: '名前', important: true },      // 必須表示
  { prop: 'email', label: 'メール', important: false },  // 非表示OK
  { prop: 'status', label: '状態', important: true }     // 必須表示
]

// フォームレイアウト
<ResponsiveForm>  <!-- 自動で縦積みに変更 -->
  <el-form-item label="長いラベル名">
    <el-input />
  </el-form-item>
</ResponsiveForm>
```

### タブレット (768px〜1024px)
```vue
<!-- グリッドレイアウト -->
<ResponsiveGrid>
  <ResponsiveCol :tablet="12" :desktop="6">
    <!-- タブレットで2列、デスクトップで4列 -->
  </ResponsiveCol>
</ResponsiveGrid>
```

### デスクトップ (1024px〜)
```vue
<!-- 全機能表示 -->
<ResponsiveTable
  :columns="allColumns"
  show-actions
  action-width="180"
/>
```

---

## 🔧 実装パターン集

### パターン1: 検索付きデータ一覧
```vue
<template>
  <ResponsiveCrudPage
    title="データ管理"
    :columns="columns"
    :data="data"
    @search="handleSearch"
  >
    <template #search>
      <el-form :inline="!isMobile">
        <el-form-item label="キーワード">
          <el-input v-model="search.keyword" />
        </el-form-item>
        <el-form-item label="カテゴリ">
          <el-select v-model="search.category">
            <el-option label="全て" value="" />
          </el-select>
        </el-form-item>
      </el-form>
    </template>
  </ResponsiveCrudPage>
</template>
```

### パターン2: カスタムアクション
```vue
<template>
  <ResponsiveCrudPage>
    <template #header-actions>
      <el-button @click="exportData">エクスポート</el-button>
      <el-button @click="importData">インポート</el-button>
    </template>

    <template #row-actions="{ row }">
      <el-button @click="viewDetail(row)">詳細</el-button>
      <el-button @click="duplicate(row)">複製</el-button>
    </template>
  </ResponsiveCrudPage>
</template>
```

### パターン3: カスタム列表示
```vue
<template>
  <ResponsiveCrudPage>
    <template #column-status="{ row }">
      <el-tag :type="getStatusType(row.status)">
        {{ getStatusLabel(row.status) }}
      </el-tag>
    </template>

    <template #column-avatar="{ row }">
      <el-avatar :src="row.avatar" :size="isMobile ? 24 : 32" />
    </template>
  </ResponsiveCrudPage>
</template>
```

---

## 📏 ブレークポイント活用

### useResponsive Composable
```typescript
import { useResponsive } from '@/composables/useResponsive'

export default {
  setup() {
    const { isMobile, isTablet, isDesktop, windowWidth } = useResponsive()

    // 条件付き表示
    const showAdvancedFilters = computed(() => isDesktop.value)

    // サイズ調整
    const buttonSize = computed(() => isMobile.value ? 'small' : 'default')

    return {
      isMobile,
      showAdvancedFilters,
      buttonSize
    }
  }
}
```

### 条件付きレンダリング
```vue
<template>
  <!-- デスクトップのみ表示 -->
  <div v-if="isDesktop">
    <el-button>詳細フィルター</el-button>
  </div>

  <!-- モバイル用シンプル表示 -->
  <div v-if="isMobile">
    <el-button icon="Filter" circle />
  </div>

  <!-- 動的サイズ調整 -->
  <el-avatar :size="isMobile ? 24 : 48" />
</template>
```

---

## 🎨 スタイリングガイドライン

### CSS Variables活用
```scss
:root {
  --mobile-padding: 12px;
  --tablet-padding: 16px;
  --desktop-padding: 24px;

  --mobile-font-size: 14px;
  --desktop-font-size: 16px;
}

.container {
  padding: var(--mobile-padding);

  @media (min-width: 768px) {
    padding: var(--tablet-padding);
  }

  @media (min-width: 1024px) {
    padding: var(--desktop-padding);
  }
}
```

### タッチ対応
```scss
.touch-target {
  min-height: 44px;
  min-width: 44px;

  // タッチ領域拡張
  &::before {
    content: '';
    position: absolute;
    top: -8px; left: -8px;
    right: -8px; bottom: -8px;
  }
}
```

---

## 🧪 テスト要件

### 必須テストデバイス
```typescript
const testDevices = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 }
]
```

### テストチェック項目
- [ ] 全要素が画面内に収まる
- [ ] タッチ操作が可能（最小44px）
- [ ] テキストが読みやすい（最小16px）
- [ ] 横スクロールが適切に動作
- [ ] ダイアログが画面からはみ出ない

---

## 🚫 禁止事項

### ❌ やってはいけないこと
```vue
<!-- 固定幅の使用 -->
<el-dialog width="600px">  <!-- 禁止 -->

<!-- レスポンシブを考慮しないグリッド -->
<el-col :span="8">  <!-- 禁止 -->

<!-- 直接的なElement Plus使用 -->
<el-table>  <!-- ResponsiveTableを使用すること -->

<!-- 個別のメディアクエリ -->
<style>
@media (max-width: 768px) {  <!-- 共通コンポーネントで解決 -->
  .custom-responsive { }
</style>
```

### ✅ 推奨方法
```vue
<!-- レスポンシブダイアログ -->
<ResponsiveDialog :desktop-width="600">

<!-- レスポンシブグリッド -->
<ResponsiveCol :mobile="24" :desktop="8">

<!-- レスポンシブテーブル -->
<ResponsiveTable>

<!-- 共通スタイル活用 -->
<div class="responsive-container">
```

---

## 📈 品質指標

### パフォーマンス
- Lighthouse モバイルスコア: 90以上
- 初期表示: 3秒以内
- インタラクション: 300ms以内

### アクセシビリティ
- WCAG 2.1 AA準拠
- キーボード操作対応
- スクリーンリーダー対応

### ユーザビリティ
- タップターゲット: 最小44px
- テキストサイズ: 最小16px
- コントラスト比: 4.5:1以上

---

## 🔄 レビューチェックリスト

### コードレビュー時
- [ ] Responsiveコンポーネントを使用している
- [ ] 個別のメディアクエリを使用していない
- [ ] useResponsive Composableを適切に活用
- [ ] 固定幅・固定サイズを使用していない
- [ ] タッチ対応を考慮している

### デザインレビュー時
- [ ] 全ブレークポイントで確認済み
- [ ] コンテンツが適切に表示される
- [ ] 操作性に問題がない
- [ ] パフォーマンスが許容範囲内

---

## 📚 参考リソース

### 設計書
- [レスポンシブ対応設計書](./01_機能設計書/05_レスポンシブ対応/)
- [レスポンシブコンポーネント詳細設計書](./01_機能設計書/04_共通コンポーネント/)

### サンプルコード
- [ResponsiveCrudPage実装例](./samples/ResponsiveCrudPage.vue)
- [ResponsiveTable実装例](./samples/ResponsiveTable.vue)

### テストツール
- Chrome DevTools Device Mode
- Firefox Responsive Design Mode
- Playwright E2Eテスト

---

## 🎯 まとめ

1. **共通コンポーネント必須**: 個別対応は行わない
2. **モバイルファースト**: 最小画面から設計
3. **パフォーマンス重視**: 不要な処理を排除
4. **テスト徹底**: 全デバイスで動作確認

これらの原則に従うことで、効率的で保守性の高いレスポンシブ対応を実現できます。

---

**作成日**: 2025-09-27
**更新予定**: 実装完了後にサンプルコード追加