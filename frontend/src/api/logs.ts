/**
 * ログ監視システム API
 */

import api from './index'
import type {
  LogEntry,
  LogSearchParams,
  LogSearchResult,
  LogStatisticsParams,
  LogStatisticsResult,
  RealtimeStatistics
} from '@/types/log'

export interface LogCollectionRequest {
  logs: Omit<LogEntry, 'id' | 'user'>[]
}

export interface LogCollectionResponse {
  success: boolean
  received: number
  saved: number
  errors: string[]
}

/**
 * ログ収集API (認証不要)
 */
export const collectLogs = async (logs: Omit<LogEntry, 'id' | 'user'>[]): Promise<LogCollectionResponse> => {
  const response = await api.post<LogCollectionResponse>('/api/logs', { logs })
  return response.data
}

/**
 * ログ検索API (認証必要)
 */
export const searchLogs = async (params: Partial<LogSearchParams>): Promise<LogSearchResult> => {
  const searchParams = {
    page: 1,
    pageSize: 50,
    sortBy: 'timestamp',
    sortOrder: 'desc' as const,
    ...params
  }

  const queryParams = new URLSearchParams()

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','))
      } else {
        queryParams.append(key, String(value))
      }
    }
  })

  const response = await api.get<LogSearchResult>(`/api/logs/search?${queryParams}`)
  return response.data
}

/**
 * 統計データ取得API (認証必要)
 */
export const getStatistics = async (params: LogStatisticsParams): Promise<LogStatisticsResult> => {
  const queryParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','))
      } else {
        queryParams.append(key, String(value))
      }
    }
  })

  const response = await api.get<LogStatisticsResult>(`/api/logs/statistics?${queryParams}`)
  return response.data
}

/**
 * リアルタイム統計取得API (認証必要)
 */
export const getRealtimeStatistics = async (): Promise<RealtimeStatistics> => {
  const response = await api.get<RealtimeStatistics>('/api/logs/realtime')
  return response.data
}

/**
 * ログ詳細取得API (認証必要)
 */
export const getLogDetail = async (id: string): Promise<{ success: boolean; log: LogEntry }> => {
  const response = await api.get<{ success: boolean; log: LogEntry }>(`/api/logs/${id}`)
  return response.data
}

/**
 * ログクリーンアップAPI (管理者のみ)
 */
export const cleanupLogs = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>('/api/logs/cleanup')
  return response.data
}

/**
 * ログエクスポートAPI (管理者のみ)
 */
export const exportLogs = async (params: {
  format?: 'json' | 'csv'
  startTime?: string
  endTime?: string
  levels?: number[]
  categories?: string[]
  sources?: string[]
}): Promise<Blob> => {
  const queryParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','))
      } else {
        queryParams.append(key, String(value))
      }
    }
  })

  const response = await api.get(`/api/logs/export?${queryParams}`, {
    responseType: 'blob'
  })

  return response.data
}