/**
 * レポート関連ルート
 */

import { Router } from 'express'
import { ReportController } from '../controllers/ReportController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const reportController = new ReportController()

// ユーザーレポート（管理者のみ）
router.get('/users', authenticate, authorize(['ADMIN']), reportController.generateUserReport.bind(reportController))

// 権限レポート（管理者のみ）
router.get('/permissions', authenticate, authorize(['ADMIN']), reportController.generatePermissionReport.bind(reportController))

// 監査レポート（管理者のみ）
router.get('/audit', authenticate, authorize(['ADMIN']), reportController.generateAuditReport.bind(reportController))

// システム統計レポート（管理者のみ）
router.get('/statistics', authenticate, authorize(['ADMIN']), reportController.generateStatisticsReport.bind(reportController))

export default router