/**
 * ログサービス
 * ログの収集・保存・検索・統計処理を担当
 */

import { PrismaClient } from '@prisma/client'
import { LogEntry, LogSearchParams, LogSearchResult, LogStatisticsParams, LogStatisticsResult } from '../types/log'
import { getWebSocketService } from './WebSocketService.js'
import { AlertRuleEngine } from './AlertRuleEngine.js'

export class LogService {
  private prisma: PrismaClient
  private alertRuleEngine: AlertRuleEngine

  constructor() {
    this.prisma = new PrismaClient()
    this.alertRuleEngine = new AlertRuleEngine()
  }

  /**
   * ログ保存
   */
  async saveLogs(logs: LogEntry[]): Promise<{ saved: number; errors: string[] }> {
    const errors: string[] = []
    let saved = 0

    for (const log of logs) {
      try {
        // データ検証
        if (!this.validateLogEntry(log)) {
          errors.push(`Invalid log entry: ${JSON.stringify(log)}`)
          continue
        }

        // レベルを文字列に変換
        const logLevel = this.convertLevelToEnum(log.level)

        const savedLog = await this.prisma.logs.create({
          data: {
            timestamp: new Date(log.timestamp),
            level: logLevel,
            message: log.message,
            userId: log.userId,
            source: log.source,
            environment: log.environment || 'development',
            context: log.details || log.error || log.performance || {}
          },
          include: {
            users: true
          }
        })
        saved++

        // WebSocketでリアルタイム配信
        const webSocketService = getWebSocketService()
        if (webSocketService) {
          const formattedLog = this.formatLogEntry(savedLog)
          webSocketService.broadcastNewLog(formattedLog)

          // 高レベルエラーの場合はアラートも送信
          if (log.level >= 50) { // ERROR以上
            webSocketService.broadcastAlert({
              level: log.level >= 60 ? 'critical' : 'error',
              message: `${log.level >= 60 ? '致命的エラー' : 'エラー'}が発生しました: ${log.message}`,
              logEntry: formattedLog,
              details: {
                category: log.category,
                source: log.source
              }
            })
          }
        }

        // アラートルールエンジンで評価
        try {
          await this.alertRuleEngine.evaluateLog(log)
        } catch (alertError) {
          console.error('アラートルール評価エラー:', alertError)
        }
      } catch (error: any) {
        errors.push(`Log save error: ${error.message}`)
      }
    }

    // 統計情報更新（保存に成功したログのみ）
    if (saved > 0) {
      await this.updateStatistics(logs.slice(0, saved))
    }

    return { saved, errors }
  }

  /**
   * ログ検索
   */
  async searchLogs(params: LogSearchParams): Promise<LogSearchResult> {
    const where: any = {}

    // 時間範囲フィルタ
    if (params.startTime || params.endTime) {
      where.timestamp = {}
      if (params.startTime) where.timestamp.gte = new Date(params.startTime)
      if (params.endTime) where.timestamp.lte = new Date(params.endTime)
    }

    // レベルフィルタ
    if (params.levels && params.levels.length > 0) {
      where.level = { in: params.levels }
    }

    // カテゴリフィルタ
    if (params.categories && params.categories.length > 0) {
      where.category = { in: params.categories }
    }

    // ソースフィルタ
    if (params.sources && params.sources.length > 0) {
      where.source = { in: params.sources }
    }

    // トレースIDフィルタ
    if (params.traceId) {
      where.traceId = params.traceId
    }

    // ユーザーIDフィルタ
    if (params.userId) {
      where.userId = params.userId
    }

    // フリーテキスト検索
    if (params.query) {
      where.message = { contains: params.query, mode: 'insensitive' }
    }

    // 総件数取得
    const total = await this.prisma.logs.count({ where })

    // ページング計算
    const skip = (params.page - 1) * params.pageSize
    const take = params.pageSize

    // ソート設定
    const orderBy: any = {}
    orderBy[params.sortBy] = params.sortOrder

    // ログ取得
    const logs = await this.prisma.logs.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    })

    return {
      logs: logs.map(this.formatLogEntry),
      total,
      page: params.page,
      pageSize: params.pageSize,
      hasNext: skip + take < total
    }
  }

  /**
   * 統計データ取得
   */
  async getStatistics(params: LogStatisticsParams): Promise<LogStatisticsResult> {
    const startDate = new Date(params.startTime)
    const endDate = new Date(params.endTime)

    let groupByField: string
    let dateFormat: string

    switch (params.groupBy) {
      case 'hour':
        groupByField = 'hour'
        dateFormat = 'YYYY-MM-DD HH:00'
        break
      case 'day':
        groupByField = 'date'
        dateFormat = 'YYYY-MM-DD'
        break
      case 'category':
        groupByField = 'category'
        break
      case 'level':
        groupByField = 'level'
        break
      default:
        groupByField = 'hour'
    }

    // 統計クエリ実行
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate
      }
    }

    if (params.categories && params.categories.length > 0) {
      whereClause.category = { in: params.categories }
    }

    if (params.levels && params.levels.length > 0) {
      whereClause.level = { in: params.levels }
    }

    const statistics = await this.prisma.log_statistics.groupBy({
      by: [groupByField as any],
      where: whereClause,
      _sum: {
        count: true
      },
      orderBy: {
        _sum: {
          count: 'desc'
        }
      }
    })

    const total = statistics.reduce((sum, stat) => sum + (stat._sum.count || 0), 0)

    return {
      statistics: statistics.map(stat => ({
        key: this.formatStatisticsKey(stat[groupByField as keyof typeof stat], params.groupBy),
        count: stat._sum.count || 0,
        percentage: total > 0 ? ((stat._sum.count || 0) / total) * 100 : 0
      })),
      total,
      period: {
        start: params.startTime,
        end: params.endTime
      }
    }
  }

  /**
   * リアルタイム統計（直近の統計）
   */
  async getRealtimeStatistics(): Promise<{
    totalLogs: number
    errorCount: number
    warningCount: number
    recentLogs: LogEntry[]
  }> {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // 直近1時間の統計
    const [totalLogs, errorLogs, warningLogs, recentLogs] = await Promise.all([
      this.prisma.logs.count({
        where: { timestamp: { gte: oneHourAgo } }
      }),
      this.prisma.logs.count({
        where: {
          timestamp: { gte: oneHourAgo },
          level: { in: ['ERROR', 'FATAL'] }
        }
      }),
      this.prisma.logs.count({
        where: {
          timestamp: { gte: oneHourAgo },
          level: 'WARN'
        }
      }),
      this.prisma.logs.findMany({
        where: { timestamp: { gte: oneHourAgo } },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          users: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      })
    ])

    return {
      totalLogs,
      errorCount: errorLogs,
      warningCount: warningLogs,
      recentLogs: recentLogs.map(this.formatLogEntry)
    }
  }

  /**
   * ログエントリ検証
   */
  private validateLogEntry(log: LogEntry): boolean {
    if (!log.timestamp || !log.level || !log.message || !log.source) {
      return false
    }

    if (![60, 50, 40, 30, 20, 10].includes(log.level)) {
      return false
    }

    if (!['frontend', 'backend', 'database', 'infrastructure'].includes(log.source)) {
      return false
    }

    return true
  }

  /**
   * レベル数値をEnum文字列に変換
   */
  private convertLevelToEnum(level: number): 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' {
    switch (level) {
      case 10: return 'TRACE'
      case 20: return 'DEBUG'
      case 30: return 'INFO'
      case 40: return 'WARN'
      case 50: return 'ERROR'
      case 60: return 'FATAL'
      default: return 'INFO'
    }
  }

  /**
   * レベルEnum文字列を数値に変換
   */
  private convertEnumToLevel(level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'): number {
    switch (level) {
      case 'TRACE': return 10
      case 'DEBUG': return 20
      case 'INFO': return 30
      case 'WARN': return 40
      case 'ERROR': return 50
      case 'FATAL': return 60
      default: return 30
    }
  }

  /**
   * ログエントリフォーマット
   */
  private formatLogEntry = (log: any): LogEntry => {
    return {
      id: log.id.toString(),
      timestamp: log.timestamp.toISOString(),
      level: this.convertEnumToLevel(log.level),
      category: log.category || 'SYS',
      message: log.message,
      traceId: undefined,
      sessionId: undefined,
      userId: log.userId,
      user: log.users,
      source: log.source,
      hostname: undefined,
      service: undefined,
      details: log.context,
      error: undefined,
      performance: undefined,
      tags: [],
      environment: log.environment
    }
  }

  /**
   * 統計キーフォーマット
   */
  private formatStatisticsKey(value: any, groupBy: string): string {
    if (groupBy === 'level') {
      const levelNames: Record<number, string> = {
        60: 'FATAL',
        50: 'ERROR',
        40: 'WARN',
        30: 'INFO',
        20: 'DEBUG',
        10: 'TRACE'
      }
      return levelNames[value] || value.toString()
    }

    if (groupBy === 'category') {
      const categoryNames: Record<string, string> = {
        AUTH: '認証',
        API: 'API',
        DB: 'データベース',
        SEC: 'セキュリティ',
        SYS: 'システム',
        USER: 'ユーザー',
        PERF: 'パフォーマンス',
        ERR: 'エラー'
      }
      return categoryNames[value] || value
    }

    return value?.toString() || 'unknown'
  }

  /**
   * 統計情報更新
   */
  private async updateStatistics(logs: LogEntry[]) {
    const statsMap = new Map<string, number>()

    for (const log of logs) {
      const date = new Date(log.timestamp)
      const dateStr = date.toISOString().split('T')[0]
      const hour = date.getHours()

      const key = `${dateStr}-${hour}-${log.level}-${log.category}-${log.source}`
      statsMap.set(key, (statsMap.get(key) || 0) + 1)
    }

    for (const [key, count] of statsMap) {
      const [dateStr, hourStr, levelStr, category, source] = key.split('-')

      try {
        await this.prisma.log_statistics.upsert({
          where: {
            date_hour_level_category_source: {
              date: new Date(dateStr),
              hour: parseInt(hourStr),
              level: this.convertLevelToEnum(parseInt(levelStr)),
              category,
              source
            }
          },
          update: {
            count: {
              increment: count
            }
          },
          create: {
            date: new Date(dateStr),
            hour: parseInt(hourStr),
            level: this.convertLevelToEnum(parseInt(levelStr)),
            category,
            source,
            count
          }
        })
      } catch (error) {
        console.error('統計更新エラー:', error)
      }
    }
  }

  /**
   * 古いログの削除
   */
  async cleanupOldLogs() {
    const now = new Date()
    const retentionPeriods = {
      // エラー・致命的: 1年
      error: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      // 警告: 6ヶ月
      warn: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      // 情報: 3ヶ月
      info: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      // デバッグ・トレース: 1ヶ月
      debug: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    await Promise.all([
      // DEBUG・TRACE削除
      this.prisma.logs.deleteMany({
        where: {
          level: { in: ['DEBUG', 'TRACE'] },
          timestamp: { lt: retentionPeriods.debug }
        }
      }),
      // INFO削除
      this.prisma.logs.deleteMany({
        where: {
          level: 'INFO',
          timestamp: { lt: retentionPeriods.info }
        }
      }),
      // WARN削除
      this.prisma.logs.deleteMany({
        where: {
          level: 'WARN',
          timestamp: { lt: retentionPeriods.warn }
        }
      }),
      // ERROR・FATAL削除
      this.prisma.logs.deleteMany({
        where: {
          level: { in: ['ERROR', 'FATAL'] },
          timestamp: { lt: retentionPeriods.error }
        }
      })
    ])

    console.log('ログクリーンアップ完了')
  }
}