import { api } from './index'

export interface Permission {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
  canExport: boolean
}

export interface DepartmentPermission {
  featureId: number
  featureCode: string
  featureName: string
  category: string
  permissions: Permission
  inheritFromParent: boolean
}

export interface UserPermission {
  featureCode: string
  featureName: string
  permissions: Permission
  source: string
}

export interface PermissionMatrix {
  departmentId: number
  departmentName: string
  features: {
    featureCode: string
    featureName: string
    permissions: string
  }[]
}

export interface PermissionCheck {
  featureCode: string
  action: 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'APPROVE' | 'EXPORT'
}

export interface PermissionCheckResult {
  featureCode: string
  action: string
  hasPermission: boolean
}

export interface UpdatePermissionRequest {
  permissions: {
    featureId: number
    canView?: boolean
    canCreate?: boolean
    canEdit?: boolean
    canDelete?: boolean
    canApprove?: boolean
    canExport?: boolean
    inheritFromParent?: boolean
  }[]
}

export interface PermissionTemplate {
  id: number
  name: string
  description?: string
  category: string
  isPreset: boolean
  displayOrder: number
  features: {
    featureId: number
    featureCode: string
    featureName: string
    featureCategory: string
    permissions: Permission
  }[]
}

export interface CreatePermissionTemplateRequest {
  companyId: number
  name: string
  description?: string
  category?: string
  features: {
    featureId: number
    permissions: Permission
  }[]
}

export interface ApplyPermissionTemplateRequest {
  departmentIds: number[]
}

export const permissionAPI = {
  /**
   * 部署権限取得
   */
  async getDepartmentPermissions(departmentId: number) {
    const response = await api.get(`/permissions/department/${departmentId}`)
    return response.data
  },

  /**
   * 部署権限更新
   */
  async updateDepartmentPermissions(departmentId: number, data: UpdatePermissionRequest) {
    const response = await api.post(`/permissions/department/${departmentId}`, data)
    return response.data
  },

  /**
   * ユーザー有効権限取得
   */
  async getUserPermissions(userId: number) {
    const response = await api.get(`/permissions/user/${userId}`)
    return response.data
  },

  /**
   * 現在のユーザー権限取得
   */
  async getMyPermissions() {
    const response = await api.get('/permissions/my')
    return response.data
  },

  /**
   * 権限チェック
   */
  async checkPermission(featureCode: string, action: string) {
    const response = await api.post('/permissions/check', {
      featureCode,
      action
    })
    return response.data
  },

  /**
   * 権限一括チェック
   */
  async checkBulkPermissions(checks: PermissionCheck[]) {
    const response = await api.post('/permissions/check-bulk', {
      checks
    })
    return response.data
  },

  /**
   * 権限マトリクスレポート取得
   */
  async getPermissionMatrix(companyId: number, departmentIds?: number[]) {
    const params: any = { companyId }
    if (departmentIds && departmentIds.length > 0) {
      params.departmentIds = departmentIds.join(',')
    }

    const response = await api.get('/permissions/matrix', { params })
    return response.data
  },

  /**
   * 権限テンプレート一覧取得
   */
  async getPermissionTemplates(companyId: number) {
    const response = await api.get('/permissions/templates', {
      params: { companyId }
    })
    return response.data
  },

  /**
   * 権限テンプレート作成
   */
  async createPermissionTemplate(data: CreatePermissionTemplateRequest) {
    const response = await api.post('/permissions/templates', data)
    return response.data
  },

  /**
   * 権限テンプレート適用
   */
  async applyPermissionTemplate(templateId: number, data: ApplyPermissionTemplateRequest) {
    const response = await api.post(`/permissions/templates/${templateId}/apply`, data)
    return response.data
  },

  /**
   * 権限テンプレート削除
   */
  async deletePermissionTemplate(templateId: number) {
    const response = await api.delete(`/permissions/templates/${templateId}`)
    return response.data
  }
}