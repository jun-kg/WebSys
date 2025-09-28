/**
 * Workflow Dashboard Microservice
 * ワークフロー統計ダッシュボードマイクロサービス
 *
 * 機能:
 * - ワークフロー統計情報の取得・リアルタイム更新
 * - 2エンドポイント（約100行）
 */

import { Router } from 'express';
import { query } from 'express-validator';
import { WorkflowService } from '../../services/WorkflowService';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { performanceMonitor } from '../../middleware/performanceMonitor';

const router = Router();
const workflowService = new WorkflowService();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

// GET /api/workflow/dashboard/statistics - ワークフロー統計情報
router.get('/statistics',
  authenticate,
  [
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']).withMessage('有効な期間を選択してください'),
    query('startDate').optional().isISO8601().withMessage('有効な開始日を指定してください'),
    query('endDate').optional().isISO8601().withMessage('有効な終了日を指定してください'),
    query('departmentId').optional().isInt({ min: 1 }).withMessage('有効な部署IDを指定してください'),
    query('typeId').optional().isInt({ min: 1 }).withMessage('有効なワークフロータイプIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { period = 'month', startDate, endDate, departmentId, typeId } = req.query;
      const companyId = req.user.companyId;

      console.log(`[WorkflowDashboard] Getting statistics for company ${companyId}, period: ${period}`);

      // 期間の計算
      let dateRange: { startDate: Date; endDate: Date };

      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      } else {
        dateRange = calculateDateRange(period as string);
      }

      const statistics = await workflowService.getWorkflowStatistics(companyId, {
        ...dateRange,
        departmentId: departmentId ? Number(departmentId) : undefined,
        typeId: typeId ? Number(typeId) : undefined
      });

      res.json({
        success: true,
        data: {
          period,
          dateRange,
          statistics
        }
      });
    } catch (error) {
      console.error('[WorkflowDashboard] Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロー統計の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/dashboard/realtime - リアルタイム統計情報
router.get('/realtime',
  authenticate,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;

      console.log(`[WorkflowDashboard] Getting realtime statistics for company ${companyId}`);

      const realtimeStats = await workflowService.getRealtimeStatistics(companyId);

      res.json({
        success: true,
        data: {
          timestamp: new Date(),
          statistics: realtimeStats
        }
      });
    } catch (error) {
      console.error('[WorkflowDashboard] Error getting realtime statistics:', error);
      res.status(500).json({
        success: false,
        message: 'リアルタイム統計の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * 期間文字列から日付範囲を計算
 */
function calculateDateRange(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterMonth, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      // デフォルトは1ヶ月
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { startDate, endDate };
}

export default router;