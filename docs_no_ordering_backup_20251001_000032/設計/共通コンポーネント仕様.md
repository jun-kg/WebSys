# 共通コンポーネント仕様

## 概要

このドキュメントでは、企業システムで使用する共通コンポーネントの詳細仕様を定義します。
すべてのプロジェクトで統一的に使用することを前提とした設計となっています。

### レスポンシブ対応方針

すべての共通コンポーネントは**モバイルファースト設計**を採用し、PC・スマートフォン・タブレット全デバイスでの最適な表示と操作性を保証します。

- **最小対応幅**: 320px
- **ブレークポイント**: xs(320px), sm(576px), md(768px), lg(992px), xl(1200px), xxl(1920px)
- **タッチフレンドリー**: 最小タップ領域44×44px
- **レスポンシブプロパティ**: 画面サイズ別の動作制御
- **アクセシビリティ**: WCAG 2.1 AA準拠

詳細は [レスポンシブデザインガイドライン](./11-レスポンシブデザインガイドライン.md) を参照してください。

## 使用可能コンポーネント一覧

### 基本コンポーネント

#### CommonButton
```typescript
interface CommonButtonProps {
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size: 'small' | 'medium' | 'large'
  loading?: boolean
  disabled?: boolean
  icon?: Component
  iconPosition?: 'left' | 'right'
  htmlType?: 'button' | 'submit' | 'reset'
  // レスポンシブ対応
  responsive?: boolean  // 画面サイズに応じたサイズ変更
  touchOptimized?: boolean  // タッチデバイス最適化
  fullWidthMobile?: boolean  // モバイルで全幅表示
}

interface CommonButtonEvents {
  'on-click': (event: MouseEvent) => void
}
```

**使用例:**
```vue
<!-- 基本的な使用 -->
<CommonButton
  variant="primary"
  size="medium"
  :loading="isSubmitting"
  @on-click="handleSubmit"
>
  送信
</CommonButton>

<!-- レスポンシブ対応の使用 -->
<CommonButton
  variant="primary"
  responsive
  touch-optimized
  full-width-mobile
  @on-click="handleAction"
>
  実行
</CommonButton>
```

#### CommonInput
```typescript
interface CommonInputProps {
  modelValue: string | number
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url'
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  clearable?: boolean
  showPassword?: boolean
  maxlength?: number
  size?: 'small' | 'medium' | 'large'
  status?: 'success' | 'warning' | 'error'
  message?: string
}

interface CommonInputEvents {
  'update:modelValue': (value: string | number) => void
  'on-change': (value: string | number) => void
  'on-blur': (event: FocusEvent) => void
  'on-focus': (event: FocusEvent) => void
  'on-clear': () => void
}
```

**使用例:**
```vue
<CommonInput
  v-model="form.username"
  type="text"
  placeholder="ユーザー名を入力"
  clearable
  status="error"
  message="ユーザー名は必須です"
/>
```

#### CommonSelect
```typescript
interface CommonSelectOption {
  label: string
  value: string | number
  disabled?: boolean
  children?: CommonSelectOption[]
}

interface CommonSelectProps {
  modelValue: string | number | Array<string | number>
  options: CommonSelectOption[]
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  multiple?: boolean
  filterable?: boolean
  size?: 'small' | 'medium' | 'large'
  status?: 'success' | 'warning' | 'error'
  message?: string
}

interface CommonSelectEvents {
  'update:modelValue': (value: string | number | Array<string | number>) => void
  'on-change': (value: string | number | Array<string | number>) => void
  'on-clear': () => void
}
```

**使用例:**
```vue
<CommonSelect
  v-model="form.department"
  :options="departmentOptions"
  placeholder="部署を選択"
  clearable
  filterable
/>
```

### データ表示コンポーネント

#### CommonTable
```typescript
interface CommonTableColumn {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  fixed?: 'left' | 'right'
  sortable?: boolean
  formatter?: (row: any, column: any, cellValue: any) => string
  type?: 'selection' | 'index' | 'expand'
  slot?: string
  // レスポンシブ対応
  hideOnMobile?: boolean  // モバイルで非表示
  priorityOrder?: number  // モバイル表示優先度
}

interface CommonTableProps {
  data: any[]
  columns: CommonTableColumn[]
  loading?: boolean
  height?: string | number
  maxHeight?: string | number
  stripe?: boolean
  border?: boolean
  size?: 'small' | 'medium' | 'large'
  selection?: boolean
  pagination?: {
    currentPage: number
    pageSize: number
    total: number
    pageSizes?: number[]
  }
  // レスポンシブ対応
  mobileLayout?: 'card' | 'table' | 'auto'  // モバイル表示形式
  cardTemplate?: string  // カード表示時のテンプレート
  horizontalScroll?: boolean  // 横スクロールの有効化
}

interface CommonTableEvents {
  'on-selection-change': (selection: any[]) => void
  'on-sort-change': (column: any, prop: string, order: string) => void
  'on-page-change': (page: number) => void
  'on-size-change': (size: number) => void
  'on-row-click': (row: any, column: any, event: Event) => void
}
```

**使用例:**
```vue
<!-- 基本的なテーブル -->
<CommonTable
  :data="tableData"
  :columns="tableColumns"
  :loading="loading"
  :pagination="pagination"
  selection
  stripe
  @on-selection-change="handleSelectionChange"
  @on-page-change="handlePageChange"
/>

<!-- レスポンシブ対応テーブル -->
<CommonTable
  :data="tableData"
  :columns="responsiveColumns"
  mobile-layout="card"
  horizontal-scroll
  :pagination="pagination"
  @on-page-change="handlePageChange"
/>

<script setup>
// カラム定義（レスポンシブ）
const responsiveColumns = [
  { prop: 'name', label: '名前', priorityOrder: 1 },
  { prop: 'email', label: 'メール', hideOnMobile: true },
  { prop: 'role', label: '役割', priorityOrder: 2 },
  { prop: 'status', label: 'ステータス', priorityOrder: 3 },
  { prop: 'actions', label: '操作', hideOnMobile: false }
]
</script>
```

#### CommonCard
```typescript
interface CommonCardProps {
  title?: string
  shadow?: 'always' | 'hover' | 'never'
  bodyPadding?: string
  headerPadding?: string
}

interface CommonCardSlots {
  default: () => any
  header: () => any
  footer: () => any
}
```

**使用例:**
```vue
<CommonCard title="ユーザー情報" shadow="hover">
  <template #header>
    <div class="card-header">
      <span>詳細情報</span>
      <CommonButton size="small">編集</CommonButton>
    </div>
  </template>

  <div class="card-content">
    コンテンツ内容
  </div>

  <template #footer>
    <div class="card-footer">
      最終更新: 2024-01-01
    </div>
  </template>
</CommonCard>
```

### フォームコンポーネント

#### CommonForm
```typescript
interface CommonFormField {
  prop: string
  label: string
  type: 'input' | 'select' | 'checkbox' | 'radio' | 'date' | 'textarea'
  required?: boolean
  rules?: any[]
  options?: CommonSelectOption[]
  placeholder?: string
  disabled?: boolean
  span?: number
  offset?: number
}

interface CommonFormProps {
  model: Record<string, any>
  schema: CommonFormField[]
  labelWidth?: string
  inline?: boolean
  disabled?: boolean
  columns?: 1 | 2 | 3 | 4
}

interface CommonFormEvents {
  'on-submit': (formData: Record<string, any>) => void
  'on-reset': () => void
  'on-field-change': (prop: string, value: any) => void
}
```

**使用例:**
```vue
<CommonForm
  :model="formData"
  :schema="formSchema"
  :columns="2"
  @on-submit="handleSubmit"
  @on-reset="handleReset"
/>
```

### ナビゲーションコンポーネント

#### CommonMenu
```typescript
interface CommonMenuItem {
  id: string
  label: string
  icon?: Component
  path?: string
  children?: CommonMenuItem[]
  disabled?: boolean
  badge?: string | number
}

interface CommonMenuProps {
  items: CommonMenuItem[]
  mode?: 'horizontal' | 'vertical'
  collapse?: boolean
  activeId?: string
  theme?: 'light' | 'dark'
}

interface CommonMenuEvents {
  'on-select': (menuId: string, menuPath: string[]) => void
  'on-open': (menuId: string, menuPath: string[]) => void
  'on-close': (menuId: string, menuPath: string[]) => void
}
```

**使用例:**
```vue
<CommonMenu
  :items="menuItems"
  mode="vertical"
  :collapse="isCollapsed"
  :activeId="activeMenuId"
  theme="dark"
  @on-select="handleMenuSelect"
/>
```

#### CommonBreadcrumb
```typescript
interface CommonBreadcrumbItem {
  label: string
  path?: string
  icon?: Component
}

interface CommonBreadcrumbProps {
  items: CommonBreadcrumbItem[]
  separator?: string
}

interface CommonBreadcrumbEvents {
  'on-click': (item: CommonBreadcrumbItem, index: number) => void
}
```

**使用例:**
```vue
<CommonBreadcrumb
  :items="breadcrumbItems"
  separator="/"
  @on-click="handleBreadcrumbClick"
/>
```

### フィードバックコンポーネント

#### CommonDialog
```typescript
interface CommonDialogProps {
  modelValue: boolean
  title?: string
  width?: string | number
  fullscreen?: boolean
  modal?: boolean
  closeOnClickModal?: boolean
  closeOnPressEscape?: boolean
  showClose?: boolean
  destroyOnClose?: boolean
}

interface CommonDialogEvents {
  'update:modelValue': (visible: boolean) => void
  'on-open': () => void
  'on-close': () => void
  'on-confirm': () => void
  'on-cancel': () => void
}

interface CommonDialogSlots {
  default: () => any
  header: () => any
  footer: () => any
}
```

**使用例:**
```vue
<CommonDialog
  v-model="dialogVisible"
  title="確認"
  width="500px"
  @on-confirm="handleConfirm"
  @on-cancel="handleCancel"
>
  <p>この操作を実行しますか？</p>

  <template #footer>
    <CommonButton @on-click="handleCancel">キャンセル</CommonButton>
    <CommonButton variant="primary" @on-click="handleConfirm">確認</CommonButton>
  </template>
</CommonDialog>
```

#### CommonMessage（プログラマティック）
```typescript
interface CommonMessageOptions {
  message: string
  type?: 'success' | 'warning' | 'info' | 'error'
  duration?: number
  showClose?: boolean
  center?: boolean
  onClose?: () => void
}

interface CommonMessage {
  (options: CommonMessageOptions): void
  success: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
}
```

**使用例:**
```typescript
import { CommonMessage } from '@company/shared-components'

// 基本使用
CommonMessage({
  message: '保存しました',
  type: 'success',
  duration: 3000
})

// ショートハンド
CommonMessage.success('保存しました')
CommonMessage.error('エラーが発生しました')
```

## 禁止されているコンポーネント

以下のElement Plusコンポーネントは**直接使用禁止**です：

```typescript
// ❌ 使用禁止
const FORBIDDEN_COMPONENTS = [
  'ElButton',        // → CommonButton
  'ElInput',         // → CommonInput
  'ElSelect',        // → CommonSelect
  'ElTable',         // → CommonTable
  'ElCard',          // → CommonCard
  'ElForm',          // → CommonForm
  'ElFormItem',      // → CommonFormに統合
  'ElMenu',          // → CommonMenu
  'ElMenuItem',      // → CommonMenuに統合
  'ElSubMenu',       // → CommonMenuに統合
  'ElBreadcrumb',    // → CommonBreadcrumb
  'ElBreadcrumbItem', // → CommonBreadcrumbに統合
  'ElDialog',        // → CommonDialog
  'ElDrawer',        // → CommonDrawer
  'ElMessage',       // → CommonMessage
  'ElNotification',  // → CommonNotification
  'ElMessageBox',    // → CommonMessageBox
  'ElTabs',          // → CommonTabs
  'ElTabPane',       // → CommonTabsに統合
  'ElTag',           // → CommonTag
  'ElBadge',         // → CommonBadge
  'ElAvatar',        // → CommonAvatar
  'ElTooltip',       // → CommonTooltip
  'ElPopover',       // → CommonPopover
  'ElPagination',    // → CommonTableに統合
]
```

## 例外的に使用可能なコンポーネント

以下のコンポーネントは直接使用を許可します：

```typescript
// ✅ 直接使用OK
const ALLOWED_COMPONENTS = [
  // レイアウト系
  'ElContainer', 'ElHeader', 'ElMain', 'ElFooter', 'ElAside',
  'ElRow', 'ElCol',

  // ユーティリティ系
  'ElScrollbar', 'ElDivider', 'ElSkeleton',

  // 低レベルコンポーネント
  'ElIcon', 'ElImage', 'ElProgress',

  // 特殊用途
  'ElWatermark', 'ElAffix', 'ElBackTop',
]
```

## カスタマイズ指針

### 1. テーマカスタマイズ

```scss
// 共通テーマ変数
$common-primary-color: #409eff;
$common-success-color: #67c23a;
$common-warning-color: #e6a23c;
$common-danger-color: #f56c6c;
$common-info-color: #909399;

// サイズ系（レスポンシブ対応）
$common-font-size-small: 12px;
$common-font-size-medium: 14px;
$common-font-size-large: 16px;

// モバイル用フォントサイズ
$common-font-size-mobile-small: 14px;  // モバイルでは大きめ
$common-font-size-mobile-medium: 16px;
$common-font-size-mobile-large: 18px;

// スペーシング（レスポンシブ対応）
$common-spacing-small: 8px;
$common-spacing-medium: 16px;
$common-spacing-large: 24px;

// モバイル用スペーシング
$common-spacing-mobile-small: 12px;
$common-spacing-mobile-medium: 20px;
$common-spacing-mobile-large: 32px;

// タッチ対応
$common-touch-target-size: 44px;  // 最小タップ領域
$common-touch-spacing: 8px;       // タッチ要素間の最小間隔

// ブレークポイント
$breakpoint-xs: 320px;
$breakpoint-sm: 576px;
$breakpoint-md: 768px;
$breakpoint-lg: 992px;
$breakpoint-xl: 1200px;
$breakpoint-xxl: 1920px;
```

### 2. プロップス拡張ルール

```typescript
// ✅ 正しい拡張方法
interface ExtendedCommonButtonProps extends CommonButtonProps {
  // 企業固有のプロップスを追加
  trackingId?: string
  permissionRequired?: string
  analyticsEvent?: string
}

// ❌ 間違った拡張方法
interface WrongButtonProps {
  // 既存のプロップス名を変更してはいけない
  buttonType: string  // variant を変更してはいけない
  click: () => void   // on-click を変更してはいけない
}
```

### 3. スロット使用ルール

```vue
<!-- ✅ 正しいスロット使用 -->
<CommonButton>
  <template #prefix>
    <ElIcon><Plus /></ElIcon>
  </template>
  追加
</CommonButton>

<!-- ❌ 間違った使用 -->
<CommonButton>
  <!-- 構造を壊すような複雑なコンテンツは禁止 -->
  <div class="complex-layout">...</div>
</CommonButton>
```

## バージョン管理

### セマンティックバージョニング

```
Major.Minor.Patch
例: 1.2.3

Major: 破壊的変更（API変更）
Minor: 新機能追加（後方互換性あり）
Patch: バグ修正
```

### アップデート指針

```typescript
// package.json でのバージョン指定
{
  "dependencies": {
    "@company/shared-components": "^1.2.0"  // Minor更新は自動適用
  }
}
```

### 変更ログ管理

```markdown
## [1.3.0] - 2024-01-15

### Added
- CommonDatePicker コンポーネント追加
- CommonUpload ファイルアップロード機能

### Changed
- CommonTable のページネーション表示改善

### Deprecated
- CommonButton の `type` プロップス（`variant` に変更）

### Fixed
- CommonSelect の選択状態リセット問題修正
```

## レスポンシブ実装ガイドライン

### 共通composable

```typescript
// useResponsive.ts
import { computed, ref } from 'vue'
import { useWindowSize } from '@vueuse/core'

export function useResponsive() {
  const { width } = useWindowSize()

  const isMobile = computed(() => width.value < 768)
  const isTablet = computed(() => width.value >= 768 && width.value < 992)
  const isDesktop = computed(() => width.value >= 992)

  const currentBreakpoint = computed(() => {
    if (width.value < 576) return 'xs'
    if (width.value < 768) return 'sm'
    if (width.value < 992) return 'md'
    if (width.value < 1200) return 'lg'
    if (width.value < 1920) return 'xl'
    return 'xxl'
  })

  return {
    width,
    isMobile,
    isTablet,
    isDesktop,
    currentBreakpoint
  }
}
```

### レスポンシブテスト

```typescript
// 各コンポーネントでのテスト例
describe('CommonButton レスポンシブテスト', () => {
  const viewports = [
    { name: 'Mobile', width: 375 },
    { name: 'Tablet', width: 768 },
    { name: 'Desktop', width: 1024 }
  ]

  viewports.forEach(viewport => {
    it(`${viewport.name}で適切に表示される`, () => {
      cy.viewport(viewport.width, 600)
      cy.mount(CommonButton, {
        props: { responsive: true, touchOptimized: true }
      })

      if (viewport.width < 768) {
        // モバイル固有のテスト
        cy.get('[data-testid="button"]')
          .should('have.css', 'min-height', '44px')
      }
    })
  })
})
```

## まとめ

この仕様に従うことで以下のメリットを享受できます：

1. **一貫性**: 全プロジェクトで統一されたUI/UX
2. **保守性**: 中央集権的な管理による効率的な保守
3. **品質**: 十分にテストされたコンポーネントの使用
4. **開発効率**: 再利用可能なコンポーネントによる開発速度向上
5. **レスポンシブ対応**: あらゆるデバイスでの最適な表示
6. **アクセシビリティ**: 障害者を含むすべてのユーザーへの配慮

**重要**:
- 新しいコンポーネントが必要な場合は、個別実装ではなく共通ライブラリへの追加を検討してください
- すべてのコンポーネントは**モバイルファースト**で設計し、実装前に [レスポンシブデザインガイドライン](./11-レスポンシブデザインガイドライン.md) を必ず確認してください