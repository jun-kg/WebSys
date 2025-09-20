# API リファレンス

## 認証 API

### POST /api/auth/login
ユーザーログイン

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "string",
  "user": {
    "id": "number",
    "username": "string",
    "name": "string",
    "role": "USER|ADMIN"
  }
}
```

### POST /api/auth/register
ユーザー登録

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "name": "string",
  "email": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "string"
}
```

### POST /api/auth/logout
ログアウト

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "string"
}
```

## ユーザー管理 API

### GET /api/users
ユーザー一覧取得

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: number (default: 1)
- `pageSize`: number (default: 10)

**Response:**
```json
{
  "users": [
    {
      "id": "number",
      "username": "string",
      "name": "string",
      "email": "string",
      "role": "USER|ADMIN",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "pageSize": "number"
}
```

### GET /api/users/:id
ユーザー詳細取得

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": "number",
    "username": "string",
    "name": "string",
    "email": "string",
    "role": "USER|ADMIN",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### PUT /api/users/:id
ユーザー情報更新

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "role": "USER|ADMIN"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "number",
    "username": "string",
    "name": "string",
    "email": "string",
    "role": "USER|ADMIN",
    "updatedAt": "string"
  }
}
```

### DELETE /api/users/:id
ユーザー削除

**Headers:**
- `Authorization: Bearer <token>`
- 管理者権限必要

**Response:**
```json
{
  "success": true,
  "message": "string"
}
```

## ログ監視 API

### POST /api/logs
ログ収集

**Request Body:**
```json
{
  "logs": [
    {
      "timestamp": "string (ISO 8601)",
      "level": "number (10|20|30|40|50|60)",
      "category": "string (AUTH|API|DB|SEC|SYS|USER|PERF|ERR)",
      "source": "string (frontend|backend|database|infrastructure)",
      "message": "string",
      "traceId": "string (optional)",
      "sessionId": "string (optional)",
      "userId": "number (optional)",
      "hostname": "string (optional)",
      "service": "string (optional)",
      "details": "object (optional)",
      "error": {
        "name": "string (optional)",
        "message": "string (optional)",
        "stack": "string (optional)",
        "code": "string|number (optional)"
      },
      "performance": {
        "duration": "number (optional)",
        "memoryUsage": "number (optional)",
        "cpuUsage": "number (optional)"
      },
      "tags": ["string (optional)"],
      "environment": "string"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "received": "number",
  "saved": "number",
  "errors": ["string"]
}
```

### GET /api/logs/search
ログ検索

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `startTime`: string (ISO 8601, optional)
- `endTime`: string (ISO 8601, optional)
- `levels`: string (comma-separated numbers, optional)
- `categories`: string (comma-separated, optional)
- `sources`: string (comma-separated, optional)
- `traceId`: string (optional)
- `userId`: number (optional)
- `query`: string (free text search, optional)
- `page`: number (default: 1)
- `pageSize`: number (default: 50, max: 1000)
- `sortBy`: string (default: timestamp)
- `sortOrder`: string (asc|desc, default: desc)

**Response:**
```json
{
  "logs": [
    {
      "id": "string",
      "timestamp": "string",
      "level": "number",
      "category": "string",
      "source": "string",
      "message": "string",
      "traceId": "string",
      "sessionId": "string",
      "userId": "number",
      "user": {
        "id": "number",
        "username": "string",
        "name": "string"
      },
      "hostname": "string",
      "service": "string",
      "details": "object",
      "error": "object",
      "performance": "object",
      "tags": ["string"],
      "environment": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "pageSize": "number",
  "hasNext": "boolean"
}
```

### GET /api/logs/statistics
ログ統計取得

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `startTime`: string (ISO 8601, required)
- `endTime`: string (ISO 8601, required)
- `groupBy`: string (hour|day|category|level, default: hour)
- `categories`: string (comma-separated, optional)
- `levels`: string (comma-separated numbers, optional)

**Response:**
```json
{
  "statistics": [
    {
      "key": "string",
      "count": "number",
      "percentage": "number"
    }
  ],
  "total": "number",
  "period": {
    "start": "string",
    "end": "string"
  }
}
```

### GET /api/logs/realtime
リアルタイム統計取得

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "totalLogs": "number",
  "errorCount": "number",
  "warningCount": "number",
  "recentLogs": [
    {
      "id": "string",
      "timestamp": "string",
      "level": "number",
      "category": "string",
      "message": "string",
      "user": {
        "id": "number",
        "username": "string",
        "name": "string"
      }
    }
  ]
}
```

### GET /api/logs/:id
ログ詳細取得

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "log": {
    "id": "string",
    "timestamp": "string",
    "level": "number",
    "category": "string",
    "source": "string",
    "message": "string",
    "traceId": "string",
    "sessionId": "string",
    "userId": "number",
    "user": {
      "id": "number",
      "username": "string",
      "name": "string"
    },
    "hostname": "string",
    "service": "string",
    "details": "object",
    "error": "object",
    "performance": "object",
    "tags": ["string"],
    "environment": "string"
  }
}
```

### POST /api/logs/cleanup
ログクリーンアップ

**Headers:**
- `Authorization: Bearer <token>`
- 管理者権限必要

**Response:**
```json
{
  "success": true,
  "message": "string"
}
```

### GET /api/logs/export
ログエクスポート

**Headers:**
- `Authorization: Bearer <token>`
- 管理者権限必要

**Query Parameters:**
- `format`: string (json|csv, default: json)
- `startTime`: string (ISO 8601, optional)
- `endTime`: string (ISO 8601, optional)
- `levels`: string (comma-separated numbers, optional)
- `categories`: string (comma-separated, optional)
- `sources`: string (comma-separated, optional)

**Response:**
- Content-Type: application/json or text/csv
- Content-Disposition: attachment; filename="logs_YYYY-MM-DD.json|csv"

## エラーレスポンス

### 400 Bad Request
```json
{
  "success": false,
  "message": "string",
  "error": "string (development only)"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "認証が必要です"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "権限がありません"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "リソースが見つかりません"
}
```

### 413 Payload Too Large
```json
{
  "success": false,
  "message": "リクエストサイズが大きすぎます"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "string",
  "error": "string (development only)"
}
```

## 定数・列挙型

### ログレベル
```typescript
enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60
}
```

### ログカテゴリ
```typescript
enum LogCategory {
  AUTH = 'AUTH',     // 認証
  API = 'API',       // API
  DB = 'DB',         // データベース
  SEC = 'SEC',       // セキュリティ
  SYS = 'SYS',       // システム
  USER = 'USER',     // ユーザー
  PERF = 'PERF',     // パフォーマンス
  ERR = 'ERR'        // エラー
}
```

### ログソース
```typescript
enum LogSource {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  DATABASE = 'database',
  INFRASTRUCTURE = 'infrastructure'
}
```

### ユーザー権限
```typescript
enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}
```