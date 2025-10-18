# Custom（企業固有機能）

このディレクトリは、企業固有のUIとビジネスロジックを実装するディレクトリです。

## 使用方法

### 実装可能な項目
- 業務画面（営業管理、在庫管理、顧客管理等）
- カスタムダッシュボード
- レポートビュー
- データ可視化コンポーネント
- 企業固有ワークフロー画面

### ディレクトリ構造例

```
custom/
├── views/
│   ├── Sales.vue           # 営業管理画面
│   ├── Inventory.vue       # 在庫管理画面
│   └── Dashboard.vue       # カスタムダッシュボード
├── components/
│   ├── SalesChart.vue
│   ├── InventoryTable.vue
│   └── CustomerCard.vue
├── api/
│   ├── sales.ts
│   ├── inventory.ts
│   └── customers.ts
├── stores/
│   ├── sales.ts            # Pinia store
│   └── inventory.ts
├── types/
│   ├── sales.ts
│   └── inventory.ts
└── utils/
    └── salesHelpers.ts
```

### 実装例

```vue
<!-- custom/views/Sales.vue -->
<template>
  <div class="sales-management">
    <h1>営業管理</h1>
    <SalesChart :data="salesData" />
    <SalesTable :items="salesList" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSales } from '@custom/api/sales'
import SalesChart from '@custom/components/SalesChart.vue'
import SalesTable from '@custom/components/SalesTable.vue'

const salesData = ref([])
const salesList = ref([])

onMounted(async () => {
  salesList.value = await getSales()
})
</script>
```

### ルーター登録

```typescript
// router/index.ts
import Sales from '@custom/views/Sales.vue'

const routes = [
  {
    path: '/sales',
    name: 'Sales',
    component: Sales,
    meta: { requiresAuth: true }
  }
]
```

## 重要な原則

- ✅ 完全に自由な実装が可能
- ✅ core/ の機能を活用（認証、ログ監視、権限管理等）
- ❌ core/ のファイルは変更しない（共通ライブラリ更新で上書きされます）
