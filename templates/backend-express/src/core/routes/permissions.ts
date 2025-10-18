import { Router } from 'express';
import { PermissionController } from '../controllers/PermissionController';
import { authenticate } from '../middleware/auth';

const router = Router();
const permissionController = new PermissionController();

/**
 * 権限マトリクスAPI
 *
 * 全エンドポイントで認証必須
 */

/**
 * GET /api/permissions/matrix
 * 権限マトリクス取得（管理者のみ）
 */
router.get('/matrix', authenticate, (req, res) => {
  permissionController.getPermissionMatrix(req, res);
});

/**
 * GET /api/permissions/my-permissions
 * 自分の権限一覧取得（全ユーザー）
 */
router.get('/my-permissions', authenticate, (req, res) => {
  permissionController.getMyPermissions(req, res);
});

/**
 * GET /api/permissions/check
 * 権限チェック（全ユーザー）
 *
 * クエリパラメータ:
 * - action: アクション名（必須）
 * - targetUserId: 対象ユーザーID（オプション）
 * - targetDepartmentId: 対象部署ID（オプション）
 */
router.get('/check', authenticate, (req, res) => {
  permissionController.checkPermission(req, res);
});

/**
 * POST /api/permissions/clear-cache
 * キャッシュクリア（管理者のみ・テスト用）
 */
router.post('/clear-cache', authenticate, (req, res) => {
  permissionController.clearCache(req, res);
});

/**
 * GET /api/permissions/cache-stats
 * キャッシュ統計取得（管理者のみ・監視用）
 */
router.get('/cache-stats', authenticate, (req, res) => {
  permissionController.getCacheStats(req, res);
});

export default router;
