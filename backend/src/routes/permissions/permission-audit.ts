/**
 * Permission Audit Microservice
 * 権限監査ログマイクロサービス
 *
 * 機能:
 * - 権限変更履歴・監査ログ管理
 * - 6エンドポイント（約150行）
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
 * 監査ログ一覧取得
 * GET /api/permissions/audit/logs
 */
router.get('/logs',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('departmentId').optional().isInt({ min: 1 }),
    query('featureId').optional().isInt({ min: 1 }),
    query('action').optional().isString(),
    query('userId').optional().isInt({ min: 1 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        departmentId,
        featureId,
        action,
        userId
      } = req.query;

      console.log(`[PermissionAudit] Getting audit logs with filters`);

      // フィルター条件を構築
      const where: any = {
        targetType: 'DEPARTMENT'
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      if (departmentId) where.targetId = parseInt(departmentId as string);
      if (featureId) where.featureId = parseInt(featureId as string);
      if (action) where.action = action as string;
      if (userId) where.userId = parseInt(userId as string);

      // 総件数を取得
      const total = await prisma.audit_logs.count({ where });

      // ページネーション付きでログを取得
      const logs = await prisma.audit_logs.findMany({
        where,
        include: {
          users: {
            select: { id: true, name: true, email: true }
          },
          departments: {
            select: { id: true, name: true }
          },
          features: {
            select: { id: true, code: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      });

      const formattedLogs = logs.map(log => ({
        id: log.id,
        timestamp: log.createdAt,
        action: log.action,
        user: log.users ? {
          id: log.users.id,
          name: log.users.name,
          email: log.users.email
        } : null,
        department: log.departments ? {
          id: log.departments.id,
          name: log.departments.name
        } : null,
        feature: log.features ? {
          id: log.features.id,
          code: log.features.code,
          name: log.features.name
        } : null,
        oldPermissions: log.oldPermissions,
        newPermissions: log.newPermissions,
        details: log.details
      }));

      res.json({
        success: true,
        data: {
          logs: formattedLogs,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionAudit] Error fetching audit logs:', error);
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
 * 監査ログ統計取得
 * GET /api/permissions/audit/statistics
 */
router.get('/statistics',
  [
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { period = 'month', startDate, endDate } = req.query;

      console.log(`[PermissionAudit] Getting statistics for period: ${period}`);

      // 期間設定
      let dateFilter: any = {};
      const now = new Date();

      if (startDate && endDate) {
        dateFilter = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      } else {
        switch (period) {
          case 'today':
            dateFilter = {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
            };
            break;
          case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            dateFilter = { gte: weekStart };
            break;
          case 'month':
            dateFilter = {
              gte: new Date(now.getFullYear(), now.getMonth(), 1)
            };
            break;
          case 'quarter':
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            dateFilter = { gte: quarterStart };
            break;
          case 'year':
            dateFilter = {
              gte: new Date(now.getFullYear(), 0, 1)
            };
            break;
        }
      }

      // 統計データを並行取得
      const [
        totalCount,
        actionStats,
        userStats,
        departmentStats,
        dailyStats
      ] = await Promise.all([
        // 総件数
        prisma.audit_logs.count({
          where: {
            targetType: 'DEPARTMENT',
            createdAt: dateFilter
          }
        }),
        // アクション別統計
        prisma.audit_logs.groupBy({
          by: ['action'],
          where: {
            targetType: 'DEPARTMENT',
            createdAt: dateFilter
          },
          _count: true
        }),
        // ユーザー別統計（上位10名）
        prisma.audit_logs.groupBy({
          by: ['userId'],
          where: {
            targetType: 'DEPARTMENT',
            createdAt: dateFilter
          },
          _count: true,
          orderBy: {
            _count: {
              userId: 'desc'
            }
          },
          take: 10
        }),
        // 部署別統計（上位10部署）
        prisma.audit_logs.groupBy({
          by: ['targetId'],
          where: {
            targetType: 'DEPARTMENT',
            createdAt: dateFilter
          },
          _count: true,
          orderBy: {
            _count: {
              targetId: 'desc'
            }
          },
          take: 10
        }),
        // 日別統計（過去30日）
        prisma.$queryRaw`
          SELECT
            DATE(created_at) as date,
            COUNT(*) as count
          FROM audit_logs
          WHERE target_type = 'DEPARTMENT'
            AND created_at >= ${dateFilter.gte || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}
            ${dateFilter.lte ? prisma.$queryRaw`AND created_at <= ${dateFilter.lte}` : prisma.$queryRaw``}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `
      ]);

      const statistics = {
        overview: {
          totalCount,
          period: period as string,
          dateRange: {
            start: dateFilter.gte,
            end: dateFilter.lte || now
          }
        },
        actions: actionStats,
        topUsers: userStats,
        topDepartments: departmentStats,
        dailyActivity: dailyStats
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
      console.error('[PermissionAudit] Error fetching statistics:', error);
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
 * 監査ログ詳細取得
 * GET /api/permissions/audit/logs/:logId
 */
router.get('/logs/:logId',
  [
    param('logId').isInt({ min: 1 }).withMessage('有効なログIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const logId = parseInt(req.params.logId);

      console.log(`[PermissionAudit] Getting audit log detail for ${logId}`);

      const log = await prisma.audit_logs.findUnique({
        where: { id: logId },
        include: {
          users: {
            select: { id: true, name: true, email: true }
          },
          departments: {
            select: { id: true, name: true, code: true, level: true }
          },
          features: {
            select: { id: true, code: true, name: true, category: true }
          }
        }
      });

      if (!log) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された監査ログが見つかりません'
          }
        });
      }

      res.json({
        success: true,
        data: {
          id: log.id,
          timestamp: log.createdAt,
          action: log.action,
          user: log.users ? {
            id: log.users.id,
            name: log.users.name,
            email: log.users.email
          } : null,
          department: log.departments ? {
            id: log.departments.id,
            name: log.departments.name,
            code: log.departments.code,
            level: log.departments.level
          } : null,
          feature: log.features ? {
            id: log.features.id,
            code: log.features.code,
            name: log.features.name,
            category: log.features.category
          } : null,
          oldPermissions: log.oldPermissions,
          newPermissions: log.newPermissions,
          details: log.details,
          changes: analyzePermissionChanges(log.oldPermissions, log.newPermissions)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    } catch (error) {
      console.error('[PermissionAudit] Error fetching audit log detail:', error);
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
function analyzePermissionChanges(oldPermissions: any, newPermissions: any) {
  if (!oldPermissions || !newPermissions) {
    return null;
  }

  const changes = [];
  const permissions = ['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove', 'canExport'];

  permissions.forEach(perm => {
    const oldValue = oldPermissions[perm];
    const newValue = newPermissions[perm];

    if (oldValue !== newValue) {
      changes.push({
        permission: perm,
        from: oldValue,
        to: newValue,
        action: newValue ? 'GRANTED' : 'REVOKED'
      });
    }
  });

  return changes;
}

export default router;