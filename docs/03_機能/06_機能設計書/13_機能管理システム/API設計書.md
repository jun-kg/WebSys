# 機能管理システム API設計書

## 1. API概要

### 1.1 基本仕様
- **ベースURL**: `/api/v1`
- **認証方式**: JWT Bearer Token
- **レスポンス形式**: JSON
- **文字コード**: UTF-8
- **HTTPステータスコード**: RESTful規約に準拠

### 1.2 共通ヘッダー
| ヘッダー名 | 必須 | 説明 |
|-----------|------|------|
| Authorization | ○ | Bearer {JWT_TOKEN} |
| Content-Type | ○ | application/json |
| X-Request-ID | - | リクエストID（トレース用） |

### 1.3 共通レスポンス形式

**成功時:**
```json
{
  "success": true,
  "data": {
    // レスポンスデータ
  },
  "meta": {
    "timestamp": "2024-01-20T10:00:00Z",
    "requestId": "req_123456"
  }
}
```

**エラー時:**
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "この操作を実行する権限がありません",
    "details": {
      "requiredPermission": "USER_MGMT.CREATE"
    }
  },
  "meta": {
    "timestamp": "2024-01-20T10:00:00Z",
    "requestId": "req_123456"
  }
}
```

## 2. 会社管理API

### 2.1 会社一覧取得
**GET** `/api/v1/companies`

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| page | integer | - | ページ番号（デフォルト: 1） |
| limit | integer | - | 1ページの件数（デフォルト: 20） |
| search | string | - | 検索キーワード |
| isActive | boolean | - | 有効フラグフィルタ |

#### レスポンス
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": 1,
        "code": "COMP001",
        "name": "株式会社サンプル",
        "nameKana": "カブシキガイシャサンプル",
        "industry": "IT",
        "establishedDate": "2000-04-01",
        "employeeCount": 150,
        "address": "東京都千代田区...",
        "phone": "03-1234-5678",
        "email": "info@sample.co.jp",
        "contractPlan": "ENTERPRISE",
        "maxUsers": 500,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 2.2 会社詳細取得
**GET** `/api/v1/companies/{companyId}`

#### パスパラメータ
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| companyId | integer | 会社ID |

#### レスポンス
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "COMP001",
    "name": "株式会社サンプル",
    "nameKana": "カブシキガイシャサンプル",
    "industry": "IT",
    "establishedDate": "2000-04-01",
    "employeeCount": 150,
    "address": "東京都千代田区...",
    "phone": "03-1234-5678",
    "email": "info@sample.co.jp",
    "contractPlan": "ENTERPRISE",
    "maxUsers": 500,
    "currentUsers": 120,
    "departments": 15,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "createdBy": {
      "id": 1,
      "name": "管理者"
    },
    "updatedBy": {
      "id": 1,
      "name": "管理者"
    }
  }
}
```

### 2.3 会社登録
**POST** `/api/v1/companies`

#### リクエストボディ
```json
{
  "code": "COMP002",
  "name": "新規会社",
  "nameKana": "シンキガイシャ",
  "industry": "製造業",
  "establishedDate": "2020-01-01",
  "employeeCount": 50,
  "address": "大阪府大阪市...",
  "phone": "06-9876-5432",
  "email": "info@newcompany.co.jp",
  "contractPlan": "STANDARD",
  "maxUsers": 100
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "id": 2,
    "code": "COMP002",
    "name": "新規会社",
    // ... 登録したデータ
  }
}
```

### 2.4 会社更新
**PUT** `/api/v1/companies/{companyId}`

#### リクエストボディ
```json
{
  "name": "更新後の会社名",
  "employeeCount": 60,
  "contractPlan": "ENTERPRISE"
}
```

### 2.5 会社削除（論理削除）
**DELETE** `/api/v1/companies/{companyId}`

## 3. 部署管理API

### 3.1 部署ツリー取得
**GET** `/api/v1/departments/tree`

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| companyId | integer | ○ | 会社ID |
| includeInactive | boolean | - | 無効部署を含む |

#### レスポンス
```json
{
  "success": true,
  "data": {
    "tree": [
      {
        "id": 1,
        "code": "HQ",
        "name": "本社",
        "nameKana": "ホンシャ",
        "level": 1,
        "userCount": 10,
        "isActive": true,
        "children": [
          {
            "id": 2,
            "code": "SALES",
            "name": "営業部",
            "nameKana": "エイギョウブ",
            "level": 2,
            "userCount": 25,
            "isActive": true,
            "children": [
              {
                "id": 3,
                "code": "SALES_1",
                "name": "営業1課",
                "nameKana": "エイギョウ1カ",
                "level": 3,
                "userCount": 12,
                "isActive": true,
                "children": []
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### 3.2 部署一覧取得（フラット）
**GET** `/api/v1/departments`

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| companyId | integer | ○ | 会社ID |
| parentId | integer | - | 親部署ID |
| level | integer | - | 階層レベル |
| search | string | - | 検索キーワード |

### 3.3 部署詳細取得
**GET** `/api/v1/departments/{departmentId}`

#### レスポンス
```json
{
  "success": true,
  "data": {
    "id": 2,
    "companyId": 1,
    "code": "SALES",
    "name": "営業部",
    "nameKana": "エイギョウブ",
    "parentId": 1,
    "parent": {
      "id": 1,
      "name": "本社"
    },
    "level": 2,
    "path": "/1/2",
    "displayOrder": 1,
    "isActive": true,
    "users": [
      {
        "id": 10,
        "name": "山田太郎",
        "email": "yamada@example.com",
        "role": "MANAGER",
        "isPrimary": true
      }
    ],
    "childDepartments": 3,
    "totalUsers": 25,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 3.4 部署登録
**POST** `/api/v1/departments`

#### リクエストボディ
```json
{
  "companyId": 1,
  "code": "IT",
  "name": "情報システム部",
  "nameKana": "ジョウホウシステムブ",
  "parentId": 1,
  "displayOrder": 2
}
```

### 3.5 部署更新
**PUT** `/api/v1/departments/{departmentId}`

### 3.6 部署削除（論理削除）
**DELETE** `/api/v1/departments/{departmentId}`

### 3.7 部署移動（階層変更）
**POST** `/api/v1/departments/{departmentId}/move`

#### リクエストボディ
```json
{
  "newParentId": 5,
  "displayOrder": 3
}
```

## 4. ユーザー所属管理API

### 4.1 ユーザー所属一覧取得
**GET** `/api/v1/users/{userId}/departments`

#### レスポンス
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": 1,
        "departmentId": 2,
        "department": {
          "id": 2,
          "name": "営業部",
          "path": "/1/2"
        },
        "isPrimary": true,
        "role": "MANAGER",
        "assignedDate": "2023-04-01",
        "expiredDate": null
      },
      {
        "id": 2,
        "departmentId": 5,
        "department": {
          "id": 5,
          "name": "プロジェクトチーム",
          "path": "/1/5"
        },
        "isPrimary": false,
        "role": "MEMBER",
        "assignedDate": "2024-01-01",
        "expiredDate": "2024-12-31"
      }
    ]
  }
}
```

### 4.2 ユーザー所属追加
**POST** `/api/v1/users/{userId}/departments`

#### リクエストボディ
```json
{
  "departmentId": 3,
  "isPrimary": false,
  "role": "MEMBER",
  "assignedDate": "2024-02-01",
  "expiredDate": null
}
```

### 4.3 ユーザー所属更新
**PUT** `/api/v1/user-departments/{userDepartmentId}`

### 4.4 ユーザー所属削除
**DELETE** `/api/v1/user-departments/{userDepartmentId}`

## 5. 機能管理API

### 5.1 機能一覧取得
**GET** `/api/v1/features`

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| category | string | - | カテゴリフィルタ |
| parentId | integer | - | 親機能ID |
| isMenuItem | boolean | - | メニュー表示フラグ |
| isActive | boolean | - | 有効フラグ |

#### レスポンス
```json
{
  "success": true,
  "data": {
    "features": [
      {
        "id": 1,
        "code": "USER_MGMT",
        "name": "ユーザー管理",
        "description": "ユーザーの登録・編集・削除",
        "category": "SYSTEM",
        "parentId": null,
        "path": "/1",
        "urlPattern": "/users/*",
        "apiPattern": "/api/v1/users/*",
        "icon": "el-icon-user",
        "displayOrder": 10,
        "isMenuItem": true,
        "isActive": true,
        "children": [
          {
            "id": 11,
            "code": "USER_LIST",
            "name": "ユーザー一覧",
            "parentId": 1,
            "path": "/1/11"
          }
        ]
      }
    ]
  }
}
```

### 5.2 機能カテゴリ一覧取得
**GET** `/api/v1/features/categories`

#### レスポンス
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "code": "SYSTEM",
        "name": "システム管理",
        "description": "システム全体の管理機能",
        "featureCount": 5
      },
      {
        "code": "USER_MGMT",
        "name": "ユーザー管理",
        "description": "ユーザー関連の管理機能",
        "featureCount": 8
      }
    ]
  }
}
```

### 5.3 機能登録
**POST** `/api/v1/features`

#### リクエストボディ
```json
{
  "code": "NEW_FEATURE",
  "name": "新機能",
  "description": "新しい機能の説明",
  "category": "CUSTOM",
  "parentId": null,
  "urlPattern": "/new-feature/*",
  "apiPattern": "/api/v1/new-feature/*",
  "icon": "el-icon-star",
  "displayOrder": 100,
  "isMenuItem": true
}
```

### 5.4 機能更新
**PUT** `/api/v1/features/{featureId}`

### 5.5 機能削除（論理削除）
**DELETE** `/api/v1/features/{featureId}`

## 6. 権限管理API

### 6.1 部署権限取得
**GET** `/api/v1/permissions/department/{departmentId}`

#### レスポンス
```json
{
  "success": true,
  "data": {
    "departmentId": 2,
    "departmentName": "営業部",
    "permissions": [
      {
        "featureId": 1,
        "featureCode": "USER_MGMT",
        "featureName": "ユーザー管理",
        "category": "SYSTEM",
        "permissions": {
          "canView": true,
          "canCreate": false,
          "canEdit": false,
          "canDelete": false,
          "canApprove": false,
          "canExport": true
        },
        "inheritFromParent": true
      }
    ]
  }
}
```

### 6.2 部署権限更新
**POST** `/api/v1/permissions/department/{departmentId}`

#### リクエストボディ
```json
{
  "permissions": [
    {
      "featureId": 1,
      "canView": true,
      "canCreate": true,
      "canEdit": true,
      "canDelete": false,
      "canApprove": false,
      "canExport": true,
      "inheritFromParent": false
    }
  ]
}
```

### 6.3 ユーザー有効権限取得
**GET** `/api/v1/permissions/user/{userId}`

#### レスポンス
```json
{
  "success": true,
  "data": {
    "userId": 10,
    "userName": "山田太郎",
    "effectivePermissions": [
      {
        "featureCode": "USER_MGMT",
        "featureName": "ユーザー管理",
        "permissions": {
          "canView": true,
          "canCreate": true,
          "canEdit": true,
          "canDelete": false,
          "canApprove": true,
          "canExport": true
        },
        "source": "PRIMARY_DEPARTMENT"
      }
    ],
    "departments": [
      {
        "id": 2,
        "name": "営業部",
        "isPrimary": true,
        "role": "MANAGER"
      }
    ]
  }
}
```

### 6.4 現在のユーザー権限取得
**GET** `/api/v1/permissions/my`

### 6.5 権限チェック
**POST** `/api/v1/permissions/check`

#### リクエストボディ
```json
{
  "featureCode": "USER_MGMT",
  "action": "CREATE"
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "hasPermission": true,
    "feature": "USER_MGMT",
    "action": "CREATE",
    "source": "PRIMARY_DEPARTMENT"
  }
}
```

### 6.6 権限一括チェック
**POST** `/api/v1/permissions/check-bulk`

#### リクエストボディ
```json
{
  "checks": [
    {
      "featureCode": "USER_MGMT",
      "action": "VIEW"
    },
    {
      "featureCode": "LOG_MGMT",
      "action": "EXPORT"
    }
  ]
}
```

## 7. 権限テンプレートAPI

### 7.1 テンプレート一覧取得
**GET** `/api/permissions/templates`

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| companyId | integer | ○ | 会社ID |
| category | string | - | カテゴリ（CUSTOM/ADMIN/GENERAL/READONLY） |
| isActive | boolean | - | アクティブフラグ |

#### レスポンス
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "companyId": 1,
      "name": "営業部標準権限",
      "description": "営業部向けの標準権限設定",
      "category": "CUSTOM",
      "isPreset": false,
      "isActive": true,
      "displayOrder": 1,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "createdBy": {
        "id": 1,
        "name": "管理者"
      }
    }
  ]
}
```

### 7.2 テンプレート詳細取得
**GET** `/api/permissions/templates/{templateId}`

#### レスポンス
```json
{
  "success": true,
  "data": {
    "id": 1,
    "companyId": 1,
    "name": "営業部標準権限",
    "description": "営業部向けの標準権限設定",
    "category": "CUSTOM",
    "isPreset": false,
    "isActive": true,
    "displayOrder": 1,
    "permissions": [
      {
        "featureId": 1,
        "featureCode": "USER_MGMT",
        "featureName": "ユーザー管理",
        "canView": true,
        "canCreate": false,
        "canEdit": false,
        "canDelete": false,
        "canApprove": false,
        "canExport": true
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "createdBy": {
      "id": 1,
      "name": "管理者"
    },
    "updatedBy": {
      "id": 1,
      "name": "管理者"
    }
  }
}
```

### 7.3 テンプレート作成
**POST** `/api/permissions/templates`

#### リクエストボディ
```json
{
  "companyId": 1,
  "name": "カスタムテンプレート",
  "description": "特定用途のテンプレート",
  "category": "CUSTOM",
  "displayOrder": 1,
  "permissions": [
    {
      "featureId": 1,
      "canView": true,
      "canCreate": true,
      "canEdit": true,
      "canDelete": false,
      "canApprove": false,
      "canExport": true
    }
  ]
}
```

### 7.4 テンプレート更新
**PUT** `/api/permissions/templates/{templateId}`

#### リクエストボディ
```json
{
  "name": "更新されたテンプレート",
  "description": "更新された説明",
  "category": "CUSTOM",
  "isActive": true,
  "displayOrder": 2,
  "permissions": [
    {
      "featureId": 1,
      "canView": true,
      "canCreate": false,
      "canEdit": true,
      "canDelete": false,
      "canApprove": false,
      "canExport": true
    }
  ]
}
```

### 7.5 テンプレート削除
**DELETE** `/api/permissions/templates/{templateId}`

#### 説明
論理削除を実行します。システムプリセットテンプレートは削除できません。

#### レスポンス
```json
{
  "success": true,
  "data": {
    "message": "テンプレートが削除されました",
    "deletedAt": "2024-01-20T10:00:00Z"
  }
}
```

### 7.6 テンプレート適用
**POST** `/api/permissions/templates/{templateId}/apply`

#### リクエストボディ
```json
{
  "departmentIds": [2, 3, 5],
  "overwrite": true
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "appliedTo": [
      {
        "departmentId": 2,
        "departmentName": "営業部",
        "status": "SUCCESS"
      },
      {
        "departmentId": 3,
        "departmentName": "企画部",
        "status": "SUCCESS"
      },
      {
        "departmentId": 5,
        "departmentName": "システム部",
        "status": "SUCCESS"
      }
    ],
    "appliedAt": "2024-01-20T10:00:00Z"
  }
}
```

### 7.7 テンプレート複製
**POST** `/api/permissions/templates/{templateId}/duplicate`

#### リクエストボディ
```json
{
  "name": "複製されたテンプレート",
  "description": "元のテンプレートから複製"
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "id": 2,
    "companyId": 1,
    "name": "複製されたテンプレート",
    "description": "元のテンプレートから複製",
    "category": "CUSTOM",
    "isPreset": false,
    "isActive": true,
    "displayOrder": 100,
    "permissions": [
      {
        "featureId": 1,
        "featureCode": "USER_MGMT",
        "featureName": "ユーザー管理",
        "canView": true,
        "canCreate": false,
        "canEdit": false,
        "canDelete": false,
        "canApprove": false,
        "canExport": true
      }
    ],
    "createdAt": "2024-01-20T10:00:00Z",
    "createdBy": {
      "id": 1,
      "name": "管理者"
    }
  }
}
```

## 8. 監査ログAPI

### 8.1 権限変更ログ検索
**GET** `/api/v1/audit/permission-logs`

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| userId | integer | - | 実行ユーザーID |
| action | string | - | アクション（GRANT/REVOKE/MODIFY） |
| targetType | string | - | 対象タイプ |
| targetId | integer | - | 対象ID |
| dateFrom | date | - | 開始日 |
| dateTo | date | - | 終了日 |
| page | integer | - | ページ番号 |
| limit | integer | - | 1ページの件数 |

#### レスポンス
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 100,
        "userId": 1,
        "userName": "管理者",
        "action": "MODIFY",
        "targetType": "DEPARTMENT",
        "targetId": 2,
        "targetName": "営業部",
        "featureId": 1,
        "featureName": "ユーザー管理",
        "oldPermissions": {
          "canView": true,
          "canCreate": false,
          "canEdit": false,
          "canDelete": false,
          "canApprove": false,
          "canExport": false
        },
        "newPermissions": {
          "canView": true,
          "canCreate": true,
          "canEdit": true,
          "canDelete": false,
          "canApprove": false,
          "canExport": true
        },
        "reason": "営業部の権限拡張",
        "ipAddress": "192.168.1.100",
        "createdAt": "2024-01-20T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25
    }
  }
}
```

### 8.2 権限変更統計取得
**GET** `/api/v1/audit/permission-statistics`

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| period | string | - | 期間（daily/weekly/monthly） |
| dateFrom | date | - | 開始日 |
| dateTo | date | - | 終了日 |

#### レスポンス
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalChanges": 150,
      "byAction": {
        "GRANT": 50,
        "REVOKE": 30,
        "MODIFY": 70
      },
      "byTargetType": {
        "DEPARTMENT": 100,
        "USER": 50
      },
      "byDate": [
        {
          "date": "2024-01-20",
          "count": 25
        }
      ],
      "topUsers": [
        {
          "userId": 1,
          "userName": "管理者",
          "changeCount": 80
        }
      ]
    }
  }
}
```

### 8.3 監査ログエクスポート
**GET** `/api/v1/audit/export`

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| format | string | ○ | エクスポート形式（csv/json） |
| dateFrom | date | ○ | 開始日 |
| dateTo | date | ○ | 終了日 |
| includeDetails | boolean | - | 詳細情報を含む |

## 9. レポートAPI

### 9.1 権限マトリクスレポート取得
**GET** `/api/v1/reports/permission-matrix`

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| companyId | integer | ○ | 会社ID |
| departmentIds | array | - | 部署IDリスト |

#### レスポンス
```json
{
  "success": true,
  "data": {
    "matrix": [
      {
        "departmentId": 2,
        "departmentName": "営業部",
        "features": [
          {
            "featureCode": "USER_MGMT",
            "featureName": "ユーザー管理",
            "permissions": "V,E,X"
          }
        ]
      }
    ],
    "legend": {
      "V": "閲覧",
      "C": "作成",
      "E": "編集",
      "D": "削除",
      "A": "承認",
      "X": "出力"
    }
  }
}
```

### 9.2 未使用権限レポート取得
**GET** `/api/v1/reports/unused-permissions`

#### レスポンス
```json
{
  "success": true,
  "data": {
    "unusedPermissions": [
      {
        "departmentId": 5,
        "departmentName": "企画部",
        "featureId": 10,
        "featureName": "高度な分析",
        "lastUsed": null,
        "daysUnused": 365,
        "recommendation": "REVOKE"
      }
    ],
    "summary": {
      "total": 25,
      "neverUsed": 10,
      "over90Days": 15
    }
  }
}
```

### 9.3 権限棚卸レポート生成
**POST** `/api/v1/reports/permission-inventory`

#### リクエストボディ
```json
{
  "companyId": 1,
  "includeInactive": false,
  "format": "EXCEL"
}
```

## 10. エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| AUTH_REQUIRED | 401 | 認証が必要です |
| INVALID_TOKEN | 401 | 無効なトークンです |
| TOKEN_EXPIRED | 401 | トークンの有効期限が切れています |
| PERMISSION_DENIED | 403 | 権限がありません |
| NOT_FOUND | 404 | リソースが見つかりません |
| VALIDATION_ERROR | 400 | 入力値が不正です |
| DUPLICATE_ENTRY | 409 | 重複するデータが存在します |
| REFERENCE_ERROR | 400 | 参照整合性エラー |
| QUOTA_EXCEEDED | 403 | 利用上限を超えています |
| RATE_LIMITED | 429 | レート制限に達しました |
| INTERNAL_ERROR | 500 | サーバー内部エラー |

## 11. レート制限

| エンドポイント | 制限 | 単位 |
|--------------|------|------|
| 認証API | 10回 | 1分 |
| 読み取りAPI | 100回 | 1分 |
| 書き込みAPI | 50回 | 1分 |
| エクスポートAPI | 5回 | 1時間 |
| レポートAPI | 10回 | 1時間 |

## 12. API実装サンプル

### 12.1 権限チェックミドルウェア
```typescript
export const requirePermission = (
  featureCode: string,
  action: 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'APPROVE' | 'EXPORT'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const hasPermission = await permissionService.checkPermission(
        userId,
        featureCode,
        action
      );

      if (!hasPermission) {
        // 監査ログに記録
        await auditService.logAccessDenied(userId, featureCode, action);

        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `権限がありません: ${featureCode}.${action}`,
            details: {
              requiredPermission: `${featureCode}.${action}`
            }
          }
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// 使用例
router.get(
  '/api/v1/users',
  authMiddleware,
  requirePermission('USER_MGMT', 'VIEW'),
  userController.list
);
```

### 12.2 権限情報のキャッシング
```typescript
class PermissionCache {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5分間キャッシュ
  }

  async getUserPermissions(userId: number): Promise<PermissionSet> {
    const cacheKey = `permissions:${userId}`;

    // キャッシュから取得
    let permissions = this.cache.get<PermissionSet>(cacheKey);

    if (!permissions) {
      // DBから取得
      permissions = await this.loadPermissionsFromDB(userId);
      this.cache.set(cacheKey, permissions);
    }

    return permissions;
  }

  invalidateUser(userId: number): void {
    this.cache.del(`permissions:${userId}`);
  }

  invalidateDepartment(departmentId: number): void {
    // 部署に所属する全ユーザーのキャッシュをクリア
    const pattern = 'permissions:*';
    const keys = this.cache.keys();
    keys.forEach(key => {
      if (key.startsWith('permissions:')) {
        this.cache.del(key);
      }
    });
  }
}
```

### 12.3 バッチ権限チェック
```typescript
export const checkBulkPermissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { checks } = req.body;
  const userId = req.user.id;

  const results = await Promise.all(
    checks.map(async (check) => {
      const hasPermission = await permissionService.checkPermission(
        userId,
        check.featureCode,
        check.action
      );

      return {
        featureCode: check.featureCode,
        action: check.action,
        hasPermission
      };
    })
  );

  res.json({
    success: true,
    data: {
      results
    }
  });
};
```