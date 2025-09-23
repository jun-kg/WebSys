import type { Company } from './company'

export interface Department {
  id: number
  code: string
  name: string
  companyId: number
  company?: Pick<Company, 'id' | 'code' | 'name'>
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    primaryUsers: number
  }
}

export interface DepartmentsResponse {
  success: boolean
  data?: {
    departments: Department[]
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

export interface DepartmentResponse {
  success: boolean
  data?: {
    department: Department
  }
  error?: {
    code: string
    message: string
  }
}

export interface CreateDepartmentRequest {
  code: string
  name: string
  companyId: number
}

export interface UpdateDepartmentRequest {
  code?: string
  name?: string
  companyId?: number
  isActive?: boolean
}

export interface DepartmentSearchParams {
  page?: number
  pageSize?: number
  search?: string
  companyId?: number
}