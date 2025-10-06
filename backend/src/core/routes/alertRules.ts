/**
 * アラートルール関連ルート
 */

import { Router } from 'express'
import { AlertRuleController } from '@core/controllers/AlertRuleController'
import { authenticate, authorize } from '@core/middleware/auth'

const router = Router()
const alertRuleController = new AlertRuleController()

// アラートルール一覧取得（認証必要）
router.get('/', authenticate, alertRuleController.getAlertRules.bind(alertRuleController))

// アラートルール詳細取得（認証必要）
router.get('/:id', authenticate, alertRuleController.getAlertRule.bind(alertRuleController))

// アラートルール作成（管理者のみ）
router.post('/', authenticate, authorize(['ADMIN']), alertRuleController.createAlertRule.bind(alertRuleController))

// アラートルール更新（管理者のみ）
router.put('/:id', authenticate, authorize(['ADMIN']), alertRuleController.updateAlertRule.bind(alertRuleController))

// アラートルール削除（管理者のみ）
router.delete('/:id', authenticate, authorize(['ADMIN']), alertRuleController.deleteAlertRule.bind(alertRuleController))

// アラートルール有効/無効切り替え（管理者のみ）
router.patch('/:id/toggle', authenticate, authorize(['ADMIN']), alertRuleController.toggleAlertRule.bind(alertRuleController))

// アラートルールテスト（管理者のみ）
router.post('/:id/test', authenticate, authorize(['ADMIN']), alertRuleController.testAlertRule.bind(alertRuleController))

export default router