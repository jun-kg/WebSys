import { api } from '@core/api'

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
  parent?: {
    id: number
    name: string
    path?: string
  }
  children?: Department[]
  userCount?: number
  childDepartments?: number
}

export interface DepartmentTree extends Department {
  children: DepartmentTree[]
}

export interface CreateDepartmentRequest {
  companyId: number
  code: string
  name: string
  nameKana?: string
  parentId?: number
  displayOrder?: number
}

export interface UpdateDepartmentRequest {
  name?: string
  nameKana?: string
  displayOrder?: number
  isActive?: boolean
}

export interface MoveDepartmentRequest {
  newParentId?: number
  displayOrder?: number
}

export interface GetDepartmentsParams {
  companyId: number
  parentId?: number
  level?: number
  search?: string
  page?: number
  limit?: number
}

export interface GetDepartmentTreeParams {
  companyId: number
  includeInactive?: boolean
}

export const departmentAPI = {
  /**
   * 部署ツリー取得
   */
  async getDepartmentTree(params: GetDepartmentTreeParams) {
    const response = await api.get('/departments/tree', { params })
    return response.data
  },

  /**
   * 部署一覧取得（フラット）
   */
  async getDepartments(params: GetDepartmentsParams) {
    const response = await api.get('/departments', { params })
    return response.data
  },

  /**
   * 部署詳細取得
   */
  async getDepartment(id: number) {
    const response = await api.get(`/departments/${id}`)
    return response.data
  },

  /**
   * 部署作成
   */
  async createDepartment(data: CreateDepartmentRequest) {
    const response = await api.post('/departments', data)
    return response.data
  },

  /**
   * 部署更新
   */
  async updateDepartment(id: number, data: UpdateDepartmentRequest) {
    const response = await api.put(`/departments/${id}`, data)
    return response.data
  },

  /**
   * 部署削除（論理削除）
   */
  async deleteDepartment(id: number) {
    const response = await api.delete(`/departments/${id}`)
    return response.data
  },

  /**
   * 部署移動（階層変更）
   */
  async moveDepartment(id: number, data: MoveDepartmentRequest) {
    const response = await api.post(`/departments/${id}/move`, data)
    return response.data
  }
}