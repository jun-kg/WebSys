/**
 * Emergency Approval Microservice
 * 緊急承認マイクロサービス
 *
 * 機能:
 * - 緊急承認申請・実行・履歴・設定管理
 * - 6エンドポイント（約180行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { EmergencyApprovalService } from '../../services/EmergencyApprovalService';
import { authenticate, requireRole } from '@core/middleware/auth';
import { validateRequest } from '../../../middleware/validation';
import { performanceMonitor } from '../../../middleware/performanceMonitor';

const router = Router();
const emergencyApprovalService = new EmergencyApprovalService();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

// POST /api/workflow/emergency/request - 緊急承認申請
router.post('/request',
  authenticate,
  [
    body('requestId').isInt({ min: 1 }).withMessage('有効なリクエストIDを指定してください'),
    body('reason').isString().isLength({ min: 10, max: 500 }).withMessage('緊急承認理由は10-500文字で入力してください'),
    body('urgencyLevel').isIn(['HIGH', 'CRITICAL']).withMessage('緊急度を選択してください'),
    body('requestedBy').optional().isInt({ min: 1 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId, reason, urgencyLevel, requestedBy } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[EmergencyApproval] Creating emergency approval request for request ${requestId} by user ${userId}`);

      const emergencyRequest = await emergencyApprovalService.createEmergencyRequest({
        requestId,
        reason,
        urgencyLevel,
        requestedBy: requestedBy || userId,
        companyId
      });

      res.status(201).json({
        success: true,
        message: '緊急承認申請を作成しました',
        data: emergencyRequest
      });
    } catch (error) {
      console.error('[EmergencyApproval] Error creating emergency request:', error);
      res.status(500).json({
        success: false,
        message: '緊急承認申請の作成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/emergency/approve/:id - 緊急承認実行
router.post('/approve/:id',
  authenticate,
  requireRole(['ADMIN']),
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください'),
    body('comment').optional().isString().isLength({ max: 500 }).withMessage('コメントは500文字以内で入力してください'),
    body('overrideReason').optional().isString().isLength({ max: 500 }).withMessage('上書き理由は500文字以内で入力してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { comment, overrideReason } = req.body;
      const companyId = req.user.companyId;
      const approverId = req.user.id;

      console.log(`[EmergencyApproval] Processing emergency approval ${id} by admin ${approverId}`);

      const result = await emergencyApprovalService.processEmergencyApproval(id, {
        approverId,
        companyId,
        action: 'APPROVE',
        comment,
        overrideReason
      });

      res.json({
        success: true,
        message: '緊急承認を実行しました',
        data: result
      });
    } catch (error) {
      console.error('[EmergencyApproval] Error processing emergency approval:', error);
      res.status(500).json({
        success: false,
        message: '緊急承認の実行に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/emergency/reject/:id - 緊急承認却下
router.post('/reject/:id',
  authenticate,
  requireRole(['ADMIN']),
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください'),
    body('comment').isString().isLength({ min: 1, max: 500 }).withMessage('却下理由は必須で、500文字以内で入力してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { comment } = req.body;
      const companyId = req.user.companyId;
      const approverId = req.user.id;

      console.log(`[EmergencyApproval] Rejecting emergency approval ${id} by admin ${approverId}`);

      const result = await emergencyApprovalService.processEmergencyApproval(id, {
        approverId,
        companyId,
        action: 'REJECT',
        comment
      });

      res.json({
        success: true,
        message: '緊急承認申請を却下しました',
        data: result
      });
    } catch (error) {
      console.error('[EmergencyApproval] Error rejecting emergency approval:', error);
      res.status(500).json({
        success: false,
        message: '緊急承認申請の却下に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/emergency/history - 緊急承認履歴
router.get('/history',
  authenticate,
  requireRole(['ADMIN']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
    query('urgencyLevel').optional().isIn(['HIGH', 'CRITICAL'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, startDate, endDate, status, urgencyLevel } = req.query;
      const companyId = req.user.companyId;

      console.log(`[EmergencyApproval] Getting emergency approval history for company ${companyId}`);

      const result = await emergencyApprovalService.getEmergencyApprovalHistory(companyId, {
        page: Number(page),
        pageSize: Number(limit),
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as string,
        urgencyLevel: urgencyLevel as string
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[EmergencyApproval] Error getting emergency approval history:', error);
      res.status(500).json({
        success: false,
        message: '緊急承認履歴の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/emergency/pending - 保留中の緊急承認一覧
router.get('/pending',
  authenticate,
  requireRole(['ADMIN']),
  [
    query('urgencyLevel').optional().isIn(['HIGH', 'CRITICAL'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { urgencyLevel } = req.query;
      const companyId = req.user.companyId;

      console.log(`[EmergencyApproval] Getting pending emergency approvals for company ${companyId}`);

      const pendingApprovals = await emergencyApprovalService.getPendingEmergencyApprovals(companyId, {
        urgencyLevel: urgencyLevel as string
      });

      res.json({
        success: true,
        data: pendingApprovals
      });
    } catch (error) {
      console.error('[EmergencyApproval] Error getting pending emergency approvals:', error);
      res.status(500).json({
        success: false,
        message: '保留中の緊急承認一覧の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/emergency/statistics - 緊急承認統計
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

      console.log(`[EmergencyApproval] Getting emergency approval statistics for company ${companyId}`);

      const statistics = await emergencyApprovalService.getEmergencyApprovalStatistics(companyId, {
        period: period as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('[EmergencyApproval] Error getting emergency approval statistics:', error);
      res.status(500).json({
        success: false,
        message: '緊急承認統計の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;