# 権限マトリクスAPI仕様書

## 概要

役職ベースの権限マトリクス管理APIです。全役職の権限一覧を取得し、フロントエンドで視覚的に表示します。

## エンドポイント一覧

| メソッド | エンドポイント | 説明 | 認証 | 権限 |
|---------|---------------|------|------|------|
| GET | /api/permissions/matrix | 権限マトリクス取得 | 必要 | ADMIN |
| GET | /api/permissions/my-permissions | 自分の権限一覧取得 | 必要 | 全ユーザー |
| GET | /api/permissions/check | 権限チェック | 必要 | 全ユーザー |

---

## 1. 権限マトリクス取得

全役職の権限一覧を取得します。管理者のみアクセス可能です。

### リクエスト

```http
GET /api/permissions/matrix
Authorization: Bearer {token}
```

### レスポンス

```json
{
  "success": true,
  "data": {
    "matrix": [
      {
        "role": "ADMIN",
        "permissions": [
          {
            "action": "USER_CREATE",
            "scope": "GLOBAL",
            "description": "ユーザー作成（全社）"
          },
          {
            "action": "USER_EDIT",
            "scope": "GLOBAL",
            "description": "ユーザー編集（全社）"
          },
          {
            "action": "USER_DELETE",
            "scope": "GLOBAL",
            "description": "ユーザー削除（全社）"
          }
        ]
      },
      {
        "role": "MANAGER",
        "permissions": [
          {
            "action": "USER_VIEW",
            "scope": "DEPARTMENT",
            "description": "ユーザー閲覧（部署）"
          },
          {
            "action": "USER_EDIT",
            "scope": "DEPARTMENT",
            "description": "ユーザー編集（部署）"
          }
        ]
      },
      {
        "role": "USER",
        "permissions": [
          {
            "action": "USER_VIEW",
            "scope": "SELF",
            "description": "ユーザー閲覧（自分のみ）"
          },
          {
            "action": "USER_EDIT",
            "scope": "SELF",
            "description": "ユーザー編集（自分のみ）"
          }
        ]
      },
      {
        "role": "GUEST",
        "permissions": [
          {
            "action": "USER_VIEW",
            "scope": "SELF",
            "description": "ユーザー閲覧（自分のみ）"
          }
        ]
      }
    ],
    "totalRoles": 4,
    "totalPermissions": 36
  }
}
```

### エラーレスポンス

#### 403 Forbidden（権限不足）

```json
{
  "success": false,
  "error": {
    "message": "管理者権限が必要です"
  }
}
```

---

## 2. 自分の権限一覧取得

ログイン中のユーザーの権限一覧を取得します。

### リクエスト

```http
GET /api/permissions/my-permissions
Authorization: Bearer {token}
```

### レスポンス

```json
{
  "success": true,
  "data": {
    "userId": 1,
    "username": "admin",
    "role": "ADMIN",
    "permissions": [
      {
        "action": "USER_CREATE",
        "scope": "GLOBAL",
        "description": "ユーザー作成（全社）"
      },
      {
        "action": "USER_EDIT",
        "scope": "GLOBAL",
        "description": "ユーザー編集（全社）"
      },
      {
        "action": "USER_DELETE",
        "scope": "GLOBAL",
        "description": "ユーザー削除（全社）"
      },
      {
        "action": "USER_VIEW",
        "scope": "GLOBAL",
        "description": "ユーザー閲覧（全社）"
      },
      {
        "action": "DEPT_CREATE",
        "scope": "GLOBAL",
        "description": "部署作成（全社）"
      },
      {
        "action": "DEPT_EDIT",
        "scope": "GLOBAL",
        "description": "部署編集（全社）"
      },
      {
        "action": "DEPT_DELETE",
        "scope": "GLOBAL",
        "description": "部署削除（全社）"
      },
      {
        "action": "DEPT_VIEW",
        "scope": "GLOBAL",
        "description": "部署閲覧（全社）"
      },
      {
        "action": "COMPANY_EDIT",
        "scope": "GLOBAL",
        "description": "会社情報編集"
      }
    ],
    "totalPermissions": 18
  }
}
```

---

## 3. 権限チェック

特定のアクションに対する権限を事前チェックします。

### リクエスト

```http
GET /api/permissions/check?action=USER_EDIT&targetUserId=5
Authorization: Bearer {token}
```

### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| action | string | ✅ | アクション名（例: USER_EDIT, DEPT_VIEW） |
| targetUserId | number | ❌ | 対象ユーザーID（SELF/DEPARTMENT権限で必要） |
| targetDepartmentId | number | ❌ | 対象部署ID（DEPARTMENT権限で必要） |

### レスポンス（許可）

```json
{
  "success": true,
  "data": {
    "allowed": true,
    "scope": "DEPARTMENT",
    "message": "権限があります"
  }
}
```

### レスポンス（拒否）

```json
{
  "success": true,
  "data": {
    "allowed": false,
    "scope": "DEPARTMENT",
    "reason": "DEPARTMENT scope: no common department found",
    "message": "権限がありません"
  }
}
```

---

## データモデル

### PermissionMatrix

```typescript
interface PermissionMatrix {
  role: UserRole;           // 役職（ADMIN, MANAGER, USER, GUEST）
  permissions: Permission[];
}
```

### Permission

```typescript
interface Permission {
  action: string;           // アクション名（例: USER_EDIT）
  scope: PermissionScope;   // 権限スコープ（GLOBAL, DEPARTMENT, SELF）
  description: string;      // 説明
}
```

### PermissionScope

```typescript
enum PermissionScope {
  GLOBAL = 'GLOBAL',           // 全社アクセス可能
  DEPARTMENT = 'DEPARTMENT',   // 所属部署のみアクセス可能
  SELF = 'SELF'                // 自分のデータのみアクセス可能
}
```

---

## アクション一覧

### ユーザー管理

| アクション | 説明 | ADMIN | MANAGER | USER | GUEST |
|----------|------|-------|---------|------|-------|
| USER_CREATE | ユーザー作成 | GLOBAL | ❌ | ❌ | ❌ |
| USER_EDIT | ユーザー編集 | GLOBAL | DEPARTMENT | SELF | ❌ |
| USER_DELETE | ユーザー削除 | GLOBAL | ❌ | ❌ | ❌ |
| USER_VIEW | ユーザー閲覧 | GLOBAL | DEPARTMENT | SELF | SELF |
| USER_PASSWORD_RESET | パスワードリセット | GLOBAL | DEPARTMENT | SELF | ❌ |

### 部署管理

| アクション | 説明 | ADMIN | MANAGER | USER | GUEST |
|----------|------|-------|---------|------|-------|
| DEPT_CREATE | 部署作成 | GLOBAL | ❌ | ❌ | ❌ |
| DEPT_EDIT | 部署編集 | GLOBAL | DEPARTMENT | ❌ | ❌ |
| DEPT_DELETE | 部署削除 | GLOBAL | ❌ | ❌ | ❌ |
| DEPT_VIEW | 部署閲覧 | GLOBAL | DEPARTMENT | DEPARTMENT | ❌ |
| DEPT_MEMBER_ASSIGN | 部署メンバー割り当て | GLOBAL | DEPARTMENT | ❌ | ❌ |

### 会社管理

| アクション | 説明 | ADMIN | MANAGER | USER | GUEST |
|----------|------|-------|---------|------|-------|
| COMPANY_EDIT | 会社情報編集 | GLOBAL | ❌ | ❌ | ❌ |
| COMPANY_VIEW | 会社情報閲覧 | GLOBAL | GLOBAL | GLOBAL | ❌ |

### ログ監視

| アクション | 説明 | ADMIN | MANAGER | USER | GUEST |
|----------|------|-------|---------|------|-------|
| LOG_VIEW | ログ閲覧 | GLOBAL | DEPARTMENT | SELF | ❌ |
| LOG_EXPORT | ログエクスポート | GLOBAL | ❌ | ❌ | ❌ |
| LOG_DELETE | ログ削除 | GLOBAL | ❌ | ❌ | ❌ |

### 権限管理

| アクション | 説明 | ADMIN | MANAGER | USER | GUEST |
|----------|------|-------|---------|------|-------|
| PERMISSION_VIEW | 権限閲覧 | GLOBAL | DEPARTMENT | SELF | ❌ |
| PERMISSION_EDIT | 権限編集 | GLOBAL | ❌ | ❌ | ❌ |

---

## パフォーマンス要件

| API | 目標レスポンス | 最大許容時間 | スループット |
|-----|--------------|-------------|-------------|
| GET /matrix | 50ms以内 | 200ms | 100 req/sec |
| GET /my-permissions | 20ms以内 | 100ms | 500 req/sec |
| GET /check | 10ms以内 | 50ms | 1,000 req/sec |

### 最適化戦略

1. **キャッシュ活用**
   - RolePermissionService内で5分間のメモリキャッシュ
   - セッション中の権限情報保持

2. **N+1クエリ対策**
   - Prisma `include`による一括取得
   - 部署情報のキャッシュ化

3. **インデックス活用**
   - `role_permissions(role, action)` 複合インデックス
   - `role_permissions(role)` 単一インデックス

---

## セキュリティ

### 認証・認可

- 全エンドポイントでJWT認証必須
- `/matrix`エンドポイントは管理者のみアクセス可能
- `/my-permissions`は全ユーザーアクセス可能（自分の情報のみ）
- `/check`は全ユーザーアクセス可能（権限スコープで制限）

### 監査ログ

以下の操作は監査ログに記録されます：

- 権限マトリクス閲覧（管理者）
- 権限チェック失敗（警告レベル）
- 不正アクセス試行（エラーレベル）

---

## 使用例（フロントエンド）

### 権限マトリクス取得

```typescript
import { apiClient } from '@core/api/client'

interface PermissionMatrix {
  role: string
  permissions: Array<{
    action: string
    scope: string
    description: string
  }>
}

async function getPermissionMatrix(): Promise<PermissionMatrix[]> {
  const response = await apiClient.get<{
    success: boolean
    data: {
      matrix: PermissionMatrix[]
      totalRoles: number
      totalPermissions: number
    }
  }>('/api/permissions/matrix')

  if (response.data.success) {
    return response.data.data.matrix
  }

  throw new Error('権限マトリクス取得失敗')
}
```

### 自分の権限一覧取得

```typescript
async function getMyPermissions() {
  const response = await apiClient.get('/api/permissions/my-permissions')
  return response.data.data.permissions
}
```

### 権限チェック

```typescript
async function checkPermission(action: string, targetUserId?: number) {
  const params = new URLSearchParams({ action })
  if (targetUserId) {
    params.append('targetUserId', targetUserId.toString())
  }

  const response = await apiClient.get(`/api/permissions/check?${params}`)
  return response.data.data.allowed
}
```

---

## テストケース

### 1. 権限マトリクス取得

```typescript
describe('GET /api/permissions/matrix', () => {
  it('管理者は権限マトリクスを取得できる', async () => {
    const response = await request(app)
      .get('/api/permissions/matrix')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.matrix).toHaveLength(4) // ADMIN, MANAGER, USER, GUEST
    expect(response.body.data.totalPermissions).toBe(36)
  })

  it('一般ユーザーは権限マトリクスを取得できない（403）', async () => {
    const response = await request(app)
      .get('/api/permissions/matrix')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403)

    expect(response.body.success).toBe(false)
  })
})
```

### 2. 自分の権限一覧取得

```typescript
describe('GET /api/permissions/my-permissions', () => {
  it('ログイン中のユーザーは自分の権限を取得できる', async () => {
    const response = await request(app)
      .get('/api/permissions/my-permissions')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.role).toBe('USER')
    expect(response.body.data.permissions).toBeDefined()
  })
})
```

### 3. 権限チェック

```typescript
describe('GET /api/permissions/check', () => {
  it('GLOBAL権限: 管理者は他のユーザーを編集できる', async () => {
    const response = await request(app)
      .get('/api/permissions/check?action=USER_EDIT&targetUserId=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(response.body.data.allowed).toBe(true)
    expect(response.body.data.scope).toBe('GLOBAL')
  })

  it('DEPARTMENT権限: マネージャーは同じ部署のユーザーのみ編集できる', async () => {
    const response = await request(app)
      .get('/api/permissions/check?action=USER_EDIT&targetUserId=3')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)

    expect(response.body.data.allowed).toBe(true)
    expect(response.body.data.scope).toBe('DEPARTMENT')
  })

  it('SELF権限: 一般ユーザーは自分のデータのみ編集できる', async () => {
    const response = await request(app)
      .get('/api/permissions/check?action=USER_EDIT&targetUserId=999')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)

    expect(response.body.data.allowed).toBe(false)
    expect(response.body.data.reason).toContain('SELF scope')
  })
})
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-05 | 1.0.0 | 初版作成 |
