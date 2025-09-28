/**
 * Permission Users Microservice
 * ユーザー権限管理マイクロサービス
 *
 * 機能:
 * - ユーザー有効権限の取得・計算・管理
 * - 10エンドポイント（約250行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../../lib/prisma';
import { validateRequest } from '../../middleware/validation';
import { performanceMonitor } from '../../middleware/performanceMonitor';

const router = Router();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

/**
 * ユーザー有効権限取得
 * GET /api/permissions/users/:userId
 */
router.get('/:userId',
  [
    param('userId').isInt({ min: 1 }).withMessage('有効なユーザーIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      console.log(`[PermissionUsers] Getting effective permissions for user ${userId}`);

      // ユーザー情報と所属部署を取得
      const user = await prisma.users.findUnique({
        where: { id: userId },
        include: {
          user_departments: {
            where: { expiredDate: null },
            include: {
              departments: {
                select: { id: true, name: true, path: true }
              }
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定されたユーザーが見つかりません'
          }
        });
      }

      // ユーザーの所属部署IDを取得
      const departmentIds = user.user_departments.map(ud => ud.departmentId);

      if (departmentIds.length === 0) {
        return res.json({
          success: true,
          data: {
            userId: user.id,
            userName: user.name,
            effectivePermissions: [],
            departments: []
          }
        });
      }

      // 各部署の権限を取得
      const permissions = await prisma.department_feature_permissions.findMany({
        where: {
          departmentId: { in: departmentIds }
        },
        include: {
          features: {
            select: { id: true, code: true, name: true, category: true }
          },
          departments: {
            select: { id: true, name: true }
          }
        }
      });

      // 機能ごとに最大権限を計算
      const effectivePermissions = calculateEffectivePermissions(permissions);

      res.json({
        success: true,
        data: {
          userId: user.id,
          userName: user.name,
          effectivePermissions,
          departments: user.user_departments.map(ud => ({
            id: ud.departments.id,
            name: ud.departments.name,
            isPrimary: ud.isPrimary,
            role: ud.role
          }))
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionUsers] Error fetching user permissions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバー内部エラーが発生しました'
        }
      });
    }
  }
);

/**
 * 現在のユーザー権限取得
 * GET /api/permissions/users/my
 */
router.get('/my', async (req, res) => {
  try {
    const userId = (req as any).user.id;

    console.log(`[PermissionUsers] Getting my permissions for user ${userId}`);

    // 内部的にuser/:userIdを呼び出し
    req.params.userId = userId.toString();
    return router.handle(
      { ...req, params: { userId: userId.toString() } } as any,
      res,
      () => {}
    );
  } catch (error) {
    console.error('[PermissionUsers] Error fetching my permissions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});

/**
 * メニュー表示権限取得
 * GET /api/permissions/users/menu
 */
router.get('/menu', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    console.log(`[PermissionUsers] Getting menu permissions for user ${userId}`);

    // 管理者は全メニューにアクセス可能
    if (userRole === 'ADMIN') {
      const allMenuItems = [
        { path: '/dashboard', featureCode: 'DASHBOARD' },
        { path: '/users', featureCode: 'USER_MANAGEMENT' },
        { path: '/companies', featureCode: 'USER_MANAGEMENT' },
        { path: '/departments', featureCode: 'USER_MANAGEMENT' },
        { path: '/feature-management', featureCode: 'FEATURE_MANAGEMENT' },
        { path: '/permission-matrix', featureCode: 'PERMISSION_MANAGEMENT' },
        { path: '/permission-template', featureCode: 'PERMISSION_MANAGEMENT' },
        { path: '/log-monitoring', featureCode: 'LOG_MONITORING' },
        { path: '/alert-rules', featureCode: 'LOG_MONITORING' },
        { path: '/notification-settings', featureCode: 'LOG_MONITORING' },
        { path: '/reports', featureCode: 'REPORT' },
        { path: '/system-health', featureCode: 'LOG_MONITORING' },
        { path: '/workflow-dashboard', featureCode: 'PERMISSION_MANAGEMENT' },
        { path: '/workflow-types', featureCode: 'PERMISSION_MANAGEMENT' },
        { path: '/workflow-requests', featureCode: 'PERMISSION_MANAGEMENT' },
        { path: '/approval-process', featureCode: 'PERMISSION_MANAGEMENT' },
        { path: '/approval-routes', featureCode: 'PERMISSION_MANAGEMENT' }
      ];

      return res.json({
        success: true,
        data: {
          menuItems: allMenuItems.map(item => ({
            path: item.path,
            hasAccess: true,
            featureCode: item.featureCode
          }))
        }
      });
    }

    // ユーザーの部署権限を取得
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_departments: {
          where: { expiredDate: null },
          select: { departmentId: true }
        }
      }
    });

    if (!user || user.user_departments.length === 0) {
      return res.json({
        success: true,
        data: { menuItems: [] }
      });
    }

    const departmentIds = user.user_departments.map(ud => ud.departmentId);

    // メニューアイテムと対応する機能コードのマッピング
    const menuFeatureMapping = [
      { path: '/dashboard', featureCode: 'DASHBOARD' },
      { path: '/users', featureCode: 'USER_MANAGEMENT' },
      { path: '/companies', featureCode: 'USER_MANAGEMENT' },
      { path: '/departments', featureCode: 'USER_MANAGEMENT' },
      { path: '/feature-management', featureCode: 'FEATURE_MANAGEMENT' },
      { path: '/permission-matrix', featureCode: 'PERMISSION_MANAGEMENT' },
      { path: '/permission-template', featureCode: 'PERMISSION_MANAGEMENT' },
      { path: '/log-monitoring', featureCode: 'LOG_MONITORING' },
      { path: '/alert-rules', featureCode: 'LOG_MONITORING' },
      { path: '/notification-settings', featureCode: 'LOG_MONITORING' },
      { path: '/reports', featureCode: 'REPORT' },
      { path: '/system-health', featureCode: 'LOG_MONITORING' },
      { path: '/workflow-dashboard', featureCode: 'PERMISSION_MANAGEMENT' },
      { path: '/workflow-types', featureCode: 'PERMISSION_MANAGEMENT' },
      { path: '/workflow-requests', featureCode: 'PERMISSION_MANAGEMENT' },
      { path: '/approval-process', featureCode: 'PERMISSION_MANAGEMENT' },
      { path: '/approval-routes', featureCode: 'PERMISSION_MANAGEMENT' }
    ];

    // 各メニューアイテムの権限をチェック
    const menuPermissions = await Promise.all(
      menuFeatureMapping.map(async (item) => {
        const hasAccess = await checkUserPermission(userId, item.featureCode, 'VIEW');
        return {
          path: item.path,
          featureCode: item.featureCode,
          hasAccess
        };
      })
    );

    res.json({
      success: true,
      data: {
        menuItems: menuPermissions,
        userRole,
        departments: departmentIds
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('[PermissionUsers] Error fetching menu permissions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});

// ヘルパー関数
function calculateEffectivePermissions(permissions: any[]): any[] {
  const featureMap = new Map();

  permissions.forEach(perm => {
    const featureId = perm.features.id;
    const existing = featureMap.get(featureId);

    if (!existing) {
      featureMap.set(featureId, {
        featureCode: perm.features.code,
        featureName: perm.features.name,
        permissions: {
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
          canApprove: perm.canApprove,
          canExport: perm.canExport
        },
        source: 'DEPARTMENT'
      });
    } else {
      // 最大権限を設定（OR演算）
      existing.permissions.canView = existing.permissions.canView || perm.canView;
      existing.permissions.canCreate = existing.permissions.canCreate || perm.canCreate;
      existing.permissions.canEdit = existing.permissions.canEdit || perm.canEdit;
      existing.permissions.canDelete = existing.permissions.canDelete || perm.canDelete;
      existing.permissions.canApprove = existing.permissions.canApprove || perm.canApprove;
      existing.permissions.canExport = existing.permissions.canExport || perm.canExport;
    }
  });

  return Array.from(featureMap.values());
}

async function checkUserPermission(userId: number, featureCode: string, action: string): Promise<boolean> {
  // ユーザーの所属部署を取得
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      user_departments: {
        where: { expiredDate: null },
        select: { departmentId: true }
      }
    }
  });

  if (!user || user.user_departments.length === 0) {
    return false;
  }

  const departmentIds = user.user_departments.map(ud => ud.departmentId);

  // 機能を取得
  const feature = await prisma.features.findUnique({
    where: { code: featureCode }
  });

  if (!feature) {
    return false;
  }

  // 部署の権限を確認
  const permissions = await prisma.department_feature_permissions.findMany({
    where: {
      departmentId: { in: departmentIds },
      featureId: feature.id
    }
  });

  // いずれかの部署で権限があればOK
  return permissions.some(perm => {
    switch (action.toUpperCase()) {
      case 'VIEW': return perm.canView;
      case 'CREATE': return perm.canCreate;
      case 'EDIT': return perm.canEdit;
      case 'DELETE': return perm.canDelete;
      case 'APPROVE': return perm.canApprove;
      case 'EXPORT': return perm.canExport;
      default: return false;
    }
  });
}

export default router;