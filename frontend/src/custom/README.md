# Custom - 企業固有機能ディレクトリ

## 📋 概要

このディレクトリは**企業固有のビジネスロジック**を実装するために使用します。
共通コア機能（core/）とは完全に独立しており、自由に実装できます。

## 🏢 使用方法

### 実装例

#### 1. 企業固有の画面コンポーネント
```vue
<!-- custom/views/SalesAnalytics.vue -->
<template>
  <div class="sales-analytics">
    <h1>営業分析ダッシュボード</h1>
    <!-- 企業固有のUI -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { SalesData } from '@custom/types/sales'
import { fetchSalesData } from '@custom/api/sales'

// 企業固有ロジック実装
const salesData = ref<SalesData[]>([])
</script>
```

#### 2. 企業固有のAPIクライアント
```typescript
// custom/api/sales.ts
import { apiClient } from '@/api'
import type { SalesData, SalesReport } from '@custom/types/sales'

export const fetchSalesData = async (): Promise<SalesData[]> => {
  const { data } = await apiClient.get<SalesData[]>('/api/custom/sales')
  return data
}

export const generateSalesReport = async (
  params: SalesReportParams
): Promise<SalesReport> => {
  const { data } = await apiClient.post<SalesReport>(
    '/api/custom/sales/report',
    params
  )
  return data
}
```

#### 3. 企業固有の型定義
```typescript
// custom/types/sales.ts
export interface SalesData {
  id: number
  productName: string
  amount: number
  salesDate: Date
  region: string
}

export interface SalesReport {
  totalSales: number
  topProducts: ProductSales[]
  regionBreakdown: RegionSales[]
}
```

## ✅ 実装ルール

### 自由に実装可能
- ビジネスロジックの完全独立実装
- 企業固有のUI/UXデザイン
- カスタムAPIエンドポイント
- 独自のデータモデル

### 共通機能の利用
```typescript
// ✅ 共通コア機能は自由に利用可能
import { useLogService } from '@core/composables/useLogService'
import { authenticate } from '@core/middleware/auth'
import type { User } from '@core/types/user'

// ✅ 拡張機能も利用可能
import { CustomValidation } from '@extensions/services/validation'
```

## 📦 インポートルール

```typescript
// ✅ 推奨される方法
import { SalesService } from '@custom/services/SalesService'
import { useLogService } from '@core/composables/useLogService'
import type { SalesData } from '@custom/types/sales'

// ⚠️ 相対パスも可能（同一custom/内）
import { InventoryController } from './controllers/InventoryController'
import type { Product } from '../types/product'

// ❌ 避けるべき
import { LogService } from '../core/composables/useLogService'  // @core使用
```

## 🚀 ベストプラクティス

1. **命名規則**: 企業・業務ドメインに沿った命名
2. **依存管理**: 共通コア機能は積極的に活用
3. **ドキュメント**: ビジネスロジックの明確な説明
4. **テスト**: 業務ロジックの単体・統合テスト必須

## 📂 推奨構造

```
custom/
├── views/           # 企業固有画面
│   ├── SalesAnalytics.vue
│   ├── InventoryManagement.vue
│   └── CustomerPortal.vue
├── components/      # 企業固有コンポーネント
│   └── charts/
│       ├── SalesChart.vue
│       └── InventoryChart.vue
├── api/            # 企業固有API
│   ├── sales.ts
│   ├── inventory.ts
│   └── customers.ts
├── types/          # 企業固有型定義
│   ├── sales.ts
│   ├── inventory.ts
│   └── customer.ts
├── utils/          # 企業固有ユーティリティ
│   ├── salesCalculation.ts
│   └── inventoryOptimization.ts
└── stores/         # 企業固有状態管理
    ├── salesStore.ts
    └── inventoryStore.ts
```

## 🔗 関連ドキュメント

- [共通コアAPI仕様](../core/README.md)
- [拡張機能ガイド](../extensions/README.md)
- [開発ガイド](../../../docs/07_ガイド/02_開発ガイド.md)
