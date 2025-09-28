/**
 * Workflow Microservices Main Router
 * ワークフローマイクロサービス統合ルーター
 *
 * 機能:
 * - 9つのマイクロサービスの統合ルーティング
 * - レガシーAPI互換性保証
 * - フィーチャーフラグによる段階的移行
 */

import { Router } from 'express';
import workflowTypesRouter from './workflow-types';
import workflowRequestsRouter from './workflow-requests';
import workflowDashboardRouter from './workflow-dashboard';
// import emergencyApprovalRouter from './emergency-approval';
// import delegationApprovalRouter from './delegation-approval';
// import proxyApprovalRouter from './proxy-approval';
// import parallelApprovalRouter from './parallel-approval';
// import sequentialApprovalRouter from './sequential-approval';
// import autoApprovalRouter from './auto-approval';

import { authenticate } from '../../middleware/auth';
import { performanceMonitor } from '../../middleware/performanceMonitor';
import { featureFlags } from '../../utils/featureFlags';

const router = Router();

// 全体の性能監視
router.use(performanceMonitor.middleware());

// ヘルスチェックエンドポイント
router.get('/health', (req, res) => {
  const healthMetrics = performanceMonitor.getHealthMetrics();
  const migrationProgress = featureFlags.getMigrationProgress();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'workflow-microservices',
    version: '1.0.0',
    performance: healthMetrics,
    migration: migrationProgress,
    features: featureFlags.getFlags()
  });
});

// マイクロサービス型ルーター統合
router.use('/types', workflowTypesRouter);
router.use('/requests', workflowRequestsRouter);
router.use('/dashboard', workflowDashboardRouter);

// Phase 3-4で作成されたマイクロサービス（フィーチャーフラグで制御）
import emergencyApprovalRouter from './emergency-approval';
import delegationApprovalRouter from './delegation-approval';
import proxyApprovalRouter from './proxy-approval';
import parallelApprovalRouter from './parallel-approval';
import sequentialApprovalRouter from './sequential-approval';
import autoApprovalRouter from './auto-approval';

// 段階的有効化（フィーチャーフラグベース）
if (featureFlags.shouldUseNewEmergencyApproval()) {
  router.use('/emergency', emergencyApprovalRouter);
}
if (featureFlags.shouldUseNewDelegationApproval()) {
  router.use('/delegation', delegationApprovalRouter);
}
if (featureFlags.shouldUseNewProxyApproval()) {
  router.use('/proxy', proxyApprovalRouter);
}
if (featureFlags.shouldUseNewParallelApproval()) {
  router.use('/parallel', parallelApprovalRouter);
}
if (featureFlags.shouldUseNewSequentialApproval()) {
  router.use('/sequential', sequentialApprovalRouter);
}
if (featureFlags.shouldUseNewAutoApproval()) {
  router.use('/auto', autoApprovalRouter);
}

// レガシーAPI互換性ラッパー（段階的移行用）
class LegacyWorkflowAPIWrapper {
  // レガシーエンドポイント: GET /api/workflow/types
  static async legacyGetWorkflowTypes(req: any, res: any, next: any) {
    if (featureFlags.shouldUseNewWorkflowTypes()) {
      // 新しいマイクロサービスに転送
      req.url = '/types';
      next();
    } else {
      // レガシーAPIにフォールバック
      console.log('🔄 Using legacy workflow types API');
      next();
    }
  }

  // レガシーエンドポイント: GET /api/workflow/requests
  static async legacyGetWorkflowRequests(req: any, res: any, next: any) {
    if (featureFlags.shouldUseNewWorkflowRequests()) {
      // 新しいマイクロサービスに転送
      req.url = '/requests';
      next();
    } else {
      // レガシーAPIにフォールバック
      console.log('🔄 Using legacy workflow requests API');
      next();
    }
  }

  // レガシーエンドポイント: GET /api/workflow/dashboard
  static async legacyGetWorkflowDashboard(req: any, res: any, next: any) {
    if (featureFlags.shouldUseNewWorkflowDashboard()) {
      // 新しいマイクロサービスに転送
      req.url = '/dashboard/statistics';
      next();
    } else {
      // レガシーAPIにフォールバック
      console.log('🔄 Using legacy workflow dashboard API');
      next();
    }
  }
}

// レガシー互換性ルート（段階的移行中のみ）
if (!featureFlags.isFullyMigrated()) {
  console.log('🔄 Legacy compatibility mode enabled');

  // 互換性ラッパーを適用
  router.get('/types', LegacyWorkflowAPIWrapper.legacyGetWorkflowTypes);
  router.get('/requests', LegacyWorkflowAPIWrapper.legacyGetWorkflowRequests);
  router.get('/dashboard', LegacyWorkflowAPIWrapper.legacyGetWorkflowDashboard);
}

// 性能統計エンドポイント（開発・監視用）
router.get('/performance', authenticate, (req, res) => {
  const stats = performanceMonitor.getPerformanceStats();

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      service: 'workflow-microservices',
      performance: stats,
      migration: featureFlags.getMigrationProgress()
    }
  });
});

// フィーチャーフラグ制御エンドポイント（管理者のみ）
router.post('/feature-flags/:phase', authenticate, (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: '管理者のみがフィーチャーフラグを制御できます'
    });
  }

  const phase = Number(req.params.phase);

  if (phase < 1 || phase > 5) {
    return res.status(400).json({
      success: false,
      message: '有効なフェーズ (1-5) を指定してください'
    });
  }

  featureFlags.enablePhase(phase);
  featureFlags.logStatus();

  res.json({
    success: true,
    message: `Phase ${phase} を有効化しました`,
    data: {
      enabledPhase: phase,
      flags: featureFlags.getFlags(),
      progress: featureFlags.getMigrationProgress()
    }
  });
});

// Migration status エンドポイント
router.get('/migration/status', authenticate, (req, res) => {
  const progress = featureFlags.getMigrationProgress();
  const flags = featureFlags.getFlags();

  res.json({
    success: true,
    data: {
      progress,
      flags,
      isFullyMigrated: featureFlags.isFullyMigrated(),
      nextPhase: progress.completed < 9 ? Math.floor(progress.completed / 2) + 1 : null
    }
  });
});

export default router;