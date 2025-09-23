/**
 * ログ監視システム型定義
 */

export type LogLevel = 60 | 50 | 40 | 30 | 20 | 10
export type LogCategory = 'AUTH' | 'API' | 'DB' | 'SEC' | 'SYS' | 'USER' | 'PERF' | 'ERR'
export type LogSource = 'frontend' | 'backend' | 'database' | 'infrastructure'

export interface LogEntry {
  id?: string
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string

  // 追跡情報
  traceId?: string
  sessionId?: string
  userId?: number
  user?: {
    id: number
    username: string
    name: string
  }

  // システム情報
  source: LogSource
  hostname?: string
  service?: string

  // 詳細情報
  details?: Record<string, any>
  error?: ErrorInfo
  performance?: PerformanceInfo

  // メタデータ
  tags?: string[]
  environment: string
}

export interface ErrorInfo {
  name?: string
  message?: string
  stack?: string
  code?: string | number
}

export interface PerformanceInfo {
  duration?: number
  memoryUsage?: number
  cpuUsage?: number
}

export interface LogSearchParams {
  startTime?: string
  endTime?: string
  levels?: LogLevel[]
  categories?: LogCategory[]
  sources?: LogSource[]
  traceId?: string
  userId?: number
  query?: string
  page: number
  pageSize: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface LogSearchResult {
  logs: LogEntry[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
}

export interface LogStatisticsParams {
  startTime: string
  endTime: string
  groupBy: 'hour' | 'day' | 'category' | 'level'
  categories?: string[]
  levels?: number[]
}

export interface LogStatistics {
  key: string
  count: number
  percentage: number
}

export interface LogStatisticsResult {
  statistics: LogStatistics[]
  total: number
  period: {
    start: string
    end: string
  }
}

export interface AlertRule {
  id?: number
  name: string
  description?: string

  // 条件
  level?: number
  category?: string
  source?: string
  messagePattern?: string

  // 閾値
  thresholdCount: number
  thresholdPeriod: number

  // 通知設定
  notificationChannels: string[]

  isEnabled: boolean
  createdAt?: Date
  updatedAt?: Date
}

// ログレベル定数
export const LOG_LEVELS = {
  FATAL: 60,
  ERROR: 50,
  WARN: 40,
  INFO: 30,
  DEBUG: 20,
  TRACE: 10
} as const

// ログレベル名
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  60: 'FATAL',
  50: 'ERROR',
  40: 'WARN',
  30: 'INFO',
  20: 'DEBUG',
  10: 'TRACE'
}

// カテゴリ名
export const LOG_CATEGORY_NAMES: Record<LogCategory, string> = {
  AUTH: '認証',
  API: 'API',
  DB: 'データベース',
  SEC: 'セキュリティ',
  SYS: 'システム',
  USER: 'ユーザー',
  PERF: 'パフォーマンス',
  ERR: 'エラー'
}

// ソース名
export const LOG_SOURCE_NAMES: Record<LogSource, string> = {
  frontend: 'フロントエンド',
  backend: 'バックエンド',
  database: 'データベース',
  infrastructure: 'インフラ'
}