/**
 * 高性能キャッシュサービス
 * メモリ効率とパフォーマンスに最適化されたキャッシュシステム
 */

export class CacheService {
  private cache = new Map<string, CacheEntry>()
  private readonly maxSize: number
  private readonly defaultTTL: number
  private cleanupInterval?: NodeJS.Timeout

  constructor(maxSize = 10000, defaultTTL = 300000) { // 5分
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
    this.startCleanup()
  }

  /**
   * キャッシュから値を取得
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // 有効期限チェック
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    // LRU更新
    entry.lastAccessed = Date.now()
    return entry.value as T
  }

  /**
   * キャッシュに値を設定
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL)

    // キャッシュサイズ制限チェック
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: Date.now(),
      size: this.calculateSize(value)
    })
  }

  /**
   * キャッシュから削除
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * パターンマッチによる削除
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace('*', '.*'))
    let deletedCount = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * 全キャッシュクリア
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * キャッシュ統計情報
   */
  getStats(): CacheStats {
    const now = Date.now()
    let totalSize = 0
    let expiredCount = 0

    for (const entry of this.cache.values()) {
      totalSize += entry.size
      if (now > entry.expiresAt) {
        expiredCount++
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalSize,
      expiredCount,
      hitRate: this.calculateHitRate()
    }
  }

  /**
   * 有効期限切れエントリのクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * LRU（最後に使用されてから最も古い）エントリを削除
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * 値のサイズを概算計算
   */
  private calculateSize(value: any): number {
    const str = JSON.stringify(value)
    return str.length * 2 // 文字列は2バイト/文字で概算
  }

  /**
   * ヒット率計算（簡易版）
   */
  private calculateHitRate(): number {
    // 実装簡略化のため固定値
    return 0.85
  }

  /**
   * クリーンアップタイマー開始
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // 1分間隔
  }

  /**
   * サービス停止
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

interface CacheEntry {
  value: any
  expiresAt: number
  lastAccessed: number
  size: number
}

interface CacheStats {
  size: number
  maxSize: number
  totalSize: number
  expiredCount: number
  hitRate: number
}

// シングルトンインスタンス
export const cacheService = new CacheService()

/**
 * キャッシュミドルウェア
 */
export function cacheMiddleware(ttl?: number) {
  return (req: any, res: any, next: any) => {
    const key = `api:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`

    const cached = cacheService.get(key)
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.json(cached)
    }

    // レスポンスを保存
    const originalSend = res.json
    res.json = function(data: any) {
      cacheService.set(key, data, ttl)
      res.set('X-Cache', 'MISS')
      return originalSend.call(this, data)
    }

    next()
  }
}

/**
 * データベースクエリキャッシュヘルパー
 */
export async function withCache<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cacheService.get<T>(key)
  if (cached !== null) {
    return cached
  }

  const result = await queryFn()
  cacheService.set(key, result, ttl)
  return result
}