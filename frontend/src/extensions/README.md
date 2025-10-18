# Extensions - 拡張機能ディレクトリ

## 📋 概要

このディレクトリは**共通コア機能（core/）の拡張・カスタマイズ**のために使用します。
企業固有の完全独立機能は `custom/` ディレクトリに配置してください。

## 🔌 使用方法

### 拡張可能な機能

#### 1. 認証ミドルウェアの拡張
```typescript
// extensions/middleware/customAuth.ts
import { authenticate } from '@core/middleware/auth'
import type { Request, Response, NextFunction } from 'express'

export const customAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 共通認証の前処理
  console.log('Custom auth check:', req.path)

  // 共通認証を実行
  return authenticate(req, res, next)
}
```

#### 2. バリデーションの拡張
```typescript
// extensions/services/validation.ts
import { validateInput } from '@core/utils/validation'

export class ExtendedValidationService {
  static validateCustomField(value: string): boolean {
    // 共通バリデーション実行
    const baseValid = validateInput(value)

    // カスタムルール追加
    return baseValid && value.length > 10
  }
}
```

#### 3. ログフィルターの拡張
```vue
<!-- extensions/components/CustomLogFilter.vue -->
<template>
  <div class="custom-log-filter">
    <!-- カスタムフィルターUI -->
  </div>
</template>

<script setup lang="ts">
import { useLogService } from '@core/composables/useLogService'

const logService = useLogService()

// 共通ログサービスを拡張
const customFilter = (logs) => {
  return logService.filterLogs(logs).filter(/* カスタム条件 */)
}
</script>
```

## ⚠️ 注意事項

### ✅ 許可される操作
- 共通コア機能の**ラッパー作成**
- 共通機能の**前後処理追加**
- 共通機能の**組み合わせ利用**

### ❌ 禁止される操作
- `@core/` ディレクトリの**直接編集**
- 共通機能の**動作変更**（オーバーライド禁止）
- 相対パスでの `../core/` インポート

## 📦 インポートルール

```typescript
// ✅ 正しい方法
import { authenticate } from '@core/middleware/auth'
import { useLogService } from '@core/composables/useLogService'

// ❌ 禁止
import { authenticate } from '../core/middleware/auth'
import { useLogService } from '../../core/composables/useLogService'
```

## 🚀 ベストプラクティス

1. **命名規則**: `Custom〜`, `Extended〜` プレフィックスを使用
2. **依存関係**: 必ず `@core/` からインポート
3. **ドキュメント**: 拡張の目的と使用方法を明記
4. **テスト**: 拡張機能の単体テスト必須

## 📂 推奨構造

```
extensions/
├── components/      # UI拡張コンポーネント
├── composables/     # ロジック拡張
├── middleware/      # ミドルウェア拡張
├── services/        # サービス拡張
└── utils/          # ユーティリティ拡張
```
