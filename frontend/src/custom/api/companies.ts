import { api } from '@core/api'
import type {
  CompaniesResponse,
  CompanyResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanySearchParams
} from '@custom/types/company'

export const companiesApi = {
  /**
   * 会社一覧取得（ページネーション、検索対応）
   */
  async getCompanies(params?: CompanySearchParams): Promise<CompaniesResponse> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
    if (params?.search) queryParams.append('search', params.search)

    const url = queryParams.toString() ? `/companies?${queryParams.toString()}` : '/companies'
    return await api.get<CompaniesResponse>(url)
  },

  /**
   * 会社詳細取得
   */
  async getCompany(id: number): Promise<CompanyResponse> {
    return await api.get<CompanyResponse>(`/companies/${id}`)
  },

  /**
   * 会社作成
   */
  async createCompany(companyData: CreateCompanyRequest): Promise<CompanyResponse> {
    return await api.post<CompanyResponse>('/companies', companyData)
  },

  /**
   * 会社更新
   */
  async updateCompany(id: number, companyData: UpdateCompanyRequest): Promise<CompanyResponse> {
    return await api.put<CompanyResponse>(`/companies/${id}`, companyData)
  },

  /**
   * 会社削除（ソフト削除）
   */
  async deleteCompany(id: number): Promise<{ success: boolean; message: string }> {
    return await api.delete(`/companies/${id}`)
  }
}

export type { Company } from '@custom/types/company'