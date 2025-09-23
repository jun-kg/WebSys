# API接続テスト機能設計書

## 1. 概要

### 1.1 機能概要
- **機能名**: API接続テスト機能
- **目的**: フロントエンドからバックエンドAPIへの接続確認とデータ取得テスト
- **対象画面**: `/api-test`
- **実装ファイル**: `workspace/frontend/src/views/ApiTest.vue`

### 1.2 機能目標
- フロントエンド・バックエンド間の通信確認
- JWT認証フローのテスト
- API応答時間の測定
- エラーハンドリングの動作確認
- データベース接続状態の確認

## 2. 画面設計

### 2.1 画面構成
```
+------------------------------------------+
|        API接続テスト画面                    |
+------------------------------------------+
| [ヘルスチェック] [認証テスト] [ユーザー一覧取得] |
+------------------------------------------+
| 実行結果表示エリア                           |
| ┌──────────────────────────────────────┐ |
| │ ✅ API接続: 成功 (123ms)                 │ |
| │ ✅ 認証: 成功                           │ |
| │ ✅ データ取得: 3件                       │ |
| └──────────────────────────────────────┘ |
+------------------------------------------+
| ログ表示エリア                             |
| ┌──────────────────────────────────────┐ |
| │ [2025-09-20 10:30:15] API呼び出し開始   │ |
| │ [2025-09-20 10:30:15] トークン取得成功   │ |
| │ [2025-09-20 10:30:15] ユーザー一覧取得完了│ |
| └──────────────────────────────────────┘ |
+------------------------------------------+
```

### 2.2 操作フロー
1. **ヘルスチェック**: `/api/health` エンドポイントの生存確認
2. **認証テスト**: `/api/auth/login` エンドポイントでJWTトークン取得
3. **ユーザー一覧取得**: `/api/users` エンドポイントで認証済みAPI呼び出し

## 3. 技術仕様

### 3.1 使用技術
- **フレームワーク**: Vue 3 + TypeScript
- **UIライブラリ**: Element Plus
- **HTTPクライアント**: Axios
- **状態管理**: Pinia (認証情報)
- **スタイリング**: CSS Modules + BIZ UDGothic

### 3.2 テスト対象API
| API | メソッド | エンドポイント | 認証 | 説明 |
|-----|----------|----------------|------|------|
| ヘルスチェック | GET | `/api/health` | 不要 | サーバー生存確認 |
| ログイン | POST | `/api/auth/login` | 不要 | JWT認証 |
| ユーザー一覧 | GET | `/api/users` | 必要 | 認証済みデータ取得 |

### 3.3 レスポンス処理
```typescript
interface TestResult {
  success: boolean
  message: string
  duration?: number
  data?: any
  error?: string
}

interface ApiTestState {
  healthCheck: TestResult
  authentication: TestResult
  userFetch: TestResult
  logs: string[]
}
```

## 4. 機能詳細

### 4.1 ヘルスチェック機能
```typescript
const healthCheck = async (): Promise<TestResult> => {
  const startTime = Date.now()
  try {
    const response = await api.get('/api/health')
    const duration = Date.now() - startTime
    return {
      success: true,
      message: `API接続成功 (${duration}ms)`,
      duration,
      data: response.data
    }
  } catch (error) {
    return {
      success: false,
      message: 'API接続失敗',
      error: error.message
    }
  }
}
```

### 4.2 認証テスト機能
```typescript
const authenticationTest = async (): Promise<TestResult> => {
  try {
    const response = await api.post('/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    })

    // トークンを一時的に保存（テスト用）
    testToken.value = response.data.token

    return {
      success: true,
      message: '認証成功',
      data: {
        user: response.data.user,
        tokenLength: response.data.token.length
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '認証失敗',
      error: error.response?.data?.message || error.message
    }
  }
}
```

### 4.3 ユーザー一覧取得機能
```typescript
const userFetchTest = async (): Promise<TestResult> => {
  if (!testToken.value) {
    return {
      success: false,
      message: 'トークンが必要です',
      error: '先に認証テストを実行してください'
    }
  }

  try {
    const response = await api.get('/api/users', {
      headers: {
        Authorization: `Bearer ${testToken.value}`
      }
    })

    return {
      success: true,
      message: `ユーザー一覧取得成功 (${response.data.length}件)`,
      data: response.data
    }
  } catch (error) {
    return {
      success: false,
      message: 'ユーザー一覧取得失敗',
      error: error.response?.data?.message || error.message
    }
  }
}
```

## 5. UI/UX設計

### 5.1 レスポンシブ対応
- **PC**: 横3列のボタン配置
- **タブレット**: 縦2列の配置
- **モバイル**: 縦1列の配置

### 5.2 アクセシビリティ
- **フォント**: BIZ UDGothic使用
- **コントラスト**: WCAG 2.1 AA準拠
- **タップサイズ**: 最小44px確保
- **キーボード操作**: Tab順序の最適化

### 5.3 ユーザビリティ
- **実行状態表示**: ローディングスピナーとプログレス
- **結果の視覚化**: 成功・失敗のアイコン表示
- **ログの時系列表示**: 実行順序の明確化
- **エラー詳細表示**: デバッグ情報の提供

## 6. セキュリティ設計

### 6.1 認証情報の取り扱い
- **テスト用トークン**: セッション内でのみ保存
- **本番環境での使用禁止**: 開発・ステージング環境限定
- **ログ出力制御**: 機密情報の出力禁止

### 6.2 API呼び出し制限
- **レート制限**: 連続実行の防止（1秒間隔）
- **タイムアウト**: 30秒でリクエスト切断
- **CORS設定**: 適切なオリジン制限

## 7. テスト設計

### 7.1 単体テスト
- **正常系**: 各API呼び出しの成功パターン
- **異常系**: ネットワークエラー、認証エラー、サーバーエラー
- **境界値**: タイムアウト、レスポンスサイズ上限

### 7.2 結合テスト
- **フロントエンド・バックエンド連携**: 実際のAPI呼び出し
- **認証フロー**: ログイン → API呼び出し → レスポンス処理
- **エラーハンドリング**: 各段階でのエラー処理確認

## 8. 運用設計

### 8.1 監視項目
- **API応答時間**: 各エンドポイントのパフォーマンス
- **成功率**: テスト実行の成功・失敗率
- **エラーパターン**: 頻出エラーの分析

### 8.2 ログ管理
- **ログレベル**: INFO（成功）、WARN（注意）、ERROR（失敗）
- **ログ出力**: コンソール + 画面表示
- **ログ保存**: セッション内での履歴保持

## 9. 今後の拡張予定

### 9.1 機能拡張
1. **パフォーマンステスト**: 負荷テスト機能
2. **API仕様確認**: Swagger連携
3. **自動テスト**: CI/CD統合
4. **レポート機能**: テスト結果のエクスポート

### 9.2 UI改善
1. **リアルタイム更新**: WebSocket接続テスト
2. **グラフ表示**: 応答時間の可視化
3. **テスト履歴**: 過去の実行結果保存

## 10. 実装状況

### 10.1 現在の実装状況
```bash
✅ 基本機能実装完了
✅ ヘルスチェック機能
✅ 認証テスト機能
✅ ユーザー一覧取得機能
✅ レスポンシブUI対応
✅ エラーハンドリング
✅ ログ表示機能
```

### 10.2 動作確認
- **URL**: http://localhost:3000/api-test
- **前提条件**: バックエンドサーバー起動済み
- **テストデータ**: PostgreSQLシードデータ使用

---

**作成日**: 2025年9月20日
**作成者**: 開発チーム
**バージョン**: 1.0.0
**次回レビュー**: 2025年10月1日