/**
 * アラートルールエンジン
 * ログに対するアラートルールの評価とアラート生成を担当
 */

import { PrismaClient } from '@prisma/client'
import { LogEntry } from '../types/log'
import { getWebSocketService } from './WebSocketService.js'

export class AlertRuleEngine {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  /**
   * ログに対してアラートルールを評価
   */
  async evaluateLog(log: LogEntry): Promise<void> {
    try {
      // 有効なアラートルールを取得
      const activeRules = await this.prisma.alertRule.findMany({
        where: { isEnabled: true }
      })

      // 各ルールをチェック
      for (const rule of activeRules) {
        const isMatch = await this.checkRule(rule, log)
        if (isMatch) {
          await this.triggerAlert(rule, log)
        }
      }
    } catch (error) {
      console.error('アラートルール評価エラー:', error)
    }
  }

  /**
   * ログがアラートルールにマッチするかチェック
   */
  private async checkRule(rule: any, log: LogEntry): Promise<boolean> {
    try {
      // 基本条件チェック
      if (rule.level !== null && log.level !== rule.level) return false
      if (rule.category && log.category !== rule.category) return false
      if (rule.source && log.source !== rule.source) return false

      // メッセージパターンチェック
      if (rule.messagePattern) {
        const pattern = rule.messagePattern.toLowerCase()
        const message = log.message.toLowerCase()
        if (!message.includes(pattern)) return false
      }

      // 閾値チェック（指定期間内のマッチング数）
      const now = new Date()
      const periodStart = new Date(now.getTime() - rule.thresholdPeriod * 1000)

      const where: any = {
        timestamp: {
          gte: periodStart,
          lte: now
        }
      }

      if (rule.level !== null) where.level = rule.level
      if (rule.category) where.category = rule.category
      if (rule.source) where.source = rule.source
      if (rule.messagePattern) {
        where.message = { contains: rule.messagePattern, mode: 'insensitive' }
      }

      const matchCount = await this.prisma.log.count({ where })

      return matchCount >= rule.thresholdCount
    } catch (error) {
      console.error('ルールチェックエラー:', error)
      return false
    }
  }

  /**
   * アラートを発生させる
   */
  private async triggerAlert(rule: any, triggeringLog: LogEntry): Promise<void> {
    try {
      const webSocketService = getWebSocketService()
      if (!webSocketService) return

      // アラートレベルを決定
      let alertLevel: 'info' | 'warning' | 'error' | 'critical' = 'info'
      if (triggeringLog.level >= 60) alertLevel = 'critical'
      else if (triggeringLog.level >= 50) alertLevel = 'error'
      else if (triggeringLog.level >= 40) alertLevel = 'warning'

      // アラートメッセージを生成
      const alertMessage = `アラートルール「${rule.name}」が発動しました: ${triggeringLog.message}`

      // WebSocketでアラート送信
      webSocketService.broadcastAlert({
        level: alertLevel,
        message: alertMessage,
        logEntry: triggeringLog,
        details: {
          ruleId: rule.id,
          ruleName: rule.name,
          ruleDescription: rule.description,
          thresholdCount: rule.thresholdCount,
          thresholdPeriod: rule.thresholdPeriod,
          triggeringLogId: triggeringLog.id
        }
      })

      // 将来的な拡張: 外部通知チャンネルへの送信
      // await this.sendExternalNotifications(rule, alertMessage, triggeringLog)

      console.log(`アラート発動: ${rule.name} - ${alertMessage}`)
    } catch (error) {
      console.error('アラート発動エラー:', error)
    }
  }

  /**
   * アラートルールの手動評価（テスト用）
   */
  async testRule(ruleId: number, timeRangeMinutes: number = 60): Promise<{
    matchingLogs: number,
    wouldTrigger: boolean,
    sampleLogs: LogEntry[]
  }> {
    try {
      const rule = await this.prisma.alertRule.findUnique({
        where: { id: ruleId }
      })

      if (!rule) {
        throw new Error('アラートルールが見つかりません')
      }

      const now = new Date()
      const periodStart = new Date(now.getTime() - timeRangeMinutes * 60 * 1000)

      const where: any = {
        timestamp: {
          gte: periodStart,
          lte: now
        }
      }

      if (rule.level !== null) where.level = rule.level
      if (rule.category) where.category = rule.category
      if (rule.source) where.source = rule.source
      if (rule.messagePattern) {
        where.message = { contains: rule.messagePattern, mode: 'insensitive' }
      }

      const [matchingLogs, sampleLogsRaw] = await Promise.all([
        this.prisma.log.count({ where }),
        this.prisma.log.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true
              }
            }
          }
        })
      ])

      const sampleLogs = sampleLogsRaw.map(log => ({
        id: log.id.toString(),
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        category: log.category,
        message: log.message,
        traceId: log.traceId,
        sessionId: log.sessionId,
        userId: log.userId,
        user: log.user,
        source: log.source,
        hostname: log.hostname,
        service: log.service,
        details: log.details,
        error: log.errorInfo,
        performance: log.performanceInfo,
        tags: log.tags,
        environment: log.environment
      }))

      return {
        matchingLogs,
        wouldTrigger: matchingLogs >= rule.thresholdCount,
        sampleLogs
      }
    } catch (error) {
      console.error('ルールテストエラー:', error)
      throw error
    }
  }

  /**
   * 全アクティブルールの状況取得
   */
  async getActiveRulesStatus(): Promise<any[]> {
    try {
      const activeRules = await this.prisma.alertRule.findMany({
        where: { isEnabled: true },
        orderBy: { createdAt: 'desc' }
      })

      const ruleStatuses = []

      for (const rule of activeRules) {
        const status = await this.testRule(rule.id, 60) // 過去1時間
        ruleStatuses.push({
          rule: {
            id: rule.id,
            name: rule.name,
            description: rule.description,
            thresholdCount: rule.thresholdCount,
            thresholdPeriod: rule.thresholdPeriod
          },
          status: {
            matchingLogs: status.matchingLogs,
            wouldTrigger: status.wouldTrigger,
            isActive: status.matchingLogs > 0
          }
        })
      }

      return ruleStatuses
    } catch (error) {
      console.error('アクティブルール状況取得エラー:', error)
      return []
    }
  }
}