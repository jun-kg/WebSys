/**
 * Delegation Approval Microservice
 * 承認委任マイクロサービス
 *
 * 機能:
 * - 承認権限の委任・委任解除・委任履歴・一時委任管理
 * - 10エンドポイント（約300行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ApprovalDelegationService } from '../../services/ApprovalDelegationService';
import { authenticate, requireRole } from '@core/middleware/auth';
import { validateRequest } from '../../../middleware/validation';
import { performanceMonitor } from '../../../middleware/performanceMonitor';

const router = Router();
const delegationService = new ApprovalDelegationService();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

// GET /api/workflow/delegation - 承認委任一覧
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('delegatorId').optional().isInt({ min: 1 }),
    query('delegateeId').optional().isInt({ min: 1 }),
    query('isActive').optional().isBoolean(),
    query('status').optional().isIn(['ACTIVE', 'EXPIRED', 'REVOKED'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, delegatorId, delegateeId, isActive, status } = req.query;
      const companyId = req.user.companyId;

      console.log(`[DelegationApproval] Getting delegations for company ${companyId}`);

      const result = await delegationService.getDelegations(companyId, {
        page: Number(page),
        pageSize: Number(limit),
        delegatorId: delegatorId ? Number(delegatorId) : undefined,
        delegateeId: delegateeId ? Number(delegateeId) : undefined,
        isActive: isActive ? isActive === 'true' : undefined,
        status: status as string
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[DelegationApproval] Error getting delegations:', error);
      res.status(500).json({
        success: false,
        message: '承認委任一覧の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/delegation/my - 自分の委任一覧
router.get('/my',
  authenticate,
  [
    query('type').optional().isIn(['delegated', 'received']).withMessage('typeは delegated または received を指定してください'),
    query('isActive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { type = 'delegated', isActive } = req.query;
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[DelegationApproval] Getting my delegations (${type}) for user ${userId}`);

      const delegations = await delegationService.getUserDelegations(userId, companyId, {
        type: type as string,
        isActive: isActive ? isActive === 'true' : undefined
      });

      res.json({
        success: true,
        data: delegations
      });
    } catch (error) {
      console.error('[DelegationApproval] Error getting my delegations:', error);
      res.status(500).json({
        success: false,
        message: '承認委任一覧の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/delegation - 承認委任作成
router.post('/',
  authenticate,
  [
    body('delegateeId').isInt({ min: 1 }).withMessage('有効な委任先ユーザーIDを指定してください'),
    body('workflowTypeIds').optional().isArray().withMessage('ワークフロータイプIDは配列で指定してください'),
    body('workflowTypeIds.*').optional().isInt({ min: 1 }).withMessage('有効なワークフロータイプIDを指定してください'),
    body('startDate').isISO8601().withMessage('有効な開始日を指定してください'),
    body('endDate').isISO8601().withMessage('有効な終了日を指定してください'),
    body('reason').isString().isLength({ min: 1, max: 500 }).withMessage('委任理由は1-500文字で入力してください'),
    body('isTemporary').optional().isBoolean(),
    body('conditions').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { delegateeId, workflowTypeIds, startDate, endDate, reason, isTemporary, conditions } = req.body;
      const companyId = req.user.companyId;
      const delegatorId = req.user.id;

      console.log(`[DelegationApproval] Creating delegation from user ${delegatorId} to user ${delegateeId}`);

      // 自分自身への委任チェック
      if (delegatorId === delegateeId) {
        return res.status(400).json({
          success: false,
          message: '自分自身に承認を委任することはできません'
        });
      }

      // 日付の妥当性チェック
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: '終了日は開始日より後に設定してください'
        });
      }

      const delegation = await delegationService.createDelegation({
        delegatorId,
        delegateeId,
        companyId,
        workflowTypeIds: workflowTypeIds || [],
        startDate: start,
        endDate: end,
        reason,
        isTemporary: isTemporary || false,
        conditions: conditions || {}
      });

      res.status(201).json({
        success: true,
        message: '承認委任を作成しました',
        data: delegation
      });
    } catch (error) {
      console.error('[DelegationApproval] Error creating delegation:', error);
      res.status(500).json({
        success: false,
        message: '承認委任の作成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// PUT /api/workflow/delegation/:id - 承認委任更新
router.put('/:id',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください'),
    body('workflowTypeIds').optional().isArray().withMessage('ワークフロータイプIDは配列で指定してください'),
    body('startDate').optional().isISO8601().withMessage('有効な開始日を指定してください'),
    body('endDate').optional().isISO8601().withMessage('有効な終了日を指定してください'),
    body('reason').optional().isString().isLength({ min: 1, max: 500 }).withMessage('委任理由は1-500文字で入力してください'),
    body('conditions').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[DelegationApproval] Updating delegation ${id} by user ${userId}`);

      // 存在確認と権限チェック
      const existingDelegation = await delegationService.getDelegationById(id, companyId);
      if (!existingDelegation) {
        return res.status(404).json({
          success: false,
          message: '承認委任が見つかりません'
        });
      }

      if (existingDelegation.delegatorId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'この承認委任を更新する権限がありません'
        });
      }

      const updatedDelegation = await delegationService.updateDelegation(id, req.body);

      res.json({
        success: true,
        message: '承認委任を更新しました',
        data: updatedDelegation
      });
    } catch (error) {
      console.error('[DelegationApproval] Error updating delegation:', error);
      res.status(500).json({
        success: false,
        message: '承認委任の更新に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// DELETE /api/workflow/delegation/:id - 承認委任削除（取消）
router.delete('/:id',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[DelegationApproval] Revoking delegation ${id} by user ${userId}`);

      const result = await delegationService.revokeDelegation(id, userId, companyId);

      res.json({
        success: true,
        message: '承認委任を取り消しました',
        data: result
      });
    } catch (error) {
      console.error('[DelegationApproval] Error revoking delegation:', error);
      res.status(500).json({
        success: false,
        message: '承認委任の取り消しに失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/delegation/:id/activate - 承認委任有効化
router.post('/:id/activate',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[DelegationApproval] Activating delegation ${id} by user ${userId}`);

      const result = await delegationService.activateDelegation(id, userId, companyId);

      res.json({
        success: true,
        message: '承認委任を有効化しました',
        data: result
      });
    } catch (error) {
      console.error('[DelegationApproval] Error activating delegation:', error);
      res.status(500).json({
        success: false,
        message: '承認委任の有効化に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/delegation/:id/deactivate - 承認委任無効化
router.post('/:id/deactivate',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[DelegationApproval] Deactivating delegation ${id} by user ${userId}`);

      const result = await delegationService.deactivateDelegation(id, userId, companyId);

      res.json({
        success: true,
        message: '承認委任を無効化しました',
        data: result
      });
    } catch (error) {
      console.error('[DelegationApproval] Error deactivating delegation:', error);
      res.status(500).json({
        success: false,
        message: '承認委任の無効化に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/delegation/:id/history - 承認委任履歴
router.get('/:id/history',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;

      console.log(`[DelegationApproval] Getting delegation history for delegation ${id}`);

      const history = await delegationService.getDelegationHistory(id, companyId);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('[DelegationApproval] Error getting delegation history:', error);
      res.status(500).json({
        success: false,
        message: '承認委任履歴の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/delegation/statistics - 承認委任統計
router.get('/statistics',
  authenticate,
  requireRole(['ADMIN']),
  [
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { period = 'month', startDate, endDate } = req.query;
      const companyId = req.user.companyId;

      console.log(`[DelegationApproval] Getting delegation statistics for company ${companyId}`);

      const statistics = await delegationService.getDelegationStatistics(companyId, {
        period: period as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('[DelegationApproval] Error getting delegation statistics:', error);
      res.status(500).json({
        success: false,
        message: '承認委任統計の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/delegation/bulk-create - 一括委任作成
router.post('/bulk-create',
  authenticate,
  requireRole(['ADMIN']),
  [
    body('delegations').isArray().withMessage('委任情報は配列で指定してください'),
    body('delegations.*.delegatorId').isInt({ min: 1 }).withMessage('有効な委任者IDを指定してください'),
    body('delegations.*.delegateeId').isInt({ min: 1 }).withMessage('有効な委任先IDを指定してください'),
    body('delegations.*.startDate').isISO8601().withMessage('有効な開始日を指定してください'),
    body('delegations.*.endDate').isISO8601().withMessage('有効な終了日を指定してください'),
    body('delegations.*.reason').isString().isLength({ min: 1, max: 500 }).withMessage('委任理由は1-500文字で入力してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { delegations } = req.body;
      const companyId = req.user.companyId;
      const createdBy = req.user.id;

      console.log(`[DelegationApproval] Creating bulk delegations for company ${companyId} by admin ${createdBy}`);

      const results = await delegationService.createBulkDelegations(delegations, companyId, createdBy);

      res.status(201).json({
        success: true,
        message: `${results.successful.length}件の承認委任を作成しました`,
        data: {
          successful: results.successful,
          failed: results.failed,
          summary: {
            total: delegations.length,
            successful: results.successful.length,
            failed: results.failed.length
          }
        }
      });
    } catch (error) {
      console.error('[DelegationApproval] Error creating bulk delegations:', error);
      res.status(500).json({
        success: false,
        message: '一括承認委任の作成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;