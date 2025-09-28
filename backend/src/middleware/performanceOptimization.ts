/**
 * パフォーマンス最適化ミドルウェア
 * ガベージコレクション、メモリ最適化、リクエスト最適化を統合
 */

import { Request, Response, NextFunction } from 'express'
import { memoryOptimizer } from '../services/MemoryOptimizer'
import { cacheService } from '../services/CacheService'

export class PerformanceOptimizationMiddleware {
  private requestCount = 0
  private lastOptimization = Date.now()
  private readonly optimizationInterval = 300000 // 5分間隔

  /**
   * パフォーマンス最適化ミドルウェア
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      this.requestCount++

      // リクエストレスポンス最適化
      this.optimizeRequest(req, res)

      // 定期的な最適化実行
      this.checkAndOptimize()

      next()
    }
  }

  /**
   * リクエスト・レスポンス最適化
   */
  private optimizeRequest(req: Request, res: Response): void {
    // レスポンス圧縮ヘッダー設定
    if (!res.getHeader('Content-Encoding')) {
      res.setHeader('Content-Encoding', 'gzip')
    }

    // Keep-Alive設定
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Keep-Alive', 'timeout=5, max=100')

    // キャッシュ制御ヘッダー
    if (req.method === 'GET' && !req.url.includes('/api/logs/realtime')) {
      res.setHeader('Cache-Control', 'public, max-age=300') // 5分キャッシュ
    }

    // JSONレスポンス最適化
    const originalJson = res.json
    res.json = function(data: any) {
      // 不要なプロパティを削除してレスポンスサイズを削減
      const optimizedData = this.optimizeResponseData(data)
      return originalJson.call(this, optimizedData)
    }.bind(this)
  }

  /**
   * レスポンスデータ最適化
   */
  private optimizeResponseData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data
    }

    // 配列の場合
    if (Array.isArray(data)) {
      return data.map(item => this.optimizeResponseData(item))
    }

    // オブジェクトの場合
    const optimized: any = {}
    for (const [key, value] of Object.entries(data)) {
      // null/undefined値を除外
      if (value !== null && value !== undefined) {
        // 空文字列を除外（必要に応じて）
        if (value !== '') {
          optimized[key] = this.optimizeResponseData(value)
        }
      }
    }

    return optimized
  }

  /**
   * 定期的な最適化チェック
   */
  private checkAndOptimize(): void {
    const now = Date.now()

    // 5分間隔または100リクエストごとに最適化実行
    if (now - this.lastOptimization > this.optimizationInterval || this.requestCount % 100 === 0) {
      this.performOptimization()
      this.lastOptimization = now
    }
  }

  /**
   * パフォーマンス最適化実行
   */
  private performOptimization(): void {
    console.log('[PerformanceOptimization] Starting optimization cycle')

    // メモリ使用状況チェック
    const memoryUsage = memoryOptimizer.getMemoryUsage()
    console.log(`[PerformanceOptimization] Memory usage: ${memoryUsage.heap.percentage}%`)

    // 高メモリ使用時の最適化
    if (memoryUsage.heap.percentage > 80) {
      console.log('[PerformanceOptimization] High memory usage detected, optimizing...')
      memoryOptimizer.optimize()
    }

    // キャッシュ統計取得と最適化
    const cacheStats = cacheService.getStats()
    console.log(`[PerformanceOptimization] Cache stats: ${cacheStats.size}/${cacheStats.maxSize} entries`)

    // キャッシュサイズが90%を超えた場合にクリーンアップ
    if (cacheStats.size / cacheStats.maxSize > 0.9) {
      console.log('[PerformanceOptimization] Cache size high, cleaning up expired entries')
      // 期限切れエントリのクリーンアップは自動実行される
    }
  }

  /**
   * ガベージコレクション最適化
   */
  optimizeGarbageCollection(): void {
    // V8エンジンのガベージコレクション最適化
    if (global.gc) {
      global.gc()
      console.log('[PerformanceOptimization] Manual garbage collection executed')
    }

    // メモリ統計を取得
    const memoryAfterGC = memoryOptimizer.getMemoryUsage()
    console.log(`[PerformanceOptimization] Memory after GC: ${memoryAfterGC.heap.percentage}%`)
  }

  /**
   * リクエスト処理時間最適化
   */
  optimizeRequestTiming() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint()

      res.on('finish', () => {
        const endTime = process.hrtime.bigint()
        const duration = Number(endTime - startTime) / 1_000_000 // ナノ秒をミリ秒に変換

        // 遅いリクエストの検出とログ
        if (duration > 1000) { // 1秒以上
          console.warn(`[PerformanceOptimization] Slow request detected: ${req.method} ${req.url} took ${duration.toFixed(2)}ms`)
        }

        // パフォーマンスヘッダー追加
        res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`)
      })

      next()
    }
  }

  /**
   * リソース使用量の監視と最適化
   */
  monitorAndOptimizeResources(): void {
    setInterval(() => {
      const memoryUsage = memoryOptimizer.getMemoryUsage()
      const cacheStats = cacheService.getStats()

      // パフォーマンス統計をログ出力
      console.log(`[PerformanceOptimization] Performance Stats:`, {
        memory: `${memoryUsage.heap.percentage}%`,
        cache: `${cacheStats.size}/${cacheStats.maxSize}`,
        requests: this.requestCount
      })

      // リクエストカウンターリセット
      this.requestCount = 0

      // 自動最適化実行
      if (memoryUsage.heap.percentage > 85) {
        this.optimizeGarbageCollection()
      }
    }, 60000) // 1分間隔
  }
}

// シングルトンインスタンス
export const performanceOptimization = new PerformanceOptimizationMiddleware()

// アプリケーション起動時にリソース監視開始
performanceOptimization.monitorAndOptimizeResources()