/**
 * Visualization WebWorker
 * 可視化計算処理用WebWorker
 *
 * 機能:
 * - 重いツリー構造計算をバックグラウンドで実行
 * - UIスレッドのブロッキング防止
 * - 大規模データセットの効率的処理
 */

import type { Department, VisualizationNode } from '../components/visualization/VisualizationTypes'

// Worker message types
interface WorkerMessage {
  type: 'BUILD_TREE' | 'BUILD_FLOW' | 'BUILD_MATRIX' | 'CALCULATE_INHERITANCE'
  data: any
  requestId: string
}

interface WorkerResponse {
  type: 'TREE_BUILT' | 'FLOW_BUILT' | 'MATRIX_BUILT' | 'INHERITANCE_CALCULATED' | 'ERROR'
  data: any
  requestId: string
}

// Worker context
const ctx: Worker = self as any

// Message handler
ctx.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, data, requestId } = event.data

  try {
    let result: any

    switch (type) {
      case 'BUILD_TREE':
        result = buildTreeData(data.departments, data.selectedFeature)
        ctx.postMessage({
          type: 'TREE_BUILT',
          data: result,
          requestId
        } as WorkerResponse)
        break

      case 'BUILD_FLOW':
        result = buildFlowData(data.departments, data.selectedFeature)
        ctx.postMessage({
          type: 'FLOW_BUILT',
          data: result,
          requestId
        } as WorkerResponse)
        break

      case 'BUILD_MATRIX':
        result = buildMatrixData(data.departments, data.selectedFeature)
        ctx.postMessage({
          type: 'MATRIX_BUILT',
          data: result,
          requestId
        } as WorkerResponse)
        break

      case 'CALCULATE_INHERITANCE':
        result = calculateEffectivePermissions(data.departmentId, data.departments)
        ctx.postMessage({
          type: 'INHERITANCE_CALCULATED',
          data: result,
          requestId
        } as WorkerResponse)
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    ctx.postMessage({
      type: 'ERROR',
      data: { error: error.message },
      requestId
    } as WorkerResponse)
  }
})

// Tree data building (heavy computation)
function buildTreeData(departments: Department[], selectedFeature?: number): VisualizationNode[] {
  console.log(`[VisualizationWorker] Building tree data for ${departments.length} departments`)

  const nodeMap = new Map<number, VisualizationNode>()

  // Convert departments to visualization nodes
  departments.forEach(dept => {
    const permissions = selectedFeature
      ? (dept.effectivePermissions || []).filter(p => p.featureId === selectedFeature)
      : []

    nodeMap.set(dept.id, {
      id: dept.id.toString(),
      name: dept.name,
      level: dept.level,
      parentId: dept.parentId?.toString(),
      permissions: permissions,
      inheritanceRules: dept.inheritanceRules || [],
      children: [],
      parentName: dept.parentId ? departments.find(d => d.id === dept.parentId)?.name : undefined,
      childrenCount: departments.filter(d => d.parentId === dept.id).length
    })
  })

  // Build tree structure
  const tree: VisualizationNode[] = []
  nodeMap.forEach(node => {
    if (node.parentId) {
      const parent = nodeMap.get(parseInt(node.parentId))
      if (parent) {
        parent.children!.push(node)
      }
    } else {
      tree.push(node)
    }
  })

  // Sort children by name for consistent rendering
  const sortChildren = (node: VisualizationNode) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => a.name.localeCompare(b.name))
      node.children.forEach(sortChildren)
    }
  }

  tree.forEach(sortChildren)

  console.log(`[VisualizationWorker] Tree data built: ${tree.length} root nodes`)
  return tree
}

// Flow data building (filtered and sorted)
function buildFlowData(departments: Department[], selectedFeature?: number): VisualizationNode[] {
  if (!selectedFeature) return []

  console.log(`[VisualizationWorker] Building flow data for feature ${selectedFeature}`)

  const filtered = departments
    .filter(dept => {
      const permission = dept.effectivePermissions?.find(p => p.featureId === selectedFeature)
      return permission && (permission.source === 'inherited' || hasDirectPermission(dept, selectedFeature))
    })
    .map(dept => ({
      id: dept.id.toString(),
      name: dept.name,
      level: dept.level,
      parentId: dept.parentId?.toString(),
      permissions: dept.effectivePermissions?.filter(p => p.featureId === selectedFeature) || [],
      inheritanceRules: dept.inheritanceRules || [],
      parentName: dept.parentId ? departments.find(d => d.id === dept.parentId)?.name : undefined,
      childrenCount: departments.filter(d => d.parentId === dept.id).length
    }))
    .sort((a, b) => a.level - b.level)

  console.log(`[VisualizationWorker] Flow data built: ${filtered.length} nodes`)
  return filtered
}

// Matrix data building
function buildMatrixData(departments: Department[], selectedFeature?: number) {
  console.log(`[VisualizationWorker] Building matrix data`)

  const permissions = ['参照', '作成', '編集', '削除', '承認', 'エクスポート']

  const result = {
    departments: departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      effectivePermissions: dept.effectivePermissions || []
    })),
    permissions,
    selectedFeature
  }

  console.log(`[VisualizationWorker] Matrix data built: ${result.departments.length} departments`)
  return result
}

// Effective permissions calculation (complex inheritance logic)
function calculateEffectivePermissions(departmentId: number, departments: Department[]) {
  console.log(`[VisualizationWorker] Calculating effective permissions for department ${departmentId}`)

  // Get department path (from leaf to root)
  const departmentPath = getDepartmentPath(departmentId, departments)

  // Calculate effective permissions based on inheritance rules
  const effectivePermissions = new Map()

  // Process from root to leaf
  departmentPath.reverse().forEach(dept => {
    const deptPermissions = dept.effectivePermissions || []

    deptPermissions.forEach(perm => {
      const key = `${perm.featureId}`

      if (!effectivePermissions.has(key)) {
        // First occurrence (from higher level)
        if (perm.inheritFromParent && dept.id !== departmentId) {
          effectivePermissions.set(key, {
            ...perm,
            source: 'inherited',
            inheritedFrom: dept.name
          })
        } else if (dept.id === departmentId) {
          // Own department permissions
          effectivePermissions.set(key, {
            ...perm,
            source: 'direct'
          })
        }
      } else if (dept.id === departmentId && !perm.inheritFromParent) {
        // Override inherited permission with direct permission
        effectivePermissions.set(key, {
          ...perm,
          source: 'direct'
        })
      }
    })
  })

  const result = Array.from(effectivePermissions.values())
  console.log(`[VisualizationWorker] Calculated ${result.length} effective permissions`)
  return result
}

// Helper functions
function hasDirectPermission(dept: Department, selectedFeature: number): boolean {
  const permission = dept.effectivePermissions?.find(p => p.featureId === selectedFeature)
  return permission?.source === 'direct'
}

function getDepartmentPath(departmentId: number, departments: Department[]): Department[] {
  const path: Department[] = []
  let currentId = departmentId

  while (currentId) {
    const dept = departments.find(d => d.id === currentId)
    if (!dept) break

    path.push(dept)
    currentId = dept.parentId
  }

  return path
}

// Performance monitoring
let startTime = Date.now()
ctx.addEventListener('message', () => {
  startTime = Date.now()
})

// Report performance after each operation
const reportPerformance = (operation: string) => {
  const duration = Date.now() - startTime
  console.log(`[VisualizationWorker] ${operation} completed in ${duration}ms`)
}

export {}