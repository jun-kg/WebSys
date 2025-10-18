import { api } from '@core/api'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: ServiceHealth
    application: ServiceHealth
    system: ServiceHealth
  }
  metrics: SystemMetrics
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  error?: string
  details?: any
}

export interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    loadAverage: number[]
  }
  memory: {
    used: number
    free: number
    total: number
    percentage: number
  }
  disk: {
    used: number
    free: number
    total: number
    percentage: number
  }
  network: {
    activeConnections: number
  }
  application: {
    uptime: number
    activeSessions: number
    totalRequests: number
    errorRate: number
    averageResponseTime: number
  }
}

export interface LoadTestResult {
  duration: number
  requests: number
  failures: number
  averageResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  successRate: number
  requestsPerSecond: number
  timestamp: string
  performedBy: string
}

/**
 * 基本ヘルスチェック取得
 */
export const getHealthStatus = async (): Promise<HealthStatus> => {
  const response = await api.get('/health')
  return response.data.data
}

/**
 * 詳細ヘルスチェック取得（認証必要）
 */
export const getDetailedHealthStatus = async (): Promise<HealthStatus & { internal: any }> => {
  const response = await api.get('/health/detailed')
  return response.data.data
}

/**
 * システムメトリクス取得（認証必要）
 */
export const getSystemMetrics = async (): Promise<{
  metrics: SystemMetrics
  timestamp: string
  status: 'healthy' | 'degraded' | 'unhealthy'
}> => {
  const response = await api.get('/health/metrics')
  return response.data.data
}

/**
 * ライブネスプローブ
 */
export const getLiveness = async (): Promise<{
  status: string
  timestamp: string
  uptime: number
}> => {
  const response = await api.get('/health/live')
  return response.data
}

/**
 * レディネスプローブ
 */
export const getReadiness = async (): Promise<{
  status: string
  timestamp: string
  services?: any
  reason?: string
}> => {
  const response = await api.get('/health/ready')
  return response.data
}

/**
 * パフォーマンステスト実行（管理者のみ）
 */
export const runLoadTest = async (): Promise<LoadTestResult> => {
  const response = await api.post('/health/loadtest')
  return response.data.data
}

/**
 * ヘルスチェック履歴取得
 */
export const getHealthHistory = async (count: number = 5): Promise<{
  history: HealthStatus[]
  summary: {
    totalChecks: number
    healthyCount: number
    degradedCount: number
    unhealthyCount: number
  }
}> => {
  const response = await api.get(`/health/history?count=${count}`)
  return response.data.data
}

/**
 * ヘルスステータスの色を取得
 */
export const getStatusColor = (status: 'healthy' | 'degraded' | 'unhealthy'): string => {
  switch (status) {
    case 'healthy': return '#67C23A'
    case 'degraded': return '#E6A23C'
    case 'unhealthy': return '#F56C6C'
    default: return '#909399'
  }
}

/**
 * ヘルスステータスのアイコンを取得
 */
export const getStatusIcon = (status: 'healthy' | 'degraded' | 'unhealthy'): string => {
  switch (status) {
    case 'healthy': return 'CircleCheck'
    case 'degraded': return 'Warning'
    case 'unhealthy': return 'CircleClose'
    default: return 'QuestionFilled'
  }
}

/**
 * バイトをフォーマット
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * アップタイムをフォーマット
 */
export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

/**
 * CPUロードアベレージの説明
 */
export const getLoadAverageDescription = (loadAvg: number, cores: number): string => {
  const percentage = (loadAvg / cores) * 100

  if (percentage < 70) return 'Low'
  if (percentage < 90) return 'Moderate'
  if (percentage < 100) return 'High'
  return 'Critical'
}