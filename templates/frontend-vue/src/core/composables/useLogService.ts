/**
 * ログ監視システム Composable
 */

import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@custom/stores/auth'
import { collectLogs, searchLogs, getRealtimeStatistics } from '@core/api/logs'
import type {
  LogEntry,
  LogLevel,
  LogCategory,
  LogSource,
  LogSearchParams,
  ErrorInfo,
  PerformanceInfo
} from '@/types/log'

// セッション管理
let sessionId: string | null = null
let traceId: string | null = null

/**
 * セッションID生成
 */
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * トレースID生成
 */
const generateTraceId = (): string => {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * ログサービス Composable
 */
export const useLogService = () => {
  const authStore = useAuthStore()
  const isCollecting = ref(false)
  const logBuffer = ref<Omit<LogEntry, 'id' | 'user'>[]>([])
  const maxBufferSize = 100
  const flushInterval = 5000 // 5秒

  // セッションID初期化
  if (!sessionId) {
    sessionId = generateSessionId()
  }

  /**
   * ログエントリ作成
   */
  const createLogEntry = (
    level: LogLevel,
    category: LogCategory,
    message: string,
    options: {
      source?: LogSource
      details?: Record<string, any>
      error?: ErrorInfo
      performance?: PerformanceInfo
      tags?: string[]
      traceId?: string
    } = {}
  ): Omit<LogEntry, 'id' | 'user'> => {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      source: options.source || 'frontend',
      traceId: options.traceId || traceId,
      sessionId,
      userId: authStore.user?.id,
      hostname: window.location.hostname,
      service: 'websys-frontend',
      details: options.details,
      error: options.error,
      performance: options.performance,
      tags: options.tags || [],
      environment: import.meta.env.MODE || 'development'
    }
  }

  /**
   * ログ送信
   */
  const sendLog = async (logEntry: Omit<LogEntry, 'id' | 'user'>) => {
    try {
      logBuffer.value.push(logEntry)

      // バッファサイズ制限
      if (logBuffer.value.length > maxBufferSize) {
        logBuffer.value = logBuffer.value.slice(-maxBufferSize)
      }

      // 即座に送信する条件 (エラーレベル以上)
      if (logEntry.level >= 50) {
        await flushLogs()
      }
    } catch (error) {
      console.error('ログ送信エラー:', error)
    }
  }

  /**
   * バッファからログを送信
   */
  const flushLogs = async () => {
    if (logBuffer.value.length === 0 || isCollecting.value) {
      return
    }

    try {
      isCollecting.value = true
      const logsToSend = [...logBuffer.value]
      logBuffer.value = []

      const result = await collectLogs(logsToSend)

      if (result.errors && result.errors.length > 0) {
        console.warn('ログ送信警告:', result.errors)
      }
    } catch (error) {
      console.error('ログフラッシュエラー:', error)
      // 送信失敗時はバッファに戻す（サイズ制限内で）
      const failedLogs = logBuffer.value.slice(0, maxBufferSize - logBuffer.value.length)
      logBuffer.value.unshift(...failedLogs)
    } finally {
      isCollecting.value = false
    }
  }

  /**
   * 便利メソッド: ログレベル別
   */
  const logFatal = (message: string, options = {}) => {
    return sendLog(createLogEntry(60, 'ERR', message, options))
  }

  const logError = (message: string, error?: Error | ErrorInfo, options = {}) => {
    const errorInfo = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error

    return sendLog(createLogEntry(50, 'ERR', message, { ...options, error: errorInfo }))
  }

  const logWarn = (message: string, options = {}) => {
    return sendLog(createLogEntry(40, 'SYS', message, options))
  }

  const logInfo = (message: string, options = {}) => {
    return sendLog(createLogEntry(30, 'SYS', message, options))
  }

  const logDebug = (message: string, options = {}) => {
    return sendLog(createLogEntry(20, 'SYS', message, options))
  }

  const logTrace = (message: string, options = {}) => {
    return sendLog(createLogEntry(10, 'SYS', message, options))
  }

  /**
   * カテゴリ別便利メソッド
   */
  const logAuth = (message: string, level: LogLevel = 30, options = {}) => {
    return sendLog(createLogEntry(level, 'AUTH', message, options))
  }

  const logAPI = (message: string, level: LogLevel = 30, options = {}) => {
    return sendLog(createLogEntry(level, 'API', message, options))
  }

  const logUser = (message: string, level: LogLevel = 30, options = {}) => {
    return sendLog(createLogEntry(level, 'USER', message, options))
  }

  const logPerf = (message: string, performance: PerformanceInfo, options = {}) => {
    return sendLog(createLogEntry(30, 'PERF', message, { ...options, performance }))
  }

  /**
   * トレース開始
   */
  const startTrace = (name: string): string => {
    traceId = generateTraceId()
    logInfo(`トレース開始: ${name}`, {
      category: 'SYS',
      traceId,
      details: { action: 'trace_start', name }
    })
    return traceId
  }

  /**
   * トレース終了
   */
  const endTrace = (name: string, startTime?: number) => {
    const duration = startTime ? Date.now() - startTime : undefined
    logInfo(`トレース終了: ${name}`, {
      category: 'SYS',
      traceId,
      details: { action: 'trace_end', name },
      performance: duration ? { duration } : undefined
    })
    traceId = null
  }

  /**
   * 自動フラッシュ設定
   */
  let flushIntervalId: number | null = null

  const startAutoFlush = () => {
    if (!flushIntervalId) {
      flushIntervalId = window.setInterval(flushLogs, flushInterval)
    }
  }

  const stopAutoFlush = () => {
    if (flushIntervalId) {
      clearInterval(flushIntervalId)
      flushIntervalId = null
    }
  }

  // ページ離脱時にログをフラッシュ
  window.addEventListener('beforeunload', () => {
    if (logBuffer.value.length > 0) {
      // 同期送信（制限あり）
      navigator.sendBeacon('/api/logs', JSON.stringify({ logs: logBuffer.value }))
    }
  })

  return {
    // 状態
    isCollecting: readonly(isCollecting),
    bufferSize: computed(() => logBuffer.value.length),
    sessionId,

    // 基本メソッド
    createLogEntry,
    sendLog,
    flushLogs,

    // レベル別メソッド
    logFatal,
    logError,
    logWarn,
    logInfo,
    logDebug,
    logTrace,

    // カテゴリ別メソッド
    logAuth,
    logAPI,
    logUser,
    logPerf,

    // トレース機能
    startTrace,
    endTrace,

    // 自動フラッシュ制御
    startAutoFlush,
    stopAutoFlush
  }
}

/**
 * ログ検索 Composable
 */
export const useLogSearch = () => {
  const logs = ref<LogEntry[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(50)
  const hasNext = ref(false)

  const searchParams = reactive<Partial<LogSearchParams>>({
    page: 1,
    pageSize: 50,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  })

  const search = async (params: Partial<LogSearchParams> = {}) => {
    try {
      loading.value = true
      const searchQuery = { ...searchParams, ...params }

      const result = await searchLogs(searchQuery)

      logs.value = result.logs
      total.value = result.total
      currentPage.value = result.page
      pageSize.value = result.pageSize
      hasNext.value = result.hasNext

    } catch (error) {
      console.error('ログ検索エラー:', error)
      ElMessage.error('ログ検索に失敗しました')
    } finally {
      loading.value = false
    }
  }

  const resetSearch = () => {
    Object.assign(searchParams, {
      startTime: undefined,
      endTime: undefined,
      levels: undefined,
      categories: undefined,
      sources: undefined,
      query: undefined,
      page: 1,
      pageSize: 50,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    })
  }

  return {
    // 状態
    logs: readonly(logs),
    loading: readonly(loading),
    total: readonly(total),
    currentPage: readonly(currentPage),
    pageSize: readonly(pageSize),
    hasNext: readonly(hasNext),
    searchParams,

    // メソッド
    search,
    resetSearch
  }
}

/**
 * リアルタイム統計 Composable
 */
export const useRealtimeStats = (autoRefresh = true, refreshInterval = 30000) => {
  const stats = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let refreshIntervalId: number | null = null

  const fetchStats = async () => {
    try {
      loading.value = true
      error.value = null
      stats.value = await getRealtimeStatistics()
    } catch (err) {
      console.error('リアルタイム統計取得エラー:', err)
      error.value = 'リアルタイム統計の取得に失敗しました'
    } finally {
      loading.value = false
    }
  }

  const startAutoRefresh = () => {
    if (autoRefresh && !refreshIntervalId) {
      refreshIntervalId = window.setInterval(fetchStats, refreshInterval)
    }
  }

  const stopAutoRefresh = () => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId)
      refreshIntervalId = null
    }
  }

  // 初回取得
  fetchStats()
  startAutoRefresh()

  return {
    stats: readonly(stats),
    loading: readonly(loading),
    error: readonly(error),
    fetchStats,
    startAutoRefresh,
    stopAutoRefresh
  }
}