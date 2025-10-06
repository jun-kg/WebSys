/**
 * ゲスト制約ミドルウェア
 *
 * GUEST権限ユーザーのアクセス制御を自動実行
 * - 有効期限チェック
 * - 禁止操作チェック
 * - 許可機能チェック
 * - アクセスログ記録
 */

import { Request, Response, NextFunction } from 'express'
import { GuestUserService } from '../../custom/services/GuestUserService'
import { prisma } from '../lib/prisma'

/**
 * リクエストからアクション名を抽出
 * HTTPメソッドとパスから適切なアクション名を推測
 */
function extractActionFromRequest(req: Request): string {
  const method = req.method
  const path = req.path

  // パスベースのアクション判定
  const pathSegments = path.split('/').filter(Boolean)
  const resource = pathSegments[1] || 'unknown' // api/users → users

  // メソッドとリソースからアクション名を生成
  const actionMap: Record<string, string> = {
    // ユーザー管理
    'GET-users': 'USER_VIEW',
    'POST-users': 'USER_CREATE',
    'PUT-users': 'USER_EDIT',
    'DELETE-users': 'USER_DELETE',
    'PATCH-users-role': 'USER_ROLE_CHANGE',

    // 部署管理
    'GET-departments': 'DEPT_VIEW',
    'POST-departments': 'DEPT_CREATE',
    'PUT-departments': 'DEPT_EDIT',
    'DELETE-departments': 'DEPT_DELETE',

    // 会社管理
    'GET-companies': 'COMPANY_VIEW',
    'POST-companies': 'COMPANY_CREATE',
    'PUT-companies': 'COMPANY_EDIT',
    'DELETE-companies': 'COMPANY_DELETE',

    // 権限管理
    'GET-permissions': 'PERMISSION_VIEW',
    'POST-permissions': 'PERMISSION_CREATE',
    'PUT-permissions': 'PERMISSION_EDIT',
    'DELETE-permissions': 'PERMISSION_DELETE',

    // 機能管理
    'GET-features': 'FEATURE_VIEW',
    'POST-features': 'FEATURE_MANAGE',
    'PUT-features': 'FEATURE_MANAGE',
    'DELETE-features': 'FEATURE_MANAGE',

    // ワークフロー管理
    'GET-workflow': 'WORKFLOW_VIEW',
    'POST-workflow': 'WORKFLOW_CREATE',
    'PUT-workflow': 'WORKFLOW_EDIT',
    'DELETE-workflow': 'WORKFLOW_DELETE',
    'POST-workflow-approve': 'WORKFLOW_APPROVE',
    'POST-workflow-emergency': 'WORKFLOW_EMERGENCY',

    // 承認管理
    'GET-approval': 'APPROVAL_VIEW',
    'POST-approval-approve': 'APPROVAL_APPROVE',
    'POST-approval-reject': 'APPROVAL_REJECT',

    // レポート閲覧
    'GET-reports': 'REPORT_VIEW',
    'POST-reports': 'REPORT_CREATE',

    // データ操作
    'GET-data': 'DATA_VIEW',
    'DELETE-data': 'DATA_DELETE',

    // ログ管理
    'GET-logs': 'LOG_VIEW',
    'DELETE-logs': 'LOG_DELETE',

    // 監査ログ
    'GET-audit': 'AUDIT_VIEW_LIMITED',

    // システム設定
    'GET-settings': 'SYSTEM_SETTING',
    'PUT-settings': 'SYSTEM_SETTING',
  }

  // 特定パターンのマッチング
  if (pathSegments.includes('approve') || pathSegments.includes('approval')) {
    if (method === 'POST') return 'WORKFLOW_APPROVE'
  }

  if (pathSegments.includes('emergency')) {
    if (method === 'POST') return 'WORKFLOW_EMERGENCY'
  }

  if (pathSegments.includes('role')) {
    if (method === 'PUT' || method === 'PATCH') return 'USER_ROLE_CHANGE'
  }

  // 基本的なメソッド-リソースマッピング
  const actionKey = `${method}-${resource}`
  if (actionMap[actionKey]) {
    return actionMap[actionKey]
  }

  // デフォルトマッピング
  switch (method) {
    case 'GET':
      return `${resource.toUpperCase()}_VIEW`
    case 'POST':
      return `${resource.toUpperCase()}_CREATE`
    case 'PUT':
    case 'PATCH':
      return `${resource.toUpperCase()}_EDIT`
    case 'DELETE':
      return `${resource.toUpperCase()}_DELETE`
    default:
      return 'UNKNOWN_ACTION'
  }
}

/**
 * ゲスト制約チェックミドルウェア
 *
 * GUEST権限ユーザーの場合のみ実行
 * - 認証ミドルウェアの後に配置すること
 * - req.user が設定されていることを前提
 */
export async function checkGuestConstraints(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 認証情報チェック
    if (!req.user || !req.user.id) {
      return next() // 認証ミドルウェアで処理されるべき
    }

    const userId = req.user.id
    const userRole = req.user.role

    // GUEST権限ユーザーのみチェック
    if (userRole !== 'GUEST') {
      return next() // GUEST以外はスキップ
    }

    // アクション名を抽出
    const action = extractActionFromRequest(req)

    // GuestUserServiceでアクセスチェック
    const guestService = new GuestUserService()
    const hasAccess = await guestService.checkGuestAccess(userId, action)

    if (!hasAccess) {
      // アクセス拒否
      res.status(403).json({
        error: 'Access Denied',
        message: 'ゲストユーザーはこの操作を実行できません',
        details: {
          action,
          reason: 'ゲスト権限による制約',
          hint: '管理者にお問い合わせください'
        }
      })
      return
    }

    // アクセス許可
    next()
  } catch (error) {
    console.error('[GuestConstraint] Error:', error)

    // エラー時は安全側に倒す（アクセス拒否）
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'ゲスト権限チェック中にエラーが発生しました'
    })
  }
}

/**
 * 特定エンドポイントのゲスト制約を無効化
 *
 * 公開API・ヘルスチェック等で使用
 */
export function skipGuestConstraints(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // フラグを設定してスキップ
  (req as any).skipGuestCheck = true
  next()
}

/**
 * ゲスト制約チェックミドルウェア（スキップフラグ対応版）
 */
export async function checkGuestConstraintsWithSkip(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // スキップフラグチェック
  if ((req as any).skipGuestCheck) {
    return next()
  }

  return checkGuestConstraints(req, res, next)
}

/**
 * ゲストユーザーアクセスログ記録ミドルウェア
 *
 * 全てのGUESTユーザーのアクセスを記録
 * - checkGuestConstraints の後に配置推奨
 */
export async function logGuestAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'GUEST') {
      return next()
    }

    const userId = req.user.id
    const action = extractActionFromRequest(req)
    const ipAddress = (req.headers['x-forwarded-for'] as string) ||
                      req.socket.remoteAddress ||
                      'unknown'

    // セキュリティイベントとして記録
    await prisma.security_events.create({
      data: {
        userId,
        eventType: 'GUEST_ACCESS',
        severity: 'INFO',
        ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        details: JSON.stringify({
          action,
          method: req.method,
          path: req.path,
          query: req.query,
          timestamp: new Date().toISOString()
        }),
        status: 'success'
      }
    })

    next()
  } catch (error) {
    console.error('[GuestAccessLog] Error:', error)
    // ログ記録失敗でもリクエストは継続
    next()
  }
}

/**
 * ゲスト制約ミドルウェアスタック
 *
 * 使用例:
 * app.use(authenticate, applyGuestConstraints)
 */
export const applyGuestConstraints = [
  checkGuestConstraintsWithSkip,
  logGuestAccess
]

export default {
  checkGuestConstraints,
  skipGuestConstraints,
  checkGuestConstraintsWithSkip,
  logGuestAccess,
  applyGuestConstraints
}
