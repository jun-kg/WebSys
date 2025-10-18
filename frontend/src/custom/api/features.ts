import { api } from '@core/api'

export interface Feature {
  id: number
  code: string
  name: string
  description?: string
  category: string
  parentId?: number
  path?: string
  urlPattern?: string
  apiPattern?: string
  icon?: string
  displayOrder: number
  isMenuItem: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  parent?: {
    id: number
    name: string
    code: string
  }
  children?: Feature[]
}

export interface FeatureCategory {
  code: string
  name: string
  description: string
  featureCount: number
}

export interface CreateFeatureRequest {
  code: string
  name: string
  description?: string
  category: string
  parentId?: number
  urlPattern?: string
  apiPattern?: string
  icon?: string
  displayOrder?: number
  isMenuItem?: boolean
}

export interface UpdateFeatureRequest {
  name?: string
  description?: string
  category?: string
  parentId?: number
  urlPattern?: string
  apiPattern?: string
  icon?: string
  displayOrder?: number
  isMenuItem?: boolean
  isActive?: boolean
}

export interface GetFeaturesParams {
  category?: string
  parentId?: number
  isMenuItem?: boolean
  isActive?: boolean
  page?: number
  limit?: number
  search?: string
}

export const featureAPI = {
  /**
   * 機能一覧取得
   */
  async getFeatures(params?: GetFeaturesParams) {
    const response = await api.get('/features', { params })
    return response.data
  },

  /**
   * 機能詳細取得
   */
  async getFeature(id: number) {
    const response = await api.get(`/features/${id}`)
    return response.data
  },

  /**
   * 機能カテゴリ一覧取得
   */
  async getCategories() {
    const response = await api.get('/features/categories')
    return response.data
  },

  /**
   * 機能作成
   */
  async createFeature(data: CreateFeatureRequest) {
    const response = await api.post('/features', data)
    return response.data
  },

  /**
   * 機能更新
   */
  async updateFeature(id: number, data: UpdateFeatureRequest) {
    const response = await api.put(`/features/${id}`, data)
    return response.data
  },

  /**
   * 機能削除（論理削除）
   */
  async deleteFeature(id: number) {
    const response = await api.delete(`/features/${id}`)
    return response.data
  }
}