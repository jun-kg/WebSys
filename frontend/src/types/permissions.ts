export interface Feature {
  id: number
  code: string
  name: string
  category: string
  isActive: boolean
}

export interface PermissionSet {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
  canExport: boolean
}

export interface FeaturePermission {
  featureCode: string
  featureName?: string
  featureId?: number
  permissions: string | PermissionSet
  inheritFromParent?: boolean
}

export interface PermissionMatrixData {
  departmentId: number
  departmentName: string
  features: FeaturePermission[]
}

export interface Legend {
  [key: string]: string
}

export interface Department {
  id: number
  name: string
  code: string
  level: number
  children?: Department[]
}

export interface Category {
  code: string
  name: string
}

export interface PermissionTemplate {
  id: number
  companyId: number
  name: string
  description: string
  category: string
  isPreset: boolean
  features: TemplateFeature[]
  createdAt: string
  updatedAt: string
}

export interface TemplateFeature {
  featureId: number
  permissions: PermissionSet
}

export interface PermissionFilter {
  departmentIds: number[]
  category: string
}

export interface PermissionEditData {
  departmentId: number
  departmentName: string
  feature: Feature
  permissions: PermissionSet & { inheritFromParent: boolean }
}