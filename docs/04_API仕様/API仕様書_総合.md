# WebSys API仕様書

**最終更新**: 2025-10-03
**バージョン**: 2.0
**対象システム**: WebSys共通ライブラリ型社内システム

---

## 📋 目次

1. [概要](#概要)
2. [認証](#認証)
3. [エラーレスポンス](#エラーレスポンス)
4. [認証API](#認証api)
5. [ユーザー管理API](#ユーザー管理api)
6. [組織管理API](#組織管理api)
7. [権限管理API](#権限管理api)
8. [ログ監視API](#ログ監視api)
9. [ワークフローAPI](#ワークフローapi)
10. [通知API](#通知api)
11. [システムAPI](#システムapi)
12. [WebSocket API](#websocket-api)
13. [データモデル](#データモデル)
14. [SDKサンプル](#sdkサンプル)

---

## 概要

WebSys Platform REST APIは、Vue.js 3 + Express + PostgreSQLで構築された企業向け社内システムのバックエンドAPIです。

### Base URL

| 環境 | URL | 説明 |
|------|-----|------|
| **Development** | `http://websys_backend_dev:8000` | Docker開発環境 |
| **Local** | `http://localhost:8000` | ローカル開発 |
| **Staging** | `https://api-staging.websys.company.com` | ステージング環境 |
| **Production** | `https://api.websys.company.com` | 本番環境 |

### アーキテクチャ特徴

- **3層分離**: core（変更禁止）/ extensions（拡張可能）/ custom（自由実装）
- **マイクロサービス**: ワークフロー9サービス、ログ監視8コンポーネント
- **リアルタイム通信**: WebSocket (Socket.io) 対応
- **型安全**: TypeScript完全実装

---

## 認証

### JWT双代トークン認証

WebSysは2種類のJWTトークンを使用します。

| トークン種別 | 有効期限 | 用途 | シークレット |
|-------------|---------|------|-------------|
| **Access Token** | 15分 | API認証 | `JWT_ACCESS_SECRET` |
| **Refresh Token** | 7日間 | トークン更新 | `JWT_REFRESH_SECRET` |

### 認証ヘッダー

全ての保護されたエンドポイントには、Authorizationヘッダーが必要です。

```http
Authorization: Bearer <access_token>
```

### トークン取得フロー

```bash
# 1. ログインしてトークン取得
POST /api/auth/login
{
  "username": "admin",
  "password": "password"
}

# レスポンス
{
  "success": true,
  "message": "ログインに成功しました",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": { ... }
  }
}

# 2. アクセストークン有効期限切れ時
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}

# 3. ログアウト
POST /api/auth/logout
Authorization: Bearer <access_token>
```

---

## エラーレスポンス

### 標準エラーフォーマット

```json
{
  "success": false,
  "message": "エラーメッセージ",
  "error": {
    "code": "AUTH_001",
    "message": "認証に失敗しました"
  },
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

| コード | 説明 | 例 |
|-------|------|-----|
| `200` | 成功 | GET/PUT成功 |
| `201` | リソース作成成功 | POST成功 |
| `204` | 成功（レスポンスなし） | DELETE成功 |
| `400` | リクエストエラー | バリデーションエラー |
| `401` | 認証エラー | トークン無効・期限切れ |
| `403` | 認可エラー | 権限不足 |
| `404` | リソースが見つからない | 存在しないID |
| `409` | リソース競合 | 重複登録 |
| `422` | バリデーションエラー | 入力値不正 |
| `429` | レート制限 | リクエスト過多 |
| `500` | サーバーエラー | 内部エラー |

### エラーコード一覧

#### 認証関連 (AUTH_xxx)
- `AUTH_001`: 認証失敗
- `AUTH_002`: トークン無効
- `AUTH_003`: トークン期限切れ
- `AUTH_004`: リフレッシュトークン無効
- `AUTH_005`: 権限不足
- `AUTH_006`: ログイン試行回数制限

#### バリデーション関連 (VAL_xxx)
- `VAL_001`: 必須項目未入力
- `VAL_002`: 形式不正
- `VAL_003`: 範囲外
- `VAL_004`: 重複データ

#### リソース関連 (RES_xxx)
- `RES_001`: リソースが見つからない
- `RES_002`: リソース削除済み
- `RES_003`: リソース更新競合

---

## 認証API

### POST /api/auth/login
ユーザー認証を行い、JWTトークンを取得します。

**認証**: 不要

**リクエスト**:
```json
{
  "username": "admin",
  "password": "password"
}
```

**レスポンス 200**:
```json
{
  "success": true,
  "message": "ログインに成功しました",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "name": "管理者",
      "role": "ADMIN",
      "companyId": 1,
      "departmentId": 1,
      "isActive": true
    }
  }
}
```

**エラーレスポンス 401**:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "ユーザー名またはパスワードが正しくありません"
  }
}
```

**レート制限**: 15分間に100回

---

### POST /api/auth/refresh
リフレッシュトークンを使用して新しいアクセストークンを取得します。

**認証**: 不要

**リクエスト**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### POST /api/auth/logout
ログアウトしてトークンを無効化します。

**認証**: 必要

**レスポンス 200**:
```json
{
  "success": true,
  "message": "ログアウトしました"
}
```

---

### GET /api/auth/me
現在ログイン中のユーザー情報を取得します。

**認証**: 必要

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "name": "管理者",
    "role": "ADMIN",
    "companyId": 1,
    "departmentId": 1,
    "company": {
      "id": 1,
      "name": "サンプル企業"
    },
    "department": {
      "id": 1,
      "name": "システム部"
    }
  }
}
```

---

## ユーザー管理API

### GET /api/users
ユーザー一覧を取得します。

**認証**: 必要
**権限**: USER以上

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|----------|------|
| `page` | number | × | 1 | ページ番号 |
| `pageSize` | number | × | 20 | 1ページあたりの件数 |
| `search` | string | × | - | 検索キーワード（名前、ユーザー名、メール） |
| `role` | string | × | - | 役割フィルタ（ADMIN, USER） |
| `departmentId` | number | × | - | 部署IDフィルタ |
| `isActive` | boolean | × | - | アクティブ状態フィルタ |

**レスポンス 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "name": "管理者",
      "role": "ADMIN",
      "companyId": 1,
      "departmentId": 1,
      "isActive": true,
      "createdAt": "2025-09-25T10:00:00.000Z",
      "updatedAt": "2025-09-25T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### GET /api/users/:id
特定ユーザーの詳細情報を取得します。

**認証**: 必要
**権限**: USER以上

**パスパラメータ**:
- `id`: ユーザーID

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "name": "管理者",
    "role": "ADMIN",
    "companyId": 1,
    "departmentId": 1,
    "isActive": true,
    "company": {
      "id": 1,
      "name": "サンプル企業"
    },
    "department": {
      "id": 1,
      "name": "システム部"
    }
  }
}
```

---

### POST /api/users
新しいユーザーを作成します。

**認証**: 必要
**権限**: ADMIN

**リクエスト**:
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "name": "新規ユーザー",
  "role": "USER",
  "companyId": 1,
  "departmentId": 2,
  "isActive": true
}
```

**レスポンス 201**:
```json
{
  "success": true,
  "message": "ユーザーを作成しました",
  "data": {
    "id": 2,
    "username": "newuser",
    "email": "newuser@example.com",
    "name": "新規ユーザー",
    "role": "USER"
  }
}
```

---

### PUT /api/users/:id
ユーザー情報を更新します。

**認証**: 必要
**権限**: ADMIN

**リクエスト**:
```json
{
  "username": "updateduser",
  "email": "updated@example.com",
  "name": "更新されたユーザー",
  "departmentId": 3,
  "isActive": true
}
```

**レスポンス 200**:
```json
{
  "success": true,
  "message": "ユーザーを更新しました",
  "data": {
    "id": 2,
    "username": "updateduser",
    "email": "updated@example.com",
    "name": "更新されたユーザー"
  }
}
```

---

### DELETE /api/users/:id
ユーザーを削除します。

**認証**: 必要
**権限**: ADMIN

**レスポンス 200**:
```json
{
  "success": true,
  "message": "ユーザーを削除しました"
}
```

---

## 組織管理API

### GET /api/companies
企業一覧を取得します。

**認証**: 必要
**権限**: ADMIN

**レスポンス 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "サンプル企業",
      "isActive": true,
      "createdAt": "2025-09-25T10:00:00.000Z"
    }
  ]
}
```

---

### GET /api/departments
部署一覧を取得します。

**認証**: 必要
**権限**: USER以上

**クエリパラメータ**:
- `companyId`: 企業ID（フィルタ）

**レスポンス 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "システム部",
      "companyId": 1,
      "parentId": null,
      "isActive": true
    },
    {
      "id": 2,
      "name": "営業部",
      "companyId": 1,
      "parentId": null,
      "isActive": true
    }
  ]
}
```

---

## 権限管理API

### GET /api/permissions/templates
権限テンプレート一覧を取得します。

**認証**: 必要
**権限**: ADMIN

**レスポンス 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "管理者権限",
      "description": "全機能アクセス可能",
      "category": "ADMIN",
      "isSystem": true,
      "companyId": 1,
      "features": [
        {
          "featureId": 1,
          "featureName": "ユーザー管理",
          "canView": true,
          "canCreate": true,
          "canEdit": true,
          "canDelete": true
        }
      ]
    }
  ]
}
```

---

### POST /api/permissions/templates
権限テンプレートを作成します。

**認証**: 必要
**権限**: ADMIN

**リクエスト**:
```json
{
  "name": "営業部権限",
  "description": "営業部向けの標準権限",
  "category": "CUSTOM",
  "companyId": 1,
  "features": [
    {
      "featureId": 1,
      "canView": true,
      "canCreate": true,
      "canEdit": false,
      "canDelete": false
    }
  ]
}
```

**レスポンス 201**:
```json
{
  "success": true,
  "message": "権限テンプレートを作成しました",
  "data": {
    "id": 4,
    "name": "営業部権限",
    "category": "CUSTOM"
  }
}
```

---

### POST /api/permissions/templates/:id/apply
権限テンプレートを部署に一括適用します。

**認証**: 必要
**権限**: ADMIN

**リクエスト**:
```json
{
  "departmentIds": [1, 2, 3]
}
```

**レスポンス 200**:
```json
{
  "success": true,
  "message": "権限テンプレートを適用しました",
  "data": {
    "appliedCount": 3,
    "departments": [1, 2, 3]
  }
}
```

---

### GET /api/permissions/matrix
権限マトリクス（部署×機能）を取得します。

**認証**: 必要
**権限**: ADMIN

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "departments": [
      { "id": 1, "name": "システム部" },
      { "id": 2, "name": "営業部" }
    ],
    "features": [
      { "id": 1, "name": "ユーザー管理" },
      { "id": 2, "name": "ログ監視" }
    ],
    "matrix": [
      {
        "departmentId": 1,
        "featureId": 1,
        "canView": true,
        "canCreate": true,
        "canEdit": true,
        "canDelete": true
      }
    ]
  }
}
```

---

## ログ監視API

### POST /api/logs
ログを収集します（バッチ送信対応）。

**認証**: 不要

**リクエスト**:
```json
{
  "logs": [
    {
      "timestamp": "2025-10-03T10:00:00.000Z",
      "level": 30,
      "category": "USER",
      "source": "frontend",
      "message": "ユーザーがログインしました",
      "userId": 1,
      "environment": "development",
      "metadata": {
        "ip": "192.168.1.100",
        "userAgent": "Mozilla/5.0..."
      }
    }
  ]
}
```

**レスポンス 201**:
```json
{
  "success": true,
  "message": "ログを収集しました",
  "data": {
    "count": 1
  }
}
```

---

### GET /api/logs/search
ログを検索します。

**認証**: 必要
**権限**: USER以上

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `page` | number | × | ページ番号（デフォルト: 1） |
| `limit` | number | × | 取得件数（デフォルト: 50） |
| `level` | number | × | ログレベルフィルタ（10-60） |
| `category` | string | × | カテゴリフィルタ |
| `source` | string | × | ソースフィルタ（frontend/backend） |
| `search` | string | × | メッセージ検索キーワード |
| `startDate` | string | × | 開始日時（ISO8601） |
| `endDate` | string | × | 終了日時（ISO8601） |

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "timestamp": "2025-10-03T10:00:00.000Z",
        "level": 30,
        "levelName": "INFO",
        "category": "USER",
        "source": "frontend",
        "message": "ユーザーがログインしました",
        "userId": 1,
        "companyId": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

---

### GET /api/logs/statistics
ログ統計を取得します。

**認証**: 必要
**権限**: USER以上

**クエリパラメータ**:
- `startDate`: 開始日時（ISO8601）
- `endDate`: 終了日時（ISO8601）

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "totalLogs": 1000,
    "byLevel": {
      "FATAL": 0,
      "ERROR": 10,
      "WARN": 50,
      "INFO": 800,
      "DEBUG": 100,
      "TRACE": 40
    },
    "byCategory": {
      "AUTH": 100,
      "API": 300,
      "DB": 200,
      "USER": 400
    },
    "bySource": {
      "frontend": 600,
      "backend": 400
    },
    "timeline": [
      {
        "hour": "2025-10-03T10:00:00.000Z",
        "count": 50
      }
    ]
  }
}
```

---

### GET /api/logs/realtime
リアルタイム統計を取得します（最新5分間）。

**認証**: 必要
**権限**: USER以上

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "current": {
      "totalLogs": 50,
      "errorCount": 2,
      "warnCount": 5,
      "infoCount": 43
    },
    "recentErrors": [
      {
        "id": 100,
        "timestamp": "2025-10-03T10:05:00.000Z",
        "level": 50,
        "message": "データベース接続エラー"
      }
    ]
  }
}
```

---

### GET /api/logs/:id
ログ詳細を取得します。

**認証**: 必要
**権限**: USER以上

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "timestamp": "2025-10-03T10:00:00.000Z",
    "level": 30,
    "levelName": "INFO",
    "category": "USER",
    "source": "frontend",
    "message": "ユーザーがログインしました",
    "userId": 1,
    "companyId": 1,
    "metadata": {
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    },
    "stackTrace": null
  }
}
```

---

### POST /api/logs/cleanup
古いログをクリーンアップします。

**認証**: 必要
**権限**: ADMIN

**リクエスト**:
```json
{
  "retentionDays": 90
}
```

**レスポンス 200**:
```json
{
  "success": true,
  "message": "ログをクリーンアップしました",
  "data": {
    "deletedCount": 1000
  }
}
```

---

### GET /api/logs/export
ログをエクスポートします（CSV/JSON）。

**認証**: 必要
**権限**: ADMIN

**クエリパラメータ**:
- `format`: エクスポート形式（csv / json）
- `startDate`: 開始日時
- `endDate`: 終了日時

**レスポンス 200**:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="logs-2025-10-03.csv"

id,timestamp,level,category,message,...
```

---

## ワークフローAPI

### GET /api/workflow/types
ワークフロータイプ一覧を取得します。

**認証**: 必要
**権限**: USER以上

**レスポンス 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "稟議申請",
      "description": "稟議書の申請フロー",
      "companyId": 1,
      "isActive": true,
      "approvalFlow": "sequential",
      "requiresAttachment": true
    }
  ]
}
```

---

### POST /api/workflow/requests
ワークフロー申請を作成します。

**認証**: 必要
**権限**: USER以上

**リクエスト**:
```json
{
  "workflowTypeId": 1,
  "title": "新規システム導入の稟議",
  "description": "社内システムの導入について稟議申請します",
  "priority": "HIGH",
  "metadata": {
    "amount": 1000000,
    "vendor": "サンプル株式会社"
  }
}
```

**レスポンス 201**:
```json
{
  "success": true,
  "message": "ワークフロー申請を作成しました",
  "data": {
    "id": 1,
    "workflowTypeId": 1,
    "title": "新規システム導入の稟議",
    "status": "PENDING",
    "priority": "HIGH",
    "requesterId": 1,
    "createdAt": "2025-10-03T10:00:00.000Z"
  }
}
```

---

### GET /api/workflow/requests
ワークフロー申請一覧を取得します。

**認証**: 必要
**権限**: USER以上

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `page` | number | × | ページ番号 |
| `limit` | number | × | 取得件数 |
| `status` | string | × | ステータスフィルタ（PENDING/APPROVED/REJECTED） |
| `workflowTypeId` | number | × | ワークフロータイプID |
| `priority` | string | × | 優先度（LOW/MEDIUM/HIGH/URGENT） |

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": 1,
        "workflowTypeId": 1,
        "title": "新規システム導入の稟議",
        "status": "PENDING",
        "priority": "HIGH",
        "requester": {
          "id": 1,
          "name": "管理者"
        },
        "createdAt": "2025-10-03T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### GET /api/workflow/pending-approvals
承認待ち一覧を取得します（自分が承認者のもの）。

**認証**: 必要
**権限**: USER以上

**クエリパラメータ**:
- `page`: ページ番号
- `limit`: 取得件数
- `search`: 検索キーワード
- `workflowTypeId`: ワークフロータイプID
- `priority`: 優先度

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": 1,
        "title": "新規システム導入の稟議",
        "status": "PENDING",
        "priority": "HIGH",
        "requester": {
          "id": 2,
          "name": "山田太郎"
        },
        "currentStep": 1,
        "totalSteps": 3,
        "daysWaiting": 2
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

---

### POST /api/workflow/requests/:id/approve
ワークフロー申請を承認します。

**認証**: 必要
**権限**: USER以上（承認権限必要）

**リクエスト**:
```json
{
  "comment": "承認します",
  "nextApproverId": 3
}
```

**レスポンス 200**:
```json
{
  "success": true,
  "message": "ワークフロー申請を承認しました",
  "data": {
    "requestId": 1,
    "status": "IN_PROGRESS",
    "currentStep": 2
  }
}
```

---

### POST /api/workflow/requests/:id/reject
ワークフロー申請を却下します。

**認証**: 必要
**権限**: USER以上（承認権限必要）

**リクエスト**:
```json
{
  "comment": "内容を再検討してください",
  "reason": "情報不足"
}
```

**レスポンス 200**:
```json
{
  "success": true,
  "message": "ワークフロー申請を却下しました",
  "data": {
    "requestId": 1,
    "status": "REJECTED"
  }
}
```

---

### GET /api/workflow/dashboard/statistics
ワークフローダッシュボード統計を取得します。

**認証**: 必要
**権限**: USER以上

**クエリパラメータ**:
- `dateFrom`: 開始日（YYYY-MM-DD）
- `dateTo`: 終了日（YYYY-MM-DD）

**レスポンス 200**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 100,
      "pending": 20,
      "approved": 70,
      "rejected": 10
    },
    "byType": [
      {
        "workflowTypeId": 1,
        "typeName": "稟議申請",
        "count": 50
      }
    ],
    "byPriority": {
      "URGENT": 5,
      "HIGH": 20,
      "MEDIUM": 50,
      "LOW": 25
    },
    "timeline": [
      {
        "date": "2025-10-01",
        "count": 10
      }
    ]
  }
}
```

---

## 通知API

### GET /api/notifications
通知一覧を取得します。

**認証**: 必要
**権限**: USER以上

**クエリパラメータ**:
- `page`: ページ番号
- `limit`: 取得件数
- `isRead`: 既読フィルタ（true/false）

**レスポンス 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "type": "WORKFLOW_APPROVAL",
      "title": "承認依頼が届いています",
      "message": "新規システム導入の稟議の承認をお願いします",
      "isRead": false,
      "createdAt": "2025-10-03T10:00:00.000Z",
      "metadata": {
        "workflowRequestId": 1
      }
    }
  ]
}
```

---

### PUT /api/notifications/:id/read
通知を既読にします。

**認証**: 必要
**権限**: USER以上

**レスポンス 200**:
```json
{
  "success": true,
  "message": "通知を既読にしました"
}
```

---

### POST /api/notifications/read-all
全通知を既読にします。

**認証**: 必要
**権限**: USER以上

**レスポンス 200**:
```json
{
  "success": true,
  "message": "全ての通知を既読にしました",
  "data": {
    "count": 10
  }
}
```

---

## システムAPI

### GET /health
ヘルスチェック（認証不要）。

**認証**: 不要

**レスポンス 200**:
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2025-10-03T10:00:00.000Z",
  "version": "1.0.0",
  "database": "connected",
  "uptime": 3600
}
```

---

### GET /api/workflow/health
ワークフローマイクロサービスヘルスチェック。

**認証**: 不要

**レスポンス 200**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-03T10:00:00.000Z",
  "service": "workflow-microservices",
  "version": "1.0.0",
  "performance": {
    "avgResponseTime": 50,
    "requestCount": 1000
  }
}
```

---

## WebSocket API

### 接続

WebSocketは Socket.io を使用し、JWT認証を行います。

**接続URL**:
```
ws://websys_backend_dev:8000
```

**認証**:
```javascript
const socket = io('http://websys_backend_dev:8000', {
  auth: {
    token: accessToken
  }
});
```

---

### イベント: connect
接続成功時に発火します。

**受信**:
```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

---

### イベント: log:new
新しいログが発生した時に通知されます。

**受信**:
```javascript
socket.on('log:new', (log) => {
  console.log('New log:', log);
  // {
  //   id: 1,
  //   level: 50,
  //   message: "エラーが発生しました",
  //   timestamp: "2025-10-03T10:00:00.000Z"
  // }
});
```

---

### イベント: workflow:update
ワークフロー申請の状態が更新された時に通知されます。

**受信**:
```javascript
socket.on('workflow:update', (data) => {
  console.log('Workflow updated:', data);
  // {
  //   requestId: 1,
  //   status: "APPROVED",
  //   updatedBy: 2
  // }
});
```

---

### イベント: notification:new
新しい通知が届いた時に通知されます。

**受信**:
```javascript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  // {
  //   id: 1,
  //   type: "WORKFLOW_APPROVAL",
  //   title: "承認依頼",
  //   message: "承認をお願いします"
  // }
});
```

---

### イベント: stats:update
統計情報がリアルタイム更新された時に通知されます。

**受信**:
```javascript
socket.on('stats:update', (stats) => {
  console.log('Stats updated:', stats);
  // {
  //   totalLogs: 1000,
  //   errorCount: 10,
  //   warnCount: 50
  // }
});
```

---

## データモデル

### User
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  companyId: number;
  departmentId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### WorkflowRequest
```typescript
interface WorkflowRequest {
  id: number;
  workflowTypeId: number;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  requesterId: number;
  companyId: number;
  departmentId: number | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Log
```typescript
interface Log {
  id: number;
  timestamp: Date;
  level: number; // 10: TRACE, 20: DEBUG, 30: INFO, 40: WARN, 50: ERROR, 60: FATAL
  category: 'AUTH' | 'API' | 'DB' | 'SEC' | 'SYS' | 'USER' | 'PERF' | 'ERR';
  source: 'frontend' | 'backend' | 'system';
  message: string;
  userId: number | null;
  companyId: number | null;
  metadata: Record<string, any>;
  stackTrace: string | null;
}
```

### PermissionTemplate
```typescript
interface PermissionTemplate {
  id: number;
  name: string;
  description: string;
  category: 'ADMIN' | 'GENERAL' | 'READONLY' | 'CUSTOM';
  isSystem: boolean;
  companyId: number;
  features: PermissionFeature[];
}

interface PermissionFeature {
  featureId: number;
  featureName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}
```

---

## SDKサンプル

### TypeScript/JavaScript

```typescript
import axios, { AxiosInstance } from 'axios';

class WebSysAPI {
  private client: AxiosInstance;
  private accessToken?: string;
  private refreshToken?: string;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // レスポンスインターセプター（トークン更新）
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshToken) {
          await this.refresh();
          error.config.headers.Authorization = `Bearer ${this.accessToken}`;
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  // ログイン
  async login(username: string, password: string) {
    const response = await this.client.post('/api/auth/login', {
      username,
      password
    });

    this.accessToken = response.data.data.accessToken;
    this.refreshToken = response.data.data.refreshToken;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

    return response.data;
  }

  // トークン更新
  async refresh() {
    const response = await this.client.post('/api/auth/refresh', {
      refreshToken: this.refreshToken
    });

    this.accessToken = response.data.data.accessToken;
    this.refreshToken = response.data.data.refreshToken;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

    return response.data;
  }

  // ユーザー一覧取得
  async getUsers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
  }) {
    const response = await this.client.get('/api/users', { params });
    return response.data;
  }

  // ワークフロー申請作成
  async createWorkflowRequest(data: {
    workflowTypeId: number;
    title: string;
    description: string;
    priority: string;
  }) {
    const response = await this.client.post('/api/workflow/requests', data);
    return response.data;
  }

  // ログ送信
  async sendLogs(logs: any[]) {
    const response = await this.client.post('/api/logs', { logs });
    return response.data;
  }
}

// 使用例
const api = new WebSysAPI('http://websys_backend_dev:8000');

// ログイン
await api.login('admin', 'password');

// ユーザー一覧取得
const users = await api.getUsers({ page: 1, pageSize: 20 });

// ワークフロー申請
const workflow = await api.createWorkflowRequest({
  workflowTypeId: 1,
  title: '新規システム導入',
  description: '説明',
  priority: 'HIGH'
});
```

---

### curl コマンド例

```bash
# ログイン
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# トークン取得後
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# ユーザー一覧取得
curl -X GET "http://localhost:8000/api/users?page=1&pageSize=20" \
  -H "Authorization: Bearer $TOKEN"

# ログ検索
curl -X GET "http://localhost:8000/api/logs/search?level=50&page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"

# ワークフロー申請
curl -X POST http://localhost:8000/api/workflow/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "workflowTypeId": 1,
    "title": "新規システム導入の稟議",
    "description": "説明",
    "priority": "HIGH"
  }'

# 承認待ち一覧
curl -X GET "http://localhost:8000/api/workflow/pending-approvals?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# ログ送信（認証不要）
curl -X POST http://localhost:8000/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "timestamp": "2025-10-03T10:00:00.000Z",
        "level": 30,
        "category": "USER",
        "source": "frontend",
        "message": "ユーザーがログインしました"
      }
    ]
  }'
```

---

## レート制限

| エンドポイント | 制限 | ウィンドウ |
|-------------|------|---------|
| **ログイン** | 100回 | 15分 |
| **一般API** | 1000回 | 15分 |
| **管理者API** | 2000回 | 15分 |

制限超過時: `429 Too Many Requests`

```json
{
  "success": false,
  "message": "Too many requests",
  "retryAfter": 900
}
```

---

## 変更履歴

### v2.0.0 (2025-10-03)
- JWT双代トークン認証実装
- ログ監視API完全実装（8エンドポイント）
- ワークフローAPI完全実装（9マイクロサービス）
- 権限テンプレートAPI実装
- WebSocket リアルタイム通信実装
- 3層分離アーキテクチャ対応

### v1.0.0 (2024-01-19)
- 初期リリース
- ユーザー管理API実装
- JWT認証実装
- ヘルスチェックAPI実装

---

**🔄 このドキュメントは実装済みAPIの完全リファレンスです**
**全てのエンドポイントは実装・テスト済みです**
**不明点は [GitHub Issues](https://github.com/jun-kg/WebSys) でご質問ください**
