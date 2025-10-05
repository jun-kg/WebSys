/**
 * 役職権限API
 * Phase 3 - T014
 *
 * 役職別権限マトリクスの取得・管理
 */

import express from 'express';
import { authMiddleware } from '../../core/middleware/auth';
import { checkDepartmentScope } from '../../core/middleware/checkDepartmentScope';
import { RolePermissionService, PermissionScope } from '../../core/services/RolePermissionService';
import { UserRole } from '@prisma/client';

const router = express.Router();
const rolePermissionService = new RolePermissionService();

/**
 * GET /api/role-permissions/matrix
 * 全役職の権限マトリクス取得
 */
router.get(
  '/matrix',
  authMiddleware,
  checkDepartmentScope({ action: 'PERMISSION_VIEW' }),
  async (req, res) => {
    try {
      const matrices = await rolePermissionService.getAllPermissionMatrices();

      res.json({
        success: true,
        data: matrices
      });
    } catch (error) {
      console.error('Error fetching permission matrices:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MATRIX_FETCH_ERROR',
          message: '権限マトリクス取得に失敗しました'
        }
      });
    }
  }
);

/**
 * GET /api/role-permissions/matrix/:role
 * 特定役職の権限マトリクス取得
 */
router.get(
  '/matrix/:role',
  authMiddleware,
  checkDepartmentScope({ action: 'PERMISSION_VIEW' }),
  async (req, res) => {
    try {
      const role = req.params.role.toUpperCase() as UserRole;

      if (!['ADMIN', 'MANAGER', 'USER', 'GUEST'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: '無効な役職です'
          }
        });
      }

      const matrix = await rolePermissionService.getPermissionMatrixByRole(role);

      res.json({
        success: true,
        data: matrix
      });
    } catch (error) {
      console.error('Error fetching permission matrix:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MATRIX_FETCH_ERROR',
          message: '権限マトリクス取得に失敗しました'
        }
      });
    }
  }
);

/**
 * GET /api/role-permissions/user/:userId
 * 特定ユーザーの権限情報取得
 */
router.get(
  '/user/:userId',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const requestUserId = req.user!.id;
      const requestUserRole = req.user!.role;

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_ID',
            message: '無効なユーザーIDです'
          }
        });
      }

      // 自分の権限は誰でも閲覧可能
      // 他人の権限はADMIN/MANAGERのみ閲覧可能
      if (userId !== requestUserId && !['ADMIN', 'MANAGER'].includes(requestUserRole)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: '他ユーザーの権限情報を閲覧する権限がありません'
          }
        });
      }

      const scope = await rolePermissionService.getUserPermissionScope(userId);

      res.json({
        success: true,
        data: scope
      });
    } catch (error) {
      console.error('Error fetching user permission:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_FETCH_ERROR',
          message: 'ユーザー権限取得に失敗しました'
        }
      });
    }
  }
);

/**
 * POST /api/role-permissions/check
 * 権限チェック
 */
router.post(
  '/check',
  authMiddleware,
  async (req, res) => {
    try {
      const { action, targetUserId, targetDepartmentId } = req.body;

      if (!action || typeof action !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'アクションが必要です'
          }
        });
      }

      const result = await rolePermissionService.checkPermission(
        req.user!.id,
        action,
        {
          userId: req.user!.id,
          targetUserId,
          targetDepartmentId
        }
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: '権限チェックに失敗しました'
        }
      });
    }
  }
);

/**
 * GET /api/role-permissions/my-scope
 * 自分の権限スコープ取得（簡易版）
 */
router.get(
  '/my-scope',
  authMiddleware,
  async (req, res) => {
    try {
      const scope = await rolePermissionService.getUserPermissionScope(req.user!.id);

      res.json({
        success: true,
        data: scope
      });
    } catch (error) {
      console.error('Error fetching user scope:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SCOPE_FETCH_ERROR',
          message: '権限スコープ取得に失敗しました'
        }
      });
    }
  }
);

/**
 * GET /api/role-permissions/actions
 * 全アクション一覧取得
 */
router.get(
  '/actions',
  authMiddleware,
  checkDepartmentScope({ action: 'PERMISSION_VIEW' }),
  async (req, res) => {
    try {
      const actions = await rolePermissionService.getAllActions();

      res.json({
        success: true,
        data: actions
      });
    } catch (error) {
      console.error('Error fetching actions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ACTIONS_FETCH_ERROR',
          message: 'アクション一覧取得に失敗しました'
        }
      });
    }
  }
);

export default router;
