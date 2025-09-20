import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
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
    return response.data
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          ElMessage.error('認証エラー: 再度ログインしてください')
          localStorage.removeItem('token')
          router.push('/login')
          break
        case 403:
          ElMessage.error('アクセスが拒否されました')
          break
        case 404:
          ElMessage.error('リソースが見つかりません')
          break
        case 500:
          ElMessage.error('サーバーエラーが発生しました')
          break
        default:
          ElMessage.error(`エラーが発生しました: ${error.response.data.message || error.message}`)
      }
    } else if (error.request) {
      ElMessage.error('サーバーに接続できません')
    } else {
      ElMessage.error(`エラーが発生しました: ${error.message}`)
    }
    return Promise.reject(error)
  }
)

export default api