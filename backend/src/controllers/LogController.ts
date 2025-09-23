/**
 * ログコントローラ
 * ログ関連のAPIエンドポイントを提供
 */

import { Request, Response } from 'express'
import { LogService } from '../services/LogService'
import { LogEntry, LogSearchParams, LogStatisticsParams } from '../types/log'

export class LogController {
  private logService: LogService

  constructor() {
    this.logService = new LogService()
  }

  /**
   * ログ収集
   * POST /api/logs
   */
  async collectLogs(req: Request, res: Response) {
    try {
      const { logs } = req.body

      if (!Array.isArray(logs) || logs.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ログデータが不正です'
        })
      }

      // リクエストサイズ制限チェック（1MB）
      const requestSize = JSON.stringify(logs).length
      if (requestSize > 1024 * 1024) {
        return res.status(413).json({
          success: false,
          message: 'リクエストサイズが大きすぎます'
        })
      }

      const result = await this.logService.saveLogs(logs)

      res.json({
        success: true,
        received: logs.length,
        saved: result.saved,
        errors: result.errors
      })
    } catch (error: any) {
      console.error('ログ収集エラー:', error)
      res.status(500).json({
        success: false,
        message: 'ログの保存に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * ログ検索
   * GET /api/logs/search
   */
  async searchLogs(req: Request, res: Response) {
    try {
      const searchParams: LogSearchParams = {
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
        levels: req.query.levels ?
          (req.query.levels as string).split(',').map(Number).filter(n => !isNaN(n)) :
          undefined,
        categories: req.query.categories ?
          (req.query.categories as string).split(',') :
          undefined,
        sources: req.query.sources ?
          (req.query.sources as string).split(',') as any :
          undefined,
        traceId: req.query.traceId as string,
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        query: req.query.query as string,
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: Math.min(Number(req.query.pageSize) || 50, 1000), // 最大1000件
        sortBy: req.query.sortBy as string || 'timestamp',
        sortOrder: (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc'
      }

      // パラメータ検証
      if (searchParams.page < 1) searchParams.page = 1
      if (searchParams.pageSize < 1) searchParams.pageSize = 50

      const result = await this.logService.searchLogs(searchParams)

      res.json(result)
    } catch (error: any) {
      console.error('ログ検索エラー:', error)
      res.status(500).json({
        success: false,
        message: 'ログの検索に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * ログ統計
   * GET /api/logs/statistics
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const statsParams: LogStatisticsParams = {
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
        groupBy: req.query.groupBy as any || 'hour',
        categories: req.query.categories ?
          (req.query.categories as string).split(',') :
          undefined,
        levels: req.query.levels ?
          (req.query.levels as string).split(',').map(Number).filter(n => !isNaN(n)) :
          undefined
      }

      // パラメータ検証
      if (!statsParams.startTime || !statsParams.endTime) {
        return res.status(400).json({
          success: false,
          message: '開始時間と終了時間は必須です'
        })
      }

      if (!['hour', 'day', 'category', 'level'].includes(statsParams.groupBy)) {
        statsParams.groupBy = 'hour'
      }

      const statistics = await this.logService.getStatistics(statsParams)

      res.json(statistics)
    } catch (error: any) {
      console.error('ログ統計エラー:', error)
      res.status(500).json({
        success: false,
        message: '統計の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * リアルタイム統計
   * GET /api/logs/realtime
   */
  async getRealtimeStatistics(req: Request, res: Response) {
    try {
      const statistics = await this.logService.getRealtimeStatistics()
      res.json(statistics)
    } catch (error: any) {
      console.error('リアルタイム統計エラー:', error)
      res.status(500).json({
        success: false,
        message: 'リアルタイム統計の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * ログ詳細取得
   * GET /api/logs/:id
   */
  async getLogDetail(req: Request, res: Response) {
    try {
      const logId = req.params.id

      const log = await this.logService.searchLogs({
        page: 1,
        pageSize: 1,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      })

      if (!log.logs.length) {
        return res.status(404).json({
          success: false,
          message: 'ログが見つかりません'
        })
      }

      res.json({
        success: true,
        log: log.logs[0]
      })
    } catch (error: any) {
      console.error('ログ詳細取得エラー:', error)
      res.status(500).json({
        success: false,
        message: 'ログ詳細の取得に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * ログクリーンアップ
   * POST /api/logs/cleanup
   */
  async cleanupLogs(req: Request, res: Response) {
    try {
      // 管理者権限チェック
      if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: '管理者権限が必要です'
        })
      }

      await this.logService.cleanupOldLogs()

      res.json({
        success: true,
        message: 'ログクリーンアップが完了しました'
      })
    } catch (error: any) {
      console.error('ログクリーンアップエラー:', error)
      res.status(500).json({
        success: false,
        message: 'ログクリーンアップに失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * ログエクスポート
   * GET /api/logs/export
   */
  async exportLogs(req: Request, res: Response) {
    try {
      // 管理者権限チェック
      if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: '管理者権限が必要です'
        })
      }

      const format = req.query.format as string || 'json'
      const searchParams: LogSearchParams = {
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
        levels: req.query.levels ?
          (req.query.levels as string).split(',').map(Number).filter(n => !isNaN(n)) :
          undefined,
        categories: req.query.categories ?
          (req.query.categories as string).split(',') :
          undefined,
        sources: req.query.sources ?
          (req.query.sources as string).split(',') as any :
          undefined,
        page: 1,
        pageSize: 10000, // エクスポート用に大きめの値
        sortBy: 'timestamp',
        sortOrder: 'desc'
      }

      const result = await this.logService.searchLogs(searchParams)

      if (format === 'csv') {
        // CSV形式でエクスポート
        const csvHeaders = ['timestamp', 'level', 'category', 'source', 'message', 'userId', 'traceId']
        const csvRows = result.logs.map(log => [
          log.timestamp,
          log.level,
          log.category,
          log.source,
          `"${log.message.replace(/"/g, '""')}"`,
          log.userId || '',
          log.traceId || ''
        ])

        const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="logs_${new Date().toISOString().split('T')[0]}.csv"`)
        res.send(csvContent)
      } else {
        // JSON形式でエクスポート
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="logs_${new Date().toISOString().split('T')[0]}.json"`)
        res.json(result.logs)
      }
    } catch (error: any) {
      console.error('ログエクスポートエラー:', error)
      res.status(500).json({
        success: false,
        message: 'ログエクスポートに失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}