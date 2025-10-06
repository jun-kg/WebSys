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

// Phase 3: 新しい役職権限システム（T014-T016）
import rolePermissionsRouter from '../permissions';

import { authMiddleware } from '@core/middleware/auth';
import { performanceMonitor } from '../../../middleware/performanceMonitor';
import { featureFlags } from '@custom/utils/featureFlags';
import { prisma } from '@core/lib/prisma';

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

// Phase 3: 役職権限マトリクスAPI（T014-T016）
// 優先度: 高 - 新しい役職ベース権限システムを最優先で統合
router.use('/', rolePermissionsRouter);

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

// メニュー権限エンドポイント（直接ルーティング）
router.get('/menu', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    console.log(`[Permissions] Getting menu permissions for user ${userId}, role ${userRole}`);

    // 管理者は全メニューアクセス可能
    if (userRole === 'ADMIN') {
      const allMenuItems = [
        { path: '/dashboard', name: 'ダッシュボード', hasAccess: true },
        { path: '/users', name: 'ユーザー管理', hasAccess: true },
        { path: '/companies', name: '会社管理', hasAccess: true },
        { path: '/departments', name: '部署管理', hasAccess: true },
        { path: '/permissions', name: '権限管理', hasAccess: true },
        { path: '/permissions/matrix', name: '権限マトリクス', hasAccess: true },
        { path: '/permissions/templates', name: '権限テンプレート', hasAccess: true },
        { path: '/permissions/inheritance', name: '権限継承', hasAccess: true },
        { path: '/logs', name: 'ログ監視', hasAccess: true },
        { path: '/statistics', name: '統計', hasAccess: true },
        { path: '/reports', name: 'レポート', hasAccess: true },
        { path: '/workflow', name: 'ワークフロー', hasAccess: true },
        { path: '/approval', name: '承認管理', hasAccess: true }
      ];

      return res.json({
        success: true,
        data: {
          menuItems: allMenuItems
        }
      });
    }

    // 一般ユーザーの場合、基本メニューのみアクセス可能
    const basicMenuItems = [
      { path: '/dashboard', name: 'ダッシュボード', hasAccess: true }
    ];

    res.json({
      success: true,
      data: {
        menuItems: basicMenuItems
      }
    });
  } catch (error) {
    console.error('[Permissions] Error fetching menu permissions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});

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