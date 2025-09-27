import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { WorkflowService } from '../services/WorkflowService';
import { EmergencyApprovalService } from '../services/EmergencyApprovalService';
import { ApprovalDelegationService } from '../services/ApprovalDelegationService';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  validateCreateWorkflowType,
  validateUpdateWorkflowType,
  validateCreateWorkflowRequest,
  validateUpdateWorkflowRequest,
  validateListQuery
} from '../utils/validation';

const router = Router();
const workflowService = new WorkflowService();
const emergencyApprovalService = new EmergencyApprovalService();
const delegationService = new ApprovalDelegationService();

// ============ ワークフロータイプ管理 ============

// ワークフロータイプ一覧取得
router.get('/types',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().isLength({ max: 100 }),
    query('category').optional().isIn(['USER_MANAGEMENT', 'SYSTEM_CONFIG', 'DATA_OPERATION', 'APPROVAL', 'OTHER']),
    query('isActive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, category, isActive } = req.query;
      const companyId = req.user.companyId;

      const result = await workflowService.getWorkflowTypes(companyId, {
        page: Number(page),
        pageSize: Number(limit),
        search: search as string,
        category: category as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      });

      res.json(result);
    } catch (error) {
      console.error('ワークフロータイプ一覧取得エラー:', error);
      console.error('Error stack:', error.stack);
      console.error('User:', req.user);
      console.error('Query params:', req.query);
      res.status(500).json({ error: 'ワークフロータイプの取得に失敗しました', details: error.message });
    }
  }
);

// ワークフロータイプ詳細取得
router.get('/types/:id',
  authenticate,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  async (req, res) => {
    try {
      const workflowTypeId = Number(req.params.id);
      const companyId = req.user.companyId;

      const workflowType = await workflowService.getWorkflowType(workflowTypeId, companyId);

      if (!workflowType) {
        return res.status(404).json({ error: 'ワークフロータイプが見つかりません' });
      }

      res.json(workflowType);
    } catch (error) {
      console.error('ワークフロータイプ詳細取得エラー:', error);
      res.status(500).json({ error: 'ワークフロータイプの取得に失敗しました' });
    }
  }
);

// ワークフロータイプ作成
router.post('/types',
  authenticate,
  requireRole(['ADMIN']),
  validateCreateWorkflowType,
  validateRequest,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const createdBy = req.user.id;

      const workflowType = await workflowService.createWorkflowType({
        ...req.body,
        companyId,
        createdBy
      });

      res.status(201).json(workflowType);
    } catch (error) {
      console.error('ワークフロータイプ作成エラー:', error);
      if (error.message.includes('既に存在します')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'ワークフロータイプの作成に失敗しました' });
    }
  }
);

// ワークフロータイプ更新
router.put('/types/:id',
  authenticate,
  requireRole(['ADMIN']),
  [param('id').isInt({ min: 1 })],
  validateUpdateWorkflowType,
  validateRequest,
  async (req, res) => {
    try {
      const workflowTypeId = Number(req.params.id);
      const companyId = req.user.companyId;
      const updatedBy = req.user.id;

      const workflowType = await workflowService.updateWorkflowType(workflowTypeId, {
        ...req.body,
        updatedBy
      }, companyId);

      res.json(workflowType);
    } catch (error) {
      console.error('ワークフロータイプ更新エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('既に存在します')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'ワークフロータイプの更新に失敗しました' });
    }
  }
);

// ワークフロータイプ削除
router.delete('/types/:id',
  authenticate,
  requireRole(['ADMIN']),
  [param('id').isInt({ min: 1 })],
  validateRequest,
  async (req, res) => {
    try {
      const workflowTypeId = Number(req.params.id);
      const companyId = req.user.companyId;

      await workflowService.deleteWorkflowType(workflowTypeId, companyId);
      res.status(204).send();
    } catch (error) {
      console.error('ワークフロータイプ削除エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('削除できません')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'ワークフロータイプの削除に失敗しました' });
    }
  }
);

// ============ ワークフロー申請管理 ============

// ワークフロー申請一覧取得
router.get('/requests',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().isLength({ max: 100 }),
    query('status').optional().isIn(['DRAFT', 'SUBMITTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED']),
    query('workflowTypeId').optional().isInt({ min: 1 }),
    query('requesterId').optional().isInt({ min: 1 }),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        workflowTypeId,
        requesterId,
        dateFrom,
        dateTo
      } = req.query;
      const companyId = req.user.companyId;

      const result = await workflowService.getWorkflowRequests(companyId, {
        page: Number(page),
        pageSize: Number(limit),
        search: search as string,
        status: status as string,
        workflowTypeId: workflowTypeId ? Number(workflowTypeId) : undefined,
        requesterId: requesterId ? Number(requesterId) : undefined,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string
      });

      res.json(result);
    } catch (error) {
      console.error('ワークフロー申請一覧取得エラー:', error);
      res.status(500).json({ error: 'ワークフロー申請の取得に失敗しました' });
    }
  }
);

// ワークフロー申請詳細取得
router.get('/requests/:id',
  authenticate,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const companyId = req.user.companyId;

      const request = await workflowService.getWorkflowRequest(requestId, companyId);

      if (!request) {
        return res.status(404).json({ error: 'ワークフロー申請が見つかりません' });
      }

      res.json(request);
    } catch (error) {
      console.error('ワークフロー申請詳細取得エラー:', error);
      res.status(500).json({ error: 'ワークフロー申請の取得に失敗しました' });
    }
  }
);

// ワークフロー申請作成
router.post('/requests',
  authenticate,
  validateCreateWorkflowRequest,
  validateRequest,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const requesterId = req.user.id;

      const request = await workflowService.createWorkflowRequest({
        ...req.body,
        companyId,
        requesterId
      });

      res.status(201).json(request);
    } catch (error) {
      console.error('ワークフロー申請作成エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'ワークフロー申請の作成に失敗しました' });
    }
  }
);

// ワークフロー申請更新
router.put('/requests/:id',
  authenticate,
  [param('id').isInt({ min: 1 })],
  validateUpdateWorkflowRequest,
  validateRequest,
  async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const companyId = req.user.companyId;

      const request = await workflowService.updateWorkflowRequest(requestId, req.body, companyId, req.user.id);

      res.json(request);
    } catch (error) {
      console.error('ワークフロー申請更新エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('更新できません')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'ワークフロー申請の更新に失敗しました' });
    }
  }
);

// ワークフロー申請提出
router.post('/requests/:id/submit',
  authenticate,
  [
    param('id').isInt({ min: 1 }),
    body('comment').optional().isString().isLength({ max: 1000 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const companyId = req.user.companyId;
      const { comment } = req.body;

      const request = await workflowService.submitWorkflowRequest(requestId, comment, companyId, req.user.id);

      res.json(request);
    } catch (error) {
      console.error('ワークフロー申請提出エラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('提出できません')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'ワークフロー申請の提出に失敗しました' });
    }
  }
);

// ワークフロー申請キャンセル
router.post('/requests/:id/cancel',
  authenticate,
  [
    param('id').isInt({ min: 1 }),
    body('reason').isString().isLength({ min: 1, max: 1000 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const companyId = req.user.companyId;
      const { reason } = req.body;

      const request = await workflowService.cancelWorkflowRequest(requestId, reason, companyId);

      res.json(request);
    } catch (error) {
      console.error('ワークフロー申請キャンセルエラー:', error);
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('キャンセルできません')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'ワークフロー申請のキャンセルに失敗しました' });
    }
  }
);

// ============ ダッシュボード統計 ============

// ワークフロー統計取得
router.get('/statistics',
  authenticate,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.id;

      const statistics = await workflowService.getWorkflowStatistics(companyId);

      res.json(statistics);
    } catch (error) {
      console.error('ワークフロー統計取得エラー:', error);
      res.status(500).json({ error: 'ワークフロー統計の取得に失敗しました' });
    }
  }
);

// 承認待ち一覧取得
router.get('/pending-approvals',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const companyId = req.user.companyId;
      const userId = req.user.id;

      const result = await workflowService.getPendingApprovals(
        companyId,
        userId,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      console.error('承認待ち一覧取得エラー:', error);
      res.status(500).json({ error: '承認待ち一覧の取得に失敗しました' });
    }
  }
);

// ============ 緊急承認機能 ============

// 緊急承認実行
router.post('/requests/:id/emergency-approve',
  authenticate,
  requireRole(['ADMIN']),
  [
    param('id').isInt({ min: 1 }),
    body('reason').isString().isLength({ min: 10, max: 1000 }).withMessage('理由は10-1000文字で入力してください'),
    body('notifyApprovers').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const { reason, notifyApprovers = true } = req.body;
      const adminUserId = req.user.id;
      const companyId = req.user.companyId;

      const result = await emergencyApprovalService.executeEmergencyApproval({
        requestId,
        reason,
        adminUserId,
        companyId,
        notifyApprovers
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('緊急承認実行エラー:', error);
      if (error.message.includes('管理者のみ')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      if (error.message.includes('見つかりません')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('既に緊急承認済み')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: '緊急承認の実行に失敗しました' });
    }
  }
);

// 緊急承認可能性チェック
router.get('/requests/:id/emergency-approve/check',
  authenticate,
  requireRole(['ADMIN']),
  [param('id').isInt({ min: 1 })],
  validateRequest,
  async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const adminUserId = req.user.id;
      const companyId = req.user.companyId;

      const result = await emergencyApprovalService.canEmergencyApprove(requestId, adminUserId, companyId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('緊急承認可能性チェックエラー:', error);
      res.status(500).json({ success: false, error: '緊急承認可能性のチェックに失敗しました' });
    }
  }
);

// 緊急承認履歴取得
router.get('/emergency-approvals',
  authenticate,
  requireRole(['ADMIN']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('adminUserId').optional().isInt({ min: 1 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page, pageSize, dateFrom, dateTo, adminUserId } = req.query;
      const companyId = req.user.companyId;

      const options: any = {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        adminUserId: adminUserId ? Number(adminUserId) : undefined
      };

      if (dateFrom) options.dateFrom = new Date(dateFrom as string);
      if (dateTo) options.dateTo = new Date(dateTo as string);

      const result = await emergencyApprovalService.getEmergencyApprovalHistory(companyId, options);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('緊急承認履歴取得エラー:', error);
      res.status(500).json({ success: false, error: '緊急承認履歴の取得に失敗しました' });
    }
  }
);

// 緊急承認統計取得
router.get('/emergency-approvals/statistics',
  authenticate,
  requireRole(['ADMIN']),
  [query('days').optional().isInt({ min: 1, max: 365 })],
  validateRequest,
  async (req, res) => {
    try {
      const { days } = req.query;
      const companyId = req.user.companyId;

      const result = await emergencyApprovalService.getEmergencyApprovalStatistics(
        companyId,
        days ? Number(days) : 30
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('緊急承認統計取得エラー:', error);
      res.status(500).json({ success: false, error: '緊急承認統計の取得に失敗しました' });
    }
  }
);

// ============ 承認委任管理 ============

// 委任作成
router.post('/delegations',
  authenticate,
  [
    body('delegateId').isInt().withMessage('委任先ユーザーIDは数値である必要があります'),
    body('startDate').isISO8601().withMessage('開始日は有効な日付である必要があります'),
    body('endDate').isISO8601().withMessage('終了日は有効な日付である必要があります'),
    body('workflowTypeId').optional().isInt().withMessage('ワークフロータイプIDは数値である必要があります'),
    body('reason').optional().isString().withMessage('理由は文字列である必要があります')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { delegateId, startDate, endDate, workflowTypeId, reason } = req.body;
      const delegatorId = req.user.id;
      const createdBy = req.user.id;

      const result = await delegationService.createDelegation({
        delegatorId,
        delegateId,
        workflowTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        createdBy
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('委任作成エラー:', error);
      res.status(500).json({ success: false, error: error.message || '委任の作成に失敗しました' });
    }
  }
);

// 委任可能性チェック
router.get('/delegations/check',
  authenticate,
  [
    query('delegateId').isInt().withMessage('委任先ユーザーIDは数値である必要があります'),
    query('workflowTypeId').optional().isInt().withMessage('ワークフロータイプIDは数値である必要があります'),
    query('startDate').optional().isISO8601().withMessage('開始日は有効な日付である必要があります'),
    query('endDate').optional().isISO8601().withMessage('終了日は有効な日付である必要があります')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { delegateId, workflowTypeId, startDate, endDate } = req.query;
      const delegatorId = req.user.id;

      const result = await delegationService.canCreateDelegation(
        delegatorId,
        Number(delegateId),
        workflowTypeId ? Number(workflowTypeId) : undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('委任可能性チェックエラー:', error);
      res.status(500).json({ success: false, error: '委任可能性のチェックに失敗しました' });
    }
  }
);

// アクティブな委任取得
router.get('/delegations/active',
  authenticate,
  [
    query('workflowTypeId').optional().isInt().withMessage('ワークフロータイプIDは数値である必要があります')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { workflowTypeId } = req.query;
      const userId = req.user.id;

      const result = await delegationService.getActiveDelegations(
        userId,
        workflowTypeId ? Number(workflowTypeId) : undefined
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('アクティブ委任取得エラー:', error);
      res.status(500).json({ success: false, error: 'アクティブな委任の取得に失敗しました' });
    }
  }
);

// 実効承認者取得
router.get('/delegations/effective-approver/:userId',
  authenticate,
  [
    param('userId').isInt().withMessage('ユーザーIDは数値である必要があります'),
    query('workflowTypeId').optional().isInt().withMessage('ワークフロータイプIDは数値である必要があります')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { workflowTypeId } = req.query;

      const effectiveApproverId = await delegationService.getEffectiveApprover(
        Number(userId),
        workflowTypeId ? Number(workflowTypeId) : undefined
      );

      res.json({
        success: true,
        data: { effectiveApproverId }
      });
    } catch (error) {
      console.error('実効承認者取得エラー:', error);
      res.status(500).json({ success: false, error: '実効承認者の取得に失敗しました' });
    }
  }
);

// 委任履歴取得
router.get('/delegations',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('ページは1以上の整数である必要があります'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('ページサイズは1-100の整数である必要があります'),
    query('delegatorId').optional().isInt().withMessage('委任者IDは数値である必要があります'),
    query('delegateId').optional().isInt().withMessage('委任先IDは数値である必要があります'),
    query('workflowTypeId').optional().isInt().withMessage('ワークフロータイプIDは数値である必要があります')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { page, pageSize, delegatorId, delegateId, workflowTypeId, startDate, endDate } = req.query;
      const companyId = req.user.companyId;

      const result = await delegationService.getDelegationHistory(companyId, {
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20,
        delegatorId: delegatorId ? Number(delegatorId) : undefined,
        delegateId: delegateId ? Number(delegateId) : undefined,
        workflowTypeId: workflowTypeId ? Number(workflowTypeId) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('委任履歴取得エラー:', error);
      res.status(500).json({ success: false, error: '委任履歴の取得に失敗しました' });
    }
  }
);

// 委任更新
router.put('/delegations/:id',
  authenticate,
  [
    param('id').isInt().withMessage('委任IDは数値である必要があります'),
    body('startDate').optional().isISO8601().withMessage('開始日は有効な日付である必要があります'),
    body('endDate').optional().isISO8601().withMessage('終了日は有効な日付である必要があります'),
    body('reason').optional().isString().withMessage('理由は文字列である必要があります'),
    body('isActive').optional().isBoolean().withMessage('アクティブ状態はブール値である必要があります')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedBy = req.user.id;

      // 日付フィールドの変換
      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.endDate) updates.endDate = new Date(updates.endDate);

      const result = await delegationService.updateDelegation(
        Number(id),
        updates,
        updatedBy
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('委任更新エラー:', error);
      res.status(500).json({ success: false, error: error.message || '委任の更新に失敗しました' });
    }
  }
);

// 委任削除
router.delete('/delegations/:id',
  authenticate,
  [
    param('id').isInt().withMessage('委任IDは数値である必要があります')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user.id;

      const result = await delegationService.deleteDelegation(Number(id), deletedBy);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('委任削除エラー:', error);
      res.status(500).json({ success: false, error: error.message || '委任の削除に失敗しました' });
    }
  }
);

// 期限切れ委任の自動無効化（管理者のみ）
router.post('/delegations/cleanup',
  authenticate,
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const result = await delegationService.deactivateExpiredDelegations();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('期限切れ委任無効化エラー:', error);
      res.status(500).json({ success: false, error: '期限切れ委任の無効化に失敗しました' });
    }
  }
);

export default router;