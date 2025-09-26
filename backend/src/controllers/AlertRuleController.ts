/**
 * アラートルールコントローラ
 * アラートルールのCRUD操作を提供
 */

import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

export class AlertRuleController {
  constructor() {
    // Prismaシングルトンを使用
  }

  /**
   * アラートルール一覧取得
   * GET /api/alert-rules
   */
  async getAlertRules(req: Request, res: Response) {
    try {
      console.log('[AlertRule] アラートルール取得開始', { query: req.query });

      const { page = 1, pageSize = 20, isEnabled } = req.query

      const where: any = {}
      if (isEnabled !== undefined) {
        where.isEnabled = isEnabled === 'true'
      }

      console.log('[AlertRule] クエリ条件', { where, page, pageSize });

      const skip = (Number(page) - 1) * Number(pageSize)
      const take = Number(pageSize)

      console.log('[AlertRule] Prismaクエリ実行前', { skip, take });

      const [rules, total] = await Promise.all([
        prisma.alert_rules.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.alert_rules.count({ where })
      ])

      console.log('[AlertRule] データ取得完了', { count: rules.length, total });

      res.json({
        rules,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      })
    } catch (error: any) {
      console.error('アラートルール取得エラー:', error)
      res.status(500).json({
        success: false,
        message: 'アラートルールの取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * アラートルール詳細取得
   * GET /api/alert-rules/:id
   */
  async getAlertRule(req: Request, res: Response) {
    try {
      const { id } = req.params

      const rule = await prisma.alert_rules.findUnique({
        where: { id: Number(id) }
      })

      if (!rule) {
        return res.status(404).json({
          success: false,
          message: 'アラートルールが見つかりません'
        })
      }

      res.json(rule)
    } catch (error: any) {
      console.error('アラートルール詳細取得エラー:', error)
      res.status(500).json({
        success: false,
        message: 'アラートルール詳細の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * アラートルール作成
   * POST /api/alert-rules
   */
  async createAlertRule(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        level,
        category,
        source,
        messagePattern,
        thresholdCount = 1,
        thresholdPeriod = 300,
        notificationChannels = [],
        isEnabled = true
      } = req.body

      // バリデーション
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ルール名は必須です'
        })
      }

      if (thresholdCount < 1 || thresholdPeriod < 1) {
        return res.status(400).json({
          success: false,
          message: '閾値は1以上である必要があります'
        })
      }

      const rule = await prisma.alert_rules.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          level,
          category: category?.trim(),
          source: source?.trim(),
          messagePattern: messagePattern?.trim(),
          thresholdCount,
          thresholdPeriod,
          notificationChannels,
          isEnabled
        }
      })

      res.status(201).json({
        success: true,
        message: 'アラートルールを作成しました',
        rule
      })
    } catch (error: any) {
      console.error('アラートルール作成エラー:', error)
      res.status(500).json({
        success: false,
        message: 'アラートルールの作成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * アラートルール更新
   * PUT /api/alert-rules/:id
   */
  async updateAlertRule(req: Request, res: Response) {
    try {
      const { id } = req.params
      const {
        name,
        description,
        level,
        category,
        source,
        messagePattern,
        thresholdCount,
        thresholdPeriod,
        notificationChannels,
        isEnabled
      } = req.body

      // 存在チェック
      const existingRule = await prisma.alert_rules.findUnique({
        where: { id: Number(id) }
      })

      if (!existingRule) {
        return res.status(404).json({
          success: false,
          message: 'アラートルールが見つかりません'
        })
      }

      // バリデーション
      if (name && name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ルール名は空にできません'
        })
      }

      if (thresholdCount && thresholdCount < 1) {
        return res.status(400).json({
          success: false,
          message: '閾値カウントは1以上である必要があります'
        })
      }

      if (thresholdPeriod && thresholdPeriod < 1) {
        return res.status(400).json({
          success: false,
          message: '閾値期間は1以上である必要があります'
        })
      }

      const updateData: any = { updatedAt: new Date() }
      if (name !== undefined) updateData.name = name.trim()
      if (description !== undefined) updateData.description = description?.trim()
      if (level !== undefined) updateData.level = level
      if (category !== undefined) updateData.category = category?.trim()
      if (source !== undefined) updateData.source = source?.trim()
      if (messagePattern !== undefined) updateData.messagePattern = messagePattern?.trim()
      if (thresholdCount !== undefined) updateData.thresholdCount = thresholdCount
      if (thresholdPeriod !== undefined) updateData.thresholdPeriod = thresholdPeriod
      if (notificationChannels !== undefined) updateData.notificationChannels = notificationChannels
      if (isEnabled !== undefined) updateData.isEnabled = isEnabled

      const rule = await prisma.alert_rules.update({
        where: { id: Number(id) },
        data: updateData
      })

      res.json({
        success: true,
        message: 'アラートルールを更新しました',
        rule
      })
    } catch (error: any) {
      console.error('アラートルール更新エラー:', error)
      res.status(500).json({
        success: false,
        message: 'アラートルールの更新に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * アラートルール削除
   * DELETE /api/alert-rules/:id
   */
  async deleteAlertRule(req: Request, res: Response) {
    try {
      const { id } = req.params

      // 存在チェック
      const existingRule = await prisma.alert_rules.findUnique({
        where: { id: Number(id) }
      })

      if (!existingRule) {
        return res.status(404).json({
          success: false,
          message: 'アラートルールが見つかりません'
        })
      }

      await prisma.alert_rules.delete({
        where: { id: Number(id) }
      })

      res.json({
        success: true,
        message: 'アラートルールを削除しました'
      })
    } catch (error: any) {
      console.error('アラートルール削除エラー:', error)
      res.status(500).json({
        success: false,
        message: 'アラートルールの削除に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * アラートルール有効/無効切り替え
   * PATCH /api/alert-rules/:id/toggle
   */
  async toggleAlertRule(req: Request, res: Response) {
    try {
      const { id } = req.params

      // 存在チェック
      const existingRule = await prisma.alert_rules.findUnique({
        where: { id: Number(id) }
      })

      if (!existingRule) {
        return res.status(404).json({
          success: false,
          message: 'アラートルールが見つかりません'
        })
      }

      const rule = await prisma.alert_rules.update({
        where: { id: Number(id) },
        data: {
          isEnabled: !existingRule.isEnabled,
          updatedAt: new Date()
        }
      })

      res.json({
        success: true,
        message: `アラートルールを${rule.isEnabled ? '有効' : '無効'}にしました`,
        rule
      })
    } catch (error: any) {
      console.error('アラートルール切り替えエラー:', error)
      res.status(500).json({
        success: false,
        message: 'アラートルールの切り替えに失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * アラートルールテスト
   * POST /api/alert-rules/:id/test
   */
  async testAlertRule(req: Request, res: Response) {
    try {
      const { id } = req.params

      const rule = await prisma.alert_rules.findUnique({
        where: { id: Number(id) }
      })

      if (!rule) {
        return res.status(404).json({
          success: false,
          message: 'アラートルールが見つかりません'
        })
      }

      // 過去1時間のログでルールをテスト
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const where: any = {
        timestamp: { gte: oneHourAgo }
      }

      if (rule.level !== null) where.level = rule.level
      if (rule.category) where.category = rule.category
      if (rule.source) where.source = rule.source
      if (rule.messagePattern) {
        where.message = { contains: rule.messagePattern, mode: 'insensitive' }
      }

      const matchingLogs = await prisma.logs.count({ where })

      const wouldTrigger = matchingLogs >= rule.thresholdCount

      res.json({
        success: true,
        message: 'アラートルールをテストしました',
        result: {
          matchingLogs,
          thresholdCount: rule.thresholdCount,
          wouldTrigger,
          testPeriod: '過去1時間'
        }
      })
    } catch (error: any) {
      console.error('アラートルールテストエラー:', error)
      res.status(500).json({
        success: false,
        message: 'アラートルールのテストに失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}