/**
 * ゲストユーザーAPI
 * Phase 3 - T016
 */

import express from 'express';
import { authMiddleware } from '../../core/middleware/auth';
import { GuestUserService, GUEST_RESTRICTIONS } from '../services/GuestUserService';

const router = express.Router();
const guestService = new GuestUserService();

/**
 * POST /api/guest/invite
 * ゲストユーザー招待
 */
router.post(
  '/invite',
  authMiddleware,
  async (req, res) => {
    try {
      // 権限チェック（ADMIN/MANAGERのみ）
      if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'ゲストユーザー招待にはADMINまたはMANAGER権限が必要です'
          }
        });
      }

      const { email, name, organization, purpose, validDays, allowedFeatures, ipWhitelist } = req.body;

      // バリデーション
      if (!email || !name || !purpose || !validDays || !allowedFeatures) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'メールアドレス、氏名、利用目的、有効期限、許可機能は必須です'
          }
        });
      }

      const result = await guestService.inviteGuest({
        email,
        name,
        organization,
        purpose,
        validDays,
        allowedFeatures,
        invitedBy: req.user!.id,
        ipWhitelist
      });

      // 一時パスワードは管理者にのみ返す（実際はメール送信推奨）
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          guestUser: result.guestUser,
          tempPassword: result.tempPassword, // 本番ではメール送信後削除
          message: 'ゲストユーザーを招待しました'
        }
      });
    } catch (error: any) {
      console.error('Error inviting guest:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GUEST_INVITE_ERROR',
          message: error.message || 'ゲストユーザー招待に失敗しました'
        }
      });
    }
  }
);

/**
 * GET /api/guest/list
 * ゲストユーザー一覧取得
 */
router.get(
  '/list',
  authMiddleware,
  async (req, res) => {
    try {
      // 権限チェック
      if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'ゲストユーザー一覧の閲覧にはADMINまたはMANAGER権限が必要です'
          }
        });
      }

      const { isActive, expiringWithinDays } = req.query;

      const filters: any = {};
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (expiringWithinDays) {
        filters.expiringWithinDays = parseInt(expiringWithinDays as string, 10);
      }

      const guests = await guestService.getGuestUsers(req.user!.companyId, filters);

      res.json({
        success: true,
        data: guests
      });
    } catch (error) {
      console.error('Error fetching guest users:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GUEST_FETCH_ERROR',
          message: 'ゲストユーザー一覧取得に失敗しました'
        }
      });
    }
  }
);

/**
 * GET /api/guest/:userId
 * ゲストユーザー詳細取得
 */
router.get(
  '/:userId',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_ID',
            message: '無効なユーザーIDです'
          }
        });
      }

      // 権限チェック
      if (!['ADMIN', 'MANAGER'].includes(req.user!.role) && req.user!.id !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: '他のゲストユーザー情報の閲覧権限がありません'
          }
        });
      }

      const guest = await guestService.getGuestUserDetail(userId);

      if (!guest) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'GUEST_NOT_FOUND',
            message: 'ゲストユーザーが見つかりません'
          }
        });
      }

      res.json({
        success: true,
        data: guest
      });
    } catch (error) {
      console.error('Error fetching guest detail:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GUEST_DETAIL_ERROR',
          message: 'ゲストユーザー詳細取得に失敗しました'
        }
      });
    }
  }
);

/**
 * DELETE /api/guest/:userId
 * ゲストユーザー無効化
 */
router.delete(
  '/:userId',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_ID',
            message: '無効なユーザーIDです'
          }
        });
      }

      // 権限チェック
      if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'ゲストユーザー無効化にはADMINまたはMANAGER権限が必要です'
          }
        });
      }

      await guestService.deactivateGuest(userId, req.user!.id);

      res.json({
        success: true,
        message: 'ゲストユーザーを無効化しました'
      });
    } catch (error: any) {
      console.error('Error deactivating guest:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GUEST_DEACTIVATE_ERROR',
          message: error.message || 'ゲストユーザー無効化に失敗しました'
        }
      });
    }
  }
);

/**
 * POST /api/guest/:userId/extend
 * ゲストユーザー有効期限延長
 */
router.post(
  '/:userId/extend',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const { additionalDays } = req.body;

      if (isNaN(userId) || !additionalDays || additionalDays < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '無効なパラメータです'
          }
        });
      }

      // 権限チェック
      if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: '有効期限延長にはADMINまたはMANAGER権限が必要です'
          }
        });
      }

      await guestService.extendValidity(userId, additionalDays, req.user!.id);

      res.json({
        success: true,
        message: `有効期限を${additionalDays}日延長しました`
      });
    } catch (error: any) {
      console.error('Error extending validity:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXTEND_ERROR',
          message: error.message || '有効期限延長に失敗しました'
        }
      });
    }
  }
);

/**
 * GET /api/guest/:userId/access-log
 * ゲストユーザーアクセスログ取得
 */
router.get(
  '/:userId/access-log',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const limit = parseInt(req.query.limit as string || '100', 10);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_ID',
            message: '無効なユーザーIDです'
          }
        });
      }

      // 権限チェック
      if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'アクセスログ閲覧にはADMINまたはMANAGER権限が必要です'
          }
        });
      }

      const logs = await guestService.getAccessLog(userId, limit);

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      console.error('Error fetching access log:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOG_FETCH_ERROR',
          message: 'アクセスログ取得に失敗しました'
        }
      });
    }
  }
);

/**
 * GET /api/guest/restrictions
 * ゲスト制約情報取得
 */
router.get(
  '/restrictions/info',
  authMiddleware,
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          forbiddenActions: GUEST_RESTRICTIONS.FORBIDDEN_ACTIONS,
          security: GUEST_RESTRICTIONS.SECURITY,
          defaultAllowedFeatures: GUEST_RESTRICTIONS.DEFAULT_ALLOWED_FEATURES
        }
      });
    } catch (error) {
      console.error('Error fetching restrictions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RESTRICTIONS_FETCH_ERROR',
          message: '制約情報取得に失敗しました'
        }
      });
    }
  }
);

export default router;
