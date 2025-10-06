# Custom - 企業固有機能ディレクトリ

## 📋 概要

このディレクトリは**企業固有のビジネスロジック**を実装するために使用します。
共通コア機能（core/）とは完全に独立しており、自由に実装できます。

## 🏢 使用方法

### 実装例

#### 1. 企業固有のAPIルート
```typescript
// custom/routes/sales.ts
import express from 'express'
import { authenticate } from '@core/middleware/auth'
import { prisma } from '@core/lib/prisma'
import type { SalesData } from '@custom/types/sales'

const router = express.Router()

// 営業データ取得API
router.get('/', authenticate, async (req, res, next) => {
  try {
    const sales = await prisma.sales.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { salesDate: 'desc' }
    })

    res.json({ success: true, data: sales })
  } catch (error) {
    next(error)
  }
})

export default router
```

#### 2. 企業固有のサービス
```typescript
// custom/services/SalesAnalyticsService.ts
import { prisma } from '@core/lib/prisma'
import type { SalesReport, SalesData } from '@custom/types/sales'

export class SalesAnalyticsService {
  static async generateMonthlyReport(
    companyId: number,
    year: number,
    month: number
  ): Promise<SalesReport> {
    const sales = await prisma.sales.findMany({
      where: {
        companyId,
        salesDate: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1)
        }
      }
    })

    return {
      totalSales: sales.reduce((sum, s) => sum + s.amount, 0),
      totalCount: sales.length,
      topProducts: this.calculateTopProducts(sales),
      regionBreakdown: this.calculateRegionBreakdown(sales)
    }
  }

  private static calculateTopProducts(sales: SalesData[]) {
    // ビジネスロジック実装
  }

  private static calculateRegionBreakdown(sales: SalesData[]) {
    // ビジネスロジック実装
  }
}
```

#### 3. 企業固有の型定義
```typescript
// custom/types/sales.ts
export interface SalesData {
  id: number
  companyId: number
  productId: number
  productName: string
  amount: number
  quantity: number
  salesDate: Date
  region: string
  salesperson: string
}

export interface SalesReport {
  totalSales: number
  totalCount: number
  topProducts: ProductSales[]
  regionBreakdown: RegionSales[]
}

export interface ProductSales {
  productId: number
  productName: string
  totalAmount: number
  totalQuantity: number
}

export interface RegionSales {
  region: string
  totalAmount: number
  salesCount: number
}
```

## ✅ 実装ルール

### 自由に実装可能
- ビジネスロジックの完全独立実装
- 企業固有のAPIエンドポイント
- カスタムデータモデル（Prismaスキーマ追加）
- 独自のミドルウェア・バリデーション

### 共通機能の利用
```typescript
// ✅ 共通コア機能は自由に利用可能
import { authenticate, authorize } from '@core/middleware/auth'
import { prisma } from '@core/lib/prisma'
import { LogController } from '@core/controllers/LogController'
import type { User } from '@core/types/user'

// ✅ 拡張機能も利用可能
import { customAuthMiddleware } from '@extensions/middleware/customAuth'
```

## 📦 インポートルール

```typescript
// ✅ 推奨される方法
import { SalesService } from '@custom/services/SalesService'
import { authenticate } from '@core/middleware/auth'
import { prisma } from '@core/lib/prisma'
import type { SalesData } from '@custom/types/sales'

// ⚠️ 相対パスも可能（同一custom/内）
import { InventoryController } from './controllers/InventoryController'
import type { Product } from '../types/product'

// ❌ 避けるべき
import { authenticate } from '../core/middleware/auth'  // @core使用
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient() // 絶対禁止（@core/lib/prisma使用）
```

## 🚀 ベストプラクティス

1. **Prisma統合**: 必ず `@core/lib/prisma` から統一シングルトンを使用
2. **認証・認可**: `@core/middleware/auth` の認証を活用
3. **エラーハンドリング**: 統一的なエラーレスポンス形式を使用
4. **ドキュメント**: APIエンドポイント・ビジネスロジックを明記
5. **テスト**: 業務ロジックの単体・統合テスト必須

## 📂 推奨構造

```
custom/
├── routes/              # 企業固有APIルート
│   ├── sales.ts
│   ├── inventory.ts
│   ├── customers.ts
│   └── workflow/        # ワークフローAPI群
├── services/            # 企業固有ビジネスロジック
│   ├── SalesAnalyticsService.ts
│   ├── InventoryManagementService.ts
│   └── CustomerService.ts
├── controllers/         # 企業固有コントローラー
│   ├── SalesController.ts
│   └── InventoryController.ts
├── types/              # 企業固有型定義
│   ├── sales.ts
│   ├── inventory.ts
│   └── customer.ts
└── utils/              # 企業固有ユーティリティ
    ├── salesCalculation.ts
    └── inventoryOptimization.ts
```

## ⚠️ 重要な注意事項

### Prismaクライアント使用（必須）
```typescript
// ✅ 正しい使用方法
import { prisma } from '@core/lib/prisma'

export class SalesService {
  static async findAll() {
    return await prisma.sales.findMany()
  }
}

// ❌ 絶対禁止
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()  // 接続プール枯渇の原因
```

## 🔗 関連ドキュメント

- [共通コアAPI仕様](../core/README.md)
- [拡張機能ガイド](../extensions/README.md)
- [Prisma使用ガイドライン](../../../CLAUDE.md)
- [開発ガイド](../../../docs/07_ガイド/02_開発ガイド.md)
