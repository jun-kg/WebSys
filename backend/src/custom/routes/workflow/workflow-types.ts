/**
 * Workflow Types Microservice
 * ワークフロータイプ管理マイクロサービス
 *
 * 機能:
 * - ワークフロータイプの一覧・詳細・作成・更新・削除
 * - 7エンドポイント（約200行）
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { WorkflowService } from '../../services/WorkflowService';
import { authenticate, requireRole } from '@core/middleware/auth';
import { validateRequest } from '../../../middleware/validation';
import { performanceMonitor } from '../../../middleware/performanceMonitor';
import { featureFlags } from '@custom/utils/featureFlags';

const router = Router();
const workflowService = new WorkflowService();

// 性能監視ミドルウェア適用
router.use(performanceMonitor.middleware());

// GET /api/workflow/types - ワークフロータイプ一覧
router.get('/',
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

      console.log(`[WorkflowTypes] Getting workflow types for company ${companyId}`);

      const result = await workflowService.getWorkflowTypes(companyId, {
        page: Number(page),
        pageSize: Number(limit),
        search: search as string,
        category: category as string,
        isActive: isActive ? isActive === 'true' : undefined
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[WorkflowTypes] Error getting workflow types:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロータイプの取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/types/:id - ワークフロータイプ詳細
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

      console.log(`[WorkflowTypes] Getting workflow type ${id} for company ${companyId}`);

      const workflowType = await workflowService.getWorkflowTypeById(id, companyId);

      if (!workflowType) {
        return res.status(404).json({
          success: false,
          message: 'ワークフロータイプが見つかりません'
        });
      }

      res.json({
        success: true,
        data: workflowType
      });
    } catch (error) {
      console.error('[WorkflowTypes] Error getting workflow type:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロータイプの取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/types - ワークフロータイプ作成
router.post('/',
  authenticate,
  requireRole(['ADMIN']),
  [
    body('name').isString().isLength({ min: 1, max: 100 }).withMessage('名前は1-100文字で入力してください'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('説明は500文字以内で入力してください'),
    body('category').isIn(['USER_MANAGEMENT', 'SYSTEM_CONFIG', 'DATA_OPERATION', 'APPROVAL', 'OTHER']).withMessage('有効なカテゴリを選択してください'),
    body('approvalSteps').isArray().withMessage('承認ステップは配列で指定してください'),
    body('approvalSteps.*.stepNumber').isInt({ min: 1 }).withMessage('ステップ番号は1以上の整数を指定してください'),
    body('approvalSteps.*.name').isString().isLength({ min: 1, max: 100 }).withMessage('ステップ名は1-100文字で入力してください'),
    body('approvalSteps.*.approverType').isIn(['USER', 'ROLE', 'DEPARTMENT']).withMessage('有効な承認者タイプを選択してください'),
    body('isActive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[WorkflowTypes] Creating workflow type for company ${companyId} by user ${userId}`);

      const workflowTypeData = {
        ...req.body,
        companyId,
        createdBy: userId
      };

      const newWorkflowType = await workflowService.createWorkflowType(workflowTypeData);

      res.status(201).json({
        success: true,
        message: 'ワークフロータイプを作成しました',
        data: newWorkflowType
      });
    } catch (error) {
      console.error('[WorkflowTypes] Error creating workflow type:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロータイプの作成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// PUT /api/workflow/types/:id - ワークフロータイプ更新
router.put('/:id',
  authenticate,
  requireRole(['ADMIN']),
  [
    param('id').isInt({ min: 1 }).withMessage('有効なIDを指定してください'),
    body('name').optional().isString().isLength({ min: 1, max: 100 }).withMessage('名前は1-100文字で入力してください'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('説明は500文字以内で入力してください'),
    body('category').optional().isIn(['USER_MANAGEMENT', 'SYSTEM_CONFIG', 'DATA_OPERATION', 'APPROVAL', 'OTHER']).withMessage('有効なカテゴリを選択してください'),
    body('approvalSteps').optional().isArray().withMessage('承認ステップは配列で指定してください'),
    body('isActive').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.companyId;
      const userId = req.user.id;

      console.log(`[WorkflowTypes] Updating workflow type ${id} for company ${companyId} by user ${userId}`);

      // 存在確認
      const existingWorkflowType = await workflowService.getWorkflowTypeById(id, companyId);
      if (!existingWorkflowType) {
        return res.status(404).json({
          success: false,
          message: 'ワークフロータイプが見つかりません'
        });
      }

      const updateData = {
        ...req.body,
        updatedBy: userId
      };

      const updatedWorkflowType = await workflowService.updateWorkflowType(id, updateData);

      res.json({
        success: true,
        message: 'ワークフロータイプを更新しました',
        data: updatedWorkflowType
      });
    } catch (error) {
      console.error('[WorkflowTypes] Error updating workflow type:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロータイプの更新に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// DELETE /api/workflow/types/:id - ワークフロータイプ削除
router.delete('/:id',
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
      const userId = req.user.id;

      console.log(`[WorkflowTypes] Deleting workflow type ${id} for company ${companyId} by user ${userId}`);

      // 存在確認
      const existingWorkflowType = await workflowService.getWorkflowTypeById(id, companyId);
      if (!existingWorkflowType) {
        return res.status(404).json({
          success: false,
          message: 'ワークフロータイプが見つかりません'
        });
      }

      // 使用中かチェック
      const isInUse = await workflowService.isWorkflowTypeInUse(id);
      if (isInUse) {
        return res.status(400).json({
          success: false,
          message: 'このワークフロータイプは使用中のため削除できません'
        });
      }

      await workflowService.deleteWorkflowType(id);

      res.json({
        success: true,
        message: 'ワークフロータイプを削除しました'
      });
    } catch (error) {
      console.error('[WorkflowTypes] Error deleting workflow type:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロータイプの削除に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/workflow/types/:id/usage - ワークフロータイプ使用状況
router.get('/:id/usage',
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

      console.log(`[WorkflowTypes] Getting usage for workflow type ${id} for company ${companyId}`);

      const usage = await workflowService.getWorkflowTypeUsage(id, companyId);

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('[WorkflowTypes] Error getting workflow type usage:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロータイプの使用状況取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/workflow/types/:id/activate - ワークフロータイプ有効化
router.post('/:id/activate',
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
      const userId = req.user.id;

      console.log(`[WorkflowTypes] Activating workflow type ${id} for company ${companyId} by user ${userId}`);

      const updatedWorkflowType = await workflowService.updateWorkflowType(id, {
        isActive: true,
        updatedBy: userId
      });

      res.json({
        success: true,
        message: 'ワークフロータイプを有効化しました',
        data: updatedWorkflowType
      });
    } catch (error) {
      console.error('[WorkflowTypes] Error activating workflow type:', error);
      res.status(500).json({
        success: false,
        message: 'ワークフロータイプの有効化に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;