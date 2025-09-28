/**
 * Permissions Microservices Main Router
 * 権限マイクロサービス統合ルーター
 *
 * 機能:
 * - 7つのマイクロサービスの統合ルーティング
 * - レガシーAPI互換性保証
 * - フィーチャーフラグによる段階的移行
 */

import { Router } from 'express';
import permissionRolesRouter from './permission-roles';
import permissionUsersRouter from './permission-users';
import permissionTemplatesRouter from './permission-templates';
import permissionInheritanceRouter from './permission-inheritance';
import permissionMatrixRouter from './permission-matrix';
import permissionAuditRouter from './permission-audit';
import permissionValidationRouter from './permission-validation';

import { authMiddleware } from '../../middleware/auth';
import { performanceMonitor } from '../../middleware/performanceMonitor';
import { featureFlags } from '../../utils/featureFlags';

const router = Router();

// 全体の性能監視
router.use(performanceMonitor.middleware());

// 認証ミドルウェアを適用
router.use(authMiddleware);

// ヘルスチェックエンドポイント
router.get('/health', (req, res) => {
  const healthMetrics = performanceMonitor.getHealthMetrics();
  const migrationProgress = featureFlags.getMigrationProgress();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'permissions-microservices',
    version: '1.0.0',
    performance: healthMetrics,
    migration: migrationProgress,
    features: featureFlags.getFlags()
  });
});

// マイクロサービス型ルーター統合
router.use('/roles', permissionRolesRouter);
router.use('/users', permissionUsersRouter);
router.use('/templates', permissionTemplatesRouter);
router.use('/inheritance', permissionInheritanceRouter);
router.use('/matrix', permissionMatrixRouter);
router.use('/audit', permissionAuditRouter);
router.use('/validation', permissionValidationRouter);

// レガシーAPI互換性ラッパー（段階的移行用）
class LegacyPermissionsAPIWrapper {
  // レガシーエンドポイント: GET /api/permissions/department/:departmentId
  static async legacyGetDepartmentPermissions(req: any, res: any, next: any) {
    if (featureFlags.shouldUseNewPermissionRoles()) {
      // 新しいマイクロサービスに転送
      req.url = `/roles/department/${req.params.departmentId}`;
      next();
    } else {
      // レガシーAPIにフォールバック
      console.log('🔄 Using legacy department permissions API');
      next();
    }
  }

  // レガシーエンドポイント: POST /api/permissions/department/:departmentId
  static async legacyUpdateDepartmentPermissions(req: any, res: any, next: any) {
    if (featureFlags.shouldUseNewPermissionRoles()) {
      // 新しいマイクロサービスに転送
      req.url = `/roles/department/${req.params.departmentId}`;
      next();
    } else {
      // レガシーAPIにフォールバック
      console.log('🔄 Using legacy department permissions update API');
      next();
    }
  }

  // レガシーエンドポイント: GET /api/permissions/user/:userId
  static async legacyGetUserPermissions(req: any, res: any, next: any) {
    if (featureFlags.shouldUseNewPermissionUsers()) {
      // 新しいマイクロサービスに転送
      req.url = `/users/${req.params.userId}`;
      next();
    } else {
      // レガシーAPIにフォールバック
      console.log('🔄 Using legacy user permissions API');
      next();
    }
  }

  // レガシーエンドポイント: GET /api/permissions/matrix
  static async legacyGetPermissionMatrix(req: any, res: any, next: any) {
    if (featureFlags.shouldUseNewPermissionMatrix()) {
      // 新しいマイクロサービスに転送
      req.url = '/matrix';
      next();
    } else {
      // レガシーAPIにフォールバック
      console.log('🔄 Using legacy permission matrix API');
      next();
    }
  }

  // レガシーエンドポイント: POST /api/permissions/check
  static async legacyCheckPermission(req: any, res: any, next: any) {
    if (featureFlags.shouldUseNewPermissionValidation()) {
      // 新しいマイクロサービスに転送
      req.url = '/validation/check';
      next();
    } else {
      // レガシーAPIにフォールバック
      console.log('🔄 Using legacy permission check API');
      next();
    }
  }
}

// レガシー互換性ルート（段階的移行中のみ）
if (!featureFlags.isFullyMigrated()) {
  console.log('🔄 Legacy permissions compatibility mode enabled');

  // 互換性ラッパーを適用
  router.get('/department/:departmentId', LegacyPermissionsAPIWrapper.legacyGetDepartmentPermissions);
  router.post('/department/:departmentId', LegacyPermissionsAPIWrapper.legacyUpdateDepartmentPermissions);
  router.get('/user/:userId', LegacyPermissionsAPIWrapper.legacyGetUserPermissions);
  router.get('/matrix', LegacyPermissionsAPIWrapper.legacyGetPermissionMatrix);
  router.post('/check', LegacyPermissionsAPIWrapper.legacyCheckPermission);
}

// 性能統計エンドポイント（開発・監視用）
router.get('/performance', (req, res) => {
  const stats = performanceMonitor.getPerformanceStats();

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      service: 'permissions-microservices',
      performance: stats,
      migration: featureFlags.getMigrationProgress()
    }
  });
});

// フィーチャーフラグ制御エンドポイント（管理者のみ）
router.post('/feature-flags/:phase', (req, res) => {
  if ((req as any).user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: '管理者のみがフィーチャーフラグを制御できます'
    });
  }

  const phase = Number(req.params.phase);

  if (phase < 1 || phase > 7) {
    return res.status(400).json({
      success: false,
      message: '有効なフェーズ (1-7) を指定してください'
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
router.get('/migration/status', (req, res) => {
  const progress = featureFlags.getMigrationProgress();
  const flags = featureFlags.getFlags();

  res.json({
    success: true,
    data: {
      progress,
      flags,
      isFullyMigrated: featureFlags.isFullyMigrated(),
      nextPhase: progress.completed < 7 ? Math.floor(progress.completed / 1) + 1 : null
    }
  });
});

export default router;