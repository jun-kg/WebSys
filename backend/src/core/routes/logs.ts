/**
 * ログ関連ルート
 */

import { Router } from 'express'
import { LogController } from '@core/controllers/LogController'
import { authenticate, authorize } from '@core/middleware/auth'
import { checkDepartmentScope } from '@core/middleware/checkDepartmentScope'

const router = Router()
const logController = new LogController()

// ログ収集（認証不要 - フロントエンドからの自動送信用）
router.post('/', logController.collectLogs.bind(logController))

// ログ検索
// ADMIN: GLOBAL（全ログ検索）
// MANAGER: DEPARTMENT（部署ログ検索）
// USER: SELF（自分のログのみ検索）
// GUEST: 権限なし
router.get('/search',
  authenticate,
  checkDepartmentScope({ action: 'LOG_VIEW' }),
  logController.searchLogs.bind(logController)
)

// ログ統計
// ADMIN: GLOBAL（全ログ統計）
// MANAGER: DEPARTMENT（部署ログ統計）
// USER: SELF（自分のログ統計）
// GUEST: 権限なし
router.get('/statistics',
  authenticate,
  checkDepartmentScope({ action: 'LOG_VIEW' }),
  logController.getStatistics.bind(logController)
)

// リアルタイム統計
// ADMIN: GLOBAL（全ログリアルタイム統計）
// MANAGER: DEPARTMENT（部署ログリアルタイム統計）
// USER: SELF（自分のログリアルタイム統計）
// GUEST: 権限なし
router.get('/realtime',
  authenticate,
  checkDepartmentScope({ action: 'LOG_VIEW' }),
  logController.getRealtimeStatistics.bind(logController)
)

// ログ詳細
// ADMIN: GLOBAL（全ログ詳細閲覧）
// MANAGER: DEPARTMENT（部署ログ詳細閲覧）
// USER: SELF（自分のログ詳細閲覧）
// GUEST: 権限なし
router.get('/:id',
  authenticate,
  checkDepartmentScope({ action: 'LOG_VIEW' }),
  logController.getLogDetail.bind(logController)
)

// ログクリーンアップ（管理者のみ）
// ADMIN: GLOBAL（全ログ削除可能）
// MANAGER/USER/GUEST: 権限なし
router.post('/cleanup',
  authenticate,
  checkDepartmentScope({ action: 'LOG_DELETE' }),
  logController.cleanupLogs.bind(logController)
)

// ログエクスポート（管理者のみ）
// ADMIN: GLOBAL（全ログエクスポート可能）
// MANAGER/USER/GUEST: 権限なし
router.get('/export',
  authenticate,
  checkDepartmentScope({ action: 'LOG_EXPORT' }),
  logController.exportLogs.bind(logController)
)

export default router