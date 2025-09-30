# MessageService 使用ガイド

## 1. 概要

MessageServiceは、ElMessageを拡張したエラーコードベースのメッセージ管理サービスです。
すべてのメッセージはドキュメントで定義されたコードで管理され、統一的なユーザー体験を提供します。

## 2. 基本的な使い方

### 2.1 インポート

```typescript
import { showMessage, showError, showWarning, showInfo, showSuccess } from '@/utils/messages'
```

### 2.2 メッセージの表示

#### エラーコードで表示
```typescript
// 成功メッセージ
showSuccess('S-AUTH-001')  // "ログインに成功しました"

// エラーメッセージ
showError('E-AUTH-001')    // "ログインに失敗しました"

// 警告メッセージ
showWarning('W-AUTH-001')  // "セッションがまもなく期限切れです"

// 情報メッセージ
showInfo('I-SYS-001')      // "システムを初期化しています"
```

### 2.3 オプション付き表示

```typescript
// 詳細メッセージも表示
showError('E-AUTH-001', {
  showDetail: true,
  duration: 5000,
  closable: true
})

// エラーコードも表示
showError('E-NET-001', {
  showCode: true  // "[E-NET-001] ネットワークエラーが発生しました"
})

// 通知形式で表示
showSuccess('S-USER-001', {
  showNotification: true
})
```

## 3. 高度な使い方

### 3.1 APIエラーハンドリング

```typescript
try {
  const response = await api.post('/api/users', userData)
  showSuccess('S-USER-001')
} catch (error) {
  // APIエラーを自動判定して適切なメッセージを表示
  showApiError(error, 'E-USER-001')  // デフォルトコード指定
}
```

### 3.2 確認ダイアログ

```typescript
import { confirm } from '@/utils/messages'

const handleDelete = async (id: number) => {
  const confirmed = await confirm('E-USER-002')  // 削除確認メッセージ

  if (confirmed) {
    await deleteUser(id)
    showSuccess('S-USER-003')
  }
}
```

### 3.3 カスタムメッセージ

```typescript
import { messageService } from '@/utils/messages'

// 一時的なカスタムメッセージ
messageService.showCustom('処理が完了しました', 'success')

// コード定義と異なるメッセージで表示
messageService.showByCode('E-USER-001', {}, 'カスタムエラーメッセージ')
```

### 3.4 複数メッセージの表示

```typescript
import { messageService } from '@/utils/messages'

// 複数のメッセージを順番に表示
messageService.showMultiple([
  'I-DATA-001',  // データ読み込み中
  'S-DATA-001'   // データ保存完了
])
```

### 3.5 バリデーションエラー

```typescript
import { messageService } from '@/utils/messages'

const validationErrors = {
  username: 'ユーザー名は必須です',
  email: 'メールアドレスの形式が正しくありません'
}

messageService.showValidationErrors(validationErrors)
```

## 4. Vue コンポーネントでの使用例

### 4.1 ログインコンポーネント

```vue
<script setup lang="ts">
import { showSuccess, showApiError } from '@/utils/messages'

const handleLogin = async () => {
  try {
    const response = await api.post('/api/auth/login', {
      username: loginForm.username,
      password: loginForm.password
    })

    showSuccess('S-AUTH-001')  // ログイン成功
    router.push('/dashboard')
  } catch (error) {
    showApiError(error, 'E-AUTH-001')  // ログイン失敗
  }
}
</script>
```

### 4.2 CRUDオペレーション

```vue
<script setup lang="ts">
import { showSuccess, showError, showApiError } from '@/utils/messages'

// 作成
const handleCreate = async (data: any) => {
  try {
    await createUser(data)
    showSuccess('S-USER-001')  // ユーザー作成成功
  } catch (error) {
    showApiError(error, 'E-USER-001')
  }
}

// 更新
const handleUpdate = async (id: number, data: any) => {
  try {
    await updateUser(id, data)
    showSuccess('S-USER-002')  // ユーザー更新成功
  } catch (error) {
    showApiError(error, 'E-USER-005')
  }
}

// 削除
const handleDelete = async (id: number) => {
  try {
    await deleteUser(id)
    showSuccess('S-USER-003')  // ユーザー削除成功
  } catch (error) {
    showError('E-USER-006')
  }
}
</script>
```

### 4.3 フォームバリデーション

```vue
<script setup lang="ts">
import { showError } from '@/utils/messages'

const validateForm = () => {
  if (!formData.email) {
    showError('E-VALID-001')  // 必須項目未入力
    return false
  }

  if (!isValidEmail(formData.email)) {
    showError('E-VALID-005')  // メール形式エラー
    return false
  }

  return true
}
</script>
```

## 5. グローバル設定

### 5.1 デフォルト設定の変更

```typescript
// main.ts
import { messageService } from '@/utils/messages'

// グローバルオプション設定
messageService.setGlobalOptions({
  duration: 5000,          // 表示時間を5秒に
  showDetail: true,        // 常に詳細を表示
  closable: true,          // 常に閉じるボタンを表示
  showCode: false,         // コードは表示しない
  showNotification: false  // 通知形式は使用しない
})
```

### 5.2 インスタンス作成

```typescript
import { MessageService } from '@/utils/messages'

// カスタムインスタンス作成
const customMessageService = MessageService.getInstance({
  duration: 10000,
  showCode: true,
  showNotification: true
})

customMessageService.showError('E-NET-001')
```

## 6. エラーコード体系

### 6.1 コード形式
```
[タイプ][カテゴリ][番号]
例: E-AUTH-001
```

### 6.2 タイプ識別子
- **E**: Error (エラー)
- **W**: Warning (警告)
- **I**: Info (情報)
- **S**: Success (成功)

### 6.3 カテゴリ識別子
- **AUTH**: 認証関連
- **USER**: ユーザー管理
- **DATA**: データ操作
- **NET**: ネットワーク
- **VALID**: 入力検証
- **SYS**: システム
- **FILE**: ファイル操作
- **PERM**: 権限

## 7. ベストプラクティス

### 7.1 一貫性のあるエラーハンドリング

```typescript
// 良い例
try {
  await someOperation()
  showSuccess('S-DATA-001')
} catch (error) {
  showApiError(error, 'E-DATA-001')
}

// 避けるべき例
try {
  await someOperation()
  ElMessage.success('成功しました')  // 直接ElMessageを使用
} catch (error) {
  console.error(error)  // エラーメッセージ表示なし
}
```

### 7.2 適切なメッセージタイプの選択

```typescript
// 成功: 操作が正常に完了
showSuccess('S-USER-001')

// エラー: 操作が失敗、ユーザーの対応が必要
showError('E-USER-001')

// 警告: 操作は成功したが注意が必要
showWarning('W-USER-001')

// 情報: 処理状況や一般的な情報
showInfo('I-SYS-001')
```

### 7.3 詳細メッセージの活用

```typescript
// デバッグ時や詳細情報が必要な場合
showError('E-NET-001', {
  showDetail: true,
  showCode: true,
  duration: 0  // 自動で消えない
})
```

## 8. トラブルシューティング

### 8.1 メッセージが表示されない

```typescript
// メッセージコードが存在するか確認
import { messageDefinitions } from '@/utils/messages'

if (messageDefinitions['E-USER-001']) {
  showError('E-USER-001')
} else {
  console.error('メッセージコードが定義されていません')
}
```

### 8.2 メッセージをクリア

```typescript
import { messageService } from '@/utils/messages'

// すべてのメッセージをクリア
messageService.clearAll()
```

### 8.3 新しいメッセージコードの追加

1. `/docs/01_機能設計書/11_メッセージ管理/メッセージコード定義書.md` に追加
2. `/src/utils/messages/messageDefinitions.ts` に実装を追加
3. 使用箇所で新しいコードを参照

## 9. 更新履歴

| 日付 | バージョン | 更新内容 | 更新者 |
|------|------------|----------|--------|
| 2025-01-20 | 1.0.0 | 初版作成 | 開発チーム |

---

**最終更新**: 2025年1月20日
**管理者**: 開発チーム