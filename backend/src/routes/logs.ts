/**
 * ログ関連ルート
 */

import { Router } from 'express'
import { LogController } from '../controllers/LogController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const logController = new LogController()

// ログ収集（認証不要 - フロントエンドからの自動送信用）
router.post('/', logController.collectLogs.bind(logController))

// ログ検索（認証必要）
router.get('/search', authenticate, logController.searchLogs.bind(logController))

// ログ統計（認証必要）
router.get('/statistics', authenticate, logController.getStatistics.bind(logController))

// リアルタイム統計（認証必要）
router.get('/realtime', authenticate, logController.getRealtimeStatistics.bind(logController))

// ログ詳細（認証必要）
router.get('/:id', authenticate, logController.getLogDetail.bind(logController))

// ログクリーンアップ（管理者のみ）
router.post('/cleanup', authenticate, authorize(['ADMIN']), logController.cleanupLogs.bind(logController))

// ログエクスポート（管理者のみ）
router.get('/export', authenticate, authorize(['ADMIN']), logController.exportLogs.bind(logController))

export default router