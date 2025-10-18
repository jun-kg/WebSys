/**
 * Permission Matrix Microservice
 * 権限マトリクス管理マイクロサービス
 *
 * 機能:
 * - 権限マトリクスレポートの生成・表示
 * - 8エンドポイント（約200行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '@core/lib/prisma';
import { validateRequest } from '../../../middleware/validation';
import { performanceMonitor } from '../../../middleware/performanceMonitor';
import { cacheMiddleware, withCache } from '../../../services/CacheService';

const router = Router();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

/**
 * 権限マトリクスレポート取得
 * GET /api/permissions/matrix
 */
router.get('/',
  [
    query('companyId').isInt({ min: 1 }).withMessage('有効な会社IDを指定してください'),
    query('departmentIds').optional().isString()
  ],
  validateRequest,
  cacheMiddleware(300000), // 5分キャッシュ
  async (req, res) => {
    try {
      const { companyId, departmentIds } = req.query;

      console.log(`[PermissionMatrix] Getting matrix for company ${companyId}`);

      let deptWhere: any = {
        companyId: parseInt(companyId as string),
        isActive: true
      };

      if (departmentIds) {
        const ids = (departmentIds as string).split(',').map(id => parseInt(id));
        deptWhere.id = { in: ids };
      }

      // キャッシュ効率化された一括取得
      const cacheKey = `permission-matrix:${companyId}:${departmentIds || 'all'}`

      const [departments, features, allPermissions] = await withCache(
        cacheKey,
        () => Promise.all([
          prisma.departments.findMany({
            where: deptWhere,
            orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }],
            select: {
              id: true,
              name: true,
              level: true,
              displayOrder: true
            }
          }),
          prisma.features.findMany({
            where: { isActive: true },
            orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
            select: {
              id: true,
              code: true,
              name: true,
              category: true,
              displayOrder: true
            }
          }),
          prisma.department_feature_permissions.findMany({
            where: {
              departments: {
                companyId: parseInt(companyId as string),
                isActive: true,
                ...(departmentIds ? { id: { in: (departmentIds as string).split(',').map(id => parseInt(id)) } } : {})
              }
            },
            select: {
              departmentId: true,
              featureId: true,
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
              canApprove: true,
              canExport: true
            }
          })
        ]),
        300000 // 5分キャッシュ
      );

      // 権限データをハッシュマップで効率化（O(1)アクセス）
      const permissionMap = new Map<string, any>();
      allPermissions.forEach(p => {
        permissionMap.set(`${p.departmentId}-${p.featureId}`, p);
      });

      // 部署×機能のマトリクス作成（最適化版）
      const matrix = departments.map(dept => ({
        departmentId: dept.id,
        departmentName: dept.name,
        features: features.map(feature => {
          const perm = permissionMap.get(`${dept.id}-${feature.id}`);

          // 権限文字列を効率的に生成
          const permissions = [
            perm?.canView && 'V',
            perm?.canCreate && 'C',
            perm?.canEdit && 'E',
            perm?.canDelete && 'D',
            perm?.canApprove && 'A',
            perm?.canExport && 'X'
          ].filter(Boolean);

          return {
            featureCode: feature.code,
            featureName: feature.name,
            permissions: permissions.length > 0 ? permissions.join(',') : '-'
          };
        })
      }));

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
      console.error('[PermissionMatrix] Error fetching permission matrix:', error);
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
 * 権限マトリクス統計取得
 * GET /api/permissions/matrix/statistics
 */
router.get('/statistics',
  [
    query('companyId').isInt({ min: 1 }).withMessage('有効な会社IDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { companyId } = req.query;

      console.log(`[PermissionMatrix] Getting statistics for company ${companyId}`);

      // 基本統計を取得
      const [departmentCount, featureCount, permissionCount] = await Promise.all([
        prisma.departments.count({
          where: { companyId: parseInt(companyId as string), isActive: true }
        }),
        prisma.features.count({
          where: { isActive: true }
        }),
        prisma.department_feature_permissions.count({
          where: {
            departments: {
              companyId: parseInt(companyId as string),
              isActive: true
            }
          }
        })
      ]);

      // 権限タイプ別統計
      const permissionTypeStats = await prisma.department_feature_permissions.groupBy({
        by: ['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove', 'canExport'],
        where: {
          departments: {
            companyId: parseInt(companyId as string),
            isActive: true
          }
        },
        _count: true
      });

      // 機能カテゴリ別統計
      const categoryStats = await prisma.department_feature_permissions.groupBy({
        by: ['featureId'],
        where: {
          departments: {
            companyId: parseInt(companyId as string),
            isActive: true
          }
        },
        _count: true,
        include: {
          features: {
            select: { category: true }
          }
        }
      });

      const statistics = {
        overview: {
          departmentCount,
          featureCount,
          permissionCount,
          coverage: departmentCount > 0 ? (permissionCount / (departmentCount * featureCount) * 100).toFixed(1) : '0'
        },
        permissionTypes: permissionTypeStats,
        categories: categoryStats
      };

      res.json({
        success: true,
        data: statistics,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionMatrix] Error fetching statistics:', error);
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
 * 権限マトリクスエクスポート
 * POST /api/permissions/matrix/export
 */
router.post('/export',
  [
    body('companyId').isInt({ min: 1 }).withMessage('有効な会社IDを指定してください'),
    body('format').isIn(['csv', 'excel', 'json']).withMessage('有効なフォーマットを指定してください'),
    body('departmentIds').optional().isArray(),
    body('includeInactive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { companyId, format, departmentIds, includeInactive } = req.body;

      console.log(`[PermissionMatrix] Exporting matrix in ${format} format for company ${companyId}`);

      let deptWhere: any = {
        companyId,
        isActive: includeInactive ? undefined : true
      };

      if (departmentIds && Array.isArray(departmentIds)) {
        deptWhere.id = { in: departmentIds };
      }

      // データを取得
      const [departments, features] = await Promise.all([
        prisma.departments.findMany({
          where: deptWhere,
          orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }]
        }),
        prisma.features.findMany({
          where: { isActive: includeInactive ? undefined : true },
          orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }]
        })
      ]);

      const allPermissions = await prisma.department_feature_permissions.findMany({
        where: {
          departmentId: { in: departments.map(d => d.id) }
        }
      });

      // エクスポートデータを生成
      const exportData = departments.map(dept => {
        const deptPermissions = allPermissions.filter(p => p.departmentId === dept.id);
        const permissionMap = new Map();
        deptPermissions.forEach(p => {
          permissionMap.set(p.featureId, p);
        });

        const row: any = {
          department_id: dept.id,
          department_name: dept.name,
          department_level: dept.level
        };

        features.forEach(feature => {
          const perm = permissionMap.get(feature.id);
          const permissions = [];

          if (perm?.canView) permissions.push('V');
          if (perm?.canCreate) permissions.push('C');
          if (perm?.canEdit) permissions.push('E');
          if (perm?.canDelete) permissions.push('D');
          if (perm?.canApprove) permissions.push('A');
          if (perm?.canExport) permissions.push('X');

          row[`${feature.code}`] = permissions.join(',') || '-';
        });

        return row;
      });

      res.json({
        success: true,
        data: {
          format,
          exportData,
          metadata: {
            departmentCount: departments.length,
            featureCount: features.length,
            generatedAt: new Date().toISOString(),
            includeInactive: includeInactive || false
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionMatrix] Error exporting matrix:', error);
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