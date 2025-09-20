# API設計書テンプレート

## 概要

本テンプレートは、企業システムで実装する各機能のAPI設計書作成時に使用します。
OpenAPI 3.0仕様に準拠し、モバイルファースト・レスポンシブ対応を前提とした設計とします。

## API設計原則

### 1. RESTful設計
- リソース指向の設計
- 適切なHTTPメソッドの使用
- ステートレス通信
- 階層的なURL構造

### 2. レスポンシブ対応
- モバイル向けページネーション（小さなページサイズ）
- データ量の最適化（必要最小限のフィールド）
- 帯域幅を考慮したレスポンス設計
- 段階的データ読み込み対応

### 3. セキュリティファースト
- JWT認証必須
- 権限チェック
- レート制限
- 入力値検証

### 4. 性能重視
- レスポンス時間2秒以内
- 適切なキャッシュ戦略
- データ圧縮
- 並列処理対応

---

# [機能名] API設計書

## 基本情報

| 項目 | 内容 |
|------|------|
| API名 | [機能名] API |
| バージョン | v1.0.0 |
| ベースURL | `https://api.company.com/v1` |
| 認証方式 | Bearer Token (JWT) |
| 文字エンコーディング | UTF-8 |
| レスポンス形式 | JSON |

## 認証・認可

### JWT Token仕様
```typescript
interface JWTPayload {
  sub: string              // ユーザーID
  iss: string              // 発行者
  aud: string              // 対象者
  exp: number              // 有効期限
  iat: number              // 発行時刻
  roles: string[]          // ユーザーロール
  permissions: string[]    // 権限一覧
  organizationId: string   // 組織ID
}
```

### 認証ヘッダー
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 共通レスポンス形式

### 成功レスポンス
```typescript
interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
  meta?: {
    pagination?: PaginationMeta
    filters?: FilterMeta
    sort?: SortMeta
  }
}
```

### エラーレスポンス
```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string              // エラーコード
    message: string           // エラーメッセージ
    details?: any             // 詳細情報
    field?: string            // エラー対象フィールド
  }
  timestamp: string           // エラー発生時刻
  path: string               // リクエストパス
  method: string             // HTTPメソッド
}
```

### ページネーション
```typescript
interface PaginationMeta {
  page: number               // 現在のページ番号（1から開始）
  limit: number              // 1ページあたりの件数
  total: number              // 総件数
  totalPages: number         // 総ページ数
  hasNext: boolean           // 次ページの存在
  hasPrev: boolean           // 前ページの存在
}

// モバイル推奨設定
const MOBILE_DEFAULT_LIMIT = 10    // モバイル用デフォルト
const DESKTOP_DEFAULT_LIMIT = 20   // デスクトップ用デフォルト
const MAX_LIMIT = 100              // 最大件数制限
```

## API エンドポイント一覧

### [リソース名] APIs

#### 1. [リソース]一覧取得
```http
GET /api/v1/[resources]
```

**クエリパラメータ:**
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|------------|----|----|----------|------|
| page | number | No | 1 | ページ番号 |
| limit | number | No | 20 | 1ページの件数（max: 100） |
| sort | string | No | 'createdAt:desc' | ソート条件 |
| search | string | No | - | 検索キーワード |
| filter | object | No | - | フィルター条件 |

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "サンプルデータ",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### 2. [リソース]詳細取得
```http
GET /api/v1/[resources]/{id}
```

**パスパラメータ:**
| パラメータ | 型 | 説明 |
|------------|----|----|
| id | string | リソースID（UUID） |

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "サンプルデータ",
    "description": "詳細説明",
    "status": "active",
    "metadata": {
      "category": "important",
      "tags": ["tag1", "tag2"]
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": {
      "id": "user-123",
      "name": "山田太郎"
    }
  }
}
```

#### 3. [リソース]作成
```http
POST /api/v1/[resources]
```

**リクエストボディ:**
```typescript
interface CreateResourceDto {
  name: string                    // 必須: 名前
  description?: string            // 任意: 説明
  status?: 'active' | 'inactive' // 任意: ステータス（デフォルト: active）
  metadata?: {                    // 任意: メタデータ
    category?: string
    tags?: string[]
  }
}
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "新規データ",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "リソースが正常に作成されました"
}
```

#### 4. [リソース]更新
```http
PUT /api/v1/[resources]/{id}
```

**パスパラメータ:**
| パラメータ | 型 | 説明 |
|------------|----|----|
| id | string | リソースID（UUID） |

**リクエストボディ:**
```typescript
interface UpdateResourceDto {
  name?: string                   // 任意: 名前
  description?: string            // 任意: 説明
  status?: 'active' | 'inactive' // 任意: ステータス
  metadata?: {                    // 任意: メタデータ
    category?: string
    tags?: string[]
  }
}
```

#### 5. [リソース]削除
```http
DELETE /api/v1/[resources]/{id}
```

**パスパラメータ:**
| パラメータ | 型 | 説明 |
|------------|----|----|
| id | string | リソースID（UUID） |

**レスポンス例:**
```json
{
  "success": true,
  "message": "リソースが正常に削除されました"
}
```

## モバイル最適化API

### 軽量版一覧取得
```http
GET /api/v1/[resources]/mobile
```

モバイル向けに最適化された軽量版データを返します。

**特徴:**
- 必要最小限のフィールドのみ
- 小さなページサイズ（デフォルト10件）
- 画像はサムネイルURL
- 関連データは最小限

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "サンプル",
      "status": "active",
      "thumbnail": "https://cdn.company.com/thumbs/sample_200x200.jpg"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "hasNext": true
    }
  }
}
```

### 段階的詳細取得
```http
GET /api/v1/[resources]/{id}/summary
GET /api/v1/[resources]/{id}/details
GET /api/v1/[resources]/{id}/related
```

詳細情報を段階的に取得できるエンドポイント群。

## バリデーション

### 共通バリデーションルール
```typescript
interface ValidationRules {
  // 文字列
  name: {
    required: true
    minLength: 1
    maxLength: 100
    pattern: /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s-_]+$/
  }

  // メールアドレス
  email: {
    required: true
    format: 'email'
    maxLength: 255
  }

  // 日時
  datetime: {
    format: 'iso8601'  // YYYY-MM-DDTHH:mm:ssZ
  }

  // UUID
  id: {
    format: 'uuid'
    version: 4
  }

  // ページネーション
  pagination: {
    page: { min: 1, max: 10000 }
    limit: { min: 1, max: 100 }
  }
}
```

### バリデーションエラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値に誤りがあります",
    "details": [
      {
        "field": "name",
        "message": "名前は必須です",
        "code": "REQUIRED"
      },
      {
        "field": "email",
        "message": "正しいメールアドレス形式で入力してください",
        "code": "INVALID_FORMAT"
      }
    ]
  }
}
```

## エラーコード一覧

### システムエラー
| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| INTERNAL_ERROR | 500 | 内部サーバーエラー |
| SERVICE_UNAVAILABLE | 503 | サービス利用不可 |
| TIMEOUT | 504 | タイムアウト |

### 認証・認可エラー
| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| UNAUTHORIZED | 401 | 認証が必要 |
| FORBIDDEN | 403 | アクセス権限なし |
| TOKEN_EXPIRED | 401 | トークンの有効期限切れ |
| INVALID_TOKEN | 401 | 無効なトークン |

### リクエストエラー
| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| BAD_REQUEST | 400 | 不正なリクエスト |
| VALIDATION_ERROR | 400 | バリデーションエラー |
| NOT_FOUND | 404 | リソースが見つからない |
| CONFLICT | 409 | データの競合 |
| RATE_LIMIT_EXCEEDED | 429 | レート制限超過 |

### 業務エラー
| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| BUSINESS_RULE_VIOLATION | 422 | 業務ルール違反 |
| INSUFFICIENT_PERMISSION | 403 | 権限不足 |
| RESOURCE_LOCKED | 423 | リソースがロック中 |

## レート制限

### 制限内容
| ユーザータイプ | 1分間の制限 | 1時間の制限 | 1日の制限 |
|----------------|-------------|-------------|-----------|
| 一般ユーザー | 60リクエスト | 1000リクエスト | 10000リクエスト |
| 管理者 | 120リクエスト | 2000リクエスト | 20000リクエスト |
| システム | 300リクエスト | 5000リクエスト | 50000リクエスト |

### レート制限ヘッダー
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995200
X-RateLimit-RetryAfter: 60
```

## キャッシュ戦略

### キャッシュ対象
- GET API（マスタデータ）: 1時間
- GET API（トランザクションデータ）: 5分
- 静的ファイル: 24時間

### キャッシュヘッダー
```http
Cache-Control: public, max-age=3600
ETag: "abc123"
Last-Modified: Tue, 15 Jan 2024 10:30:00 GMT
```

## OpenAPI仕様書

### Swagger定義例
```yaml
openapi: 3.0.3
info:
  title: [機能名] API
  description: [機能の説明]
  version: 1.0.0
  contact:
    name: API Support
    email: api-support@company.com

servers:
  - url: https://api.company.com/v1
    description: 本番環境
  - url: https://staging-api.company.com/v1
    description: ステージング環境

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Resource:
      type: object
      required:
        - id
        - name
        - status
      properties:
        id:
          type: string
          format: uuid
          description: リソースID
        name:
          type: string
          minLength: 1
          maxLength: 100
          description: リソース名
        status:
          type: string
          enum: [active, inactive]
          description: ステータス

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string

paths:
  /[resources]:
    get:
      summary: [リソース]一覧取得
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResourceListResponse'
```

## テスト仕様

### 単体テスト
- すべてのエンドポイントの正常系テスト
- バリデーションエラーのテスト
- 認証・認可のテスト
- レート制限のテスト

### 統合テスト
- API間の連携テスト
- データベーストランザクションのテスト
- 外部サービス連携のテスト

### パフォーマンステスト
- 負荷テスト（同時接続数）
- ストレステスト（限界値）
- 耐久テスト（長時間実行）

## 監視・ログ

### メトリクス
- リクエスト数/秒
- レスポンス時間
- エラー率
- 同時接続数

### ログ出力
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "method": "GET",
  "path": "/api/v1/resources",
  "statusCode": 200,
  "responseTime": 150,
  "userId": "user-123",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.100"
}
```

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 1.0.0 | 2024-01-15 | 初版作成 | 開発チーム |

---

**注意事項:**
- このテンプレートは各機能のAPI設計時に参照し、必要に応じてカスタマイズしてください
- モバイルファースト設計を必ず考慮してください
- セキュリティ要件は最新のOWASP推奨事項に従ってください
- パフォーマンス要件は実際の負荷を考慮して調整してください