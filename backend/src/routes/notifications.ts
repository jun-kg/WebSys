/**
 * 通知関連のAPIルート
 */

import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { getNotificationService } from '../services/NotificationService.js'
import type { NotificationMessage } from '../services/NotificationService.js'

const router = express.Router()

// 通知テスト送信
router.post('/test', authenticate, async (req, res) => {
  try {
    const { channel } = req.body

    if (!channel || !['slack', 'email', 'teams'].includes(channel)) {
      return res.status(400).json({
        error: '有効な通知チャンネルを指定してください (slack, email, teams)'
      })
    }

    const notificationService = getNotificationService()
    const success = await notificationService.testNotification(channel)

    if (success) {
      res.json({
        message: `${channel}通知テストが正常に送信されました`,
        channel,
        success: true
      })
    } else {
      res.status(500).json({
        error: `${channel}通知テストの送信に失敗しました`,
        channel,
        success: false
      })
    }
  } catch (error) {
    console.error('通知テストエラー:', error)
    res.status(500).json({
      error: '通知テストでエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// カスタム通知送信
router.post('/send', authenticate, async (req, res) => {
  try {
    const { title, message, level, channels, details } = req.body

    if (!title || !message) {
      return res.status(400).json({
        error: 'タイトルとメッセージは必須です'
      })
    }

    if (!['info', 'warning', 'error', 'critical'].includes(level)) {
      return res.status(400).json({
        error: '有効なレベルを指定してください (info, warning, error, critical)'
      })
    }

    const validChannels = ['slack', 'email', 'teams']
    if (!channels || !Array.isArray(channels) ||
        !channels.every(ch => validChannels.includes(ch))) {
      return res.status(400).json({
        error: '有効な通知チャンネルの配列を指定してください'
      })
    }

    const notification: NotificationMessage = {
      title,
      message,
      level,
      timestamp: new Date().toISOString(),
      details: details || {}
    }

    const notificationService = getNotificationService()
    await notificationService.send(notification, channels)

    res.json({
      message: '通知が正常に送信されました',
      notification: {
        title,
        level,
        channels
      },
      success: true
    })
  } catch (error) {
    console.error('通知送信エラー:', error)
    res.status(500).json({
      error: '通知送信でエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// 通知設定の取得
router.get('/config', authenticate, async (req, res) => {
  try {
    const hasSlack = !!process.env.SLACK_WEBHOOK_URL
    const hasEmail = !!process.env.SMTP_HOST
    const hasTeams = !!process.env.TEAMS_WEBHOOK_URL

    res.json({
      availableChannels: {
        slack: hasSlack,
        email: hasEmail,
        teams: hasTeams
      },
      slackConfig: hasSlack ? {
        channel: process.env.SLACK_CHANNEL || 'default',
        username: process.env.SLACK_USERNAME || 'Log Monitor'
      } : null,
      emailConfig: hasEmail ? {
        from: process.env.EMAIL_FROM || 'noreply@logmonitor.com',
        to: (process.env.EMAIL_TO || '').split(',').filter(Boolean)
      } : null
    })
  } catch (error) {
    console.error('通知設定取得エラー:', error)
    res.status(500).json({
      error: '通知設定の取得でエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router