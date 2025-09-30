# 申請・承認ワークフロー機能設計書

**作成日**: 2025-09-27
**バージョン**: 1.0
**対象システム**: Vue.js + Element Plus + Express + PostgreSQL 社内システム
**機能名**: 申請・承認ワークフロー機能

---

## 📋 目次

1. [機能概要](#機能概要)
2. [要件定義](#要件定義)
3. [システム設計](#システム設計)
4. [データベース設計](#データベース設計)
5. [API設計](#api設計)
6. [画面設計](#画面設計)
7. [セキュリティ設計](#セキュリティ設計)
8. [実装計画](#実装計画)

---

## 📖 機能概要

### 🎯 目的
企業内の各種申請（有給・出張・購買・その他）から承認までのワークフローを完全デジタル化し、業務効率化とガバナンス強化を実現する。

### 🔄 基本フロー
```
[申請者] → [直属上司] → [部門長] → [最終承認者] → [完了]
    ↓         ↓           ↓           ↓
  [下書き]   [差戻し]    [差戻し]    [却下]
    ↓         ↓           ↓           ↓
  [修正]    [修正]      [修正]      [終了]
```

### 🌟 主要価値
- **業務効率化**: ペーパーレス・自動ルーティング
- **透明性向上**: 進捗可視化・履歴管理
- **ガバナンス強化**: 承認証跡・監査対応
- **柔軟性**: カスタマイズ可能なワークフロー

---

## 📝 要件定義

### 🎯 機能要件

#### 1. 申請機能
| 機能 | 説明 | 優先度 |
|------|------|--------|
| 申請書作成 | 動的フォームによる申請書作成 | High |
| ファイル添付 | 証憑・資料の添付機能 | High |
| 下書き保存 | 途中保存・後で編集 | Medium |
| 申請履歴 | 自分の申請一覧・ステータス確認 | High |
| 申請複製 | 過去申請の複製・再利用 | Low |

#### 2. 承認機能
| 機能 | 説明 | 優先度 |
|------|------|--------|
| 承認待ち一覧 | 自分宛の承認待ち案件表示 | High |
| 承認・却下・差戻し | 理由コメント付きアクション | High |
| 代理承認 | 休暇時の代理設定 | Medium |
| 一括承認 | 同種申請の効率的処理 | Medium |
| 承認履歴 | 承認・却下の履歴管理 | High |

#### 3. ワークフロー管理
| 機能 | 説明 | 優先度 |
|------|------|--------|
| 承認ルート設定 | 部署・申請種別別ルート定義 | High |
| 条件分岐 | 金額・期間による自動ルート変更 | Medium |
| 並列承認 | 複数承認者の同時承認 | Low |
| エスカレーション | 期限超過時の自動上位承認 | Medium |

#### 4. 管理機能
| 機能 | 説明 | 優先度 |
|------|------|--------|
| 申請種別管理 | 動的フォーム定義・管理 | High |
| 統計・レポート | 申請状況の可視化 | Medium |
| 通知機能 | 申請・承認時の自動通知 | Medium |
| 監査ログ | 全操作の監査証跡 | High |

### 🎨 非機能要件

#### 性能要件
- **レスポンス時間**: 画面表示2秒以内、API応答500ms以内
- **同時接続**: 100ユーザー同時利用可能
- **ファイルアップロード**: 最大10MB、PDF/Word/Excel対応

#### セキュリティ要件
- **認証**: 既存JWT認証システム連携
- **認可**: RBAC権限システム活用
- **データ保護**: 申請データの暗号化保存
- **監査**: 全操作の完全ログ記録

#### 運用要件
- **可用性**: 99.9%以上
- **バックアップ**: 日次自動バックアップ
- **復旧**: 4時間以内のデータ復旧
- **保守**: 既存システムとの統合運用

---

## 🏗️ システム設計

### 📐 アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   フロントエンド   │    │   バックエンド    │    │   データベース    │
│   Vue.js 3      │◄──►│   Express       │◄──►│   PostgreSQL    │
│   Element Plus  │    │   Prisma ORM    │    │   + 既存テーブル  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  ワークフロー画面  │    │  ワークフローAPI  │    │ ワークフロー関連  │
│  - 申請画面     │    │  - 申請管理      │    │     テーブル     │
│  - 承認画面     │    │  - 承認処理      │    │  - requests     │
│  - 管理画面     │    │  - ルート管理     │    │  - approvals    │
│  - ダッシュボード │    │  - 通知送信      │    │  - workflows    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🔧 技術スタック

#### フロントエンド
```typescript
Vue.js 3.4.29          // Composition API
Element Plus 2.8.0     // UI コンポーネント
TypeScript 5.4.5       // 型安全性
Pinia 2.2.2            // 状態管理
Vue Router 4.4.3       // ルーティング
```

#### バックエンド
```typescript
Express 4.19.2         // Webフレームワーク
Prisma 5.18.0          // ORM（既存統合）
PostgreSQL 15          // データベース
JWT                    // 認証（既存連携）
```

#### 新規追加ライブラリ
```typescript
// フロントエンド
vue-flow              // フロー図可視化
file-saver            // ファイルダウンロード
xlsx                  // Excel出力

// バックエンド
multer                // ファイルアップロード
sharp                 // 画像処理
archiver              // ZIP圧縮
```

---

## 🗄️ データベース設計

### 📊 ER図

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   users         │    │   companies     │    │  departments    │
│   (既存)        │    │   (既存)        │    │   (既存)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────▼───────────────────────┐
         │            workflow_types                     │
         │  - id, name, description                     │
         │  - form_schema (JSONB)                       │
         │  - company_id                                │
         └───────────────────┬───────────────────────────┘
                             │
         ┌───────────────────▼───────────────────────────┐
         │           approval_routes                     │
         │  - id, workflow_type_id                      │
         │  - department_id                             │
         │  - route_definition (JSONB)                  │
         └───────────────────┬───────────────────────────┘
                             │
         ┌───────────────────▼───────────────────────────┐
         │          workflow_requests                    │
         │  - id, workflow_type_id, requester_id        │
         │  - title, form_data (JSONB)                  │
         │  - current_step, status                      │
         └───────────────────┬───────────────────────────┘
                             │
         ┌───────────────────▼───────────────────────────┐
         │          approval_history                     │
         │  - id, request_id, step_number               │
         │  - approver_id, action, comment              │
         │  - approved_at                               │
         └─────────────────────────────────────────────────┘
```

### 📋 テーブル定義

#### 1. workflow_types（申請種別マスタ）
```sql
CREATE TABLE workflow_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,                    -- 申請種別名
  display_name VARCHAR(100) NOT NULL,            -- 表示名
  description TEXT,                              -- 説明
  form_schema JSONB NOT NULL,                    -- 動的フォーム定義
  icon VARCHAR(50),                              -- アイコン名
  color VARCHAR(20),                             -- テーマカラー
  is_file_required BOOLEAN DEFAULT false,        -- ファイル添付必須
  max_file_size INTEGER DEFAULT 10485760,       -- 最大ファイルサイズ(10MB)
  allowed_file_types VARCHAR(200),               -- 許可ファイル形式
  auto_approval_amount DECIMAL(15,2),            -- 自動承認金額上限
  estimated_days INTEGER DEFAULT 3,              -- 標準処理日数
  is_active BOOLEAN DEFAULT true,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT workflow_types_company_name_unique
    UNIQUE(company_id, name)
);

-- インデックス
CREATE INDEX idx_workflow_types_company_active
  ON workflow_types(company_id, is_active);
```

#### 2. approval_routes（承認ルートマスタ）
```sql
CREATE TABLE approval_routes (
  id SERIAL PRIMARY KEY,
  workflow_type_id INTEGER NOT NULL REFERENCES workflow_types(id),
  department_id INTEGER REFERENCES departments(id),  -- NULL = 全部署共通
  route_name VARCHAR(100) NOT NULL,                  -- ルート名
  route_definition JSONB NOT NULL,                   -- ルート定義
  condition_rules JSONB,                             -- 条件分岐ルール
  is_default BOOLEAN DEFAULT false,                  -- デフォルトルート
  priority INTEGER DEFAULT 0,                       -- 優先度（高い順）
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT approval_routes_type_dept_unique
    UNIQUE(workflow_type_id, department_id, route_name)
);

-- インデックス
CREATE INDEX idx_approval_routes_workflow_dept
  ON approval_routes(workflow_type_id, department_id);
```

#### 3. workflow_requests（申請書）
```sql
CREATE TABLE workflow_requests (
  id SERIAL PRIMARY KEY,
  request_number VARCHAR(50) UNIQUE NOT NULL,       -- 申請番号
  workflow_type_id INTEGER NOT NULL REFERENCES workflow_types(id),
  requester_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,                      -- 申請タイトル
  description TEXT,                                 -- 申請概要
  form_data JSONB NOT NULL,                         -- 申請データ
  attachments JSONB,                                -- 添付ファイル情報
  current_step INTEGER DEFAULT 1,                   -- 現在のステップ
  total_steps INTEGER NOT NULL,                     -- 総ステップ数
  status VARCHAR(20) DEFAULT 'DRAFT',               -- ステータス
  urgency VARCHAR(10) DEFAULT 'NORMAL',             -- 緊急度
  estimated_amount DECIMAL(15,2),                   -- 概算金額
  due_date DATE,                                    -- 希望完了日
  actual_start_date TIMESTAMP,                      -- 承認開始日時
  actual_end_date TIMESTAMP,                        -- 承認完了日時
  cancel_reason TEXT,                               -- キャンセル理由
  final_comment TEXT,                               -- 最終コメント
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT workflow_requests_status_check
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED')),
  CONSTRAINT workflow_requests_urgency_check
    CHECK (urgency IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

-- インデックス
CREATE INDEX idx_workflow_requests_requester_status
  ON workflow_requests(requester_id, status);
CREATE INDEX idx_workflow_requests_status_created
  ON workflow_requests(status, created_at DESC);
CREATE INDEX idx_workflow_requests_number
  ON workflow_requests(request_number);
```

#### 4. approval_history（承認履歴）
```sql
CREATE TABLE approval_history (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES workflow_requests(id),
  step_number INTEGER NOT NULL,                     -- ステップ番号
  step_name VARCHAR(100),                           -- ステップ名
  approver_id INTEGER NOT NULL REFERENCES users(id),
  proxy_approver_id INTEGER REFERENCES users(id),   -- 代理承認者
  action VARCHAR(20) NOT NULL,                      -- アクション
  comment TEXT,                                     -- 承認・却下理由
  attachments JSONB,                                -- 追加添付ファイル
  ip_address INET,                                  -- IPアドレス
  user_agent TEXT,                                  -- ユーザーエージェント
  processing_time INTERVAL,                         -- 処理時間
  approved_at TIMESTAMP,                            -- 承認日時
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT approval_history_action_check
    CHECK (action IN ('APPROVE', 'REJECT', 'RETURN', 'DELEGATE', 'CANCEL', 'TIMEOUT'))
);

-- インデックス
CREATE INDEX idx_approval_history_request_step
  ON approval_history(request_id, step_number);
CREATE INDEX idx_approval_history_approver
  ON approval_history(approver_id, approved_at DESC);
```

#### 5. approval_delegates（代理承認設定）
```sql
CREATE TABLE approval_delegates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),        -- 本人
  delegate_id INTEGER NOT NULL REFERENCES users(id),    -- 代理人
  workflow_type_ids INTEGER[],                          -- 対象申請種別
  start_date DATE NOT NULL,                             -- 開始日
  end_date DATE NOT NULL,                               -- 終了日
  reason TEXT,                                          -- 代理理由
  max_amount DECIMAL(15,2),                             -- 代理承認上限金額
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT approval_delegates_date_check
    CHECK (end_date >= start_date),
  CONSTRAINT approval_delegates_different_users
    CHECK (user_id != delegate_id)
);

-- インデックス
CREATE INDEX idx_approval_delegates_user_period
  ON approval_delegates(user_id, start_date, end_date);
CREATE INDEX idx_approval_delegates_delegate_active
  ON approval_delegates(delegate_id, is_active);
```

#### 6. workflow_notifications（通知管理）
```sql
CREATE TABLE workflow_notifications (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES workflow_requests(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  notification_type VARCHAR(30) NOT NULL,              -- 通知種別
  title VARCHAR(200) NOT NULL,                         -- 通知タイトル
  message TEXT NOT NULL,                               -- 通知内容
  is_read BOOLEAN DEFAULT false,                       -- 既読フラグ
  read_at TIMESTAMP,                                   -- 既読日時
  sent_email BOOLEAN DEFAULT false,                    -- メール送信済み
  email_sent_at TIMESTAMP,                             -- メール送信日時
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT workflow_notifications_type_check
    CHECK (notification_type IN ('SUBMITTED', 'APPROVAL_REQUIRED', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED', 'REMINDER'))
);

-- インデックス
CREATE INDEX idx_workflow_notifications_user_unread
  ON workflow_notifications(user_id, is_read);
CREATE INDEX idx_workflow_notifications_request
  ON workflow_notifications(request_id);
```

---

## 🔗 API設計

### 📋 APIエンドポイント一覧

#### 申請管理API
```typescript
// 申請書関連
GET    /api/workflow/requests                   // 申請一覧取得
POST   /api/workflow/requests                   // 申請書作成
GET    /api/workflow/requests/:id               // 申請詳細取得
PUT    /api/workflow/requests/:id               // 申請書更新
DELETE /api/workflow/requests/:id               // 申請キャンセル
POST   /api/workflow/requests/:id/submit        // 申請提出
POST   /api/workflow/requests/:id/duplicate     // 申請複製

// ファイル管理
POST   /api/workflow/requests/:id/attachments   // ファイルアップロード
GET    /api/workflow/requests/:id/attachments/:fileId  // ファイルダウンロード
DELETE /api/workflow/requests/:id/attachments/:fileId  // ファイル削除
```

#### 承認管理API
```typescript
// 承認処理
GET    /api/workflow/approvals/pending          // 承認待ち一覧
GET    /api/workflow/approvals/history          // 承認履歴
POST   /api/workflow/approvals/:requestId/approve    // 承認
POST   /api/workflow/approvals/:requestId/reject     // 却下
POST   /api/workflow/approvals/:requestId/return     // 差戻し
POST   /api/workflow/approvals/batch             // 一括承認

// 代理承認
GET    /api/workflow/delegates                   // 代理設定一覧
POST   /api/workflow/delegates                   // 代理設定作成
PUT    /api/workflow/delegates/:id               // 代理設定更新
DELETE /api/workflow/delegates/:id               // 代理設定削除
```

#### 管理API
```typescript
// ワークフロー種別
GET    /api/workflow/types                       // 申請種別一覧
POST   /api/workflow/types                       // 申請種別作成
PUT    /api/workflow/types/:id                   // 申請種別更新
DELETE /api/workflow/types/:id                   // 申請種別削除

// 承認ルート
GET    /api/workflow/routes                      // 承認ルート一覧
POST   /api/workflow/routes                      // 承認ルート作成
PUT    /api/workflow/routes/:id                  // 承認ルート更新
DELETE /api/workflow/routes/:id                  // 承認ルート削除

// 統計・レポート
GET    /api/workflow/statistics/dashboard        // ダッシュボード統計
GET    /api/workflow/statistics/approver         // 承認者別統計
GET    /api/workflow/statistics/department       // 部署別統計
GET    /api/workflow/reports/export              // レポートエクスポート
```

### 📝 API詳細仕様

#### 申請書作成API
```typescript
POST /api/workflow/requests
Content-Type: application/json

// リクエスト
{
  workflowTypeId: number,
  title: string,
  description?: string,
  formData: {
    [key: string]: any
  },
  urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
  estimatedAmount?: number,
  dueDate?: string,  // ISO date
  isDraft?: boolean
}

// レスポンス
{
  success: true,
  data: {
    id: number,
    requestNumber: string,
    status: string,
    currentStep: number,
    totalSteps: number,
    approvalRoute: [
      {
        stepNumber: number,
        stepName: string,
        approverIds: number[],
        approverNames: string[],
        isParallel: boolean
      }
    ],
    createdAt: string
  }
}
```

#### 承認実行API
```typescript
POST /api/workflow/approvals/:requestId/approve
Content-Type: application/json

// リクエスト
{
  action: 'APPROVE' | 'REJECT' | 'RETURN',
  comment: string,
  attachments?: FileInfo[],
  nextApprovers?: number[]  // 差戻し時の指定承認者
}

// レスポンス
{
  success: true,
  data: {
    requestId: number,
    newStatus: string,
    nextStep: number,
    nextApprovers: {
      userId: number,
      userName: string,
      departmentName: string
    }[],
    isCompleted: boolean,
    processingTime: string
  }
}
```

---

## 🎨 画面設計

### 📱 画面一覧

#### メイン画面
1. **ワークフローダッシュボード** - 統計・進捗可視化
2. **申請一覧** - 自分の申請状況一覧
3. **承認待ち一覧** - 承認待ち案件一覧
4. **申請書作成** - 新規申請作成
5. **申請詳細** - 申請内容・進捗確認

#### 管理画面
6. **申請種別管理** - ワークフロー種別設定
7. **承認ルート管理** - 承認フロー設定
8. **代理承認設定** - 代理承認者設定
9. **統計・レポート** - 分析・エクスポート

### 🖼️ 画面設計詳細

#### 1. ワークフローダッシュボード
```vue
<template>
  <div class="workflow-dashboard">
    <!-- 統計カード -->
    <el-row :gutter="20" class="statistics-cards">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="承認待ち"
            :value="pendingCount"
            suffix="件"
            value-style="color: #f56c6c"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="今月申請"
            :value="monthlyRequests"
            suffix="件"
            value-style="color: #409eff"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="今月承認"
            :value="monthlyApprovals"
            suffix="件"
            value-style="color: #67c23a"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="平均処理時間"
            :value="avgProcessingTime"
            suffix="時間"
            value-style="color: #e6a23c"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- チャート -->
    <el-row :gutter="20" class="charts">
      <el-col :span="12">
        <el-card title="申請種別別統計">
          <workflow-chart type="doughnut" :data="typeStatistics" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card title="月別申請推移">
          <workflow-chart type="line" :data="monthlyTrends" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近の活動 -->
    <el-card title="最近の活動">
      <workflow-activity-timeline :activities="recentActivities" />
    </el-card>
  </div>
</template>
```

#### 2. 申請書作成画面
```vue
<template>
  <div class="request-creation">
    <el-form
      ref="requestForm"
      :model="request"
      :rules="validationRules"
      label-width="120px"
    >
      <!-- 基本情報 -->
      <el-card title="基本情報" class="form-section">
        <el-form-item label="申請種別" prop="workflowTypeId" required>
          <el-select
            v-model="request.workflowTypeId"
            placeholder="申請種別を選択"
            @change="onWorkflowTypeChange"
            style="width: 100%"
          >
            <el-option
              v-for="type in workflowTypes"
              :key="type.id"
              :label="type.displayName"
              :value="type.id"
            >
              <span style="float: left">
                <el-icon :color="type.color">
                  <component :is="type.icon" />
                </el-icon>
                {{ type.displayName }}
              </span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ type.estimatedDays }}日
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="申請タイトル" prop="title" required>
          <el-input
            v-model="request.title"
            placeholder="申請内容を簡潔に入力"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="緊急度" prop="urgency">
          <el-radio-group v-model="request.urgency">
            <el-radio-button label="LOW">低</el-radio-button>
            <el-radio-button label="NORMAL">普通</el-radio-button>
            <el-radio-button label="HIGH">高</el-radio-button>
            <el-radio-button label="URGENT">緊急</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- 動的フォーム -->
      <el-card title="申請内容" class="form-section" v-if="formSchema">
        <dynamic-workflow-form
          :schema="formSchema"
          v-model="request.formData"
          :validation-rules="dynamicValidationRules"
        />
      </el-card>

      <!-- ファイル添付 -->
      <el-card title="添付ファイル" class="form-section">
        <workflow-file-upload
          v-model="request.attachments"
          :max-size="selectedType?.maxFileSize"
          :allowed-types="selectedType?.allowedFileTypes"
          :required="selectedType?.isFileRequired"
        />
      </el-card>

      <!-- 承認ルートプレビュー -->
      <el-card title="承認ルート" class="form-section" v-if="approvalRoute">
        <approval-route-preview
          :route="approvalRoute"
          :estimated-days="selectedType?.estimatedDays"
        />
      </el-card>
    </el-form>

    <!-- アクションボタン -->
    <div class="form-actions">
      <el-button @click="saveDraft" :loading="saving">
        下書き保存
      </el-button>
      <el-button
        type="primary"
        @click="submitRequest"
        :loading="submitting"
      >
        申請する
      </el-button>
      <el-button @click="previewRequest">
        プレビュー
      </el-button>
    </div>
  </div>
</template>
```

#### 3. 承認画面
```vue
<template>
  <div class="approval-management">
    <!-- フィルタ・検索 -->
    <el-card class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="申請種別">
          <el-select v-model="filters.workflowTypeId" clearable>
            <el-option
              v-for="type in workflowTypes"
              :key="type.id"
              :label="type.displayName"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="緊急度">
          <el-select v-model="filters.urgency" clearable>
            <el-option label="緊急" value="URGENT" />
            <el-option label="高" value="HIGH" />
            <el-option label="普通" value="NORMAL" />
            <el-option label="低" value="LOW" />
          </el-select>
        </el-form-item>
        <el-form-item label="申請者">
          <user-select v-model="filters.requesterId" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchApprovals">
            検索
          </el-button>
          <el-button @click="resetFilters">
            リセット
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 承認待ち一覧 -->
    <el-card title="承認待ち一覧">
      <el-table
        :data="pendingApprovals"
        row-key="id"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column label="緊急度" width="80">
          <template #default="{ row }">
            <el-tag
              :type="getUrgencyType(row.urgency)"
              size="small"
            >
              {{ getUrgencyLabel(row.urgency) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="requestNumber" label="申請番号" width="120" />

        <el-table-column label="申請内容" min-width="200">
          <template #default="{ row }">
            <div class="request-summary">
              <div class="title">{{ row.title }}</div>
              <div class="type">{{ row.workflowType.displayName }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="申請者" width="120">
          <template #default="{ row }">
            <user-avatar
              :user="row.requester"
              size="small"
              show-name
            />
          </template>
        </el-table-column>

        <el-table-column label="申請日" width="120">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="待機時間" width="100">
          <template #default="{ row }">
            <waiting-time-badge :created-at="row.createdAt" />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                size="small"
                @click="viewDetail(row)"
              >
                詳細
              </el-button>
              <el-button
                size="small"
                type="success"
                @click="quickApprove(row)"
              >
                承認
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="quickReject(row)"
              >
                却下
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 一括操作 -->
      <div class="batch-operations" v-if="selectedApprovals.length > 0">
        <el-alert
          type="info"
          :title="`${selectedApprovals.length}件選択中`"
          show-icon
        />
        <el-button-group>
          <el-button type="success" @click="batchApprove">
            一括承認
          </el-button>
          <el-button type="danger" @click="batchReject">
            一括却下
          </el-button>
        </el-button-group>
      </div>
    </el-card>
  </div>
</template>
```

---

## 🔐 セキュリティ設計

### 🛡️ 認証・認可

#### JWT認証連携
```typescript
// 既存認証システムと完全連携
interface WorkflowJWTPayload extends JWTPayload {
  workflowPermissions: {
    canCreateRequest: boolean,
    canApproveAnyRequest: boolean,
    canManageWorkflow: boolean,
    approvableTypes: number[],
    maxApprovalAmount: number
  }
}
```

#### RBAC権限制御
```typescript
// 権限レベル定義
enum WorkflowPermission {
  // 申請権限
  CREATE_REQUEST = 'WORKFLOW_CREATE_REQUEST',
  VIEW_OWN_REQUESTS = 'WORKFLOW_VIEW_OWN_REQUESTS',
  CANCEL_OWN_REQUEST = 'WORKFLOW_CANCEL_OWN_REQUEST',

  // 承認権限
  APPROVE_REQUESTS = 'WORKFLOW_APPROVE_REQUESTS',
  APPROVE_HIGH_AMOUNT = 'WORKFLOW_APPROVE_HIGH_AMOUNT',
  DELEGATE_APPROVAL = 'WORKFLOW_DELEGATE_APPROVAL',

  // 管理権限
  MANAGE_WORKFLOW_TYPES = 'WORKFLOW_MANAGE_TYPES',
  MANAGE_APPROVAL_ROUTES = 'WORKFLOW_MANAGE_ROUTES',
  VIEW_ALL_REQUESTS = 'WORKFLOW_VIEW_ALL_REQUESTS',
  EXPORT_REPORTS = 'WORKFLOW_EXPORT_REPORTS'
}
```

### 🔒 データ保護

#### 暗号化
```typescript
// 機密データの暗号化
const encryptSensitiveData = (data: any): string => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY)
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

// 申請データの機密情報暗号化
const request = {
  formData: encryptSensitiveData(request.formData),
  // その他のフィールド
}
```

#### ファイルセキュリティ
```typescript
// ファイルアップロード制限
const fileSecurityConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ],
  scanForMalware: true,
  quarantineSuspicious: true
}
```

### 📊 監査ログ

#### 完全操作記録
```typescript
// 監査ログエントリ
interface WorkflowAuditLog {
  id: string,
  requestId: number,
  userId: number,
  action: string,
  targetType: string,
  targetId: string,
  oldValue: any,
  newValue: any,
  ipAddress: string,
  userAgent: string,
  sessionId: string,
  timestamp: Date,

  // ワークフロー固有
  stepNumber?: number,
  approvalAction?: string,
  processingTime?: number,
  riskScore?: number
}
```

---

## 📅 実装計画

### 🎯 開発フェーズ

#### Phase 1: 基盤実装（3-4日）
**目標**: 基本的な申請・承認機能の実装

**実装内容**:
1. **データベース設計** (0.5日)
   - テーブル作成・マイグレーション
   - インデックス・制約設定
   - シードデータ投入

2. **バックエンドAPI基盤** (1.5日)
   - 基本CRUD API実装
   - 認証・認可ミドルウェア
   - バリデーション実装

3. **フロントエンド基盤** (1.5日)
   - 基本画面実装
   - ルーティング設定
   - 状態管理設定

4. **基本機能テスト** (0.5日)
   - API動作確認
   - 画面表示確認
   - 基本フロー確認

#### Phase 2: コア機能実装（4-5日）
**目標**: 申請・承認のコア機能完成

**実装内容**:
1. **動的フォーム機能** (1.5日)
   - フォームスキーマ定義
   - 動的レンダリング
   - バリデーション連携

2. **承認フロー実装** (1.5日)
   - 承認ルート処理
   - ステップ管理
   - 条件分岐対応

3. **ファイル管理機能** (1日)
   - ファイルアップロード
   - セキュリティチェック
   - ダウンロード機能

4. **通知機能** (1日)
   - リアルタイム通知
   - メール連携
   - WebSocket実装

#### Phase 3: 高度機能実装（3-4日）
**目標**: 管理機能・統計機能の実装

**実装内容**:
1. **管理画面実装** (1.5日)
   - ワークフロー種別管理
   - 承認ルート管理
   - ユーザー管理連携

2. **統計・レポート機能** (1.5日)
   - ダッシュボード実装
   - チャート表示
   - エクスポート機能

3. **代理承認機能** (1日)
   - 代理設定管理
   - 代理承認処理
   - 権限継承対応

#### Phase 4: 最適化・テスト（2-3日）
**目標**: 品質向上・本番準備

**実装内容**:
1. **単体試験実装** (1日)
   - API試験
   - コンポーネント試験
   - 統合試験

2. **パフォーマンス最適化** (0.5日)
   - クエリ最適化
   - フロントエンド最適化
   - キャッシュ実装

3. **セキュリティ強化** (0.5日)
   - 脆弱性検査
   - セキュリティヘッダー
   - 入力サニタイズ

4. **ドキュメント整備** (1日)
   - 操作マニュアル
   - 運用手順書
   - 技術仕様書

### 📊 実装優先度

| 機能 | 優先度 | 実装フェーズ | 理由 |
|------|--------|-------------|------|
| 基本申請・承認 | High | Phase 1-2 | コア機能 |
| 動的フォーム | High | Phase 2 | 柔軟性確保 |
| ファイル添付 | High | Phase 2 | 実用性必須 |
| 承認ルート管理 | Medium | Phase 2-3 | 運用効率化 |
| 統計・レポート | Medium | Phase 3 | 経営支援 |
| 代理承認 | Medium | Phase 3 | 運用継続性 |
| 一括承認 | Low | Phase 3 | 効率化 |
| 並列承認 | Low | Phase 4 | 高度機能 |

### 🎯 成功指標

#### 技術指標
- **API応答時間**: 500ms以内
- **画面表示時間**: 2秒以内
- **テストカバレッジ**: 90%以上
- **セキュリティスコア**: A評価以上

#### 業務指標
- **申請処理時間**: 50%短縮
- **承認漏れ**: 0件
- **ユーザー満足度**: 80%以上
- **システム稼働率**: 99.9%以上

---

## 📝 補足事項

### 🔄 既存システムとの連携

#### ユーザー・組織マスタ連携
```typescript
// 既存テーブルとの関連
workflow_requests.requester_id → users.id
approval_routes.department_id → departments.id
workflow_types.company_id → companies.id
```

#### 権限システム連携
```typescript
// 既存RBAC権限システムの拡張
const workflowPermissions = [
  'WORKFLOW_CREATE_REQUEST',
  'WORKFLOW_APPROVE_REQUESTS',
  'WORKFLOW_MANAGE_TYPES',
  'WORKFLOW_VIEW_REPORTS'
]
```

### 📈 将来拡張計画

#### 1. AI機能統合
- 申請内容の自動分類
- 承認予測・推奨機能
- 異常申請の検知

#### 2. 外部システム連携
- 人事システム連携（有給残日数）
- 会計システム連携（予算チェック）
- カレンダー連携（スケジュール確認）

#### 3. モバイル対応
- PWA対応
- プッシュ通知
- オフライン機能

### 🛠️ 技術的考慮事項

#### パフォーマンス
- データベースインデックス最適化
- API応答キャッシュ
- 画像・ファイル圧縮

#### 可用性
- ファイルストレージの冗長化
- データベースレプリケーション
- 障害時の自動復旧

#### 拡張性
- マイクロサービス分割準備
- API バージョニング
- プラグイン機構

---

**📋 設計書完了**

この設計書に基づいて申請・承認ワークフロー機能の実装を開始できます。
次のステップとして、どの部分から実装を始めますか？

1. **データベース設計** - テーブル作成・マイグレーション
2. **バックエンドAPI** - 基本CRUD実装
3. **フロントエンド画面** - 基本画面実装
4. **動的フォーム機能** - 申請種別対応

どちらから始めましょうか？