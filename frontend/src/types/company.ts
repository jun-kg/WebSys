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
  contractPlan?: string
  maxUsers?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
    departments: number
  }
}

export interface CompaniesResponse {
  success: boolean
  data?: {
    companies: Company[]
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

export interface CompanyResponse {
  success: boolean
  data?: {
    company: Company
  }
  error?: {
    code: string
    message: string
  }
}

export interface CreateCompanyRequest {
  code: string
  name: string
  address?: string
  phone?: string
  email?: string
}

export interface UpdateCompanyRequest {
  code?: string
  name?: string
  address?: string
  phone?: string
  email?: string
  isActive?: boolean
}

export interface CompanySearchParams {
  page?: number
  pageSize?: number
  search?: string
}