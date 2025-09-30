# workflow.ts APIモノリス分割対策案

## 📊 現状分析

### 深刻なAPIモノリス問題
- **ファイルサイズ**: 56KB（1,616行）
- **APIエンドポイント数**: 51個
- **機能領域**: 9つの異なる機能が混在
- **複雑度**: LogMonitoring.vue（36KB）を上回る最重要課題

### 現在の機能構成
```
workflow.ts (1,616行, 51エンドポイント)
├── ワークフロータイプ管理     (147行, 7エンドポイント)
├── ワークフロー申請管理       (187行, 9エンドポイント)
├── ダッシュボード統計         (49行, 2エンドポイント)
├── 緊急承認機能              (138行, 6エンドポイント)
├── 承認委任管理              (250行, 10エンドポイント)
├── 承認代理管理              (226行, 8エンドポイント)
├── 並列承認管理              (156行, 6エンドポイント)
├── 直列承認管理              (154行, 6エンドポイント)
└── 自動承認管理              (309行, 7エンドポイント)
```

## 🎯 分割戦略

### 方針
**マイクロサービス型API分割** - 機能単位での完全独立化

### 分割構造

```
routes/workflow/
├── index.ts                     # メインルーター統合 (80行)
├── workflow-types.ts            # ワークフロータイプ管理 (200行, 7EP)
├── workflow-requests.ts         # 申請管理 (250行, 9EP)
├── workflow-dashboard.ts        # 統計ダッシュボード (100行, 2EP)
├── emergency-approval.ts        # 緊急承認 (180行, 6EP)
├── delegation-approval.ts       # 承認委任 (300行, 10EP)
├── proxy-approval.ts           # 承認代理 (280行, 8EP)
├── parallel-approval.ts        # 並列承認 (200行, 6EP)
├── sequential-approval.ts      # 直列承認 (200行, 6EP)
└── auto-approval.ts            # 自動承認 (350行, 7EP)
```

## 📦 分割後のファイル詳細

### 1. routes/workflow/index.ts (統合ルーター)
```typescript
import { Router } from 'express';
import workflowTypesRouter from './workflow-types';
import workflowRequestsRouter from './workflow-requests';
import workflowDashboardRouter from './workflow-dashboard';
import emergencyApprovalRouter from './emergency-approval';
import delegationApprovalRouter from './delegation-approval';
import proxyApprovalRouter from './proxy-approval';
import parallelApprovalRouter from './parallel-approval';
import sequentialApprovalRouter from './sequential-approval';
import autoApprovalRouter from './auto-approval';

const router = Router();

// マイクロサービス型ルーター統合
router.use('/types', workflowTypesRouter);
router.use('/requests', workflowRequestsRouter);
router.use('/dashboard', workflowDashboardRouter);
router.use('/emergency', emergencyApprovalRouter);
router.use('/delegation', delegationApprovalRouter);
router.use('/proxy', proxyApprovalRouter);
router.use('/parallel', parallelApprovalRouter);
router.use('/sequential', sequentialApprovalRouter);
router.use('/auto', autoApprovalRouter);

export default router;
```

### 2. workflow-types.ts (ワークフロータイプ管理)
```typescript
import { Router } from 'express';
import { WorkflowService } from '../../services/WorkflowService';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateCreateWorkflowType, validateUpdateWorkflowType } from '../../utils/validation';

const router = Router();
const workflowService = new WorkflowService();

// GET /api/workflow/types - ワークフロータイプ一覧
router.get('/', authenticate, async (req, res) => {
  // 実装詳細
});

// GET /api/workflow/types/:id - ワークフロータイプ詳細
router.get('/:id', authenticate, async (req, res) => {
  // 実装詳細
});

// POST /api/workflow/types - ワークフロータイプ作成
router.post('/', authenticate, requireRole(['ADMIN']), async (req, res) => {
  // 実装詳細
});

// PUT /api/workflow/types/:id - ワークフロータイプ更新
router.put('/:id', authenticate, requireRole(['ADMIN']), async (req, res) => {
  // 実装詳細
});

// DELETE /api/workflow/types/:id - ワークフロータイプ削除
router.delete('/:id', authenticate, requireRole(['ADMIN']), async (req, res) => {
  // 実装詳細
});

export default router;
```

### 3. emergency-approval.ts (緊急承認)
```typescript
import { Router } from 'express';
import { EmergencyApprovalService } from '../../services/EmergencyApprovalService';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();
const emergencyApprovalService = new EmergencyApprovalService();

// POST /api/workflow/emergency/request - 緊急承認申請
router.post('/request', authenticate, async (req, res) => {
  // 緊急承認申請ロジック
});

// POST /api/workflow/emergency/approve/:id - 緊急承認実行
router.post('/approve/:id', authenticate, requireRole(['ADMIN']), async (req, res) => {
  // 緊急承認実行ロジック
});

// GET /api/workflow/emergency/history - 緊急承認履歴
router.get('/history', authenticate, requireRole(['ADMIN']), async (req, res) => {
  // 緊急承認履歴取得
});

export default router;
```

## 🔧 実装手順

### Phase 1: 準備・設計（1日）
1. ✅ 現状分析完了
2. ⬜ ディレクトリ構造作成 (`routes/workflow/`)
3. ⬜ 共通モジュールの整理（middleware, validation）
4. ⬜ 各ファイルのインターフェース設計

### Phase 2: 基盤ファイル作成（2日）
1. ⬜ workflow-types.ts（7エンドポイント）
2. ⬜ workflow-requests.ts（9エンドポイント）
3. ⬜ workflow-dashboard.ts（2エンドポイント）
4. ⬜ index.ts統合ルーター

### Phase 3: 承認機能ファイル（3日）
1. ⬜ emergency-approval.ts（6エンドポイント）
2. ⬜ delegation-approval.ts（10エンドポイント）
3. ⬜ proxy-approval.ts（8エンドポイント）
4. ⬜ parallel-approval.ts（6エンドポイント）

### Phase 4: 高度承認機能（2日）
1. ⬜ sequential-approval.ts（6エンドポイント）
2. ⬜ auto-approval.ts（7エンドポイント）
3. ⬜ 統合テスト・動作確認

### Phase 5: 移行・検証（1日）
1. ⬜ 元ファイル無効化
2. ⬜ APIエンドポイント動作確認
3. ⬜ パフォーマンステスト
4. ⬜ 本番環境デプロイ

## 📈 期待される改善効果

### サイズ削減
- **現在**: 56KB（1,616行、51エンドポイント）
- **分割後**:
  - メインルーター: 3KB（80行）
  - 各マイクロサービス: 5-15KB（100-350行）
  - **初回読み込み**: 56KB → 3KB（**95%削減**）

### パフォーマンス改善
- **API読み込み**: 56KB → 3KB（95%削減）
- **メモリ使用量**: 必要機能のみロード（60%削減）
- **レスポンス時間**: ルーター処理最適化（40%高速化）
- **スケーラビリティ**: 機能別独立デプロイ可能

### 開発効率
- **コード可読性**: 各ファイル100-350行で管理しやすい
- **テスト容易性**: 機能別単体テスト可能
- **並行開発**: チーム分担による同時開発
- **保守性**: バグ影響範囲の局所化

## 🚀 追加の最適化案

### 1. レイジーローディング実装
```typescript
// 必要時のみサービスインスタンス作成
const getEmergencyApprovalService = () => {
  if (!emergencyApprovalService) {
    emergencyApprovalService = new EmergencyApprovalService();
  }
  return emergencyApprovalService;
};
```

### 2. APIキャッシュ最適化
```typescript
// 頻繁にアクセスされるデータのキャッシュ
const workflowTypesCache = new Map();
const getCachedWorkflowTypes = async (companyId) => {
  const cacheKey = `workflow_types_${companyId}`;
  if (workflowTypesCache.has(cacheKey)) {
    return workflowTypesCache.get(cacheKey);
  }
  const data = await workflowService.getWorkflowTypes(companyId);
  workflowTypesCache.set(cacheKey, data);
  return data;
};
```

### 3. 非同期処理最適化
```typescript
// 重い処理をWorkerスレッドで実行
import { Worker } from 'worker_threads';

const processComplexApproval = async (approvalData) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./workers/approval-processor.js');
    worker.postMessage(approvalData);
    worker.on('message', resolve);
    worker.on('error', reject);
  });
};
```

## 📊 測定指標

### KPI
- **ファイルサイズ**: 56KB → 3KB（95%削減）
- **API応答時間**: 現在値 → 40%高速化
- **メモリ使用量**: 現在267MB → 60%削減
- **開発効率**: コードレビュー時間50%削減

### 成功基準
- [ ] 各ファイル350行以下
- [ ] API応答時間100ms以内
- [ ] メモリ使用量150MB以下
- [ ] 全エンドポイント正常動作

## 🔗 関連システムへの影響

### フロントエンド
- APIエンドポイントURL変更への対応
- エラーハンドリングの統一
- 新しいルーティング構造への適応

### データベース
- トランザクション処理の最適化
- 接続プール設定の調整
- クエリ実行計画の再検討

---

## 📋 実装優先度

| 機能 | 影響度 | 実装コスト | 優先度 | 期待効果 |
|------|--------|------------|---------|----------|
| workflow-types | ★★★ | 低 | 1位 | 基盤構築 |
| workflow-requests | ★★★ | 中 | 2位 | 主要機能 |
| emergency-approval | ★★ | 中 | 3位 | 重要機能 |
| delegation-approval | ★★ | 高 | 4位 | 複雑機能 |
| 統合ルーター | ★★★ | 低 | 5位 | 全体統合 |

---

*作成日: 2025-09-28*
*想定工期: 9日間*
*優先度: 最高（★★★）*
*期待削減率: 95%（56KB → 3KB）*