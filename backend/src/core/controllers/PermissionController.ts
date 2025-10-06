import { Request, Response } from 'express';
import { RolePermissionService } from '../services/RolePermissionService';
import { log, LogCategory } from '../utils/logger';
import { users } from '@prisma/client';

/**
 * 認証済みリクエスト（auth.tsと同じ定義）
 */
interface AuthenticatedRequest extends Request {
  user?: users;
  token?: string;
}

/**
 * PermissionController
 *
 * 権限マトリクス管理のコントローラー
 */
export class PermissionController {
  private rolePermissionService: RolePermissionService;

  constructor() {
    this.rolePermissionService = new RolePermissionService();
  }

  /**
   * 権限マトリクス取得（管理者のみ）
   *
   * GET /api/permissions/matrix
   */
  async getPermissionMatrix(req: Request, res: Response): Promise<void> {
    const startTime = performance.now();

    try {
      const authReq = req as AuthenticatedRequest;

      // 管理者チェック
      if (!authReq.user || authReq.user.role !== 'ADMIN') {
        log.warn(LogCategory.AUTH, 'Non-admin user attempted to access permission matrix', {
          userId: authReq.user?.id,
          role: authReq.user?.role
        });

        res.status(403).json({
          success: false,
          error: { message: '管理者権限が必要です' }
        });
        return;
      }

      // 権限マトリクス取得
      const matrix = await this.rolePermissionService.getPermissionMatrix();

      const totalRoles = matrix.length;
      const totalPermissions = matrix.reduce((sum, m) => sum + m.permissions.length, 0);

      const elapsed = performance.now() - startTime;
      log.info(LogCategory.API, 'Permission matrix retrieved', {
        userId: authReq.user.id,
        totalRoles,
        totalPermissions,
        elapsed: `${elapsed.toFixed(2)}ms`
      });

      res.json({
        success: true,
        data: {
          matrix,
          totalRoles,
          totalPermissions
        }
      });

    } catch (error) {
      log.error(LogCategory.API, 'Error fetching permission matrix', error as Error);

      res.status(500).json({
        success: false,
        error: { message: 'サーバーエラーが発生しました' }
      });
    }
  }

  /**
   * 自分の権限一覧取得
   *
   * GET /api/permissions/my-permissions
   */
  async getMyPermissions(req: Request, res: Response): Promise<void> {
    const startTime = performance.now();

    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.user) {
        res.status(401).json({
          success: false,
          error: { message: '認証が必要です' }
        });
        return;
      }

      const userId = authReq.user.id;
      const username = authReq.user.username;
      const role = authReq.user.role;

      // 全権限マトリクス取得
      const matrix = await this.rolePermissionService.getPermissionMatrix();

      // 自分の役職の権限のみ抽出
      const myRolePermissions = matrix.find(m => m.role === role);

      if (!myRolePermissions) {
        log.warn(LogCategory.AUTH, 'Role permissions not found', { userId, role });

        res.status(404).json({
          success: false,
          error: { message: '権限情報が見つかりません' }
        });
        return;
      }

      const elapsed = performance.now() - startTime;
      log.debug(LogCategory.PERF, 'My permissions retrieved', {
        userId,
        role,
        permissionCount: myRolePermissions.permissions.length,
        elapsed: `${elapsed.toFixed(2)}ms`
      });

      res.json({
        success: true,
        data: {
          userId,
          username,
          role,
          permissions: myRolePermissions.permissions,
          totalPermissions: myRolePermissions.permissions.length
        }
      });

    } catch (error) {
      log.error(LogCategory.API, 'Error fetching my permissions', error as Error);

      res.status(500).json({
        success: false,
        error: { message: 'サーバーエラーが発生しました' }
      });
    }
  }

  /**
   * 権限チェック
   *
   * GET /api/permissions/check?action=USER_EDIT&targetUserId=5
   */
  async checkPermission(req: Request, res: Response): Promise<void> {
    const startTime = performance.now();

    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.user) {
        res.status(401).json({
          success: false,
          error: { message: '認証が必要です' }
        });
        return;
      }

      const userId = authReq.user.id;
      const { action, targetUserId, targetDepartmentId } = req.query;

      // バリデーション
      if (!action || typeof action !== 'string') {
        res.status(400).json({
          success: false,
          error: { message: 'アクション名が必要です' }
        });
        return;
      }

      // 権限チェック実行
      const checkResult = await this.rolePermissionService.checkPermission(userId, action, {
        userId,
        targetUserId: targetUserId ? parseInt(targetUserId as string, 10) : undefined,
        targetDepartmentId: targetDepartmentId ? parseInt(targetDepartmentId as string, 10) : undefined
      });

      const elapsed = performance.now() - startTime;
      log.debug(LogCategory.PERF, 'Permission check completed', {
        userId,
        action,
        allowed: checkResult.allowed,
        scope: checkResult.scope,
        elapsed: `${elapsed.toFixed(2)}ms`
      });

      res.json({
        success: true,
        data: {
          allowed: checkResult.allowed,
          scope: checkResult.scope,
          reason: checkResult.reason,
          message: checkResult.allowed ? '権限があります' : '権限がありません'
        }
      });

    } catch (error) {
      log.error(LogCategory.API, 'Error checking permission', error as Error);

      res.status(500).json({
        success: false,
        error: { message: 'サーバーエラーが発生しました' }
      });
    }
  }

  /**
   * キャッシュクリア（管理者のみ・テスト用）
   *
   * POST /api/permissions/clear-cache
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      // 管理者チェック
      if (!authReq.user || authReq.user.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: { message: '管理者権限が必要です' }
        });
        return;
      }

      // キャッシュクリア
      RolePermissionService.clearCache();

      log.info(LogCategory.SYS, 'Permission cache cleared by admin', {
        userId: authReq.user.id
      });

      res.json({
        success: true,
        data: { message: 'キャッシュをクリアしました' }
      });

    } catch (error) {
      log.error(LogCategory.API, 'Error clearing cache', error as Error);

      res.status(500).json({
        success: false,
        error: { message: 'サーバーエラーが発生しました' }
      });
    }
  }

  /**
   * キャッシュ統計取得（管理者のみ・監視用）
   *
   * GET /api/permissions/cache-stats
   */
  async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      // 管理者チェック
      if (!authReq.user || authReq.user.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: { message: '管理者権限が必要です' }
        });
        return;
      }

      // キャッシュ統計取得
      const stats = RolePermissionService.getCacheStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      log.error(LogCategory.API, 'Error fetching cache stats', error as Error);

      res.status(500).json({
        success: false,
        error: { message: 'サーバーエラーが発生しました' }
      });
    }
  }
}
