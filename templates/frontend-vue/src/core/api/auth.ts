import api from '@/utils/api'
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  TokenVerificationResponse
} from '@/types/auth'

export const authApi = {
  /**
   * ユーザーログイン
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return await api.post<LoginResponse>('/auth/login', credentials)
  },

  /**
   * ユーザーログアウト
   */
  async logout(): Promise<LogoutResponse> {
    return await api.post<LogoutResponse>('/auth/logout')
  },

  /**
   * トークン検証
   */
  async verifyToken(): Promise<TokenVerificationResponse> {
    return await api.get<TokenVerificationResponse>('/auth/verify')
  },

  /**
   * ユーザー登録（管理者のみ）
   */
  async register(userData: {
    username: string
    email: string
    password: string
    name: string
  }): Promise<LoginResponse> {
    return await api.post<LoginResponse>('/auth/register', userData)
  }
}