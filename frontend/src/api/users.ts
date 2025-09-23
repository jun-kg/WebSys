import api from '@/utils/api'
import type {
  UsersResponse,
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  CompanyDepartmentData,
  UserSearchParams
} from '@/types/user'

export const usersApi = {
  /**
   * ユーザー一覧取得（ページネーション、検索対応）
   */
  async getUsers(params?: UserSearchParams): Promise<UsersResponse> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
    if (params?.search) queryParams.append('search', params.search)

    const url = queryParams.toString() ? `/users?${queryParams.toString()}` : '/users'
    return await api.get<UsersResponse>(url)
  },

  /**
   * ユーザー詳細取得
   */
  async getUser(id: number): Promise<UserResponse> {
    return await api.get<UserResponse>(`/users/${id}`)
  },

  /**
   * ユーザー作成
   */
  async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    return await api.post<UserResponse>('/users', userData)
  },

  /**
   * ユーザー更新
   */
  async updateUser(id: number, userData: UpdateUserRequest): Promise<UserResponse> {
    return await api.put<UserResponse>(`/users/${id}`, userData)
  },

  /**
   * ユーザー削除（ソフト削除）
   */
  async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
    return await api.delete(`/users/${id}`)
  },

  /**
   * フォーム用の会社・部署データ取得
   */
  async getFormData(): Promise<CompanyDepartmentData> {
    return await api.get<CompanyDepartmentData>('/users/form-data/companies-departments')
  }
}

// 後方互換性のために古いAPIも残しておく
export const getUsers = usersApi.getUsers
export const getUserById = usersApi.getUser
export const createUser = usersApi.createUser
export const updateUser = usersApi.updateUser
export const deleteUser = usersApi.deleteUser

// 型をエクスポート
export type { User } from '@/types/user'