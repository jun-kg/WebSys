/**
 * API ユーティリティ
 * HTTPリクエストの統一管理
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    if (token) {
      console.log('Sending Authorization header:', headers.Authorization)
    } else {
      console.log('No token found in localStorage')
    }
    return headers
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body } = options

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...headers,
      },
    }

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(body)
    }

    const url = `${this.baseURL}${endpoint}`

    try {
      const response = await fetch(url, config)

      // レスポンスが空の場合の処理
      const contentType = response.headers.get('content-type')
      let responseData: any

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      // 認証APIの標準レスポンス形式に対応
      // 成功でも失敗でもレスポンスデータを返し、呼び出し側で判断
      if (!response.ok) {
        // サーバーエラーレスポンス
        const error = new Error(responseData?.error?.message || responseData?.message || `HTTP ${response.status}`) as any
        error.response = { status: response.status, data: responseData }
        throw error
      }

      return responseData as T
    } catch (error: any) {
      // ネットワークエラーなどの場合
      if (!error.response) {
        console.error(`API request failed: ${method} ${url}`, error)
      }
      throw error
    }
  }

  // GET リクエスト
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers })
  }

  // POST リクエスト
  async post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, headers })
  }

  // PUT リクエスト
  async put<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers })
  }

  // DELETE リクエスト
  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers })
  }

  // PATCH リクエスト
  async patch<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers })
  }
}

// デフォルトのAPIクライアントインスタンス
const api = new ApiClient(API_BASE_URL)

export default api
export { ApiClient }