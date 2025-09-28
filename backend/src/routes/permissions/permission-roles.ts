/**
 * Permission Roles Microservice
 * 役職権限管理マイクロサービス
 *
 * 機能:
 * - 部署権限の取得・更新・管理
 * - 8エンドポイント（約200行）
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
 * 部署権限取得
 * GET /api/permissions/roles/department/:departmentId
 */
router.get('/department/:departmentId',
  [
    param('departmentId').isInt({ min: 1 }).withMessage('有効な部署IDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const departmentId = parseInt(req.params.departmentId);

      console.log(`[PermissionRoles] Getting permissions for department ${departmentId}`);

      // 部署情報を取得
      const department = await prisma.departments.findUnique({
        where: { id: departmentId },
        select: { id: true, name: true, parentId: true }
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された部署が見つかりません'
          }
        });
      }

      // 全機能を取得
      const features = await prisma.features.findMany({
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { displayOrder: 'asc' },
          { name: 'asc' }
        ]
      });

      // 部署の権限設定を取得
      const permissions = await prisma.department_feature_permissions.findMany({
        where: { departmentId },
        include: {
          features: {
            select: { id: true, code: true, name: true, category: true }
          }
        }
      });

      // 権限マップを作成
      const permissionMap = new Map();
      permissions.forEach(perm => {
        permissionMap.set(perm.featureId, perm);
      });

      // レスポンス用データを構築
      const permissionList = features.map(feature => {
        const permission = permissionMap.get(feature.id);

        return {
          featureId: feature.id,
          featureCode: feature.code,
          featureName: feature.name,
          category: feature.category,
          permissions: {
            canView: permission?.canView || false,
            canCreate: permission?.canCreate || false,
            canEdit: permission?.canEdit || false,
            canDelete: permission?.canDelete || false,
            canApprove: permission?.canApprove || false,
            canExport: permission?.canExport || false
          },
          inheritFromParent: permission?.inheritFromParent || true
        };
      });

      res.json({
        success: true,
        data: {
          departmentId: department.id,
          departmentName: department.name,
          permissions: permissionList
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionRoles] Error fetching department permissions:', error);
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
 * 部署権限更新
 * POST /api/permissions/roles/department/:departmentId
 */
router.post('/department/:departmentId',
  [
    param('departmentId').isInt({ min: 1 }).withMessage('有効な部署IDを指定してください'),
    body('permissions').isArray({ min: 1 }).withMessage('権限データが必要です'),
    body('permissions.*.featureId').isInt({ min: 1 }).withMessage('有効な機能IDを指定してください'),
    body('permissions.*.canView').optional().isBoolean(),
    body('permissions.*.canCreate').optional().isBoolean(),
    body('permissions.*.canEdit').optional().isBoolean(),
    body('permissions.*.canDelete').optional().isBoolean(),
    body('permissions.*.canApprove').optional().isBoolean(),
    body('permissions.*.canExport').optional().isBoolean(),
    body('permissions.*.inheritFromParent').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const departmentId = parseInt(req.params.departmentId);
      const { permissions } = req.body;
      const userId = (req as any).user.id;

      console.log(`[PermissionRoles] Updating permissions for department ${departmentId} by user ${userId}`);

      // 部署の存在確認
      const department = await prisma.departments.findUnique({
        where: { id: departmentId }
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された部署が見つかりません'
          }
        });
      }

      // トランザクション内で権限を更新
      const results = await prisma.$transaction(async (tx) => {
        const updateResults = [];

        for (const permData of permissions) {
          const {
            featureId,
            canView,
            canCreate,
            canEdit,
            canDelete,
            canApprove,
            canExport,
            inheritFromParent
          } = permData;

          // 既存の権限設定を取得
          const existingPermission = await tx.department_feature_permissions.findUnique({
            where: {
              departmentId_featureId: {
                departmentId,
                featureId
              }
            }
          });

          const permissionData = {
            canView: canView || false,
            canCreate: canCreate || false,
            canEdit: canEdit || false,
            canDelete: canDelete || false,
            canApprove: canApprove || false,
            canExport: canExport || false,
            inheritFromParent: inheritFromParent !== false,
            updatedBy: userId
          };

          let result;
          if (existingPermission) {
            // 監査ログ用に変更前の値を保存
            const oldPermissions = {
              canView: existingPermission.canView,
              canCreate: existingPermission.canCreate,
              canEdit: existingPermission.canEdit,
              canDelete: existingPermission.canDelete,
              canApprove: existingPermission.canApprove,
              canExport: existingPermission.canExport
            };

            // 更新
            result = await tx.department_feature_permissions.update({
              where: {
                departmentId_featureId: {
                  departmentId,
                  featureId
                }
              },
              data: permissionData
            });

            // 監査ログを記録
            await tx.audit_logs.create({
              data: {
                userId,
                action: 'MODIFY',
                targetType: 'DEPARTMENT',
                targetId: departmentId,
                featureId,
                oldPermissions,
                newPermissions: {
                  canView: permissionData.canView,
                  canCreate: permissionData.canCreate,
                  canEdit: permissionData.canEdit,
                  canDelete: permissionData.canDelete,
                  canApprove: permissionData.canApprove,
                  canExport: permissionData.canExport
                }
              }
            });
          } else {
            // 新規作成
            result = await tx.department_feature_permissions.create({
              data: {
                departmentId,
                featureId,
                ...permissionData,
                createdBy: userId
              }
            });

            // 監査ログを記録
            await tx.audit_logs.create({
              data: {
                userId,
                action: 'GRANT',
                targetType: 'DEPARTMENT',
                targetId: departmentId,
                featureId,
                oldPermissions: null,
                newPermissions: {
                  canView: permissionData.canView,
                  canCreate: permissionData.canCreate,
                  canEdit: permissionData.canEdit,
                  canDelete: permissionData.canDelete,
                  canApprove: permissionData.canApprove,
                  canExport: permissionData.canExport
                }
              }
            });
          }

          updateResults.push(result);
        }

        return updateResults;
      });

      res.json({
        success: true,
        data: {
          message: '権限を更新しました',
          updatedCount: results.length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionRoles] Error updating department permissions:', error);
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

export default router;