import type { Company, Department, UserRole } from './auth'

export interface User {
  id: number
  username: string
  email: string
  name: string
  companyId?: number
  company?: Pick<Company, 'id' | 'name' | 'code'>
  primaryDepartmentId?: number
  primaryDepartment?: Pick<Department, 'id' | 'name' | 'code'>
  employeeCode?: string
  joinDate?: string
  leaveDate?: string
  role: UserRole
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface UsersResponse {
  success: boolean
  data?: {
    users: User[]
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }
  error?: {
    code: string
    message: string
  }
}

export interface UserResponse {
  success: boolean
  data?: {
    user: User
  }
  error?: {
    code: string
    message: string
  }
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  name: string
  companyId?: number
  primaryDepartmentId?: number
  employeeCode?: string
  joinDate?: string
  role?: UserRole
}

export interface UpdateUserRequest {
  username?: string
  email?: string
  password?: string
  name?: string
  companyId?: number
  primaryDepartmentId?: number
  employeeCode?: string
  joinDate?: string
  leaveDate?: string
  role?: UserRole
  isActive?: boolean
}

export interface CompanyDepartmentData {
  success: boolean
  data?: {
    companies: Pick<Company, 'id' | 'code' | 'name'>[]
    departments: Pick<Department, 'id' | 'companyId' | 'code' | 'name'>[]
  }
  error?: {
    code: string
    message: string
  }
}

export interface UserSearchParams {
  page?: number
  pageSize?: number
  search?: string
}