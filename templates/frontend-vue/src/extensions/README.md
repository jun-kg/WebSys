# Extensions（拡張機能）

このディレクトリは、共通コア機能を拡張するためのディレクトリです。

## 使用方法

### 拡張可能な項目
- カスタム認証フロー
- 共通コンポーネントの拡張
- グローバルプラグイン
- カスタムディレクティブ

### 実装例

```vue
<!-- extensions/components/CustomAuthForm.vue -->
<template>
  <div class="custom-auth">
    <h2>企業向けSSO認証</h2>
    <!-- カスタム認証UI -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// カスタム認証ロジック
</script>
```

### インポート方法

```typescript
// vite.config.ts のパスエイリアス使用
import CustomAuthForm from '@extensions/components/CustomAuthForm.vue'
```

## 重要な原則

- ✅ core/ の機能を拡張する目的のみ使用
- ✅ 企業固有UIは custom/ に配置
- ❌ core/ のファイルは変更しない（共通ライブラリ更新で上書きされます）
