/**
 * Sequential Approval Microservice
 * 直列承認マイクロサービス
 *
 * 機能:
 * - 直列承認フロー管理・段階的承認処理
 * - 6エンドポイント（約200行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { SequentialApprovalService } from '../../services/SequentialApprovalService';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { performanceMonitor } from '../../middleware/performanceMonitor';

const router = Router();
const sequentialApprovalService = new SequentialApprovalService();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

// POST /api/workflow/sequential/start - 直列承認開始
router.post('/start',
  authenticate,
  [
    body('requestId').isInt({ min: 1 }).withMessage('有効なリクエストIDを指定してください'),
    body('approvalSteps').isArray({ min: 1 }).withMessage('承認ステップは1つ以上指定してください'),
    body('approvalSteps.*.stepNumber').isInt({ min: 1 }).withMessage('ステップ番号は1以上で指定してください'),
    body('approvalSteps.*.approverId').isInt({ min: 1 }).withMessage('有効な承認者IDを指定してください'),
    body('approvalSteps.*.stepName').isString().isLength({ min: 1, max: 100 }).withMessage('ステップ名は1-100文字で入力してください'),
    body('approvalSteps.*.isRequired').optional().isBoolean(),
    body('approvalSteps.*.timeoutHours').optional().isInt({ min: 1, max: 168 }).withMessage('タイムアウト時間は1-168時間で指定してください'),
    body('allowSkip').optional().isBoolean(),
    body('allowBacktrack').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId, approvalSteps, allowSkip, allowBacktrack } = req.body;
      const companyId = req.user.companyId;
      const initiatedBy = req.user.id;

      console.log(`[SequentialApproval] Starting sequential approval for request ${requestId} with ${approvalSteps.length} steps`);

      const sequentialApproval = await sequentialApprovalService.startSequentialApproval({
        requestId,
        approvalSteps,
        companyId,
        initiatedBy,
        allowSkip: allowSkip || false,
        allowBacktrack: allowBacktrack || false
      });

      res.status(201).json({
        success: true,
        message: '直列承認を開始しました',
        data: sequentialApproval
      });
    } catch (error) {
      console.error('[SequentialApproval] Error starting sequential approval:', error);
      res.status(500).json({
        success: false,
        message: '直列承認の開始に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/sequential/:id/approve - 直列承認実行（現在ステップ）
router.post('/:id/approve',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効な直列承認IDを指定してください'),
    body('stepNumber').optional().isInt({ min: 1 }).withMessage('ステップ番号は1以上で指定してください'),
    body('comment').optional().isString().isLength({ max: 500 }).withMessage('コメントは500文字以内で入力してください'),
    body('nextApproverId').optional().isInt({ min: 1 }).withMessage('有効な次承認者IDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const sequentialApprovalId = Number(req.params.id);
      const { stepNumber, comment, nextApproverId } = req.body;
      const companyId = req.user.companyId;
      const approverId = req.user.id;

      console.log(`[SequentialApproval] Processing approval for sequential approval ${sequentialApprovalId} step ${stepNumber || 'current'} by approver ${approverId}`);

      const result = await sequentialApprovalService.processStepApproval(sequentialApprovalId, {
        approverId,
        companyId,
        stepNumber,
        action: 'APPROVE',
        comment,
        nextApproverId
      });

      res.json({
        success: true,
        message: '直列承認を実行しました',
        data: result
      });
    } catch (error) {
      console.error('[SequentialApproval] Error processing sequential approval:', error);
      res.status(500).json({
        success: false,
        message: '直列承認の実行に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/sequential/:id/reject - 直列承認却下
router.post('/:id/reject',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効な直列承認IDを指定してください'),
    body('stepNumber').optional().isInt({ min: 1 }).withMessage('ステップ番号は1以上で指定してください'),
    body('comment').isString().isLength({ min: 1, max: 500 }).withMessage('却下理由は必須で、500文字以内で入力してください'),
    body('rejectAll').optional().isBoolean().withMessage('全ステップ却下かどうかを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const sequentialApprovalId = Number(req.params.id);
      const { stepNumber, comment, rejectAll } = req.body;
      const companyId = req.user.companyId;
      const approverId = req.user.id;

      console.log(`[SequentialApproval] Processing rejection for sequential approval ${sequentialApprovalId} step ${stepNumber || 'current'} by approver ${approverId}`);

      const result = await sequentialApprovalService.processStepApproval(sequentialApprovalId, {
        approverId,
        companyId,
        stepNumber,
        action: 'REJECT',
        comment,
        rejectAll: rejectAll || false
      });

      res.json({
        success: true,
        message: '直列承認を却下しました',
        data: result
      });
    } catch (error) {
      console.error('[SequentialApproval] Error processing sequential rejection:', error);
      res.status(500).json({
        success: false,
        message: '直列承認の却下に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/sequential/:id/skip - ステップスキップ
router.post('/:id/skip',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効な直列承認IDを指定してください'),
    body('stepNumber').isInt({ min: 1 }).withMessage('ステップ番号は1以上で指定してください'),
    body('reason').isString().isLength({ min: 1, max: 500 }).withMessage('スキップ理由は必須で、500文字以内で入力してください'),
    body('skipToStep').optional().isInt({ min: 1 }).withMessage('スキップ先ステップ番号は1以上で指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const sequentialApprovalId = Number(req.params.id);
      const { stepNumber, reason, skipToStep } = req.body;
      const companyId = req.user.companyId;
      const requestedBy = req.user.id;

      console.log(`[SequentialApproval] Skipping step ${stepNumber} for sequential approval ${sequentialApprovalId}`);

      const result = await sequentialApprovalService.skipStep(sequentialApprovalId, {
        stepNumber,
        reason,
        requestedBy,
        companyId,
        skipToStep
      });

      res.json({
        success: true,
        message: 'ステップをスキップしました',
        data: result
      });
    } catch (error) {
      console.error('[SequentialApproval] Error skipping step:', error);
      res.status(500).json({
        success: false,
        message: 'ステップのスキップに失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/sequential/:id/status - 直列承認状況確認
router.get('/:id/status',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効な直列承認IDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const sequentialApprovalId = Number(req.params.id);
      const companyId = req.user.companyId;

      console.log(`[SequentialApproval] Getting status for sequential approval ${sequentialApprovalId}`);

      const status = await sequentialApprovalService.getSequentialApprovalStatus(sequentialApprovalId, companyId);

      if (!status) {
        return res.status(404).json({
          success: false,
          message: '直列承認が見つかりません'
        });
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('[SequentialApproval] Error getting sequential approval status:', error);
      res.status(500).json({
        success: false,
        message: '直列承認状況の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/sequential/pending - 保留中の直列承認一覧
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

      console.log(`[SequentialApproval] Getting pending sequential approvals for user ${userId}`);

      const pendingApprovals = await sequentialApprovalService.getPendingSequentialApprovals(
        approverId ? Number(approverId) : userId,
        companyId
      );

      res.json({
        success: true,
        data: pendingApprovals
      });
    } catch (error) {
      console.error('[SequentialApproval] Error getting pending sequential approvals:', error);
      res.status(500).json({
        success: false,
        message: '保留中の直列承認一覧の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;