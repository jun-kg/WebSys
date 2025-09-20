module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  extends: [
    'eslint:recommended',
    '@vue/typescript/recommended',
    '@vue/prettier'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // 共通コンポーネント使用を強制するルール
    'no-restricted-imports': [
      'error',
      {
        'paths': [
          {
            'name': 'element-plus',
            'importNames': [
              // フォーム関連
              'ElButton', 'ElInput', 'ElSelect', 'ElCheckbox', 'ElRadio',
              'ElSwitch', 'ElSlider', 'ElTimePicker', 'ElDatePicker',
              'ElRate', 'ElColorPicker', 'ElTransfer', 'ElForm', 'ElFormItem',

              // データ表示関連
              'ElTable', 'ElTableColumn', 'ElTag', 'ElProgress', 'ElTree',
              'ElPagination', 'ElBadge', 'ElAvatar', 'ElSkeleton', 'ElEmpty',
              'ElDescriptions', 'ElDescriptionsItem', 'ElResult', 'ElStatistic',

              // ナビゲーション関連
              'ElMenu', 'ElMenuItem', 'ElMenuItemGroup', 'ElSubMenu',
              'ElBreadcrumb', 'ElBreadcrumbItem', 'ElPageHeader', 'ElSteps',
              'ElStep', 'ElTabs', 'ElTabPane', 'ElDropdown', 'ElDropdownMenu',
              'ElDropdownItem',

              // フィードバック関連
              'ElAlert', 'ElLoading', 'ElMessage', 'ElMessageBox', 'ElNotification',
              'ElProgress', 'ElSkeleton',

              // その他
              'ElDialog', 'ElDrawer', 'ElPopover', 'ElPopconfirm', 'ElTooltip',
              'ElCard', 'ElCarousel', 'ElCarouselItem', 'ElCollapse', 'ElCollapseItem',
              'ElTimeline', 'ElTimelineItem', 'ElDivider', 'ElCalendar', 'ElImage',
              'ElInfiniteScroll', 'ElAffix', 'ElAnchor', 'ElAnchorLink', 'ElBackTop',
              'ElConfigProvider'
            ],
            'message': '❌ Element Plus コンポーネントの直接使用は禁止されています。@company/shared-components から対応する Common コンポーネントを使用してください。\n\n例:\n  ❌ import { ElButton } from "element-plus"\n  ✅ import { CommonButton } from "@company/shared-components"\n\n詳細: docs/09-開発ガイドライン.md を参照'
          }
        ],
        'patterns': [
          {
            'group': ['element-plus/*'],
            'importNames': ['*'],
            'message': 'Element Plus の個別モジュールimportも禁止されています。共通コンポーネントを使用してください。'
          }
        ]
      }
    ],

    // Vue テンプレート内での Element Plus コンポーネント使用チェック
    'vue/no-restricted-component-names': [
      'error',
      {
        'message': 'Element Plus コンポーネントの直接使用は禁止されています。Common プレフィックス付きの共通コンポーネントを使用してください。',
        'reserved': [
          // フォーム関連
          'el-button', 'el-input', 'el-select', 'el-option', 'el-checkbox',
          'el-radio', 'el-switch', 'el-slider', 'el-time-picker', 'el-date-picker',
          'el-rate', 'el-color-picker', 'el-transfer', 'el-form', 'el-form-item',

          // データ表示関連
          'el-table', 'el-table-column', 'el-tag', 'el-progress', 'el-tree',
          'el-pagination', 'el-badge', 'el-avatar', 'el-skeleton', 'el-empty',
          'el-descriptions', 'el-descriptions-item', 'el-result', 'el-statistic',

          // ナビゲーション関連
          'el-menu', 'el-menu-item', 'el-menu-item-group', 'el-sub-menu',
          'el-breadcrumb', 'el-breadcrumb-item', 'el-page-header', 'el-steps',
          'el-step', 'el-tabs', 'el-tab-pane', 'el-dropdown', 'el-dropdown-menu',
          'el-dropdown-item',

          // フィードバック関連
          'el-alert', 'el-loading', 'el-message', 'el-notification',

          // その他
          'el-dialog', 'el-drawer', 'el-popover', 'el-popconfirm', 'el-tooltip',
          'el-card', 'el-carousel', 'el-carousel-item', 'el-collapse', 'el-collapse-item',
          'el-timeline', 'el-timeline-item', 'el-divider', 'el-calendar', 'el-image',
          'el-infinite-scroll', 'el-affix', 'el-anchor', 'el-anchor-link', 'el-back-top'
        ]
      }
    ],

    // 共通コンポーネントの import チェック
    '@company/prefer-common-components': 'error',

    // Vue.js 固有のルール
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-vars': 'error',
    'vue/no-unused-components': 'error',
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'vue/prop-name-casing': ['error', 'camelCase'],
    'vue/component-definition-name-casing': ['error', 'PascalCase'],

    // TypeScript 関連
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',

    // 一般的なコード品質ルール
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'prefer-const': 'error',
    'no-var': 'error'
  },

  // カスタムルールの設定
  plugins: [
    '@company/eslint-plugin-shared-components'
  ],

  // ファイル別の設定
  overrides: [
    {
      // テストファイルの設定
      files: ['**/__tests__/*.{j,t}s?(x)', '**/tests/unit/**/*.spec.{j,t}s?(x)'],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off'
      }
    },
    {
      // 設定ファイルの設定
      files: ['*.config.{j,t}s', '.*rc.{j,t}s'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      // 共通コンポーネントライブラリ内では Element Plus の直接使用を許可
      files: ['packages/shared-components/**/*.{vue,ts,js}'],
      rules: {
        'no-restricted-imports': 'off',
        'vue/no-restricted-component-names': 'off'
      }
    }
  ],

  // グローバル変数の定義
  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly',
    defineExpose: 'readonly',
    withDefaults: 'readonly'
  }
}