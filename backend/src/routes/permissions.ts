import { Router } from 'express';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();
// Prismaシングルトンを使用

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
      prisma.departments.findMany({
        where: deptWhere,
        orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }]
      }),
      prisma.features.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }]
      })
    ]);

    // 全部署の権限設定を取得
    const allPermissions = await prisma.department_feature_permissions.findMany({
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
 * 権限テンプレート更新
 * PUT /api/permissions/templates/:templateId
 */
router.put('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const { name, description, category, features } = req.body;
    const userId = (req as any).user.id;

    // テンプレートの存在確認
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

    // プリセットテンプレートは編集不可
    if (template.isPreset) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'プリセットテンプレートは編集できません'
        }
      });
    }

    // トランザクション内で更新
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // テンプレート情報を更新
      const updated = await tx.permission_templates.update({
        where: { id: templateId },
        data: {
          name: name || template.name,
          description: description !== undefined ? description : template.description,
          category: category || template.category,
          updatedBy: userId,
          updatedAt: new Date()
        }
      });

      // 権限設定を更新する場合
      if (features && Array.isArray(features)) {
        // 既存の権限設定を削除
        await tx.permission_template_features.deleteMany({
          where: { templateId }
        });

        // 新しい権限設定を作成
        await Promise.all(
          features.map(feature =>
            tx.permission_template_features.create({
              data: {
                templateId,
                featureId: feature.featureId,
                canView: feature.canView || false,
                canCreate: feature.canCreate || false,
                canEdit: feature.canEdit || false,
                canDelete: feature.canDelete || false,
                canApprove: feature.canApprove || false,
                canExport: feature.canExport || false
              }
            })
          )
        );
      }

      return updated;
    });

    res.json({
      success: true,
      data: {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        message: 'テンプレートを更新しました'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error updating permission template:', error);
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