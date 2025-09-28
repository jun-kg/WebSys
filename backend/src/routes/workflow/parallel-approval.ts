/**
 * Parallel Approval Microservice
 * 並列承認マイクロサービス
 *
 * 機能:
 * - 並列承認フロー管理・複数承認者同時処理
 * - 6エンドポイント（約200行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ParallelApprovalService } from '../../services/ParallelApprovalService';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { performanceMonitor } from '../../middleware/performanceMonitor';

const router = Router();
const parallelApprovalService = new ParallelApprovalService();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

// POST /api/workflow/parallel/start - 並列承認開始
router.post('/start',
  authenticate,
  [
    body('requestId').isInt({ min: 1 }).withMessage('有効なリクエストIDを指定してください'),
    body('approvers').isArray({ min: 2 }).withMessage('承認者は2名以上指定してください'),
    body('approvers.*.approverId').isInt({ min: 1 }).withMessage('有効な承認者IDを指定してください'),
    body('approvers.*.weight').optional().isFloat({ min: 0, max: 1 }).withMessage('重みは0-1の範囲で指定してください'),
    body('approvers.*.priority').optional().isInt({ min: 1, max: 10 }).withMessage('優先度は1-10で指定してください'),
    body('requiredApprovalCount').optional().isInt({ min: 1 }).withMessage('必要承認数は1以上で指定してください'),
    body('requiredApprovalRatio').optional().isFloat({ min: 0, max: 1 }).withMessage('必要承認率は0-1で指定してください'),
    body('timeoutHours').optional().isInt({ min: 1, max: 168 }).withMessage('タイムアウト時間は1-168時間で指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId, approvers, requiredApprovalCount, requiredApprovalRatio, timeoutHours } = req.body;
      const companyId = req.user.companyId;
      const initiatedBy = req.user.id;

      console.log(`[ParallelApproval] Starting parallel approval for request ${requestId} with ${approvers.length} approvers`);

      const parallelApproval = await parallelApprovalService.startParallelApproval({
        requestId,
        approvers,
        companyId,
        initiatedBy,
        requiredApprovalCount,
        requiredApprovalRatio: requiredApprovalRatio || 0.5, // デフォルト50%
        timeoutHours: timeoutHours || 72 // デフォルト72時間
      });

      res.status(201).json({
        success: true,
        message: '並列承認を開始しました',
        data: parallelApproval
      });
    } catch (error) {
      console.error('[ParallelApproval] Error starting parallel approval:', error);
      res.status(500).json({
        success: false,
        message: '並列承認の開始に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/parallel/:id/approve - 並列承認実行
router.post('/:id/approve',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効な並列承認IDを指定してください'),
    body('comment').optional().isString().isLength({ max: 500 }).withMessage('コメントは500文字以内で入力してください'),
    body('conditions').optional().isObject().withMessage('条件はオブジェクトで指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const parallelApprovalId = Number(req.params.id);
      const { comment, conditions } = req.body;
      const companyId = req.user.companyId;
      const approverId = req.user.id;

      console.log(`[ParallelApproval] Processing approval for parallel approval ${parallelApprovalId} by approver ${approverId}`);

      const result = await parallelApprovalService.processApproval(parallelApprovalId, {
        approverId,
        companyId,
        action: 'APPROVE',
        comment,
        conditions
      });

      res.json({
        success: true,
        message: '並列承認を実行しました',
        data: result
      });
    } catch (error) {
      console.error('[ParallelApproval] Error processing parallel approval:', error);
      res.status(500).json({
        success: false,
        message: '並列承認の実行に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/parallel/:id/reject - 並列承認却下
router.post('/:id/reject',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効な並列承認IDを指定してください'),
    body('comment').isString().isLength({ min: 1, max: 500 }).withMessage('却下理由は必須で、500文字以内で入力してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const parallelApprovalId = Number(req.params.id);
      const { comment } = req.body;
      const companyId = req.user.companyId;
      const approverId = req.user.id;

      console.log(`[ParallelApproval] Processing rejection for parallel approval ${parallelApprovalId} by approver ${approverId}`);

      const result = await parallelApprovalService.processApproval(parallelApprovalId, {
        approverId,
        companyId,
        action: 'REJECT',
        comment
      });

      res.json({
        success: true,
        message: '並列承認を却下しました',
        data: result
      });
    } catch (error) {
      console.error('[ParallelApproval] Error processing parallel rejection:', error);
      res.status(500).json({
        success: false,
        message: '並列承認の却下に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/parallel/:id/status - 並列承認状況確認
router.get('/:id/status',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効な並列承認IDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const parallelApprovalId = Number(req.params.id);
      const companyId = req.user.companyId;

      console.log(`[ParallelApproval] Getting status for parallel approval ${parallelApprovalId}`);

      const status = await parallelApprovalService.getParallelApprovalStatus(parallelApprovalId, companyId);

      if (!status) {
        return res.status(404).json({
          success: false,
          message: '並列承認が見つかりません'
        });
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('[ParallelApproval] Error getting parallel approval status:', error);
      res.status(500).json({
        success: false,
        message: '並列承認状況の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/parallel/pending - 保留中の並列承認一覧
router.get('/pending',
  authenticate,
  [
    query('approverId').optional().isInt({ min: 1 }).withMessage('有効な承認者IDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { approverId } = req.query;
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[ParallelApproval] Getting pending parallel approvals for user ${userId}`);

      const pendingApprovals = await parallelApprovalService.getPendingParallelApprovals(
        approverId ? Number(approverId) : userId,
        companyId
      );

      res.json({
        success: true,
        data: pendingApprovals
      });
    } catch (error) {
      console.error('[ParallelApproval] Error getting pending parallel approvals:', error);
      res.status(500).json({
        success: false,
        message: '保留中の並列承認一覧の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/parallel/statistics - 並列承認統計
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

      console.log(`[ParallelApproval] Getting parallel approval statistics for company ${companyId}`);

      const statistics = await parallelApprovalService.getParallelApprovalStatistics(companyId, {
        period: period as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('[ParallelApproval] Error getting parallel approval statistics:', error);
      res.status(500).json({
        success: false,
        message: '並列承認統計の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;