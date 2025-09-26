# Prismaシングルトン管理ガイドライン

## 概要
本ドキュメントは、Prismaクライアントの統一管理と再発防止のためのガイドラインです。

## 修正済み問題

### 発生していた問題
1. **複数インスタンス問題**: 各ファイルで`new PrismaClient()`を個別作成
2. **IIFE初期化問題**: 即座実行関数による初期化タイミングの問題
3. **接続プール枯渇**: 不要な接続の大量生成
4. **メモリリーク**: 適切な切断処理の不備

### 解決策
新しい`src/lib/prisma.ts`でProxyパターンを使用したシングルトン実装

## 必須ルール

### ✅ 正しい使用方法
```typescript
// ✅ 推奨: Prismaシングルトンを使用
import { prisma } from '../lib/prisma';

// ルートファイル内
const users = await prisma.users.findMany();

// サービスクラス内
export class UserService {
  async getUsers() {
    return await prisma.users.findMany();
  }
}
```

### ❌ 禁止事項
```typescript
// ❌ 禁止: 個別インスタンス作成
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ❌ 禁止: クラス内での個別作成
export class UserService {
  private prisma = new PrismaClient(); // 絶対禁止
}
```

## 必須チェックリスト

### 新規ファイル作成時
- [ ] `import { prisma } from '../lib/prisma'` を使用
- [ ] `new PrismaClient()` は使用しない
- [ ] コンストラクタでの初期化は行わない

### 既存ファイル修正時
- [ ] `new PrismaClient()` を全て削除
- [ ] `this.prisma` を `prisma` に置換
- [ ] インポート文を修正

### コードレビュー時
- [ ] `new PrismaClient` の存在チェック
- [ ] 正しいインポートパスの確認
- [ ] Proxyパターンの動作確認

## テーブル名規則

### Prismaスキーマとクライアントの対応
```prisma
// schema.prisma
model users { }
model companies { }
model departments { }
```

```typescript
// TypeScript (複数形)
await prisma.users.findMany()     // ✅
await prisma.companies.findMany() // ✅
await prisma.departments.findMany() // ✅

// ❌ 単数形は使用不可
await prisma.user.findMany()     // エラー
await prisma.company.findMany()  // エラー
```

## エラー診断

### よくあるエラーと対処法

#### 1. `Cannot read properties of undefined (reading 'findMany')`
**原因**: 古い`new PrismaClient()`が残存
**対処**: 該当ファイルでシングルトンに変更

#### 2. `prisma.user is not a function`
**原因**: テーブル名が単数形
**対処**: `prisma.users` に修正

#### 3. `Module not found: '../lib/prisma'`
**原因**: インポートパスが間違い
**対処**: 相対パスを確認

## 水平展開対応

### 本実装の利点
1. **接続プール最適化**: 単一インスタンスで効率的な接続管理
2. **メモリ使用量削減**: 不要な重複インスタンス排除
3. **グレースフルシャットダウン**: 適切な接続切断処理
4. **ホットリロード対応**: 開発環境での安定動作

### 監視機能
```typescript
// 接続状況の確認
import { DatabaseManager, isPrismaReady } from '../lib/prisma';

// ヘルスチェック
const isHealthy = await DatabaseManager.healthCheck();

// 接続統計
const stats = DatabaseManager.getConnectionInfo();
```

## 修正対象ファイル一覧

### 修正済み
- ✅ `src/lib/prisma.ts` - 新しいシングルトン実装
- ✅ `src/routes/users.ts` - テーブル名とインポート修正
- ✅ `src/routes/companies.ts` - テーブル名修正
- ✅ `src/services/AlertRuleEngine.ts` - シングルトン適用

### 修正必要 (高優先度)
- ⚠️ `src/services/AuthService.ts`
- ⚠️ `src/services/LogService.ts`
- ⚠️ `src/routes/auth.ts`
- ⚠️ `src/routes/departments.ts`
- ⚠️ `src/routes/features.ts`
- ⚠️ `src/routes/permissions.ts`

### 修正必要 (低優先度)
- 📝 `src/services/AuditService.ts`
- 📝 `src/services/PermissionInheritanceService.ts`
- 📝 `src/services/NotificationService.ts`
- 📝 `src/controllers/AlertRuleController.ts`

## 緊急対応手順

### 1. エラー発生時の即座対応
```bash
# エラーログの確認
grep "Cannot read properties of undefined" logs/*

# 該当ファイルの特定
grep -r "new PrismaClient" src/

# 一括置換（注意深く実行）
find src/ -name "*.ts" -exec sed -i 's/new PrismaClient()/prisma/g' {} \;
```

### 2. 修正の確認
```typescript
// 修正後の確認方法
import { isPrismaReady } from '../lib/prisma';
console.log('Prisma ready:', isPrismaReady());
```

## 今後の開発規則

### 1. 新機能開発時
- Prismaを使用する全ての新規ファイルで、必ずシングルトンを使用
- プルリクエスト時に`new PrismaClient`の検索を必須とする

### 2. チームでの共有
- 本ガイドラインをチーム内で共有
- コードレビュー時の必須チェック項目に追加

### 3. 継続的改善
- パフォーマンス監視の継続
- 接続統計の定期確認
- 新しい問題発見時のガイドライン更新

---

**最終更新**: 2025-09-23
**作成者**: Claude Code
**レビュー**: システム管理チーム