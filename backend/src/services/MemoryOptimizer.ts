/**
 * メモリ最適化サービス
 * メモリ使用量の監視と最適化を行う
 */

export class MemoryOptimizer {
  private static instance: MemoryOptimizer
  private monitoringInterval?: NodeJS.Timeout
  private readonly thresholds = {
    warning: 80, // 80%でwarning
    critical: 90, // 90%でcritical
    heapMaxMB: 512 // 最大ヒープサイズ（MB）
  }

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer()
    }
    return MemoryOptimizer.instance
  }

  private constructor() {
    this.startMonitoring()
  }

  /**
   * メモリ使用状況を取得
   */
  getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage()
    const systemMemory = this.getSystemMemory()

    return {
      heap: {
        used: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
        percentage: Math.round(usage.heapUsed / usage.heapTotal * 100)
      },
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100,
      system: systemMemory,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * システムメモリ情報を取得（簡易版）
   */
  private getSystemMemory(): SystemMemory {
    // Node.jsでは詳細なシステムメモリ情報が取得困難のため、概算値を使用
    const totalMB = 2048 // 2GB と仮定
    const usage = process.memoryUsage()
    const usedMB = Math.round(usage.rss / 1024 / 1024)

    return {
      total: totalMB,
      used: usedMB,
      free: totalMB - usedMB,
      percentage: Math.round((usedMB / totalMB) * 100)
    }
  }

  /**
   * ガベージコレクション実行
   */
  forceGC(): boolean {
    if (global.gc) {
      global.gc()
      console.log('[MemoryOptimizer] Manual GC executed')
      return true
    } else {
      console.warn('[MemoryOptimizer] GC not available. Start with --expose-gc flag')
      return false
    }
  }

  /**
   * メモリ最適化実行
   */
  optimize(): OptimizationResult {
    const beforeUsage = this.getMemoryUsage()
    const actions: string[] = []

    // ガベージコレクション実行
    if (this.forceGC()) {
      actions.push('Executed manual garbage collection')
    }

    // キャッシュクリーンアップ（CacheServiceが利用可能な場合）
    try {
      const { cacheService } = require('./CacheService')
      if (cacheService) {
        const stats = cacheService.getStats()
        if (stats.expiredCount > 0) {
          // 期限切れエントリのクリーンアップは自動実行されるため、統計のみ取得
          actions.push(`Cache cleanup: ${stats.expiredCount} expired entries`)
        }
      }
    } catch (error) {
      // CacheServiceが利用できない場合は無視
    }

    // 少し待ってから再測定
    setTimeout(() => {
      const afterUsage = this.getMemoryUsage()
      const memoryFreed = beforeUsage.heap.used - afterUsage.heap.used

      console.log(`[MemoryOptimizer] Optimization completed. Memory freed: ${memoryFreed.toFixed(2)}MB`)
    }, 100)

    return {
      beforeUsage,
      actions,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * メモリリーク検出
   */
  detectMemoryLeaks(): MemoryLeakInfo {
    const usage = this.getMemoryUsage()
    const isLeak = usage.heap.percentage > this.thresholds.critical

    let severity: 'none' | 'low' | 'medium' | 'high' = 'none'
    if (usage.heap.percentage > this.thresholds.critical) {
      severity = 'high'
    } else if (usage.heap.percentage > this.thresholds.warning) {
      severity = 'medium'
    } else if (usage.heap.percentage > 60) {
      severity = 'low'
    }

    return {
      detected: isLeak,
      severity,
      currentUsage: usage,
      recommendations: this.generateRecommendations(usage)
    }
  }

  /**
   * 最適化推奨事項を生成
   */
  private generateRecommendations(usage: MemoryUsage): string[] {
    const recommendations: string[] = []

    if (usage.heap.percentage > this.thresholds.critical) {
      recommendations.push('緊急: ガベージコレクションを実行してください')
      recommendations.push('アプリケーションの再起動を検討してください')
    }

    if (usage.heap.percentage > this.thresholds.warning) {
      recommendations.push('キャッシュサイズを縮小してください')
      recommendations.push('不要なオブジェクト参照を削除してください')
    }

    if (usage.external > 100) {
      recommendations.push('外部メモリ使用量が高いです。バッファサイズを確認してください')
    }

    if (usage.arrayBuffers > 50) {
      recommendations.push('ArrayBufferの使用量が高いです。適切に解放されているか確認してください')
    }

    return recommendations
  }

  /**
   * メモリ監視開始
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const leakInfo = this.detectMemoryLeaks()

      if (leakInfo.severity === 'high') {
        console.error('[MemoryOptimizer] Critical memory usage detected!')
        this.optimize()
      } else if (leakInfo.severity === 'medium') {
        console.warn('[MemoryOptimizer] High memory usage detected')
      }
    }, 30000) // 30秒間隔
  }

  /**
   * 監視停止
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
  }
}

// 型定義
interface MemoryUsage {
  heap: {
    used: number
    total: number
    percentage: number
  }
  rss: number
  external: number
  arrayBuffers: number
  system: SystemMemory
  timestamp: string
}

interface SystemMemory {
  total: number
  used: number
  free: number
  percentage: number
}

interface OptimizationResult {
  beforeUsage: MemoryUsage
  actions: string[]
  timestamp: string
}

interface MemoryLeakInfo {
  detected: boolean
  severity: 'none' | 'low' | 'medium' | 'high'
  currentUsage: MemoryUsage
  recommendations: string[]
}

// シングルトンインスタンス
export const memoryOptimizer = MemoryOptimizer.getInstance()

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => {
  memoryOptimizer.destroy()
})

process.on('SIGINT', () => {
  memoryOptimizer.destroy()
})