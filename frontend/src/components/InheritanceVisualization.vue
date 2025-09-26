<template>
  <div class="inheritance-visualization">
    <div class="controls">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-select
            v-model="selectedCompany"
            placeholder="会社を選択"
            @change="loadCompanyData"
            style="width: 100%"
          >
            <el-option
              v-for="company in companies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="selectedFeature"
            placeholder="機能を選択"
            @change="updateVisualization"
            style="width: 100%"
          >
            <el-option
              v-for="feature in features"
              :key="feature.id"
              :label="feature.name"
              :value="feature.id"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="visualizationType"
            @change="updateVisualization"
            style="width: 100%"
          >
            <el-option label="部署階層ツリー" value="tree" />
            <el-option label="継承フロー" value="flow" />
            <el-option label="権限マトリクス" value="matrix" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button @click="exportVisualization" type="primary">
            <el-icon><Download /></el-icon>
            PNG出力
          </el-button>
        </el-col>
      </el-row>
    </div>

    <div class="legend" v-if="visualizationType === 'tree' || visualizationType === 'flow'">
      <el-card shadow="never" class="legend-card">
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-color direct"></div>
            <span>直接権限</span>
          </div>
          <div class="legend-item">
            <div class="legend-color inherited"></div>
            <span>継承権限</span>
          </div>
          <div class="legend-item">
            <div class="legend-color none"></div>
            <span>権限なし</span>
          </div>
          <div class="legend-item">
            <div class="legend-color conflict"></div>
            <span>権限競合</span>
          </div>
        </div>
      </el-card>
    </div>

    <div class="visualization-container">
      <div
        ref="chartContainer"
        class="chart-container"
        v-loading="loading"
        element-loading-text="可視化データを読み込み中..."
      ></div>
    </div>

    <div class="info-panel" v-if="selectedNode">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>{{ selectedNode.name }} の権限詳細</span>
            <el-button @click="selectedNode = null" type="text">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </template>

        <div class="node-details">
          <div class="detail-section">
            <h4>基本情報</h4>
            <el-descriptions :column="2" size="small">
              <el-descriptions-item label="部署名">{{ selectedNode.name }}</el-descriptions-item>
              <el-descriptions-item label="階層レベル">{{ selectedNode.level }}</el-descriptions-item>
              <el-descriptions-item label="親部署">
                {{ selectedNode.parentName || 'トップレベル' }}
              </el-descriptions-item>
              <el-descriptions-item label="子部署数">{{ selectedNode.childrenCount }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="detail-section" v-if="selectedFeature">
            <h4>{{ getFeatureName(selectedFeature) }} の権限</h4>
            <div class="permission-grid">
              <div
                v-for="permission in selectedNode.permissions"
                :key="permission.type"
                class="permission-item"
                :class="{ active: permission.enabled }"
              >
                <el-icon>
                  <component :is="getPermissionIcon(permission.type)" />
                </el-icon>
                <span>{{ permission.label }}</span>
                <el-tag
                  :type="permission.source === 'direct' ? 'primary' : 'warning'"
                  size="small"
                >
                  {{ permission.source === 'direct' ? '直接' : '継承' }}
                </el-tag>
              </div>
            </div>
          </div>

          <div class="detail-section" v-if="selectedNode.inheritanceRules">
            <h4>継承ルール</h4>
            <el-table :data="selectedNode.inheritanceRules" size="small">
              <el-table-column prop="featureName" label="機能" width="120" />
              <el-table-column prop="inheritType" label="継承タイプ" width="100">
                <template #default="{ row }">
                  <el-tag
                    :type="row.inheritType === 'ALL' ? 'success' :
                           row.inheritType === 'PARTIAL' ? 'warning' : 'info'"
                    size="small"
                  >
                    {{ row.inheritType }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="priority" label="優先度" width="80" />
            </el-table>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Close, View, Edit, Delete, Plus, Check, Upload } from '@element-plus/icons-vue'
import * as d3 from 'd3'
import api from '@/api'

interface Department {
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

interface Company {
  id: number
  name: string
}

interface Feature {
  id: number
  name: string
  code: string
}

interface VisualizationNode {
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

// Props & Emits
interface Props {
  initialCompanyId?: number
  initialFeatureId?: number
}

const props = withDefaults(defineProps<Props>(), {
  initialCompanyId: undefined,
  initialFeatureId: undefined
})

// State
const selectedCompany = ref<number | undefined>(props.initialCompanyId)
const selectedFeature = ref<number | undefined>(props.initialFeatureId)
const visualizationType = ref<'tree' | 'flow' | 'matrix'>('tree')
const companies = ref<Company[]>([])
const features = ref<Feature[]>([])
const departments = ref<Department[]>([])
const selectedNode = ref<VisualizationNode | null>(null)
const loading = ref(false)

// Refs
const chartContainer = ref<HTMLElement>()

// D3 variables
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
let g: d3.Selection<SVGGElement, unknown, null, undefined>
let zoom: d3.ZoomBehavior<SVGSVGElement, unknown>

// Constants
const NODE_WIDTH = 200
const NODE_HEIGHT = 80
const LEVEL_HEIGHT = 120

// Computed
const getFeatureName = computed(() => (featureId: number) => {
  const feature = features.value.find(f => f.id === featureId)
  return feature ? feature.name : 'Unknown'
})

// Methods
const loadCompanies = async () => {
  try {
    const response = await api.get('/api/companies')
    companies.value = response.data.data || []
  } catch (error) {
    ElMessage.error('会社情報の取得に失敗しました')
    console.error(error)
  }
}

const loadFeatures = async () => {
  try {
    const response = await api.get('/api/features')
    features.value = response.data.data || []
  } catch (error) {
    ElMessage.error('機能情報の取得に失敗しました')
    console.error(error)
  }
}

const loadCompanyData = async () => {
  if (!selectedCompany.value) return

  try {
    loading.value = true
    const response = await api.get(`/api/permissions/inheritance/visualization/${selectedCompany.value}`)
    departments.value = response.data.data.departments || []

    await updateVisualization()
  } catch (error) {
    ElMessage.error('継承データの取得に失敗しました')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const updateVisualization = async () => {
  if (!chartContainer.value || !selectedCompany.value) return

  await nextTick()
  clearVisualization()

  switch (visualizationType.value) {
    case 'tree':
      await renderTreeVisualization()
      break
    case 'flow':
      await renderFlowVisualization()
      break
    case 'matrix':
      await renderMatrixVisualization()
      break
  }
}

const clearVisualization = () => {
  if (chartContainer.value) {
    d3.select(chartContainer.value).selectAll('*').remove()
  }
  selectedNode.value = null
}

const initializeSVG = (width: number, height: number) => {
  svg = d3.select(chartContainer.value!)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)

  // ズーム機能を追加
  zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 3])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)

  g = svg.append('g')

  // 背景をクリックで選択解除
  svg.on('click', (event) => {
    if (event.target === svg.node()) {
      selectedNode.value = null
    }
  })
}

const renderTreeVisualization = async () => {
  const containerWidth = chartContainer.value!.clientWidth
  const treeData = buildTreeData()

  if (!treeData.length) return

  const maxDepth = d3.max(treeData, d => getMaxDepth(d)) || 0
  const height = (maxDepth + 1) * LEVEL_HEIGHT + 100

  initializeSVG(containerWidth, height)

  // D3 tree layout
  const tree = d3.tree<VisualizationNode>()
    .size([containerWidth - 100, height - 100])

  const root = d3.hierarchy(treeData[0])
  tree(root)

  // Links (connections between nodes)
  const links = g.selectAll('.link')
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', '#ddd')
    .attr('stroke-width', 2)
    .attr('d', d3.linkVertical()
      .x(d => d.x!)
      .y(d => d.y!)
    )

  // Nodes
  const nodes = g.selectAll('.node')
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation()
      handleNodeClick(d.data)
    })

  // Node backgrounds
  nodes.append('rect')
    .attr('x', -NODE_WIDTH / 2)
    .attr('y', -NODE_HEIGHT / 2)
    .attr('width', NODE_WIDTH)
    .attr('height', NODE_HEIGHT)
    .attr('rx', 8)
    .attr('fill', d => getNodeColor(d.data))
    .attr('stroke', '#333')
    .attr('stroke-width', 1)

  // Node labels
  nodes.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .text(d => d.data.name)
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#333')

  // Permission indicators
  if (selectedFeature.value) {
    nodes.append('circle')
      .attr('cx', NODE_WIDTH / 2 - 20)
      .attr('cy', -NODE_HEIGHT / 2 + 20)
      .attr('r', 8)
      .attr('fill', d => getPermissionColor(d.data))
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
  }

  // Add zoom controls
  addZoomControls()
}

const renderFlowVisualization = async () => {
  if (!selectedFeature.value) {
    ElMessage.warning('フロー表示には機能を選択してください')
    return
  }

  const containerWidth = chartContainer.value!.clientWidth
  const flowData = buildFlowData()
  const height = Math.max(400, flowData.length * 100)

  initializeSVG(containerWidth, height)

  // Create flow layout
  const nodeSpacing = containerWidth / (flowData.length + 1)

  flowData.forEach((node, index) => {
    node.x = nodeSpacing * (index + 1)
    node.y = height / 2
  })

  // Draw inheritance arrows
  const inheritanceLinks = []
  flowData.forEach(node => {
    const parent = flowData.find(n => n.id === node.parentId)
    if (parent && hasInheritedPermission(node)) {
      inheritanceLinks.push({ source: parent, target: node })
    }
  })

  // Arrows
  g.selectAll('.flow-link')
    .data(inheritanceLinks)
    .enter()
    .append('path')
    .attr('class', 'flow-link')
    .attr('fill', 'none')
    .attr('stroke', '#f56c6c')
    .attr('stroke-width', 3)
    .attr('marker-end', 'url(#arrowhead)')
    .attr('d', d => {
      const dx = d.target.x! - d.source.x!
      const dy = d.target.y! - d.source.y!
      return `M${d.source.x},${d.source.y} Q${d.source.x! + dx/2},${d.source.y! - 50} ${d.target.x},${d.target.y}`
    })

  // Arrow markers
  svg.append('defs')
    .append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#f56c6c')

  // Nodes
  const nodes = g.selectAll('.flow-node')
    .data(flowData)
    .enter()
    .append('g')
    .attr('class', 'flow-node')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation()
      handleNodeClick(d)
    })

  // Node circles
  nodes.append('circle')
    .attr('r', 30)
    .attr('fill', d => getPermissionColor(d))
    .attr('stroke', '#333')
    .attr('stroke-width', 2)

  // Node labels
  nodes.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', 50)
    .text(d => d.name)
    .style('font-size', '12px')
    .style('font-weight', 'bold')

  addZoomControls()
}

const renderMatrixVisualization = async () => {
  if (!selectedFeature.value) {
    ElMessage.warning('マトリクス表示には機能を選択してください')
    return
  }

  const containerWidth = chartContainer.value!.clientWidth
  const matrixData = buildMatrixData()
  const height = matrixData.departments.length * 60 + 150

  initializeSVG(containerWidth, height)

  const cellWidth = Math.min(80, (containerWidth - 200) / matrixData.permissions.length)
  const cellHeight = 50

  // Header (permission types)
  const header = g.append('g')
    .attr('class', 'matrix-header')
    .attr('transform', 'translate(200, 50)')

  header.selectAll('.header-cell')
    .data(matrixData.permissions)
    .enter()
    .append('g')
    .attr('class', 'header-cell')
    .attr('transform', (d, i) => `translate(${i * cellWidth}, 0)`)
    .call(g => {
      g.append('rect')
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('fill', '#f5f5f5')
        .attr('stroke', '#ddd')

      g.append('text')
        .attr('x', cellWidth / 2)
        .attr('y', cellHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .text(d => d)
        .style('font-size', '10px')
        .style('font-weight', 'bold')
    })

  // Rows (departments)
  const rows = g.selectAll('.matrix-row')
    .data(matrixData.departments)
    .enter()
    .append('g')
    .attr('class', 'matrix-row')
    .attr('transform', (d, i) => `translate(0, ${50 + (i + 1) * cellHeight})`)

  // Department labels
  rows.append('rect')
    .attr('width', 200)
    .attr('height', cellHeight)
    .attr('fill', '#f9f9f9')
    .attr('stroke', '#ddd')

  rows.append('text')
    .attr('x', 10)
    .attr('y', cellHeight / 2)
    .attr('dy', '0.3em')
    .text(d => d.name)
    .style('font-size', '12px')
    .style('font-weight', 'bold')

  // Permission cells
  rows.each(function(dept, deptIndex) {
    const row = d3.select(this)

    row.selectAll('.permission-cell')
      .data(matrixData.permissions)
      .enter()
      .append('g')
      .attr('class', 'permission-cell')
      .attr('transform', (d, i) => `translate(${200 + i * cellWidth}, 0)`)
      .call(g => {
        g.append('rect')
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .attr('fill', (permType) => {
            const hasPermission = hasPermissionForDepartment(dept, permType)
            return hasPermission ? getPermissionTypeColor(permType) : '#fff'
          })
          .attr('stroke', '#ddd')
          .style('cursor', 'pointer')
          .on('click', (event, permType) => {
            handleMatrixCellClick(dept, permType)
          })

        g.append('text')
          .attr('x', cellWidth / 2)
          .attr('y', cellHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dy', '0.3em')
          .text((permType) => {
            return hasPermissionForDepartment(dept, permType) ? '✓' : ''
          })
          .style('font-size', '16px')
          .style('font-weight', 'bold')
          .style('fill', '#fff')
      })
  })

  addZoomControls()
}

const buildTreeData = (): VisualizationNode[] => {
  const nodeMap = new Map<number, VisualizationNode>()

  // Convert departments to visualization nodes
  departments.value.forEach(dept => {
    const permissions = selectedFeature.value
      ? (dept.effectivePermissions || []).filter(p => p.featureId === selectedFeature.value)
      : []

    nodeMap.set(dept.id, {
      id: dept.id.toString(),
      name: dept.name,
      level: dept.level,
      parentId: dept.parentId?.toString(),
      permissions: permissions,
      inheritanceRules: dept.inheritanceRules || [],
      children: [],
      parentName: dept.parentId ? departments.value.find(d => d.id === dept.parentId)?.name : undefined,
      childrenCount: departments.value.filter(d => d.parentId === dept.id).length
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

  return tree
}

const buildFlowData = (): VisualizationNode[] => {
  if (!selectedFeature.value) return []

  return departments.value
    .filter(dept => {
      const permission = dept.effectivePermissions?.find(p => p.featureId === selectedFeature.value)
      return permission && (permission.source === 'inherited' || hasDirectPermission(dept))
    })
    .map(dept => ({
      id: dept.id.toString(),
      name: dept.name,
      level: dept.level,
      parentId: dept.parentId?.toString(),
      permissions: dept.effectivePermissions?.filter(p => p.featureId === selectedFeature.value) || [],
      inheritanceRules: dept.inheritanceRules || [],
      parentName: dept.parentId ? departments.value.find(d => d.id === dept.parentId)?.name : undefined,
      childrenCount: departments.value.filter(d => d.parentId === dept.id).length
    }))
    .sort((a, b) => a.level - b.level)
}

const buildMatrixData = () => {
  const permissions = ['参照', '作成', '編集', '削除', '承認', 'エクスポート']

  return {
    departments: departments.value.map(dept => ({
      id: dept.id,
      name: dept.name,
      effectivePermissions: dept.effectivePermissions || []
    })),
    permissions
  }
}

// Helper functions
const getMaxDepth = (node: VisualizationNode): number => {
  if (!node.children || node.children.length === 0) {
    return node.level
  }
  return Math.max(...node.children.map(child => getMaxDepth(child)))
}

const getNodeColor = (node: VisualizationNode): string => {
  if (!selectedFeature.value) return '#e6f7ff'

  const permission = node.permissions.find(p => p.featureId === selectedFeature.value)
  if (!permission) return '#f5f5f5'

  if (permission.source === 'direct') return '#52c41a'
  if (permission.source === 'inherited') return '#faad14'
  return '#f5f5f5'
}

const getPermissionColor = (node: VisualizationNode): string => {
  if (!selectedFeature.value) return '#d9d9d9'

  const permission = node.permissions.find(p => p.featureId === selectedFeature.value)
  if (!permission) return '#ff4d4f'

  const hasAnyPermission = permission.canView || permission.canCreate ||
                          permission.canEdit || permission.canDelete ||
                          permission.canApprove || permission.canExport

  if (hasAnyPermission) {
    return permission.source === 'direct' ? '#52c41a' : '#faad14'
  }
  return '#ff4d4f'
}

const getPermissionTypeColor = (permissionType: string): string => {
  const colors = {
    '参照': '#52c41a',
    '作成': '#1890ff',
    '編集': '#faad14',
    '削除': '#ff4d4f',
    '承認': '#722ed1',
    'エクスポート': '#13c2c2'
  }
  return colors[permissionType] || '#d9d9d9'
}

const hasInheritedPermission = (node: VisualizationNode): boolean => {
  if (!selectedFeature.value) return false
  const permission = node.permissions.find(p => p.featureId === selectedFeature.value)
  return permission?.source === 'inherited'
}

const hasDirectPermission = (dept: Department): boolean => {
  if (!selectedFeature.value) return false
  const permission = dept.effectivePermissions?.find(p => p.featureId === selectedFeature.value)
  return permission?.source === 'direct'
}

const hasPermissionForDepartment = (dept: any, permissionType: string): boolean => {
  if (!selectedFeature.value) return false

  const permission = dept.effectivePermissions.find(p => p.featureId === selectedFeature.value)
  if (!permission) return false

  const permissionMap = {
    '参照': permission.canView,
    '作成': permission.canCreate,
    '編集': permission.canEdit,
    '削除': permission.canDelete,
    '承認': permission.canApprove,
    'エクスポート': permission.canExport
  }

  return permissionMap[permissionType] || false
}

const handleNodeClick = (node: VisualizationNode) => {
  selectedNode.value = node
}

const handleMatrixCellClick = (dept: any, permissionType: string) => {
  // TODO: Implement permission editing
  ElMessage.info(`${dept.name} の ${permissionType} 権限をクリックしました`)
}

const getPermissionIcon = (type: string) => {
  const icons = {
    'view': View,
    'create': Plus,
    'edit': Edit,
    'delete': Delete,
    'approve': Check,
    'export': Upload
  }
  return icons[type] || View
}

const addZoomControls = () => {
  const controls = svg.append('g')
    .attr('class', 'zoom-controls')
    .attr('transform', 'translate(20, 20)')

  // Zoom in button
  controls.append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 20)
    .attr('fill', '#fff')
    .attr('stroke', '#ddd')
    .style('cursor', 'pointer')
    .on('click', () => {
      svg.transition().call(zoom.scaleBy, 1.5)
    })

  controls.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .text('+')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .style('pointer-events', 'none')

  // Zoom out button
  controls.append('circle')
    .attr('cx', 0)
    .attr('cy', 50)
    .attr('r', 20)
    .attr('fill', '#fff')
    .attr('stroke', '#ddd')
    .style('cursor', 'pointer')
    .on('click', () => {
      svg.transition().call(zoom.scaleBy, 0.67)
    })

  controls.append('text')
    .attr('x', 0)
    .attr('y', 50)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .text('−')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .style('pointer-events', 'none')

  // Reset button
  controls.append('circle')
    .attr('cx', 0)
    .attr('cy', 100)
    .attr('r', 20)
    .attr('fill', '#fff')
    .attr('stroke', '#ddd')
    .style('cursor', 'pointer')
    .on('click', () => {
      svg.transition().call(zoom.transform, d3.zoomIdentity)
    })

  controls.append('text')
    .attr('x', 0)
    .attr('y', 100)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .text('○')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('pointer-events', 'none')
}

const exportVisualization = () => {
  if (!svg) {
    ElMessage.warning('可視化データがありません')
    return
  }

  // SVGをPNGとしてエクスポート
  const svgElement = svg.node()!
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!

  const svgString = new XMLSerializer().serializeToString(svgElement)
  const img = new Image()

  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    context.drawImage(img, 0, 0)

    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `inheritance-visualization-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    })
  }

  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadCompanies(),
    loadFeatures()
  ])

  if (selectedCompany.value) {
    await loadCompanyData()
  }
})
</script>

<style scoped>
.inheritance-visualization {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.controls {
  padding: 20px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.legend {
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.legend-card {
  border: none;
  box-shadow: none;
}

.legend-items {
  display: flex;
  gap: 24px;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #ddd;
}

.legend-color.direct {
  background: #52c41a;
}

.legend-color.inherited {
  background: #faad14;
}

.legend-color.none {
  background: #ff4d4f;
}

.legend-color.conflict {
  background: linear-gradient(45deg, #ff4d4f 50%, #faad14 50%);
}

.visualization-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.chart-container {
  width: 100%;
  height: 100%;
  background: #fff;
}

.info-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 400px;
  max-height: 80%;
  overflow-y: auto;
  z-index: 1000;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-details {
  max-height: 500px;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  font-size: 12px;
}

.permission-item.active {
  background: #f6ffed;
  border-color: #b7eb8f;
}

/* D3 styles */
:deep(.link) {
  transition: stroke 0.3s ease;
}

:deep(.link:hover) {
  stroke: #40a9ff !important;
  stroke-width: 3 !important;
}

:deep(.node) {
  transition: all 0.3s ease;
}

:deep(.node:hover rect) {
  stroke: #40a9ff !important;
  stroke-width: 2 !important;
}

:deep(.flow-link) {
  animation: flow 2s ease-in-out infinite;
}

@keyframes flow {
  0%, 100% { stroke-dasharray: 5 5; stroke-dashoffset: 0; }
  50% { stroke-dashoffset: 10; }
}

:deep(.matrix-row:hover rect) {
  fill: #e6f7ff !important;
}

:deep(.permission-cell:hover rect) {
  stroke: #40a9ff !important;
  stroke-width: 2 !important;
}

/* Responsive */
@media (max-width: 1200px) {
  .info-panel {
    width: 300px;
  }
}

@media (max-width: 768px) {
  .info-panel {
    position: static;
    width: 100%;
    margin-top: 20px;
  }

  .legend-items {
    flex-wrap: wrap;
    gap: 12px;
  }
}
</style>