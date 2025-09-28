/**
 * Visualization Types and Interfaces
 * 可視化コンポーネント用型定義
 */

export interface Department {
  id: number
  name: string
  parentId: number | null
  level: number
  children?: Department[]
  permissions?: any[]
  inheritanceRules?: any[]
  effectivePermissions?: any[]
  parentName?: string
  childrenCount?: number
}

export interface Company {
  id: number
  name: string
}

export interface Feature {
  id: number
  name: string
  code: string
}

export interface VisualizationNode {
  id: string
  name: string
  level: number
  parentId?: string
  permissions: any[]
  inheritanceRules: any[]
  x?: number
  y?: number
  children?: VisualizationNode[]
  parentName?: string
  childrenCount?: number
}

export interface MatrixData {
  departments: {
    id: number
    name: string
    effectivePermissions: any[]
  }[]
  permissions: string[]
}

export type VisualizationType = 'tree' | 'flow' | 'matrix'

export interface D3Selection {
  svg?: d3.Selection<SVGSVGElement, unknown, null, undefined>
  g?: d3.Selection<SVGGElement, unknown, null, undefined>
  zoom?: d3.ZoomBehavior<SVGSVGElement, unknown>
}

export interface VisualizationConfig {
  nodeWidth: number
  nodeHeight: number
  levelHeight: number
  containerWidth: number
  containerHeight: number
}

export interface PermissionColors {
  direct: string
  inherited: string
  none: string
  conflict: string
}

export interface PermissionTypeColors {
  [key: string]: string
}