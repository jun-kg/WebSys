/**
 * アラートルールエンジン
 * ログに対するアラートルールの評価とアラート生成を担当
 */

import { LogEntry } from '@core/types/log'
import { getWebSocketService } from './WebSocketService.js'
import { getNotificationService } from './NotificationService.js'
import type { NotificationMessage } from './NotificationService.js'
import { prisma } from '@core/lib/prisma'

export class AlertRuleEngine {
  constructor() {
    // Prismaシングルトンを使用
  }

  /**
   * ログに対してアラートルールを評価
   */
  async evaluateLog(log: LogEntry): Promise<void> {
    console.log('[AlertEngine] ログ評価開始', { message: log.message, level: log.level });
    try {
      // 有効なアラートルールを取得
      const activeRules = await prisma.alert_rules.findMany({
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

      const matchCount = await prisma.logs.count({ where })

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

      // 外部通知チャンネルへの送信
      await this.sendExternalNotifications(rule, alertMessage, triggeringLog, alertLevel)

      console.log(`アラート発動: ${rule.name} - ${alertMessage}`)
    } catch (error) {
      console.error('アラート発動エラー:', error)
    }
  }

  /**
   * 外部通知サービスに通知を送信
   */
  private async sendExternalNotifications(
    rule: any,
    alertMessage: string,
    triggeringLog: LogEntry,
    alertLevel: 'info' | 'warning' | 'error' | 'critical'
  ): Promise<void> {
    try {
      const notificationService = getNotificationService()

      // 通知チャンネル設定を取得（ルールの設定から、または環境変数から）
      let channels: ('slack' | 'email' | 'teams')[] = ['slack', 'email']

      if (rule.notificationChannels) {
        try {
          const ruleChannels = typeof rule.notificationChannels === 'string'
            ? JSON.parse(rule.notificationChannels)
            : rule.notificationChannels
          if (Array.isArray(ruleChannels) && ruleChannels.length > 0) {
            channels = ruleChannels
          }
        } catch (e) {
          console.warn('通知チャンネル設定の解析に失敗:', e)
        }
      }

      const notification: NotificationMessage = {
        title: `アラート: ${rule.name}`,
        message: alertMessage,
        level: alertLevel,
        timestamp: new Date().toISOString(),
        logEntry: triggeringLog,
        details: {
          ルール名: rule.name,
          説明: rule.description || '説明なし',
          閾値: `${rule.thresholdCount}回 / ${rule.thresholdPeriod}秒`,
          カテゴリ: triggeringLog.category,
          ソース: triggeringLog.source,
          レベル: this.getLogLevelName(triggeringLog.level),
          発生時刻: new Date(triggeringLog.timestamp).toLocaleString('ja-JP')
        }
      }

      await notificationService.send(notification, channels)
    } catch (error) {
      console.error('外部通知送信エラー:', error)
    }
  }

  /**
   * ログレベル数値を名前に変換
   */
  private getLogLevelName(level: number): string {
    const levels: Record<number, string> = {
      10: 'TRACE',
      20: 'DEBUG',
      30: 'INFO',
      40: 'WARN',
      50: 'ERROR',
      60: 'FATAL'
    }
    return levels[level] || 'UNKNOWN'
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
      const rule = await prisma.alert_rules.findUnique({
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
        prisma.logs.count({ where }),
        prisma.logs.findMany({
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
      const activeRules = await prisma.alert_rules.findMany({
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