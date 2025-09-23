import { Router } from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 認証ミドルウェアを適用
router.use(authMiddleware);

/**
 * 部署権限取得
 * GET /api/permissions/department/:departmentId
 */
router.get('/department/:departmentId', async (req: Request, res: Response) => {
  try {
    const departmentId = parseInt(req.params.departmentId);

    // 部署情報を取得
    const department = await prisma.department.findUnique({
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
    const features = await prisma.feature.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    // 部署の権限設定を取得
    const permissions = await prisma.departmentFeaturePermission.findMany({
      where: { departmentId },
      include: {
        feature: {
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
    console.error('Error fetching department permissions:', error);
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
 * 部署権限更新
 * POST /api/permissions/department/:departmentId
 */
router.post('/department/:departmentId', async (req: Request, res: Response) => {
  try {
    const departmentId = parseInt(req.params.departmentId);
    const { permissions } = req.body;
    const userId = (req as any).user.id; // 認証ミドルウェアで設定

    // 部署の存在確認
    const department = await prisma.department.findUnique({
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
        const existingPermission = await tx.departmentFeaturePermission.findUnique({
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
          result = await tx.departmentFeaturePermission.update({
            where: {
              departmentId_featureId: {
                departmentId,
                featureId
              }
            },
            data: permissionData
          });

          // 監査ログを記録
          await tx.auditLog.create({
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
          result = await tx.departmentFeaturePermission.create({
            data: {
              departmentId,
              featureId,
              ...permissionData,
              createdBy: userId
            }
          });

          // 監査ログを記録
          await tx.auditLog.create({
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
    console.error('Error updating department permissions:', error);
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
 * ユーザー有効権限取得
 * GET /api/permissions/user/:userId
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    // ユーザー情報と所属部署を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userDepartments: {
          where: { expiredDate: null },
          include: {
            department: {
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
    const departmentIds = user.userDepartments.map(ud => ud.departmentId);

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
    const permissions = await prisma.departmentFeaturePermission.findMany({
      where: {
        departmentId: { in: departmentIds }
      },
      include: {
        feature: {
          select: { id: true, code: true, name: true, category: true }
        },
        department: {
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
        departments: user.userDepartments.map(ud => ({
          id: ud.department.id,
          name: ud.department.name,
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
    console.error('Error fetching user permissions:', error);
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
 * 現在のユーザー権限取得
 * GET /api/permissions/my
 */
router.get('/my', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // 内部的にuser/:userIdを呼び出し
    req.params.userId = userId.toString();
    return router.handle(
      { ...req, params: { userId: userId.toString() } } as any,
      res,
      () => {}
    );
  } catch (error) {
    console.error('Error fetching my permissions:', error);
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
 * 権限チェック
 * POST /api/permissions/check
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { featureCode, action } = req.body;
    const userId = (req as any).user.id;

    if (!featureCode || !action) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'featureCodeとactionは必須です'
        }
      });
    }

    const hasPermission = await checkUserPermission(userId, featureCode, action);

    res.json({
      success: true,
      data: {
        hasPermission,
        feature: featureCode,
        action,
        source: hasPermission ? 'DEPARTMENT' : null
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error checking permission:', error);
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
 * 権限一括チェック
 * POST /api/permissions/check-bulk
 */
router.post('/check-bulk', async (req: Request, res: Response) => {
  try {
    const { checks } = req.body;
    const userId = (req as any).user.id;

    if (!Array.isArray(checks)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'checksは配列である必要があります'
        }
      });
    }

    const results = await Promise.all(
      checks.map(async (check) => {
        const hasPermission = await checkUserPermission(userId, check.featureCode, check.action);
        return {
          featureCode: check.featureCode,
          action: check.action,
          hasPermission
        };
      })
    );

    res.json({
      success: true,
      data: {
        results
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error checking bulk permissions:', error);
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
 * 権限マトリクスレポート取得
 * GET /api/permissions/matrix
 */
router.get('/matrix', async (req: Request, res: Response) => {
  try {
    const { companyId, departmentIds } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '会社IDが必要です'
        }
      });
    }

    let deptWhere: any = {
      companyId: parseInt(companyId as string),
      isActive: true
    };

    if (departmentIds) {
      const ids = (departmentIds as string).split(',').map(id => parseInt(id));
      deptWhere.id = { in: ids };
    }

    // 部署と機能を取得
    const [departments, features] = await Promise.all([
      prisma.department.findMany({
        where: deptWhere,
        orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }]
      }),
      prisma.feature.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }]
      })
    ]);

    // 全部署の権限設定を取得
    const allPermissions = await prisma.departmentFeaturePermission.findMany({
      where: {
        departmentId: { in: departments.map(d => d.id) }
      }
    });

    // 部署×機能のマトリクス作成
    const matrix = departments.map(dept => {
      const deptPermissions = allPermissions.filter(p => p.departmentId === dept.id);
      const permissionMap = new Map();
      deptPermissions.forEach(p => {
        permissionMap.set(p.featureId, p);
      });

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        features: features.map(feature => {
          const perm = permissionMap.get(feature.id);
          const permissions = [];

          if (perm?.canView) permissions.push('V');
          if (perm?.canCreate) permissions.push('C');
          if (perm?.canEdit) permissions.push('E');
          if (perm?.canDelete) permissions.push('D');
          if (perm?.canApprove) permissions.push('A');
          if (perm?.canExport) permissions.push('X');

          return {
            featureCode: feature.code,
            featureName: feature.name,
            permissions: permissions.join(',') || '-'
          };
        })
      };
    });

    res.json({
      success: true,
      data: {
        matrix,
        legend: {
          'V': '閲覧',
          'C': '作成',
          'E': '編集',
          'D': '削除',
          'A': '承認',
          'X': '出力'
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error fetching permission matrix:', error);
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
    const featureId = perm.feature.id;
    const existing = featureMap.get(featureId);

    if (!existing) {
      featureMap.set(featureId, {
        featureCode: perm.feature.code,
        featureName: perm.feature.name,
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userDepartments: {
        where: { expiredDate: null },
        select: { departmentId: true }
      }
    }
  });

  if (!user || user.userDepartments.length === 0) {
    return false;
  }

  const departmentIds = user.userDepartments.map(ud => ud.departmentId);

  // 機能を取得
  const feature = await prisma.feature.findUnique({
    where: { code: featureCode }
  });

  if (!feature) {
    return false;
  }

  // 部署の権限を確認
  const permissions = await prisma.departmentFeaturePermission.findMany({
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

/**
 * 権限テンプレート一覧取得
 * GET /api/permissions/templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '会社IDが必要です'
        }
      });
    }

    const templates = await prisma.permissionTemplate.findMany({
      where: {
        companyId: parseInt(companyId as string),
        isActive: true
      },
      include: {
        templateFeatures: {
          include: {
            feature: {
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
      features: template.templateFeatures.map(tf => ({
        featureId: tf.feature.id,
        featureCode: tf.feature.code,
        featureName: tf.feature.name,
        featureCategory: tf.feature.category,
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
    console.error('Error fetching permission templates:', error);
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
 * 権限テンプレート作成
 * POST /api/permissions/templates
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      name,
      description,
      category,
      features
    } = req.body;
    const userId = (req as any).user.id;

    if (!companyId || !name || !features || !Array.isArray(features)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '必須フィールドが不足しています'
        }
      });
    }

    // 会社の存在確認
    const company = await prisma.company.findUnique({
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
    const existingTemplate = await prisma.permissionTemplate.findFirst({
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
    const maxOrder = await prisma.permissionTemplate.aggregate({
      where: { companyId },
      _max: { displayOrder: true }
    });

    const displayOrder = (maxOrder._max.displayOrder || 0) + 1;

    // トランザクション内でテンプレートと機能権限を作成
    const template = await prisma.$transaction(async (tx) => {
      // テンプレート作成
      const newTemplate = await tx.permissionTemplate.create({
        data: {
          companyId,
          name,
          description,
          category: category || 'CUSTOM',
          isPreset: false,
          displayOrder,
          createdBy: userId,
          updatedBy: userId
        }
      });

      // 機能権限を作成
      const templateFeatures = await Promise.all(
        features.map(feature =>
          tx.permissionTemplateFeature.create({
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

      return { ...newTemplate, templateFeatures };
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
    console.error('Error creating permission template:', error);
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
 * 権限テンプレート適用
 * POST /api/permissions/templates/:templateId/apply
 */
router.post('/templates/:templateId/apply', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const { departmentIds } = req.body;
    const userId = (req as any).user.id;

    if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '適用対象の部署を指定してください'
        }
      });
    }

    // テンプレートを取得
    const template = await prisma.permissionTemplate.findUnique({
      where: { id: templateId },
      include: {
        templateFeatures: true
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
    const departments = await prisma.department.findMany({
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
        for (const templateFeature of template.templateFeatures) {
          // 既存の権限設定を取得
          const existingPermission = await tx.departmentFeaturePermission.findUnique({
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
            await tx.departmentFeaturePermission.update({
              where: {
                departmentId_featureId: {
                  departmentId,
                  featureId: templateFeature.featureId
                }
              },
              data: permissionData
            });

            // 監査ログを記録
            await tx.auditLog.create({
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
            await tx.departmentFeaturePermission.create({
              data: {
                departmentId,
                featureId: templateFeature.featureId,
                ...permissionData,
                createdBy: userId
              }
            });

            // 監査ログを記録
            await tx.auditLog.create({
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
    console.error('Error applying permission template:', error);
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
 * 権限テンプレート削除
 * DELETE /api/permissions/templates/:templateId
 */
router.delete('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const userId = (req as any).user.id;

    // テンプレートを取得
    const template = await prisma.permissionTemplate.findUnique({
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
    await prisma.permissionTemplate.update({
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
    console.error('Error deleting permission template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});

export default router;