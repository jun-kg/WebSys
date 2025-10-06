/**
 * Permission Inheritance Microservice
 * 権限継承管理マイクロサービス
 *
 * 機能:
 * - 権限継承設定・親子関係管理
 * - 7エンドポイント（約180行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '@core/lib/prisma';
import { validateRequest } from '../../../middleware/validation';
import { performanceMonitor } from '../../../middleware/performanceMonitor';

const router = Router();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

/**
 * 権限継承設定取得
 * GET /api/permissions/inheritance/department/:departmentId
 */
router.get('/department/:departmentId',
  [
    param('departmentId').isInt({ min: 1 }).withMessage('有効な部署IDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const departmentId = parseInt(req.params.departmentId);

      console.log(`[PermissionInheritance] Getting inheritance settings for department ${departmentId}`);

      // 部署情報と親部署を取得
      const department = await prisma.departments.findUnique({
        where: { id: departmentId },
        include: {
          parent: {
            select: { id: true, name: true, level: true }
          },
          children: {
            select: { id: true, name: true, level: true },
            where: { isActive: true }
          }
        }
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

      // 現在の部署の権限設定を取得
      const currentPermissions = await prisma.department_feature_permissions.findMany({
        where: { departmentId },
        include: {
          features: {
            select: { id: true, code: true, name: true, category: true }
          }
        }
      });

      // 親部署の権限設定を取得（継承用）
      let inheritedPermissions = [];
      if (department.parent) {
        inheritedPermissions = await prisma.department_feature_permissions.findMany({
          where: { departmentId: department.parent.id },
          include: {
            features: {
              select: { id: true, code: true, name: true, category: true }
            }
          }
        });
      }

      // 継承設定の分析
      const inheritanceAnalysis = analyzeInheritance(currentPermissions, inheritedPermissions);

      res.json({
        success: true,
        data: {
          department: {
            id: department.id,
            name: department.name,
            level: department.level,
            parent: department.parent,
            children: department.children
          },
          currentPermissions: currentPermissions.map(p => ({
            featureId: p.features.id,
            featureCode: p.features.code,
            featureName: p.features.name,
            permissions: {
              canView: p.canView,
              canCreate: p.canCreate,
              canEdit: p.canEdit,
              canDelete: p.canDelete,
              canApprove: p.canApprove,
              canExport: p.canExport
            },
            inheritFromParent: p.inheritFromParent
          })),
          inheritedPermissions: inheritedPermissions.map(p => ({
            featureId: p.features.id,
            featureCode: p.features.code,
            featureName: p.features.name,
            permissions: {
              canView: p.canView,
              canCreate: p.canCreate,
              canEdit: p.canEdit,
              canDelete: p.canDelete,
              canApprove: p.canApprove,
              canExport: p.canExport
            }
          })),
          inheritanceAnalysis
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionInheritance] Error fetching inheritance settings:', error);
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
 * 権限継承設定更新
 * POST /api/permissions/inheritance/department/:departmentId
 */
router.post('/department/:departmentId',
  [
    param('departmentId').isInt({ min: 1 }).withMessage('有効な部署IDを指定してください'),
    body('inheritanceSettings').isArray({ min: 1 }).withMessage('継承設定が必要です'),
    body('inheritanceSettings.*.featureId').isInt({ min: 1 }).withMessage('有効な機能IDを指定してください'),
    body('inheritanceSettings.*.inheritFromParent').isBoolean().withMessage('継承フラグを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const departmentId = parseInt(req.params.departmentId);
      const { inheritanceSettings } = req.body;
      const userId = (req as any).user.id;

      console.log(`[PermissionInheritance] Updating inheritance settings for department ${departmentId} by user ${userId}`);

      // 部署の存在確認
      const department = await prisma.departments.findUnique({
        where: { id: departmentId },
        include: {
          parent: { select: { id: true } }
        }
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

      // 親部署がない場合は継承設定不可
      if (!department.parent) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_PARENT_DEPARTMENT',
            message: 'ルート部署は権限継承設定できません'
          }
        });
      }

      // トランザクション内で継承設定を更新
      const results = await prisma.$transaction(async (tx) => {
        const updateResults = [];

        for (const setting of inheritanceSettings) {
          const { featureId, inheritFromParent } = setting;

          // 既存の権限設定を取得
          const existingPermission = await tx.department_feature_permissions.findUnique({
            where: {
              departmentId_featureId: {
                departmentId,
                featureId
              }
            }
          });

          if (existingPermission) {
            // 継承設定のみ更新
            const result = await tx.department_feature_permissions.update({
              where: {
                departmentId_featureId: {
                  departmentId,
                  featureId
                }
              },
              data: {
                inheritFromParent,
                updatedBy: userId
              }
            });

            // 監査ログを記録
            await tx.audit_logs.create({
              data: {
                userId,
                action: 'INHERITANCE_UPDATE',
                targetType: 'DEPARTMENT',
                targetId: departmentId,
                featureId,
                oldPermissions: { inheritFromParent: existingPermission.inheritFromParent },
                newPermissions: { inheritFromParent },
                details: { parentDepartmentId: department.parent.id }
              }
            });

            updateResults.push(result);
          } else {
            // 継承設定のみの新規レコード作成
            const result = await tx.department_feature_permissions.create({
              data: {
                departmentId,
                featureId,
                canView: false,
                canCreate: false,
                canEdit: false,
                canDelete: false,
                canApprove: false,
                canExport: false,
                inheritFromParent,
                createdBy: userId,
                updatedBy: userId
              }
            });

            // 監査ログを記録
            await tx.audit_logs.create({
              data: {
                userId,
                action: 'INHERITANCE_CREATE',
                targetType: 'DEPARTMENT',
                targetId: departmentId,
                featureId,
                oldPermissions: null,
                newPermissions: { inheritFromParent },
                details: { parentDepartmentId: department.parent.id }
              }
            });

            updateResults.push(result);
          }
        }

        return updateResults;
      });

      res.json({
        success: true,
        data: {
          message: '権限継承設定を更新しました',
          updatedCount: results.length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionInheritance] Error updating inheritance settings:', error);
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
 * 継承権限計算
 * GET /api/permissions/inheritance/calculate/:departmentId
 */
router.get('/calculate/:departmentId',
  [
    param('departmentId').isInt({ min: 1 }).withMessage('有効な部署IDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const departmentId = parseInt(req.params.departmentId);

      console.log(`[PermissionInheritance] Calculating effective permissions for department ${departmentId}`);

      const effectivePermissions = await calculateEffectivePermissions(departmentId);

      res.json({
        success: true,
        data: {
          departmentId,
          effectivePermissions
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionInheritance] Error calculating effective permissions:', error);
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
function analyzeInheritance(currentPermissions: any[], inheritedPermissions: any[]) {
  const inheritedMap = new Map();
  inheritedPermissions.forEach(p => {
    inheritedMap.set(p.featureId, p);
  });

  const analysis = {
    totalFeatures: currentPermissions.length,
    inheritedCount: 0,
    overriddenCount: 0,
    conflicts: []
  };

  currentPermissions.forEach(current => {
    const inherited = inheritedMap.get(current.featureId);

    if (current.inheritFromParent) {
      analysis.inheritedCount++;

      if (inherited) {
        // 継承設定だが親と異なる権限がある場合
        const hasConflict =
          current.canView !== inherited.canView ||
          current.canCreate !== inherited.canCreate ||
          current.canEdit !== inherited.canEdit ||
          current.canDelete !== inherited.canDelete ||
          current.canApprove !== inherited.canApprove ||
          current.canExport !== inherited.canExport;

        if (hasConflict) {
          analysis.conflicts.push({
            featureId: current.featureId,
            featureCode: current.features.code,
            issue: 'INHERITANCE_CONFLICT'
          });
        }
      }
    } else {
      analysis.overriddenCount++;
    }
  });

  return analysis;
}

async function calculateEffectivePermissions(departmentId: number) {
  // 部署の階層を上に向かって取得
  const departmentPath = await getDepartmentPath(departmentId);

  // 各階層の権限を取得
  const allPermissions = await prisma.department_feature_permissions.findMany({
    where: {
      departmentId: { in: departmentPath.map(d => d.id) }
    },
    include: {
      features: {
        select: { id: true, code: true, name: true }
      }
    }
  });

  // 継承ルールに基づいて有効権限を計算
  const effectiveMap = new Map();

  // 下位部署から上位部署へ向かって処理
  departmentPath.reverse().forEach(dept => {
    const deptPermissions = allPermissions.filter(p => p.departmentId === dept.id);

    deptPermissions.forEach(perm => {
      if (!effectiveMap.has(perm.featureId)) {
        if (perm.inheritFromParent && dept.id !== departmentId) {
          // 親部署の権限を継承
          effectiveMap.set(perm.featureId, perm);
        } else if (dept.id === departmentId) {
          // 自部署の設定
          effectiveMap.set(perm.featureId, perm);
        }
      }
    });
  });

  return Array.from(effectiveMap.values()).map(perm => ({
    featureId: perm.features.id,
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
    source: perm.departmentId === departmentId ? 'OWN' : 'INHERITED'
  }));
}

async function getDepartmentPath(departmentId: number): Promise<any[]> {
  const path = [];
  let currentId = departmentId;

  while (currentId) {
    const dept = await prisma.departments.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true }
    });

    if (!dept) break;

    path.push(dept);
    currentId = dept.parentId;
  }

  return path;
}

export default router;