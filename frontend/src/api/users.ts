import api from './index'

export interface User {
  id: number
  username: string
  name: string
  email: string
  department: string | null
  role: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateUserRequest {
  username: string
  name: string
  email: string
  password: string
  department?: string
  role?: string
}

export interface UpdateUserRequest {
  username?: string
  name?: string
  email?: string
  password?: string
  department?: string
  role?: string
  isActive?: boolean
}

export interface UsersSearchParams {
  username?: string
  department?: string
  page?: number
  pageSize?: number
}

// ユーザー一覧取得
export const getUsers = async (params?: UsersSearchParams) => {
  const response = await api.get('/api/users', { params })
  return response.data
}

// ユーザー詳細取得
export const getUserById = async (id: number) => {
  const response = await api.get(`/api/users/${id}`)
  return response.data
}

// ユーザー作成
export const createUser = async (userData: CreateUserRequest) => {
  const response = await api.post('/api/users', userData)
  return response.data
}

// ユーザー更新
export const updateUser = async (id: number, userData: UpdateUserRequest) => {
  const response = await api.put(`/api/users/${id}`, userData)
  return response.data
}

// ユーザー削除
export const deleteUser = async (id: number) => {
  const response = await api.delete(`/api/users/${id}`)
  return response.data
}