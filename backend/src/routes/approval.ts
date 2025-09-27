import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ApprovalService } from '../services/ApprovalService';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const approvalService = new ApprovalService();

// ============ 承認処理 ============

// 承認・却下処理
router.post('/requests/:requestId/process',
  authenticate,
  [
    param('requestId').isInt({ min: 1 }),
    body('action').isIn(['APPROVE', 'REJECT']),
    body('comment').optional().isString().isLength({ max: 1000 }),
    body('delegatedBy').optional().isInt({ min: 1 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const requestId = Number(req.params.requestId);
      const { action, comment, delegatedBy } = req.body;
      const approverId = req.user.id;
      const companyId = req.user.companyId;

      const result = await approvalService.processApproval(
        requestId,
        approverId,
        action,
        comment,
        companyId,
        delegatedBy
      );

      res.json(result);
    } catch (error) {
      console.error('承認処理エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('権限がありません') || error.message.includes('処理できません')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('無効な状態')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: '承認処理に失敗しました' });
    }
  }
);

// 承認履歴取得
router.get('/requests/:requestId/history',
  authenticate,
  [param('requestId').isInt({ min: 1 })],
  validateRequest,
  async (req, res) => {
    try {
      const requestId = Number(req.params.requestId);
      const companyId = req.user.companyId;

      const history = await approvalService.getApprovalHistory(requestId, companyId);

      res.json(history);
    } catch (error) {
      console.error('承認履歴取得エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: '承認履歴の取得に失敗しました' });
    }
  }
);

// ============ 承認ルート管理 ============

// 承認ルート一覧取得
router.get('/routes',
  authenticate,
  requireRole(['ADMIN']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().isLength({ max: 100 }),
    query('workflowTypeId').optional().isInt({ min: 1 }),
    query('isActive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        workflowTypeId,
        isActive
      } = req.query;
      const companyId = req.user.companyId;

      const result = await approvalService.getApprovalRoutes({
        companyId,
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        workflowTypeId: workflowTypeId ? Number(workflowTypeId) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      });

      res.json(result);
    } catch (error) {
      console.error('承認ルート一覧取得エラー:', error);
      res.status(500).json({ error: '承認ルートの取得に失敗しました' });
    }
  }
);

// 承認ルート詳細取得
router.get('/routes/:id',
  authenticate,
  requireRole(['ADMIN']),
  [param('id').isInt({ min: 1 })],
  validateRequest,
  async (req, res) => {
    try {
      const routeId = Number(req.params.id);
      const companyId = req.user.companyId;

      const route = await approvalService.getApprovalRouteById(routeId, companyId);

      if (!route) {
        return res.status(404).json({ error: '承認ルートが見つかりません' });
      }

      res.json(route);
    } catch (error) {
      console.error('承認ルート詳細取得エラー:', error);
      res.status(500).json({ error: '承認ルートの取得に失敗しました' });
    }
  }
);

// 承認ルート作成
router.post('/routes',
  authenticate,
  requireRole(['ADMIN']),
  [
    body('workflowTypeId').isInt({ min: 1 }),
    body('name').isString().isLength({ min: 1, max: 200 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('isActive').optional().isBoolean(),
    body('steps').isArray({ min: 1 }),
    body('steps.*.stepNumber').isInt({ min: 1 }),
    body('steps.*.stepName').isString().isLength({ min: 1, max: 100 }),
    body('steps.*.approverType').isIn(['USER', 'DEPARTMENT', 'ROLE', 'DYNAMIC']),
    body('steps.*.approverValue').optional().isString().isLength({ max: 200 }),
    body('steps.*.isRequired').isBoolean(),
    body('steps.*.isParallel').isBoolean(),
    body('steps.*.autoApprovalCondition').optional().isString().isLength({ max: 1000 }),
    body('steps.*.timeoutHours').optional().isInt({ min: 1, max: 8760 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const createdBy = req.user.id;

      const route = await approvalService.createApprovalRoute({
        ...req.body,
        companyId,
        createdBy
      });

      res.status(201).json(route);
    } catch (error) {
      console.error('承認ルート作成エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('既に存在します')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: '承認ルートの作成に失敗しました' });
    }
  }
);

// 承認ルート更新
router.put('/routes/:id',
  authenticate,
  requireRole(['ADMIN']),
  [
    param('id').isInt({ min: 1 }),
    body('name').optional().isString().isLength({ min: 1, max: 200 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('isActive').optional().isBoolean(),
    body('steps').optional().isArray({ min: 1 }),
    body('steps.*.stepNumber').optional().isInt({ min: 1 }),
    body('steps.*.stepName').optional().isString().isLength({ min: 1, max: 100 }),
    body('steps.*.approverType').optional().isIn(['USER', 'DEPARTMENT', 'ROLE', 'DYNAMIC']),
    body('steps.*.approverValue').optional().isString().isLength({ max: 200 }),
    body('steps.*.isRequired').optional().isBoolean(),
    body('steps.*.isParallel').optional().isBoolean(),
    body('steps.*.autoApprovalCondition').optional().isString().isLength({ max: 1000 }),
    body('steps.*.timeoutHours').optional().isInt({ min: 1, max: 8760 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const routeId = Number(req.params.id);
      const companyId = req.user.companyId;
      const updatedBy = req.user.id;

      const route = await approvalService.updateApprovalRoute(routeId, {
        ...req.body,
        updatedBy
      }, companyId);

      res.json(route);
    } catch (error) {
      console.error('承認ルート更新エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('更新できません')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: '承認ルートの更新に失敗しました' });
    }
  }
);

// 承認ルート削除
router.delete('/routes/:id',
  authenticate,
  requireRole(['ADMIN']),
  [param('id').isInt({ min: 1 })],
  validateRequest,
  async (req, res) => {
    try {
      const routeId = Number(req.params.id);
      const companyId = req.user.companyId;

      await approvalService.deleteApprovalRoute(routeId, companyId);
      res.status(204).send();
    } catch (error) {
      console.error('承認ルート削除エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('削除できません')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: '承認ルートの削除に失敗しました' });
    }
  }
);

// ============ 承認委譲管理 ============

// 承認委譲設定一覧取得
router.get('/delegates',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('delegatorId').optional().isInt({ min: 1 }),
    query('delegateeId').optional().isInt({ min: 1 }),
    query('isActive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        delegatorId,
        delegateeId,
        isActive
      } = req.query;
      const companyId = req.user.companyId;

      const result = await approvalService.getApprovalDelegates({
        companyId,
        page: Number(page),
        limit: Number(limit),
        delegatorId: delegatorId ? Number(delegatorId) : undefined,
        delegateeId: delegateeId ? Number(delegateeId) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      });

      res.json(result);
    } catch (error) {
      console.error('承認委譲設定一覧取得エラー:', error);
      res.status(500).json({ error: '承認委譲設定の取得に失敗しました' });
    }
  }
);

// 承認委譲設定作成
router.post('/delegates',
  authenticate,
  [
    body('delegateeId').isInt({ min: 1 }),
    body('workflowTypeId').optional().isInt({ min: 1 }),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('reason').optional().isString().isLength({ max: 1000 }),
    body('isActive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const delegatorId = req.user.id;
      const companyId = req.user.companyId;

      const delegate = await approvalService.createApprovalDelegate({
        ...req.body,
        delegatorId,
        companyId
      });

      res.status(201).json(delegate);
    } catch (error) {
      console.error('承認委譲設定作成エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('重複しています')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: '承認委譲設定の作成に失敗しました' });
    }
  }
);

// 承認委譲設定更新
router.put('/delegates/:id',
  authenticate,
  [
    param('id').isInt({ min: 1 }),
    body('delegateeId').optional().isInt({ min: 1 }),
    body('workflowTypeId').optional().isInt({ min: 1 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('reason').optional().isString().isLength({ max: 1000 }),
    body('isActive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const delegateId = Number(req.params.id);
      const companyId = req.user.companyId;

      const delegate = await approvalService.updateApprovalDelegate(delegateId, req.body, companyId);

      res.json(delegate);
    } catch (error) {
      console.error('承認委譲設定更新エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('更新できません')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: '承認委譲設定の更新に失敗しました' });
    }
  }
);

// 承認委譲設定削除
router.delete('/delegates/:id',
  authenticate,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  async (req, res) => {
    try {
      const delegateId = Number(req.params.id);
      const companyId = req.user.companyId;

      await approvalService.deleteApprovalDelegate(delegateId, companyId);
      res.status(204).send();
    } catch (error) {
      console.error('承認委譲設定削除エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: '承認委譲設定の削除に失敗しました' });
    }
  }
);

// ============ 承認統計・レポート ============

// 承認統計取得
router.get('/statistics',
  authenticate,
  [
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('workflowTypeId').optional().isInt({ min: 1 }),
    query('departmentId').optional().isInt({ min: 1 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        dateFrom,
        dateTo,
        workflowTypeId,
        departmentId
      } = req.query;
      const companyId = req.user.companyId;

      const statistics = await approvalService.getApprovalStatistics({
        companyId,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        workflowTypeId: workflowTypeId ? Number(workflowTypeId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined
      });

      res.json(statistics);
    } catch (error) {
      console.error('承認統計取得エラー:', error);
      res.status(500).json({ error: '承認統計の取得に失敗しました' });
    }
  }
);

// 自動承認処理（バッチ実行用）
router.post('/auto-process',
  authenticate,
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const companyId = req.user.companyId;

      const result = await approvalService.processAutoApprovals(companyId);

      res.json(result);
    } catch (error) {
      console.error('自動承認処理エラー:', error);
      res.status(500).json({ error: '自動承認処理に失敗しました' });
    }
  }
);

export default router;