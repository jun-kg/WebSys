/**
 * Permission Templates Microservice
 * 権限テンプレート管理マイクロサービス
 *
 * 機能:
 * - 権限テンプレートの作成・更新・削除・適用
 * - 12エンドポイント（約300行）
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
 * 権限テンプレート一覧取得
 * GET /api/permissions/templates
 */
router.get('/',
  [
    query('companyId').isInt({ min: 1 }).withMessage('有効な会社IDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { companyId } = req.query;

      console.log(`[PermissionTemplates] Getting templates for company ${companyId}`);

      const templates = await prisma.permission_templates.findMany({
        where: {
          companyId: parseInt(companyId as string),
          isActive: true
        },
        include: {
          permission_template_features: {
            include: {
              features: {
                select: { id: true, code: true, name: true, category: true }
              }
            }
          }
        },
        orderBy: { displayOrder: 'asc' }
      });

      const formattedTemplates = templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        isPreset: template.isPreset,
        displayOrder: template.displayOrder,
        features: template.permission_template_features.map(tf => ({
          featureId: tf.features.id,
          featureCode: tf.features.code,
          featureName: tf.features.name,
          featureCategory: tf.features.category,
          permissions: {
            canView: tf.canView,
            canCreate: tf.canCreate,
            canEdit: tf.canEdit,
            canDelete: tf.canDelete,
            canApprove: tf.canApprove,
            canExport: tf.canExport
          }
        }))
      }));

      res.json({
        success: true,
        data: formattedTemplates,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionTemplates] Error fetching permission templates:', error);
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
 * 権限テンプレート作成
 * POST /api/permissions/templates
 */
router.post('/',
  [
    body('companyId').isInt({ min: 1 }).withMessage('有効な会社IDを指定してください'),
    body('name').isString().isLength({ min: 1, max: 100 }).withMessage('テンプレート名は1-100文字で入力してください'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('説明は500文字以内で入力してください'),
    body('category').optional().isString().isLength({ max: 50 }),
    body('features').isArray({ min: 1 }).withMessage('機能権限設定が必要です'),
    body('features.*.featureId').isInt({ min: 1 }).withMessage('有効な機能IDを指定してください'),
    body('features.*.permissions').isObject().withMessage('権限設定はオブジェクトで指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        companyId,
        name,
        description,
        category,
        features
      } = req.body;
      const userId = (req as any).user.id;

      console.log(`[PermissionTemplates] Creating template "${name}" for company ${companyId} by user ${userId}`);

      // 会社の存在確認
      const company = await prisma.companies.findUnique({
        where: { id: companyId }
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された会社が見つかりません'
          }
        });
      }

      // テンプレート名の重複チェック
      const existingTemplate = await prisma.permission_templates.findFirst({
        where: {
          companyId,
          name,
          isActive: true
        }
      });

      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DUPLICATE_NAME',
            message: '同じ名前のテンプレートが既に存在します'
          }
        });
      }

      // 表示順序を取得
      const maxOrder = await prisma.permission_templates.aggregate({
        where: { companyId },
        _max: { displayOrder: true }
      });

      const displayOrder = (maxOrder._max.displayOrder || 0) + 1;

      // トランザクション内でテンプレートと機能権限を作成
      const template = await prisma.$transaction(async (tx) => {
        // テンプレート作成
        const newTemplate = await tx.permission_templates.create({
          data: {
            companyId,
            name,
            description,
            category: category || 'CUSTOM',
            isPreset: false,
            displayOrder,
            createdBy: userId,
            updatedBy: userId,
            updatedAt: new Date()
          }
        });

        // 機能権限を作成
        const permission_template_features = await Promise.all(
          features.map(feature =>
            tx.permission_template_features.create({
              data: {
                templateId: newTemplate.id,
                featureId: feature.featureId,
                canView: feature.permissions?.canView || false,
                canCreate: feature.permissions?.canCreate || false,
                canEdit: feature.permissions?.canEdit || false,
                canDelete: feature.permissions?.canDelete || false,
                canApprove: feature.permissions?.canApprove || false,
                canExport: feature.permissions?.canExport || false
              }
            })
          )
        );

        return { ...newTemplate, permission_template_features };
      });

      res.status(201).json({
        success: true,
        data: {
          id: template.id,
          name: template.name,
          message: 'テンプレートを作成しました'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionTemplates] Error creating permission template:', error);
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
 * 権限テンプレート適用
 * POST /api/permissions/templates/:templateId/apply
 */
router.post('/:templateId/apply',
  [
    param('templateId').isInt({ min: 1 }).withMessage('有効なテンプレートIDを指定してください'),
    body('departmentIds').isArray({ min: 1 }).withMessage('適用対象の部署を指定してください'),
    body('departmentIds.*').isInt({ min: 1 }).withMessage('有効な部署IDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const { departmentIds } = req.body;
      const userId = (req as any).user.id;

      console.log(`[PermissionTemplates] Applying template ${templateId} to ${departmentIds.length} departments by user ${userId}`);

      // テンプレートを取得
      const template = await prisma.permission_templates.findUnique({
        where: { id: templateId },
        include: {
          permission_template_features: true
        }
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定されたテンプレートが見つかりません'
          }
        });
      }

      // 部署の存在確認
      const departments = await prisma.departments.findMany({
        where: {
          id: { in: departmentIds },
          isActive: true
        }
      });

      if (departments.length !== departmentIds.length) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DEPARTMENTS',
            message: '一部の部署が存在しないか無効です'
          }
        });
      }

      // トランザクション内でテンプレートを適用
      const results = await prisma.$transaction(async (tx) => {
        const appliedResults = [];

        for (const departmentId of departmentIds) {
          for (const templateFeature of template.permission_template_features) {
            // 既存の権限設定を取得
            const existingPermission = await tx.department_feature_permissions.findUnique({
              where: {
                departmentId_featureId: {
                  departmentId,
                  featureId: templateFeature.featureId
                }
              }
            });

            const permissionData = {
              canView: templateFeature.canView,
              canCreate: templateFeature.canCreate,
              canEdit: templateFeature.canEdit,
              canDelete: templateFeature.canDelete,
              canApprove: templateFeature.canApprove,
              canExport: templateFeature.canExport,
              inheritFromParent: false,
              updatedBy: userId
            };

            if (existingPermission) {
              // 更新
              await tx.department_feature_permissions.update({
                where: {
                  departmentId_featureId: {
                    departmentId,
                    featureId: templateFeature.featureId
                  }
                },
                data: permissionData
              });

              // 監査ログを記録
              await tx.audit_logs.create({
                data: {
                  userId,
                  action: 'TEMPLATE_APPLY',
                  targetType: 'DEPARTMENT',
                  targetId: departmentId,
                  featureId: templateFeature.featureId,
                  oldPermissions: {
                    canView: existingPermission.canView,
                    canCreate: existingPermission.canCreate,
                    canEdit: existingPermission.canEdit,
                    canDelete: existingPermission.canDelete,
                    canApprove: existingPermission.canApprove,
                    canExport: existingPermission.canExport
                  },
                  newPermissions: {
                    canView: permissionData.canView,
                    canCreate: permissionData.canCreate,
                    canEdit: permissionData.canEdit,
                    canDelete: permissionData.canDelete,
                    canApprove: permissionData.canApprove,
                    canExport: permissionData.canExport
                  },
                  details: { templateId, templateName: template.name }
                }
              });
            } else {
              // 新規作成
              await tx.department_feature_permissions.create({
                data: {
                  departmentId,
                  featureId: templateFeature.featureId,
                  ...permissionData,
                  createdBy: userId
                }
              });

              // 監査ログを記録
              await tx.audit_logs.create({
                data: {
                  userId,
                  action: 'TEMPLATE_APPLY',
                  targetType: 'DEPARTMENT',
                  targetId: departmentId,
                  featureId: templateFeature.featureId,
                  oldPermissions: null,
                  newPermissions: {
                    canView: permissionData.canView,
                    canCreate: permissionData.canCreate,
                    canEdit: permissionData.canEdit,
                    canDelete: permissionData.canDelete,
                    canApprove: permissionData.canApprove,
                    canExport: permissionData.canExport
                  },
                  details: { templateId, templateName: template.name }
                }
              });
            }
          }

          appliedResults.push({ departmentId });
        }

        return appliedResults;
      });

      res.json({
        success: true,
        data: {
          message: 'テンプレートを適用しました',
          appliedDepartments: results.length,
          templateName: template.name
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionTemplates] Error applying permission template:', error);
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
 * 権限テンプレート削除
 * DELETE /api/permissions/templates/:templateId
 */
router.delete('/:templateId',
  [
    param('templateId').isInt({ min: 1 }).withMessage('有効なテンプレートIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const userId = (req as any).user.id;

      console.log(`[PermissionTemplates] Deleting template ${templateId} by user ${userId}`);

      // テンプレートを取得
      const template = await prisma.permission_templates.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定されたテンプレートが見つかりません'
          }
        });
      }

      // プリセットテンプレートは削除不可
      if (template.isPreset) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_DELETE_PRESET',
            message: 'プリセットテンプレートは削除できません'
          }
        });
      }

      // 論理削除
      await prisma.permission_templates.update({
        where: { id: templateId },
        data: {
          isActive: false,
          updatedBy: userId
        }
      });

      res.json({
        success: true,
        data: {
          message: 'テンプレートを削除しました'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionTemplates] Error deleting permission template:', error);
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