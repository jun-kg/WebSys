import { Request, Response, NextFunction } from 'express';
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
 * スコープチェックミドルウェアオプション
 */
export interface ScopeCheckOptions {
  action: string;                          // 権限アクション名（例: USER_EDIT, DEPT_VIEW）
  targetUserIdParam?: string;              // リクエストパラメータ名（例: 'id', 'userId'）
  targetDepartmentIdParam?: string;        // リクエストパラメータ名（例: 'departmentId'）
  targetUserIdFromBody?: string;           // リクエストボディのフィールド名（例: 'userId'）
  targetDepartmentIdFromBody?: string;     // リクエストボディのフィールド名（例: 'departmentId'）
  allowSelfAccess?: boolean;               // SELF権限でのアクセス許可（デフォルト: true）
}

/**
 * スコープチェックミドルウェア
 *
 * 使用例:
 *
 * ```typescript
 * // ユーザー編集API: 自分または同じ部署のユーザーのみ編集可能
 * router.put('/users/:id',
 *   authenticate,
 *   checkDepartmentScope({ action: 'USER_EDIT', targetUserIdParam: 'id' }),
 *   updateUser
 * );
 *
 * // 部署情報取得API: 自分の所属部署のみ取得可能
 * router.get('/departments/:departmentId',
 *   authenticate,
 *   checkDepartmentScope({ action: 'DEPT_VIEW', targetDepartmentIdParam: 'departmentId' }),
 *   getDepartment
 * );
 *
 * // ユーザー作成API: GLOBAL権限が必要（部署ID不要）
 * router.post('/users',
 *   authenticate,
 *   checkDepartmentScope({ action: 'USER_CREATE' }),
 *   createUser
 * );
 * ```
 *
 * パフォーマンス: 10ms以内（キャッシュヒット時: 2ms以内）
 */
export function checkDepartmentScope(options: ScopeCheckOptions) {
  const rolePermissionService = new RolePermissionService();

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();
    const authReq = req as AuthenticatedRequest;

    try {
      // 認証チェック
      if (!authReq.user) {
        log.warn(LogCategory.AUTH, 'Unauthenticated request to protected endpoint', {
          path: req.path,
          method: req.method
        });
        return res.status(401).json({
          success: false,
          error: { message: '認証が必要です' }
        });
      }

      const userId = authReq.user.id;
      const { action, targetUserIdParam, targetDepartmentIdParam, targetUserIdFromBody, targetDepartmentIdFromBody, allowSelfAccess = true } = options;

      // 対象ユーザーID取得（パラメータまたはボディから）
      let targetUserId: number | undefined;
      if (targetUserIdParam && req.params[targetUserIdParam]) {
        targetUserId = parseInt(req.params[targetUserIdParam], 10);
      } else if (targetUserIdFromBody && req.body[targetUserIdFromBody]) {
        targetUserId = parseInt(req.body[targetUserIdFromBody], 10);
      }

      // 対象部署ID取得（パラメータまたはボディから）
      let targetDepartmentId: number | undefined;
      if (targetDepartmentIdParam && req.params[targetDepartmentIdParam]) {
        targetDepartmentId = parseInt(req.params[targetDepartmentIdParam], 10);
      } else if (targetDepartmentIdFromBody && req.body[targetDepartmentIdFromBody]) {
        targetDepartmentId = parseInt(req.body[targetDepartmentIdFromBody], 10);
      }

      // 権限チェック実行
      const checkResult = await rolePermissionService.checkPermission(userId, action, {
        userId,
        targetUserId,
        targetDepartmentId
      });

      if (!checkResult.allowed) {
        log.warn(LogCategory.AUTH, 'Permission denied', {
          userId,
          action,
          targetUserId,
          targetDepartmentId,
          scope: checkResult.scope,
          reason: checkResult.reason
        });

        return res.status(403).json({
          success: false,
          error: {
            message: '権限がありません',
            details: checkResult.reason
          }
        });
      }

      // 権限チェック成功
      const elapsed = performance.now() - startTime;
      log.debug(LogCategory.PERF, 'Scope check passed', {
        userId,
        action,
        scope: checkResult.scope,
        elapsed: `${elapsed.toFixed(2)}ms`
      });

      // スコープ情報をリクエストに付与（後続処理で使用可能）
      (authReq as any).permissionScope = checkResult.scope;

      next();

    } catch (error) {
      log.error(LogCategory.AUTH, 'Error in scope check middleware', error as Error, {
        path: req.path,
        method: req.method,
        action: options.action
      });

      return res.status(500).json({
        success: false,
        error: { message: 'サーバーエラーが発生しました' }
      });
    }
  };
}

/**
 * 複数アクション対応版スコープチェックミドルウェア
 *
 * いずれか1つの権限があればアクセス許可
 *
 * 使用例:
 * ```typescript
 * // ユーザー詳細取得: 自分または管理者権限が必要
 * router.get('/users/:id',
 *   authenticate,
 *   checkAnyDepartmentScope([
 *     { action: 'USER_VIEW_SELF', targetUserIdParam: 'id' },
 *     { action: 'USER_VIEW_ALL' }
 *   ]),
 *   getUser
 * );
 * ```
 */
export function checkAnyDepartmentScope(optionsArray: ScopeCheckOptions[]) {
  const rolePermissionService = new RolePermissionService();

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();
    const authReq = req as AuthenticatedRequest;

    try {
      // 認証チェック
      if (!authReq.user) {
        log.warn(LogCategory.AUTH, 'Unauthenticated request to protected endpoint', {
          path: req.path,
          method: req.method
        });
        return res.status(401).json({
          success: false,
          error: { message: '認証が必要です' }
        });
      }

      const userId = authReq.user.id;
      let lastError: string | undefined;

      // いずれか1つでも許可されればOK
      for (const options of optionsArray) {
        const { action, targetUserIdParam, targetDepartmentIdParam, targetUserIdFromBody, targetDepartmentIdFromBody } = options;

        // 対象ユーザーID取得
        let targetUserId: number | undefined;
        if (targetUserIdParam && req.params[targetUserIdParam]) {
          targetUserId = parseInt(req.params[targetUserIdParam], 10);
        } else if (targetUserIdFromBody && req.body[targetUserIdFromBody]) {
          targetUserId = parseInt(req.body[targetUserIdFromBody], 10);
        }

        // 対象部署ID取得
        let targetDepartmentId: number | undefined;
        if (targetDepartmentIdParam && req.params[targetDepartmentIdParam]) {
          targetDepartmentId = parseInt(req.params[targetDepartmentIdParam], 10);
        } else if (targetDepartmentIdFromBody && req.body[targetDepartmentIdFromBody]) {
          targetDepartmentId = parseInt(req.body[targetDepartmentIdFromBody], 10);
        }

        // 権限チェック
        const checkResult = await rolePermissionService.checkPermission(userId, action, {
          userId,
          targetUserId,
          targetDepartmentId
        });

        if (checkResult.allowed) {
          const elapsed = performance.now() - startTime;
          log.debug(LogCategory.PERF, 'Any-scope check passed', {
            userId,
            action,
            scope: checkResult.scope,
            elapsed: `${elapsed.toFixed(2)}ms`
          });

          (authReq as any).permissionScope = checkResult.scope;
          return next();
        }

        lastError = checkResult.reason;
      }

      // 全て拒否された場合
      log.warn(LogCategory.AUTH, 'All permission checks failed', {
        userId,
        actions: optionsArray.map(o => o.action),
        lastError
      });

      return res.status(403).json({
        success: false,
        error: {
          message: '権限がありません',
          details: lastError
        }
      });

    } catch (error) {
      log.error(LogCategory.AUTH, 'Error in any-scope check middleware', error as Error, {
        path: req.path,
        method: req.method
      });

      return res.status(500).json({
        success: false,
        error: { message: 'サーバーエラーが発生しました' }
      });
    }
  };
}
