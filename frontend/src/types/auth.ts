export interface Company {
  id: number
  code: string
  name: string
  nameKana?: string
  industry?: string
  establishedDate?: string
  employeeCount?: number
  address?: string
  phone?: string
  email?: string
  contractPlan: string
  maxUsers: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy?: number
  updatedBy?: number
}

export interface Department {
  id: number
  companyId: number
  code: string
  name: string
  nameKana?: string
  parentId?: number
  level: number
  path?: string
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy?: number
  updatedBy?: number
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'GUEST'

export interface User {
  id: number
  username: string
  email: string
  name: string
  companyId?: number
  company?: Company
  primaryDepartmentId?: number
  primaryDepartment?: Department
  employeeCode?: string
  joinDate?: string
  leaveDate?: string
  role: UserRole
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  data?: {
    token: string
    user: User
    expiresIn: number
  }
  error?: {
    code: string
    message: string
    details?: any[]
  }
}

export interface TokenVerificationResponse {
  success: boolean
  data?: {
    user: User
    expiresIn: number
  }
  error?: {
    code: string
    message: string
  }
}

export interface LogoutResponse {
  success: boolean
  data?: {
    message: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface ApiError {
  code: string
  message: string
  details?: any[]
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
}