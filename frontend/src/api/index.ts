import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response) {
      const errorCode = error.response.data?.error?.code
      const errorMessage = error.response.data?.error?.message || error.response.data?.message

      switch (error.response.status) {
        case 401:
          // 認証エラーの詳細なハンドリング（新しいエラーコード対応）
          const authErrorMessages = {
            // トークン関連エラー
            'TOKEN_MISSING': 'トークンが見つかりません。再度ログインしてください',
            'TOKEN_EXPIRED': 'セッションが期限切れです。再度ログインしてください',
            'TOKEN_INVALID': '認証トークンが無効です。再度ログインしてください',
            'TOKEN_MALFORMED': 'トークンの形式が無効です。再度ログインしてください',
            'TOKEN_PAYLOAD_INVALID': 'トークンが破損しています。再度ログインしてください',
            'TOKEN_VERIFICATION_ERROR': 'トークン検証でエラーが発生しました。再度ログインしてください',

            // セッション関連エラー
            'SESSION_EXPIRED': 'セッションが期限切れです。再度ログインしてください',
            'SESSION_INVALID': 'セッションが無効です。再度ログインしてください',
            'SESSION_NOT_FOUND': 'セッションが見つかりません。再度ログインしてください',
            'SESSION_INACTIVE': 'セッションが無効化されています。再度ログインしてください',

            // WebSocket関連エラー
            'WEBSOCKET_TOKEN_MISSING': 'WebSocket接続でトークンエラー。再度ログインしてください',
            'WEBSOCKET_TOKEN_EXPIRED': 'WebSocketトークンが期限切れです。再度ログインしてください',
            'WEBSOCKET_TOKEN_INVALID': 'WebSocketトークンが無効です。再度ログインしてください',
            'WEBSOCKET_TOKEN_MALFORMED': 'WebSocketトークンの形式が無効です。再度ログインしてください',
            'WEBSOCKET_PAYLOAD_INVALID': 'WebSocketトークンが破損しています。再度ログインしてください',

            // 従来のエラーコード
            'AUTH_001': '認証情報がありません。ログインしてください',
            'AUTH_003': '認証に失敗しました。再度ログインしてください'
          }

          const authMessage = authErrorMessages[errorCode] || errorMessage || '認証エラーが発生しました。再度ログインしてください'
          ElMessage.error(authMessage)

          // トークンを削除してログイン画面へリダイレクト
          localStorage.removeItem('token')
          localStorage.removeItem('user')

          // ログイン画面へのリダイレクト前に少し待つ
          setTimeout(() => {
            router.push('/login')
          }, 500)
          break

        case 403:
          // ユーザー関連エラー（新しいエラーコード対応）
          const userErrorMessages = {
            'USER_NOT_FOUND': 'ユーザーが見つかりません。再度ログインしてください',
            'USER_INACTIVE': 'ユーザーアカウントが無効化されています',
            'USER_INVALID': 'ユーザーアカウントが無効です',
            'AUTH_004': 'この操作を実行する権限がありません'
          }

          const userMessage = userErrorMessages[errorCode] || errorMessage || 'アクセスが拒否されました'
          ElMessage.error(userMessage)

          // ユーザー関連エラーの場合はログイン画面へ
          if (['USER_NOT_FOUND', 'USER_INACTIVE', 'USER_INVALID'].includes(errorCode)) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setTimeout(() => {
              router.push('/login')
            }, 500)
          }
          break

        case 404:
          ElMessage.error(errorMessage || 'リソースが見つかりません')
          break

        case 500:
          ElMessage.error(errorMessage || 'サーバーエラーが発生しました')
          break

        default:
          ElMessage.error(errorMessage || `エラーが発生しました: ${error.message}`)
      }
    } else if (error.request) {
      ElMessage.error('サーバーに接続できません。ネットワーク接続を確認してください')
    } else {
      ElMessage.error(`エラーが発生しました: ${error.message}`)
    }
    return Promise.reject(error)
  }
)

export default api
export { api }