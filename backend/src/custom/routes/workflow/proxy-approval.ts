/**
 * Proxy Approval Microservice
 * 承認代理マイクロサービス
 *
 * 機能:
 * - 承認代理設定・代理承認実行・代理権限管理
 * - 8エンドポイント（約280行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ProxyApprovalService } from '../../services/ProxyApprovalService';
import { authenticate, requireRole } from '@core/middleware/auth';
import { validateRequest } from '../../../middleware/validation';
import { performanceMonitor } from '../../../middleware/performanceMonitor';

const router = Router();
const proxyApprovalService = new ProxyApprovalService();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

// GET /api/workflow/proxy - 承認代理一覧
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('principalId').optional().isInt({ min: 1 }),
    query('proxyId').optional().isInt({ min: 1 }),
    query('isActive').optional().isBoolean(),
    query('proxyType').optional().isIn(['TEMPORARY', 'PERMANENT', 'CONDITIONAL'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, principalId, proxyId, isActive, proxyType } = req.query;
      const companyId = req.user.companyId;

      console.log(`[ProxyApproval] Getting proxy approvals for company ${companyId}`);

      const result = await proxyApprovalService.getProxyApprovals(companyId, {
        page: Number(page),
        pageSize: Number(limit),
        principalId: principalId ? Number(principalId) : undefined,
        proxyId: proxyId ? Number(proxyId) : undefined,
        isActive: isActive ? isActive === 'true' : undefined,
        proxyType: proxyType as string
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[ProxyApproval] Error getting proxy approvals:', error);
      res.status(500).json({
        success: false,
        message: '承認代理一覧の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/proxy/my - 自分の代理設定一覧
router.get('/my',
  authenticate,
  [
    query('role').optional().isIn(['principal', 'proxy']).withMessage('roleは principal または proxy を指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { role = 'principal' } = req.query;
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[ProxyApproval] Getting my proxy approvals (${role}) for user ${userId}`);

      const proxyApprovals = await proxyApprovalService.getUserProxyApprovals(userId, companyId, {
        role: role as string
      });

      res.json({
        success: true,
        data: proxyApprovals
      });
    } catch (error) {
      console.error('[ProxyApproval] Error getting my proxy approvals:', error);
      res.status(500).json({
        success: false,
        message: '承認代理一覧の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/proxy - 承認代理設定作成
router.post('/',
  authenticate,
  [
    body('proxyId').isInt({ min: 1 }).withMessage('有効な代理者ユーザーIDを指定してください'),
    body('proxyType').isIn(['TEMPORARY', 'PERMANENT', 'CONDITIONAL']).withMessage('代理タイプを選択してください'),
    body('workflowTypeIds').optional().isArray().withMessage('ワークフロータイプIDは配列で指定してください'),
    body('workflowTypeIds.*').optional().isInt({ min: 1 }).withMessage('有効なワークフロータイプIDを指定してください'),
    body('startDate').optional().isISO8601().withMessage('有効な開始日を指定してください'),
    body('endDate').optional().isISO8601().withMessage('有効な終了日を指定してください'),
    body('conditions').optional().isObject().withMessage('条件はオブジェクトで指定してください'),
    body('reason').isString().isLength({ min: 1, max: 500 }).withMessage('代理理由は1-500文字で入力してください'),
    body('maxApprovalAmount').optional().isFloat({ min: 0 }).withMessage('承認上限金額は0以上で指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { proxyId, proxyType, workflowTypeIds, startDate, endDate, conditions, reason, maxApprovalAmount } = req.body;
      const companyId = req.user.companyId;
      const principalId = req.user.id;

      console.log(`[ProxyApproval] Creating proxy approval from user ${principalId} to user ${proxyId}`);

      // 自分自身への代理設定チェック
      if (principalId === proxyId) {
        return res.status(400).json({
          success: false,
          message: '自分自身を代理者に指定することはできません'
        });
      }

      // 一時代理の場合は期間必須
      if (proxyType === 'TEMPORARY' && (!startDate || !endDate)) {
        return res.status(400).json({
          success: false,
          message: '一時代理の場合は開始日と終了日が必須です'
        });
      }

      const proxyApproval = await proxyApprovalService.createProxyApproval({
        principalId,
        proxyId,
        companyId,
        proxyType,
        workflowTypeIds: workflowTypeIds || [],
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        conditions: conditions || {},
        reason,
        maxApprovalAmount
      });

      res.status(201).json({
        success: true,
        message: '承認代理設定を作成しました',
        data: proxyApproval
      });
    } catch (error) {
      console.error('[ProxyApproval] Error creating proxy approval:', error);
      res.status(500).json({
        success: false,
        message: '承認代理設定の作成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// PUT /api/workflow/proxy/:id - 承認代理設定更新
router.put('/:id',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください'),
    body('proxyType').optional().isIn(['TEMPORARY', 'PERMANENT', 'CONDITIONAL']).withMessage('代理タイプを選択してください'),
    body('workflowTypeIds').optional().isArray().withMessage('ワークフロータイプIDは配列で指定してください'),
    body('startDate').optional().isISO8601().withMessage('有効な開始日を指定してください'),
    body('endDate').optional().isISO8601().withMessage('有効な終了日を指定してください'),
    body('conditions').optional().isObject().withMessage('条件はオブジェクトで指定してください'),
    body('reason').optional().isString().isLength({ min: 1, max: 500 }).withMessage('代理理由は1-500文字で入力してください'),
    body('maxApprovalAmount').optional().isFloat({ min: 0 }).withMessage('承認上限金額は0以上で指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[ProxyApproval] Updating proxy approval ${id} by user ${userId}`);

      // 存在確認と権限チェック
      const existingProxy = await proxyApprovalService.getProxyApprovalById(id, companyId);
      if (!existingProxy) {
        return res.status(404).json({
          success: false,
          message: '承認代理設定が見つかりません'
        });
      }

      if (existingProxy.principalId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'この承認代理設定を更新する権限がありません'
        });
      }

      const updatedProxy = await proxyApprovalService.updateProxyApproval(id, req.body);

      res.json({
        success: true,
        message: '承認代理設定を更新しました',
        data: updatedProxy
      });
    } catch (error) {
      console.error('[ProxyApproval] Error updating proxy approval:', error);
      res.status(500).json({
        success: false,
        message: '承認代理設定の更新に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// DELETE /api/workflow/proxy/:id - 承認代理設定削除
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

      console.log(`[ProxyApproval] Deleting proxy approval ${id} by user ${userId}`);

      const result = await proxyApprovalService.deleteProxyApproval(id, userId, companyId);

      res.json({
        success: true,
        message: '承認代理設定を削除しました',
        data: result
      });
    } catch (error) {
      console.error('[ProxyApproval] Error deleting proxy approval:', error);
      res.status(500).json({
        success: false,
        message: '承認代理設定の削除に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/proxy/:id/approve - 代理承認実行
router.post('/:id/approve',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なリクエストIDを指定してください'),
    body('comment').optional().isString().isLength({ max: 500 }).withMessage('コメントは500文字以内で入力してください'),
    body('onBehalfOf').isInt({ min: 1 }).withMessage('代理対象ユーザーIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const { comment, onBehalfOf } = req.body;
      const companyId = req.user.companyId;
      const proxyId = req.user.id;

      console.log(`[ProxyApproval] Processing proxy approval for request ${requestId} by proxy ${proxyId} on behalf of ${onBehalfOf}`);

      const result = await proxyApprovalService.processProxyApproval(requestId, {
        proxyId,
        principalId: onBehalfOf,
        companyId,
        action: 'APPROVE',
        comment
      });

      res.json({
        success: true,
        message: '代理承認を実行しました',
        data: result
      });
    } catch (error) {
      console.error('[ProxyApproval] Error processing proxy approval:', error);
      res.status(500).json({
        success: false,
        message: '代理承認の実行に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/proxy/:id/reject - 代理却下実行
router.post('/:id/reject',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('有効なリクエストIDを指定してください'),
    body('comment').isString().isLength({ min: 1, max: 500 }).withMessage('却下理由は必須で、500文字以内で入力してください'),
    body('onBehalfOf').isInt({ min: 1 }).withMessage('代理対象ユーザーIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const { comment, onBehalfOf } = req.body;
      const companyId = req.user.companyId;
      const proxyId = req.user.id;

      console.log(`[ProxyApproval] Processing proxy rejection for request ${requestId} by proxy ${proxyId} on behalf of ${onBehalfOf}`);

      const result = await proxyApprovalService.processProxyApproval(requestId, {
        proxyId,
        principalId: onBehalfOf,
        companyId,
        action: 'REJECT',
        comment
      });

      res.json({
        success: true,
        message: '代理却下を実行しました',
        data: result
      });
    } catch (error) {
      console.error('[ProxyApproval] Error processing proxy rejection:', error);
      res.status(500).json({
        success: false,
        message: '代理却下の実行に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/proxy/pending - 代理承認待ち一覧
router.get('/pending',
  authenticate,
  [
    query('principalId').optional().isInt({ min: 1 }).withMessage('有効な本人ユーザーIDを指定してください')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { principalId } = req.query;
      const companyId = req.user.companyId;
      const proxyId = req.user.id;

      console.log(`[ProxyApproval] Getting pending proxy approvals for proxy ${proxyId}`);

      const pendingApprovals = await proxyApprovalService.getPendingProxyApprovals(proxyId, companyId, {
        principalId: principalId ? Number(principalId) : undefined
      });

      res.json({
        success: true,
        data: pendingApprovals
      });
    } catch (error) {
      console.error('[ProxyApproval] Error getting pending proxy approvals:', error);
      res.status(500).json({
        success: false,
        message: '代理承認待ち一覧の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/proxy/history - 代理承認履歴
router.get('/history',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('principalId').optional().isInt({ min: 1 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, principalId, startDate, endDate } = req.query;
      const companyId = req.user.companyId;
      const proxyId = req.user.id;

      console.log(`[ProxyApproval] Getting proxy approval history for proxy ${proxyId}`);

      const result = await proxyApprovalService.getProxyApprovalHistory(proxyId, companyId, {
        page: Number(page),
        pageSize: Number(limit),
        principalId: principalId ? Number(principalId) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[ProxyApproval] Error getting proxy approval history:', error);
      res.status(500).json({
        success: false,
        message: '代理承認履歴の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;