# API リファレンス

## 概要

WebSys Platform REST API は、ユーザー管理、認証、およびシステム機能へのプログラムアクセスを提供します。

## Base URL

- **Development**: `http://localhost:8000`
- **Staging**: `https://api-staging.websys.company.com`
- **Production**: `https://api.websys.company.com`

## 認証

### JWT Bearer Token

全ての保護されたエンドポイントには、Authorization ヘッダーでJWTトークンが必要です。

```bash
Authorization: Bearer <jwt_token>
```

### トークン取得

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

## エラーレスポンス

APIは標準的なHTTPステータスコードとJSON形式のエラーメッセージを返します。

### エラーフォーマット

```json
{
  "message": "エラーメッセージ",
  "errors": [
    {
      "field": "username",
      "message": "ユーザー名は必須です"
    }
  ],
  "stack": "Error stack trace (development only)"
}
```

### HTTPステータスコード

- `200` - 成功
- `201` - リソース作成成功
- `400` - リクエストエラー
- `401` - 認証エラー
- `403` - 認可エラー
- `404` - リソースが見つからない
- `422` - バリデーションエラー
- `500` - サーバーエラー

## 認証 API

### ログイン

ユーザー認証を行い、JWTトークンを取得します。

```http
POST /api/auth/login
```

#### リクエスト

```json
{
  "username": "admin",
  "password": "password"
}
```

#### レスポンス

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "name": "管理者",
    "department": "IT",
    "role": "ADMIN"
  }
}
```

#### バリデーションルール

- `username`: 必須、3-20文字
- `password`: 必須、6文字以上

#### エラーレスポンス

```json
// 認証失敗
{
  "message": "ユーザー名またはパスワードが正しくありません"
}

// バリデーションエラー
{
  "errors": [
    {
      "field": "username",
      "message": "ユーザー名は必須です"
    }
  ]
}
```

### ユーザー登録

新しいユーザーアカウントを作成します。

```http
POST /api/auth/register
```

#### リクエスト

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "name": "新規ユーザー",
  "department": "営業部"
}
```

#### レスポンス

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "newuser@example.com",
    "name": "新規ユーザー",
    "department": "営業部",
    "role": "USER"
  }
}
```

#### バリデーションルール

- `username`: 必須、3-20文字、英数字のみ、一意
- `email`: 必須、有効なメールアドレス、一意
- `password`: 必須、6文字以上
- `name`: 必須、1-50文字
- `department`: オプション、50文字以下

## ユーザー管理 API

### ユーザー一覧取得

全ユーザーの一覧を取得します。

```http
GET /api/users
Authorization: Bearer <token>
```

#### クエリパラメータ

| パラメータ | 型 | 説明 | デフォルト |
|-----------|-----|------|----------|
| `page` | number | ページ番号 | 1 |
| `limit` | number | 1ページあたりの件数 | 20 |
| `search` | string | 検索キーワード（名前、ユーザー名、メール） | - |
| `role` | string | 役割フィルタ（ADMIN, USER, GUEST） | - |
| `department` | string | 部署フィルタ | - |
| `isActive` | boolean | アクティブ状態フィルタ | - |

#### レスポンス

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "name": "管理者",
      "department": "IT",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "2024-01-19T10:30:00.000Z",
      "updatedAt": "2024-01-19T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### ユーザー詳細取得

指定されたIDのユーザー詳細情報を取得します。

```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### パスパラメータ

- `id`: ユーザーID（number）

#### レスポンス

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "name": "管理者",
  "department": "IT",
  "role": "ADMIN",
  "isActive": true,
  "createdAt": "2024-01-19T10:30:00.000Z",
  "updatedAt": "2024-01-19T10:30:00.000Z"
}
```

#### エラーレスポンス

```json
// ユーザーが見つからない場合
{
  "message": "ユーザーが見つかりません"
}
```

### ユーザー作成

新しいユーザーを作成します（管理者のみ）。

```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json
```

#### 権限要件

- 管理者権限（role: ADMIN）が必要

#### リクエスト

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "name": "新規ユーザー",
  "department": "営業部",
  "role": "USER"
}
```

#### レスポンス

```json
{
  "id": 2,
  "username": "newuser",
  "email": "newuser@example.com",
  "name": "新規ユーザー",
  "department": "営業部",
  "role": "USER",
  "isActive": true
}
```

### ユーザー更新

指定されたIDのユーザー情報を更新します（管理者のみ）。

```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json
```

#### 権限要件

- 管理者権限（role: ADMIN）が必要

#### パスパラメータ

- `id`: ユーザーID（number）

#### リクエスト

```json
{
  "username": "updateduser",
  "email": "updated@example.com",
  "name": "更新されたユーザー",
  "department": "開発部",
  "role": "USER",
  "isActive": true
}
```

#### レスポンス

```json
{
  "id": 2,
  "username": "updateduser",
  "email": "updated@example.com",
  "name": "更新されたユーザー",
  "department": "開発部",
  "role": "USER",
  "isActive": true
}
```

### ユーザー削除

指定されたIDのユーザーを削除します（管理者のみ）。

```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

#### 権限要件

- 管理者権限（role: ADMIN）が必要

#### パスパラメータ

- `id`: ユーザーID（number）

#### レスポンス

```json
{
  "message": "ユーザーを削除しました"
}
```

## システム API

### ヘルスチェック

システムの稼働状態を確認します。

```http
GET /health
```

#### レスポンス

```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2024-01-19T10:30:00.000Z",
  "version": "1.0.0"
}
```

### システム情報

システムの詳細情報を取得します（管理者のみ）。

```http
GET /api/system/info
Authorization: Bearer <token>
```

#### 権限要件

- 管理者権限（role: ADMIN）が必要

#### レスポンス

```json
{
  "version": "1.0.0",
  "environment": "development",
  "database": {
    "status": "connected",
    "version": "PostgreSQL 15.1"
  },
  "uptime": 3600,
  "memory": {
    "used": "125 MB",
    "total": "512 MB"
  }
}
```

## データモデル

### User

ユーザー情報を表すデータモデル。

```typescript
interface User {
  id: number                    // ユーザーID
  username: string              // ユーザー名（一意）
  email: string                 // メールアドレス（一意）
  password: string              // パスワード（ハッシュ化）
  name: string                  // 表示名
  department?: string           // 部署名
  role: 'ADMIN' | 'USER' | 'GUEST'  // 権限
  isActive: boolean             // アクティブ状態
  createdAt: Date               // 作成日時
  updatedAt: Date               // 更新日時
}
```

### JWTペイロード

JWTトークンに含まれる情報。

```typescript
interface JWTPayload {
  userId: number                // ユーザーID
  username: string              // ユーザー名
  role: 'ADMIN' | 'USER' | 'GUEST'  // 権限
  iat: number                   // 発行時刻
  exp: number                   // 有効期限
}
```

## SDKとサンプルコード

### JavaScript/TypeScript

```typescript
// API クライアント
class WebSysAPI {
  private baseURL: string
  private token?: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  // 認証
  async login(username: string, password: string) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })

    if (!response.ok) {
      throw new Error('Login failed')
    }

    const data = await response.json()
    this.token = data.token
    return data
  }

  // ユーザー一覧取得
  async getUsers(params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
  }) {
    const url = new URL(`${this.baseURL}/api/users`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value.toString())
        }
      })
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch users')
    }

    return response.json()
  }

  // ユーザー作成
  async createUser(userData: {
    username: string
    email: string
    password: string
    name: string
    department?: string
    role?: string
  }) {
    const response = await fetch(`${this.baseURL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      throw new Error('Failed to create user')
    }

    return response.json()
  }
}

// 使用例
const api = new WebSysAPI('http://localhost:8000')

// ログイン
await api.login('admin', 'password')

// ユーザー一覧取得
const users = await api.getUsers({
  page: 1,
  limit: 20,
  search: 'admin'
})

// ユーザー作成
const newUser = await api.createUser({
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'password123',
  name: '新規ユーザー',
  department: '営業部'
})
```

### curl コマンド例

```bash
# ログイン
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# ユーザー一覧取得
curl -X GET http://localhost:8000/api/users \
  -H "Authorization: Bearer <token>"

# ユーザー作成
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "name": "新規ユーザー",
    "department": "営業部"
  }'

# ユーザー更新
curl -X PUT http://localhost:8000/api/users/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "更新されたユーザー",
    "department": "開発部"
  }'

# ユーザー削除
curl -X DELETE http://localhost:8000/api/users/2 \
  -H "Authorization: Bearer <token>"
```

## レート制限

API呼び出しには以下のレート制限が適用されます：

- **認証エンドポイント**: 15分間に5回
- **一般エンドポイント**: 15分間に100回
- **管理者エンドポイント**: 15分間に200回

制限に達した場合、`429 Too Many Requests` ステータスが返されます。

```json
{
  "message": "Too many requests",
  "retryAfter": 900
}
```

## OpenAPI仕様

完全なOpenAPI（Swagger）仕様は以下のエンドポイントで確認できます：

- **開発環境**: http://localhost:8000/api-docs
- **ステージング**: https://api-staging.websys.company.com/api-docs

## 変更履歴

### v1.0.0 (2024-01-19)
- 初期リリース
- ユーザー管理API実装
- JWT認証実装
- ヘルスチェックAPI実装

### 今後の予定

- **v1.1.0**: ファイルアップロード機能
- **v1.2.0**: 通知システム
- **v1.3.0**: レポート機能
- **v2.0.0**: GraphQL API対応