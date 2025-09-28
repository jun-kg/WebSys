/**
 * Auto Approval Microservice
 * 自動承認マイクロサービス
 *
 * 機能:
 * - 自動承認ルール管理・条件判定・自動実行
 * - 7エンドポイント（約350行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AutoApprovalService } from '../../services/AutoApprovalService';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { performanceMonitor } from '../../middleware/performanceMonitor';

const router = Router();
const autoApprovalService = new AutoApprovalService();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

// GET /api/workflow/auto/rules - 自動承認ルール一覧
router.get('/rules',
  authenticate,
  requireRole(['ADMIN']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('workflowTypeId').optional().isInt({ min: 1 }),
    query('isActive').optional().isBoolean(),
    query('priority').optional().isInt({ min: 1, max: 10 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, workflowTypeId, isActive, priority } = req.query;
      const companyId = req.user.companyId;

      console.log(`[AutoApproval] Getting auto approval rules for company ${companyId}`);

      const result = await autoApprovalService.getAutoApprovalRules(companyId, {
        page: Number(page),
        pageSize: Number(limit),
        workflowTypeId: workflowTypeId ? Number(workflowTypeId) : undefined,
        isActive: isActive ? isActive === 'true' : undefined,
        priority: priority ? Number(priority) : undefined
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[AutoApproval] Error getting auto approval rules:', error);
      res.status(500).json({
        success: false,
        message: '自動承認ルール一覧の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/auto/rules - 自動承認ルール作成
router.post('/rules',
  authenticate,
  requireRole(['ADMIN']),
  [
    body('name').isString().isLength({ min: 1, max: 100 }).withMessage('ルール名は1-100文字で入力してください'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('説明は500文字以内で入力してください'),
    body('workflowTypeId').isInt({ min: 1 }).withMessage('有効なワークフロータイプIDを指定してください'),
    body('conditions').isObject().withMessage('条件はオブジェクトで指定してください'),
    body('conditions.maxAmount').optional().isFloat({ min: 0 }).withMessage('最大金額は0以上で指定してください'),
    body('conditions.departments').optional().isArray().withMessage('部署IDは配列で指定してください'),
    body('conditions.userRoles').optional().isArray().withMessage('ユーザー役職は配列で指定してください'),
    body('conditions.timeRange').optional().isObject().withMessage('時間範囲はオブジェクトで指定してください'),
    body('actions').isObject().withMessage('アクションはオブジェクトで指定してください'),
    body('actions.autoApprove').optional().isBoolean(),
    body('actions.assignApprover').optional().isInt({ min: 1 }),
    body('actions.notifyUsers').optional().isArray(),
    body('priority').isInt({ min: 1, max: 10 }).withMessage('優先度は1-10で指定してください'),
    body('isActive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const createdBy = req.user.id;

      console.log(`[AutoApproval] Creating auto approval rule for company ${companyId} by user ${createdBy}`);

      const ruleData = {
        ...req.body,
        companyId,
        createdBy
      };

      const newRule = await autoApprovalService.createAutoApprovalRule(ruleData);

      res.status(201).json({
        success: true,
        message: '自動承認ルールを作成しました',
        data: newRule
      });
    } catch (error) {
      console.error('[AutoApproval] Error creating auto approval rule:', error);
      res.status(500).json({
        success: false,
        message: '自動承認ルールの作成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// PUT /api/workflow/auto/rules/:id - 自動承認ルール更新
router.put('/rules/:id',
  authenticate,
  requireRole(['ADMIN']),
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください'),
    body('name').optional().isString().isLength({ min: 1, max: 100 }).withMessage('ルール名は1-100文字で入力してください'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('説明は500文字以内で入力してください'),
    body('conditions').optional().isObject().withMessage('条件はオブジェクトで指定してください'),
    body('actions').optional().isObject().withMessage('アクションはオブジェクトで指定してください'),
    body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('優先度は1-10で指定してください'),
    body('isActive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;
      const updatedBy = req.user.id;

      console.log(`[AutoApproval] Updating auto approval rule ${id} by user ${updatedBy}`);

      const updateData = {
        ...req.body,
        updatedBy
      };

      const updatedRule = await autoApprovalService.updateAutoApprovalRule(id, updateData, companyId);

      res.json({
        success: true,
        message: '自動承認ルールを更新しました',
        data: updatedRule
      });
    } catch (error) {
      console.error('[AutoApproval] Error updating auto approval rule:', error);
      res.status(500).json({
        success: false,
        message: '自動承認ルールの更新に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// DELETE /api/workflow/auto/rules/:id - 自動承認ルール削除
router.delete('/rules/:id',
  authenticate,
  requireRole(['ADMIN']),
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;

      console.log(`[AutoApproval] Deleting auto approval rule ${id}`);

      await autoApprovalService.deleteAutoApprovalRule(id, companyId);

      res.json({
        success: true,
        message: '自動承認ルールを削除しました'
      });
    } catch (error) {
      console.error('[AutoApproval] Error deleting auto approval rule:', error);
      res.status(500).json({
        success: false,
        message: '自動承認ルールの削除に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/auto/evaluate - 自動承認評価実行
router.post('/evaluate',
  authenticate,
  [
    body('requestId').isInt({ min: 1 }).withMessage('有効なリクエストIDを指定してください'),
    body('force').optional().isBoolean().withMessage('強制実行フラグはboolean値で指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId, force } = req.body;
      const companyId = req.user.companyId;
      const evaluatedBy = req.user.id;

      console.log(`[AutoApproval] Evaluating auto approval for request ${requestId}`);

      const evaluation = await autoApprovalService.evaluateAutoApproval(requestId, {
        companyId,
        evaluatedBy,
        force: force || false
      });

      res.json({
        success: true,
        message: '自動承認評価を実行しました',
        data: evaluation
      });
    } catch (error) {
      console.error('[AutoApproval] Error evaluating auto approval:', error);
      res.status(500).json({
        success: false,
        message: '自動承認評価の実行に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/auto/execute - 自動承認実行
router.post('/execute',
  authenticate,
  requireRole(['ADMIN']),
  [
    body('requestId').isInt({ min: 1 }).withMessage('有効なリクエストIDを指定してください'),
    body('ruleId').isInt({ min: 1 }).withMessage('有効なルールIDを指定してください'),
    body('overrideReason').optional().isString().isLength({ max: 500 }).withMessage('上書き理由は500文字以内で入力してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId, ruleId, overrideReason } = req.body;
      const companyId = req.user.companyId;
      const executedBy = req.user.id;

      console.log(`[AutoApproval] Executing auto approval for request ${requestId} with rule ${ruleId}`);

      const result = await autoApprovalService.executeAutoApproval(requestId, ruleId, {
        companyId,
        executedBy,
        overrideReason
      });

      res.json({
        success: true,
        message: '自動承認を実行しました',
        data: result
      });
    } catch (error) {
      console.error('[AutoApproval] Error executing auto approval:', error);
      res.status(500).json({
        success: false,
        message: '自動承認の実行に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/auto/history - 自動承認履歴
router.get('/history',
  authenticate,
  requireRole(['ADMIN']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('requestId').optional().isInt({ min: 1 }),
    query('ruleId').optional().isInt({ min: 1 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['SUCCESS', 'FAILED', 'SKIPPED'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, requestId, ruleId, startDate, endDate, status } = req.query;
      const companyId = req.user.companyId;

      console.log(`[AutoApproval] Getting auto approval history for company ${companyId}`);

      const result = await autoApprovalService.getAutoApprovalHistory(companyId, {
        page: Number(page),
        pageSize: Number(limit),
        requestId: requestId ? Number(requestId) : undefined,
        ruleId: ruleId ? Number(ruleId) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as string
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[AutoApproval] Error getting auto approval history:', error);
      res.status(500).json({
        success: false,
        message: '自動承認履歴の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/auto/statistics - 自動承認統計
router.get('/statistics',
  authenticate,
  requireRole(['ADMIN']),
  [
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('workflowTypeId').optional().isInt({ min: 1 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { period = 'month', startDate, endDate, workflowTypeId } = req.query;
      const companyId = req.user.companyId;

      console.log(`[AutoApproval] Getting auto approval statistics for company ${companyId}`);

      const statistics = await autoApprovalService.getAutoApprovalStatistics(companyId, {
        period: period as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        workflowTypeId: workflowTypeId ? Number(workflowTypeId) : undefined
      });

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('[AutoApproval] Error getting auto approval statistics:', error);
      res.status(500).json({
        success: false,
        message: '自動承認統計の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/auto/rules/:id/test - 自動承認ルールテスト
router.post('/rules/:id/test',
  authenticate,
  requireRole(['ADMIN']),
  [
    param('id').isInt({ min: 1 }).withMessage('有効なルールIDを指定してください'),
    body('testData').isObject().withMessage('テストデータはオブジェクトで指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const ruleId = Number(req.params.id);
      const { testData } = req.body;
      const companyId = req.user.companyId;

      console.log(`[AutoApproval] Testing auto approval rule ${ruleId}`);

      const testResult = await autoApprovalService.testAutoApprovalRule(ruleId, testData, companyId);

      res.json({
        success: true,
        message: '自動承認ルールテストを実行しました',
        data: testResult
      });
    } catch (error) {
      console.error('[AutoApproval] Error testing auto approval rule:', error);
      res.status(500).json({
        success: false,
        message: '自動承認ルールテストの実行に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;