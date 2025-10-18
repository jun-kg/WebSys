# Extensions（拡張機能）

このディレクトリは、共通コア機能を拡張するためのディレクトリです。

## 使用方法

### 拡張可能な項目
- カスタム認証方式（OAuth, SAML等）
- 追加バリデーション
- カスタムミドルウェア
- 共通機能の拡張

### 実装例

```typescript
// extensions/middleware/customAuth.ts
import { Request, Response, NextFunction } from 'express'

export const customAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // カスタム認証ロジック
  next()
}
```

### インポート方法

```typescript
// tsconfig.json のパスエイリアス使用
import { customAuthMiddleware } from '@extensions/middleware/customAuth'
```

## 重要な原則

- ✅ core/ の機能を拡張する目的のみ使用
- ✅ 企業固有ロジックは custom/ に配置
- ❌ core/ のファイルは変更しない（共通ライブラリ更新で上書きされます）
