# Custom（企業固有機能）

このディレクトリは、企業固有のビジネスロジックを実装するディレクトリです。

## 使用方法

### 実装可能な項目
- 業務API（営業管理、在庫管理、顧客管理等）
- 独自ワークフロー
- レポート生成
- データ可視化
- 外部システム連携

### ディレクトリ構造例

```
custom/
├── routes/
│   ├── sales.ts          # 営業管理API
│   ├── inventory.ts      # 在庫管理API
│   └── customers.ts      # 顧客管理API
├── services/
│   ├── SalesService.ts
│   ├── InventoryService.ts
│   └── CustomerService.ts
├── controllers/
│   └── SalesController.ts
├── models/
│   └── SalesModel.ts
└── utils/
    └── salesHelpers.ts
```

### 実装例

```typescript
// custom/routes/sales.ts
import { Router } from 'express'
import { authenticate } from '@core/middleware/auth'
import { SalesController } from '@custom/controllers/SalesController'

const router = Router()
const controller = new SalesController()

router.get('/sales', authenticate, controller.getSales)
router.post('/sales', authenticate, controller.createSale)

export default router
```

### メインアプリに登録

```typescript
// src/index.ts
import salesRoutes from '@custom/routes/sales'

app.use('/api/sales', salesRoutes)
```

## 重要な原則

- ✅ 完全に自由な実装が可能
- ✅ core/ の機能を活用（認証、ログ、権限管理等）
- ❌ core/ のファイルは変更しない（共通ライブラリ更新で上書きされます）
