/**
 * Permission Validation Microservice
 * 権限検証マイクロサービス
 *
 * 機能:
 * - 権限チェック・一括チェック・バリデーション
 * - 5エンドポイント（約120行）
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
 * 権限チェック
 * POST /api/permissions/validation/check
 */
router.post('/check',
  [
    body('featureCode').isString().isLength({ min: 1 }).withMessage('機能コードが必要です'),
    body('action').isString().isIn(['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT']).withMessage('有効なアクションを指定してください'),
    body('userId').optional().isInt({ min: 1 }).withMessage('有効なユーザーIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { featureCode, action, userId } = req.body;
      const targetUserId = userId || (req as any).user.id;

      console.log(`[PermissionValidation] Checking permission for user ${targetUserId}, feature ${featureCode}, action ${action}`);

      const hasPermission = await checkUserPermission(targetUserId, featureCode, action);

      res.json({
        success: true,
        data: {
          hasPermission,
          feature: featureCode,
          action,
          userId: targetUserId,
          source: hasPermission ? 'DEPARTMENT' : null
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionValidation] Error checking permission:', error);
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
 * 権限一括チェック
 * POST /api/permissions/validation/check-bulk
 */
router.post('/check-bulk',
  [
    body('checks').isArray({ min: 1 }).withMessage('チェック項目が必要です'),
    body('checks.*.featureCode').isString().isLength({ min: 1 }).withMessage('機能コードが必要です'),
    body('checks.*.action').isString().isIn(['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT']).withMessage('有効なアクションを指定してください'),
    body('userId').optional().isInt({ min: 1 }).withMessage('有効なユーザーIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { checks, userId } = req.body;
      const targetUserId = userId || (req as any).user.id;

      console.log(`[PermissionValidation] Bulk checking ${checks.length} permissions for user ${targetUserId}`);

      const results = await Promise.all(
        checks.map(async (check) => {
          const hasPermission = await checkUserPermission(targetUserId, check.featureCode, check.action);
          return {
            featureCode: check.featureCode,
            action: check.action,
            hasPermission,
            source: hasPermission ? 'DEPARTMENT' : null
          };
        })
      );

      res.json({
        success: true,
        data: {
          userId: targetUserId,
          results,
          checkedCount: results.length,
          allowedCount: results.filter(r => r.hasPermission).length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionValidation] Error checking bulk permissions:', error);
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
 * 機能別権限詳細チェック
 * GET /api/permissions/validation/feature/:featureCode
 */
router.get('/feature/:featureCode',
  [
    param('featureCode').isString().isLength({ min: 1 }).withMessage('機能コードが必要です'),
    query('userId').optional().isInt({ min: 1 }).withMessage('有効なユーザーIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const featureCode = req.params.featureCode;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : (req as any).user.id;

      console.log(`[PermissionValidation] Getting detailed permissions for user ${userId}, feature ${featureCode}`);

      // 機能の存在確認
      const feature = await prisma.features.findUnique({
        where: { code: featureCode },
        select: { id: true, code: true, name: true, category: true }
      });

      if (!feature) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FEATURE_NOT_FOUND',
            message: '指定された機能が見つかりません'
          }
        });
      }

      // 全アクションの権限をチェック
      const actions = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT'];
      const permissions = await Promise.all(
        actions.map(async (action) => {
          const hasPermission = await checkUserPermission(userId, featureCode, action);
          return {
            action,
            hasPermission,
            source: hasPermission ? 'DEPARTMENT' : null
          };
        })
      );

      res.json({
        success: true,
        data: {
          feature,
          userId,
          permissions,
          hasAnyPermission: permissions.some(p => p.hasPermission)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionValidation] Error getting feature permissions:', error);
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

// ヘルパー関数
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