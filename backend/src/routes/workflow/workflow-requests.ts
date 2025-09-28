/**
 * Workflow Requests Microservice
 * ワークフロー申請管理マイクロサービス
 *
 * 機能:
 * - ワークフロー申請の一覧・詳細・作成・更新・削除・承認・却下
 * - 9エンドポイント（約250行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { WorkflowService } from '../../services/WorkflowService';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { performanceMonitor } from '../../middleware/performanceMonitor';
import { Saga, WorkflowSagaOrchestrator } from '../../utils/saga';

const router = Router();
const workflowService = new WorkflowService();
const sagaOrchestrator = new WorkflowSagaOrchestrator();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

// GET /api/workflow/requests - ワークフロー申請一覧
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['DRAFT', 'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED']),
    query('typeId').optional().isInt({ min: 1 }),
    query('requesterId').optional().isInt({ min: 1 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, typeId, requesterId, startDate, endDate } = req.query;
      const companyId = req.user.companyId;

      console.log(`[WorkflowRequests] Getting workflow requests for company ${companyId}`);

      const result = await workflowService.getWorkflowRequests(companyId, {
        page: Number(page),
        pageSize: Number(limit),
        status: status as string,
        typeId: typeId ? Number(typeId) : undefined,
        requesterId: requesterId ? Number(requesterId) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[WorkflowRequests] Error getting workflow requests:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロー申請の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/requests/my - 自分の申請一覧
router.get('/my',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['DRAFT', 'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[WorkflowRequests] Getting my workflow requests for user ${userId}`);

      const result = await workflowService.getWorkflowRequests(companyId, {
        page: Number(page),
        pageSize: Number(limit),
        status: status as string,
        requesterId: userId
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[WorkflowRequests] Error getting my workflow requests:', error);
      res.status(500).json({
        success: false,
        message: '申請一覧の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/requests/:id - ワークフロー申請詳細
router.get('/:id',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;

      console.log(`[WorkflowRequests] Getting workflow request ${id} for company ${companyId}`);

      const request = await workflowService.getWorkflowRequestById(id, companyId);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'ワークフロー申請が見つかりません'
        });
      }

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      console.error('[WorkflowRequests] Error getting workflow request:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロー申請の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/requests - ワークフロー申請作成
router.post('/',
  authenticate,
  [
    body('typeId').isInt({ min: 1 }).withMessage('有効なワークフロータイプIDを指定してください'),
    body('title').isString().isLength({ min: 1, max: 200 }).withMessage('タイトルは1-200文字で入力してください'),
    body('description').optional().isString().isLength({ max: 1000 }).withMessage('説明は1000文字以内で入力してください'),
    body('requestData').isObject().withMessage('申請データはオブジェクトで指定してください'),
    body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']).withMessage('有効な優先度を選択してください'),
    body('dueDate').optional().isISO8601().withMessage('有効な期限日を指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[WorkflowRequests] Creating workflow request for company ${companyId} by user ${userId}`);

      const requestData = {
        ...req.body,
        companyId,
        requesterId: userId,
        status: 'DRAFT'
      };

      // Sagaパターンを使用した分散トランザクション
      const newRequest = await sagaOrchestrator.createWorkflowRequest(requestData);

      res.status(201).json({
        success: true,
        message: 'ワークフロー申請を作成しました',
        data: newRequest
      });
    } catch (error) {
      console.error('[WorkflowRequests] Error creating workflow request:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロー申請の作成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// PUT /api/workflow/requests/:id - ワークフロー申請更新
router.put('/:id',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください'),
    body('title').optional().isString().isLength({ min: 1, max: 200 }).withMessage('タイトルは1-200文字で入力してください'),
    body('description').optional().isString().isLength({ max: 1000 }).withMessage('説明は1000文字以内で入力してください'),
    body('requestData').optional().isObject().withMessage('申請データはオブジェクトで指定してください'),
    body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']).withMessage('有効な優先度を選択してください'),
    body('dueDate').optional().isISO8601().withMessage('有効な期限日を指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[WorkflowRequests] Updating workflow request ${id} for company ${companyId} by user ${userId}`);

      // 存在確認
      const existingRequest = await workflowService.getWorkflowRequestById(id, companyId);
      if (!existingRequest) {
        return res.status(404).json({
          success: false,
          message: 'ワークフロー申請が見つかりません'
        });
      }

      // 権限確認（申請者または管理者のみ）
      if (existingRequest.requesterId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'この申請を更新する権限がありません'
        });
      }

      // 下書き・却下状態のみ更新可能
      if (!['DRAFT', 'REJECTED'].includes(existingRequest.status)) {
        return res.status(400).json({
          success: false,
          message: '下書きまたは却下状態の申請のみ更新できます'
        });
      }

      const updateData = {
        ...req.body,
        updatedBy: userId
      };

      const updatedRequest = await workflowService.updateWorkflowRequest(id, updateData);

      res.json({
        success: true,
        message: 'ワークフロー申請を更新しました',
        data: updatedRequest
      });
    } catch (error) {
      console.error('[WorkflowRequests] Error updating workflow request:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロー申請の更新に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/requests/:id/submit - ワークフロー申請提出
router.post('/:id/submit',
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

      console.log(`[WorkflowRequests] Submitting workflow request ${id} for company ${companyId} by user ${userId}`);

      const result = await workflowService.submitWorkflowRequest(id, userId, companyId);

      res.json({
        success: true,
        message: 'ワークフロー申請を提出しました',
        data: result
      });
    } catch (error) {
      console.error('[WorkflowRequests] Error submitting workflow request:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロー申請の提出に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/requests/:id/approve - ワークフロー申請承認
router.post('/:id/approve',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください'),
    body('comment').optional().isString().isLength({ max: 500 }).withMessage('コメントは500文字以内で入力してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;
      const userId = req.user.id;
      const { comment } = req.body;

      console.log(`[WorkflowRequests] Approving workflow request ${id} for company ${companyId} by user ${userId}`);

      const result = await workflowService.approveWorkflowRequest(id, userId, companyId, comment);

      res.json({
        success: true,
        message: 'ワークフロー申請を承認しました',
        data: result
      });
    } catch (error) {
      console.error('[WorkflowRequests] Error approving workflow request:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロー申請の承認に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/requests/:id/reject - ワークフロー申請却下
router.post('/:id/reject',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください'),
    body('comment').isString().isLength({ min: 1, max: 500 }).withMessage('却下理由は必須で、500文字以内で入力してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;
      const userId = req.user.id;
      const { comment } = req.body;

      console.log(`[WorkflowRequests] Rejecting workflow request ${id} for company ${companyId} by user ${userId}`);

      const result = await workflowService.rejectWorkflowRequest(id, userId, companyId, comment);

      res.json({
        success: true,
        message: 'ワークフロー申請を却下しました',
        data: result
      });
    } catch (error) {
      console.error('[WorkflowRequests] Error rejecting workflow request:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロー申請の却下に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// DELETE /api/workflow/requests/:id - ワークフロー申請削除（取消）
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

      console.log(`[WorkflowRequests] Cancelling workflow request ${id} for company ${companyId} by user ${userId}`);

      const result = await workflowService.cancelWorkflowRequest(id, userId, companyId);

      res.json({
        success: true,
        message: 'ワークフロー申請を取り消しました',
        data: result
      });
    } catch (error) {
      console.error('[WorkflowRequests] Error cancelling workflow request:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロー申請の取り消しに失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;