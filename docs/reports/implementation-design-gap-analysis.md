# 実装設計差異分析報告書 - 権限テンプレート機能

## 概要
権限テンプレート機能の実装内容と既存設計書の差異を分析し、設計書の更新と仕様見直しを行います。

**作成日**: 2025-09-25
**対象機能**: 権限テンプレート管理システム
**分析対象**:
- バックエンドAPIルート
- フロントエンドコンポーネント
- データベース設計
- 認証・認可

---

## 1. 発見された未記載ルート・機能

### 1.1 バックエンドAPIルート

#### 新たに実装されたエンドポイント

| エンドポイント | HTTP Method | 設計書記載 | 実装状況 | 差異分析 |
|------------|------------|----------|----------|-----------|
| `/api/permissions/templates` | GET | ❌ 未記載 | ✅ 実装済み | **追加必要** |
| `/api/permissions/templates` | POST | ❌ 未記載 | ✅ 実装済み | **追加必要** |
| `/api/permissions/templates/:id` | PUT | ❌ 未記載 | ✅ 実装済み | **追加必要** |
| `/api/permissions/templates/:id` | DELETE | ❌ 未記載 | ✅ 実装済み | **追加必要** |
| `/api/permissions/templates/:id/apply` | POST | ❌ 未記載 | ✅ 実装済み | **追加必要** |

#### 既存の権限関連エンドポイント（設計済み）

| エンドポイント | HTTP Method | 設計書記載 | 実装状況 | 整合性 |
|------------|------------|----------|----------|---------|
| `/api/permissions/department/:id` | GET | ✅ 記載あり | ✅ 実装済み | ✅ 整合 |
| `/api/permissions/department/:id` | POST | ✅ 記載あり | ✅ 実装済み | ✅ 整合 |
| `/api/permissions/user/:id` | GET | ✅ 記載あり | ✅ 実装済み | ✅ 整合 |
| `/api/permissions/my` | GET | ✅ 記載あり | ✅ 実装済み | ✅ 整合 |
| `/api/permissions/check` | POST | ✅ 記載あり | ✅ 実装済み | ✅ 整合 |
| `/api/permissions/check-bulk` | POST | ✅ 記載あり | ✅ 実装済み | ✅ 整合 |
| `/api/permissions/matrix` | GET | ❌ 未記載 | ✅ 実装済み | **追加必要** |

### 1.2 フロントエンドルート

| ルート | コンポーネント | 設計書記載 | 実装状況 | 差異分析 |
|-------|-------------|----------|----------|-----------|
| `/permission-template` | PermissionTemplate.vue | ❌ 未記載 | ✅ 実装済み | **追加必要** |
| `/permission-matrix` | PermissionMatrix.vue | ✅ 記載あり | ✅ 実装済み | ✅ 整合 |

### 1.3 データベーステーブル

| テーブル名 | 設計書記載 | 実装状況 | 差異分析 |
|-----------|----------|----------|-----------|
| `permission_templates` | ❌ 未記載 | ✅ 実装済み | **追加必要** |
| `permission_template_features` | ❌ 未記載 | ✅ 実装済み | **追加必要** |
| `permission_template_details` | ❌ 未記載 | ✅ 実装済み（未使用） | **整理必要** |

---

## 2. 設計書更新提案

### 2.1 API設計書への追加内容

#### 権限テンプレート管理API
```markdown
### 3.8 権限テンプレート管理API

#### 3.8.1 権限テンプレート一覧取得
- **エンドポイント**: `GET /api/permissions/templates`
- **認証**: 必須
- **パラメータ**:
  - `companyId` (required): 会社ID
- **レスポンス**: 権限テンプレート配列
- **権限要件**: ADMIN または MANAGER

#### 3.8.2 権限テンプレート作成
- **エンドポイント**: `POST /api/permissions/templates`
- **認証**: 必須
- **リクエストボディ**:
  ```json
  {
    "companyId": 1,
    "name": "テンプレート名",
    "description": "説明",
    "category": "CUSTOM|ADMIN|GENERAL|READONLY",
    "features": [
      {
        "featureId": 1,
        "canView": true,
        "canCreate": false,
        ...
      }
    ]
  }
  ```
- **権限要件**: ADMIN のみ

#### 3.8.3 権限テンプレート更新
- **エンドポイント**: `PUT /api/permissions/templates/:templateId`
- **認証**: 必須
- **制約**: プリセットテンプレートは編集不可
- **権限要件**: ADMIN のみ

#### 3.8.4 権限テンプレート削除
- **エンドポイント**: `DELETE /api/permissions/templates/:templateId`
- **認証**: 必須
- **制約**: プリセットテンプレートは削除不可
- **権限要件**: ADMIN のみ

#### 3.8.5 権限テンプレート適用
- **エンドポイント**: `POST /api/permissions/templates/:templateId/apply`
- **認証**: 必須
- **リクエストボディ**:
  ```json
  {
    "departmentIds": [1, 2, 3]
  }
  ```
- **処理**: 指定部署の権限設定を上書き
- **監査ログ**: 権限変更の記録
- **権限要件**: ADMIN のみ

#### 3.8.6 権限マトリクス取得
- **エンドポイント**: `GET /api/permissions/matrix`
- **認証**: 必須
- **パラメータ**:
  - `companyId` (required): 会社ID
  - `departmentIds` (optional): 部署ID配列
- **権限要件**: ADMIN または MANAGER
```

### 2.2 データベース設計書への追加内容

```sql
-- 権限テンプレート
CREATE TABLE permission_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'CUSTOM', -- CUSTOM, ADMIN, GENERAL, READONLY
    is_preset BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),

    UNIQUE(company_id, name, is_active)
);

-- 権限テンプレート機能設定
CREATE TABLE permission_template_features (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES permission_templates(id) ON DELETE CASCADE,
    feature_id INTEGER NOT NULL REFERENCES features(id),
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_approve BOOLEAN DEFAULT false,
    can_export BOOLEAN DEFAULT false,

    UNIQUE(template_id, feature_id)
);

-- インデックス
CREATE INDEX idx_permission_templates_company ON permission_templates(company_id);
CREATE INDEX idx_permission_templates_category ON permission_templates(category);
CREATE INDEX idx_permission_template_features_template ON permission_template_features(template_id);
CREATE INDEX idx_permission_template_features_feature ON permission_template_features(feature_id);
```

### 2.3 フロントエンド画面設計への追加

#### 権限テンプレート管理画面
- **ルート**: `/permission-template`
- **コンポーネント**: `PermissionTemplate.vue`
- **機能**:
  - テンプレート一覧表示
  - 新規作成・編集・削除
  - 権限設定UI（チェックボックス形式）
  - 一括権限設定（全選択・解除・閲覧のみ・編集可能）
  - 部署への適用機能
  - プリセットテンプレート制御
- **権限要件**: ADMIN のみアクセス可能

---

## 3. 仕様見直し提案

### 3.1 権限管理の整合性確保

#### 現状の課題
1. **テーブル設計の重複**
   - `permission_template_details` テーブルが存在するが未使用
   - `permission_template_features` テーブルが実際に使用されている

#### 提案
1. **不要テーブルの削除**
   - `permission_template_details` テーブルを削除
   - マイグレーションスクリプトの整理

2. **テンプレート適用ロジックの強化**
   ```typescript
   // 適用時の監査ログ強化
   interface TemplateApplicationLog {
     templateId: number;
     templateName: string;
     departmentIds: number[];
     appliedBy: number;
     applicationTime: Date;
     previousPermissions: Record<string, any>;
     newPermissions: Record<string, any>;
   }
   ```

### 3.2 セキュリティ考慮事項の追加

#### 権限チェック強化
```typescript
// テンプレート管理の権限チェック
const requireTemplatePermission = (action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPLY') => {
  return async (req, res, next) => {
    const user = req.user;

    // ADMINのみテンプレート管理可能
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '権限が不足しています' }
      });
    }

    // プリセットテンプレートの保護
    if (action === 'UPDATE' || action === 'DELETE') {
      const templateId = parseInt(req.params.templateId);
      const template = await prisma.permission_templates.findUnique({
        where: { id: templateId }
      });

      if (template?.isPreset) {
        return res.status(403).json({
          success: false,
          error: { code: 'PRESET_PROTECTED', message: 'プリセットテンプレートは編集できません' }
        });
      }
    }

    next();
  };
};
```

### 3.3 バリデーション強化

#### テンプレート作成時のバリデーション
```typescript
const templateValidationRules = {
  name: [
    { required: true, message: 'テンプレート名は必須です' },
    { minLength: 2, maxLength: 100, message: '2〜100文字で入力してください' },
    {
      custom: async (name, companyId) => {
        const existing = await prisma.permission_templates.findFirst({
          where: { name, companyId, isActive: true }
        });
        return !existing || '同名のテンプレートが既に存在します';
      }
    }
  ],
  category: [
    { required: true, message: 'カテゴリは必須です' },
    { enum: ['CUSTOM', 'ADMIN', 'GENERAL', 'READONLY'], message: '無効なカテゴリです' }
  ],
  features: [
    { required: true, message: '機能設定は必須です' },
    { minLength: 1, message: '少なくとも1つの機能設定が必要です' }
  ]
};
```

---

## 4. 想定されていなかった機能の影響分析

### 4.1 権限マトリクス機能
- **影響**: 部署×機能の権限一覧表示機能が追加実装されている
- **設計書への追加**: 必要
- **テスト範囲**: 単体試験仕様書に追加済み

### 4.2 一括権限設定機能
- **影響**: フロントエンドで権限の一括設定機能が実装されている
- **種類**: 全選択・全解除・閲覧のみ・編集可能
- **UX考慮**: 権限設定の効率化に寄与

### 4.3 監査ログ機能
- **現状**: テンプレート適用時の監査ログが実装されている
- **拡張提案**: より詳細な変更履歴の記録

---

## 5. 推奨対応アクション

### 5.1 即座対応（Priority 1）
1. **設計書更新**
   - API設計書への権限テンプレート関連API追加
   - データベース設計書への新テーブル追加
   - フロントエンド画面設計への新ページ追加

2. **テーブル整理**
   - `permission_template_details` テーブルの削除検討
   - 不要なマイグレーションファイルの整理

### 5.2 今後対応（Priority 2）
1. **監査機能強化**
   - 権限変更履歴の詳細化
   - 変更影響範囲の追跡

2. **セキュリティ強化**
   - 権限チェック処理の統一化
   - プリセットテンプレートの保護強化

### 5.3 長期対応（Priority 3）
1. **テンプレート継承機能**
   - 親子関係を持つテンプレート設計
   - 段階的権限適用

2. **自動適用機能**
   - 新規部署作成時の自動テンプレート適用
   - 組織変更時の権限継承

---

## 6. 更新された設計書リスト

### 6.1 更新対象ドキュメント
- [ ] `13_機能管理システム/詳細設計書.md` - API設計追加
- [ ] `統合データベース設計書.md` - テーブル定義追加
- [ ] `フロントエンド画面設計書.md` - 新規画面追加
- [ ] `セキュリティ要件書.md` - 権限チェック強化

### 6.2 新規作成対象ドキュメント
- [x] `24-権限テンプレート単体試験仕様書.md` - 作成済み
- [ ] `権限テンプレート操作マニュアル.md` - ユーザーガイド

---

## 7. 品質保証

### 7.1 レビューチェックポイント
- [ ] 実装とAPI仕様の整合性
- [ ] データベーステーブル設計の妥当性
- [ ] セキュリティ要件の充足
- [ ] 監査要件の充足
- [ ] ユーザビリティの確認

### 7.2 試験実施項目
- [x] バックエンドAPI単体試験 - 実装済み
- [x] フロントエンドコンポーネント試験 - 実装済み
- [ ] 統合試験 - 要実施
- [ ] セキュリティ試験 - 要実施

---

**作成者**: Claude Code Assistant
**承認者**: 未定
**次回更新**: 設計書更新完了後