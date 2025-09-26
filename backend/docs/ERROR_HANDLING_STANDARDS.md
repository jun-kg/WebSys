# エラーハンドリング標準化ガイド

## 概要
BUG #004のJWT認証エラーハンドリング改善を水平展開し、システム全体でのエラーハンドリングを統一化するためのガイドです。

## エラーコード体系

### 1. 認証・認可エラー (4xx)
```typescript
// トークン関連 (401)
TOKEN_MISSING          // トークン未提供
TOKEN_EXPIRED          // トークン期限切れ
TOKEN_INVALID          // トークン無効・署名不正
TOKEN_MALFORMED        // トークン形式不正
TOKEN_PAYLOAD_INVALID  // ペイロード不完全

// セッション関連 (401)
SESSION_NOT_FOUND      // セッション見つからない
SESSION_INACTIVE       // セッション無効化済み
SESSION_EXPIRED        // セッション期限切れ

// ユーザー関連 (403)
USER_NOT_FOUND         // ユーザー見つからない
USER_INACTIVE          // ユーザー無効化済み
AUTH_004               // 権限不足

// WebSocket関連
WEBSOCKET_TOKEN_*      // WebSocket認証エラー
```

### 2. システムエラー (5xx)
```typescript
SYSTEM_ERROR          // 予期しないシステムエラー
DATABASE_ERROR        // データベースエラー
EXTERNAL_API_ERROR    // 外部API連携エラー
```

## エラーハンドリングパターン

### 1. 詳細エラー情報の記録
```typescript
// ❌ 改善前: 簡素なエラーログ
catch (error) {
  console.error('Login error:', error);
  return { success: false, error: 'システムエラー' };
}

// ✅ 改善後: 詳細なエラー情報
catch (error) {
  console.error('Login system error:', {
    error: error.message,
    stack: error.stack,
    userId: req.body?.username,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']
  });

  return {
    success: false,
    error: {
      code: 'SYSTEM_ERROR',
      message: 'ログイン処理中にシステムエラーが発生しました',
      timestamp: new Date().toISOString()
    }
  };
}
```

### 2. エラーコードとメッセージの分離
```typescript
// ❌ 改善前: メッセージのみ
return { success: false, error: 'トークンが無効です' };

// ✅ 改善後: コードとメッセージの分離
return {
  success: false,
  error: {
    code: 'TOKEN_INVALID',
    message: 'トークンが無効です (署名が無効)',
    details: '再度ログインしてトークンを更新してください'
  }
};
```

### 3. 段階的エラーチェック
```typescript
// ✅ 改善後: 事前チェックによる詳細エラー分類
async function verifyToken(token: string) {
  try {
    // 1. 事前チェック
    if (!token || typeof token !== 'string') {
      return { isValid: false, errorCode: 'TOKEN_MISSING', error: 'トークンが提供されていません' };
    }

    if (token.length < 10 || token.length > 2000) {
      return { isValid: false, errorCode: 'TOKEN_MALFORMED', error: 'トークンの形式が無効です' };
    }

    // 2. JWT検証
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return { isValid: false, errorCode: 'TOKEN_EXPIRED', error: `トークンが期限切れです (期限: ${expiredAt})` };
      }
      // ... 他のJWTエラー
    }

    // 3. ペイロード検証
    if (!decoded.userId || !decoded.username) {
      return { isValid: false, errorCode: 'TOKEN_PAYLOAD_INVALID', error: 'トークンのペイロードが不完全です' };
    }

    // ... 続く
  } catch (error) {
    // 予期しないシステムエラー
    console.error('Token verification system error:', {
      error: error.message,
      stack: error.stack,
      tokenLength: token?.length,
      timestamp: new Date().toISOString()
    });

    return { isValid: false, errorCode: 'SYSTEM_ERROR', error: `システムエラー: ${error.message}` };
  }
}
```

## フロントエンドエラーハンドリング

### 1. エラーコード別メッセージマッピング
```typescript
// src/utils/errorMessages.ts
export const ERROR_MESSAGES = {
  // 認証関連
  TOKEN_MISSING: 'トークンが見つかりません。再度ログインしてください',
  TOKEN_EXPIRED: 'セッションが期限切れです。再度ログインしてください',
  TOKEN_INVALID: '認証トークンが無効です。再度ログインしてください',
  TOKEN_MALFORMED: 'トークンの形式が無効です。再度ログインしてください',
  TOKEN_PAYLOAD_INVALID: 'トークンが破損しています。再度ログインしてください',

  // セッション関連
  SESSION_EXPIRED: 'セッションが期限切れです。再度ログインしてください',
  SESSION_NOT_FOUND: 'セッションが見つかりません。再度ログインしてください',
  SESSION_INACTIVE: 'セッションが無効化されています。再度ログインしてください',

  // ユーザー関連
  USER_NOT_FOUND: 'ユーザーが見つかりません。再度ログインしてください',
  USER_INACTIVE: 'ユーザーアカウントが無効化されています',

  // WebSocket関連
  WEBSOCKET_TOKEN_EXPIRED: 'WebSocketトークンが期限切れです。再度ログインしてください',
  WEBSOCKET_TOKEN_INVALID: 'WebSocketトークンが無効です。再度ログインしてください'
};

export const getErrorMessage = (errorCode: string, fallback: string) => {
  return ERROR_MESSAGES[errorCode] || fallback;
};
```

### 2. Axios インターセプター改善
```typescript
// ✅ 改善後: 詳細エラーハンドリング
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const errorCode = data?.error?.code;
      const errorMessage = data?.error?.message;

      switch (status) {
        case 401:
          handleAuthError(errorCode, errorMessage);
          break;
        case 403:
          handlePermissionError(errorCode, errorMessage);
          break;
        case 500:
          handleSystemError(errorCode, errorMessage, data?.error?.timestamp);
          break;
        default:
          handleGenericError(status, errorMessage);
      }
    }

    return Promise.reject(error);
  }
);
```

## ログレベル指針

### 1. ログレベルの使い分け
```typescript
// ERROR: システムエラー・予期しないエラー
console.error('System error:', { error, context });

// WARN: 警告・回復可能なエラー
console.warn('Deprecated feature used:', { feature, user });

// INFO: 情報・正常な処理
console.log('User authenticated:', { userId, ip });

// DEBUG: デバッグ情報
console.debug('Token validation step:', { step, result });
```

### 2. 構造化ログ
```typescript
// ✅ 推奨: 構造化されたログ情報
console.error('Authentication error:', {
  error: error.message,
  errorCode: 'TOKEN_INVALID',
  userId: decoded?.userId,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
  requestId: req.headers['x-request-id'],
  endpoint: req.originalUrl,
  method: req.method
});
```

## 水平展開チェックリスト

### バックエンド
- [ ] JWT認証エラーハンドリングの詳細化
- [ ] WebSocket認証エラーハンドリング統一
- [ ] エラーログの構造化
- [ ] システムエラーの詳細記録
- [ ] HTTPステータスコードの適切な使用

### フロントエンド
- [ ] エラーコード別メッセージマッピング
- [ ] 認証エラー時の適切なリダイレクト
- [ ] ユーザビリティを考慮したエラーメッセージ
- [ ] WebSocketエラーハンドリング対応

### テスト
- [ ] エラーケースの単体試験
- [ ] エッジケース・境界値テスト
- [ ] エラーメッセージの整合性確認
- [ ] エラーログの出力確認

## 実装済み改善例

### AuthService.verifyToken()
- ✅ 事前チェック強化
- ✅ JWT解析エラー分類
- ✅ 詳細エラーメッセージ
- ✅ 構造化ログ出力

### WebSocketService認証
- ✅ JWT認証ミドルウェア改善
- ✅ WebSocket専用エラーコード
- ✅ 詳細ログ記録

### フロントエンド axios インターセプター
- ✅ 新エラーコード対応
- ✅ エラーメッセージマッピング
- ✅ 適切なユーザーフィードバック

---

**作成日**: 2025-09-25
**対象範囲**: システム全体エラーハンドリング
**ステータス**: 水平展開実施中