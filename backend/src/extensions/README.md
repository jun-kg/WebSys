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
  // カスタム認証ロジック追加
  const customToken = req.headers['x-custom-token']

  if (customToken) {
    // カスタムトークン検証
    return next()
  }

  // 共通認証にフォールバック
  return authenticate(req, res, next)
}
```

#### 2. バリデーションの拡張
```typescript
// extensions/middleware/validation.ts
import { body, ValidationChain } from 'express-validator'

export const customValidationRules = (): ValidationChain[] => {
  return [
    body('customField')
      .isLength({ min: 10 })
      .withMessage('カスタムフィールドは10文字以上必要です'),
    body('companyCode')
      .matches(/^[A-Z]{3}\d{4}$/)
      .withMessage('会社コードは大文字3桁+数字4桁の形式です')
  ]
}
```

#### 3. ログ処理の拡張
```typescript
// extensions/services/LogEnhancer.ts
import { LogController } from '@core/controllers/LogController'
import type { Log } from '@core/types/log'

export class LogEnhancerService {
  static async enrichLog(log: Log): Promise<Log> {
    // 共通ログに追加情報を付与
    return {
      ...log,
      customMetadata: {
        environment: process.env.NODE_ENV,
        region: 'ap-northeast-1'
      }
    }
  }
}
```

## ⚠️ 注意事項

### ✅ 許可される操作
- 共通コア機能の**ラッパー作成**
- 共通機能の**前後処理追加**
- 共通機能の**組み合わせ利用**
- カスタムバリデーションルール追加

### ❌ 禁止される操作
- `@core/` ディレクトリの**直接編集**
- 共通機能の**動作変更**（オーバーライド禁止）
- 相対パスでの `../core/` インポート
- Prismaシングルトンの再作成

## 📦 インポートルール

```typescript
// ✅ 正しい方法
import { authenticate } from '@core/middleware/auth'
import { prisma } from '@core/lib/prisma'
import { LogController } from '@core/controllers/LogController'

// ❌ 禁止
import { authenticate } from '../core/middleware/auth'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient() // 絶対禁止
```

## 🚀 ベストプラクティス

1. **命名規則**: `Custom〜`, `Extended〜` プレフィックスを使用
2. **依存関係**: 必ず `@core/` からインポート
3. **Prisma使用**: `@core/lib/prisma` から統一シングルトンを使用
4. **ドキュメント**: 拡張の目的と使用方法を明記
5. **テスト**: 拡張機能の単体テスト必須

## 📂 推奨構造

```
extensions/
├── middleware/      # ミドルウェア拡張
├── services/        # サービス拡張
├── routes/          # ルート拡張
├── controllers/     # コントローラー拡張
└── utils/          # ユーティリティ拡張
```

## 🔗 関連ドキュメント

- [共通コアAPI仕様](../core/README.md)
- [Prisma使用ガイドライン](../../CLAUDE.md)
- [開発ガイド](../../../docs/07_ガイド/02_開発ガイド.md)
