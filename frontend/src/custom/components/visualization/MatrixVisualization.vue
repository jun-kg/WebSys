<template>
  <div class="matrix-visualization" ref="container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { loadD3, initializeSVG, clearD3Selection, addZoomControls } from './D3Loader'
import type { VisualizationNode, Department, MatrixData, D3Selection } from './VisualizationTypes'

interface Props {
  departments: Department[]
  selectedFeature?: number
  containerWidth: number
  containerHeight: number
}

interface Emits {
  (e: 'cell-click', dept: any, permissionType: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Refs
const container = ref<HTMLElement>()

// D3 objects
let d3Selection: D3Selection = {}

// Methods
const buildMatrixData = (): MatrixData => {
  const permissions = ['参照', '作成', '編集', '削除', '承認', 'エクスポート']

  return {
    departments: props.departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      effectivePermissions: dept.effectivePermissions || []
    })),
    permissions
  }
}

const hasPermissionForDepartment = (dept: any, permissionType: string): boolean => {
  if (!props.selectedFeature) return false

  const permission = dept.effectivePermissions.find(p => p.featureId === props.selectedFeature)
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

const handleMatrixCellClick = (dept: any, permissionType: string) => {
  emit('cell-click', dept, permissionType)
}

const renderMatrix = async () => {
  if (!container.value || !props.selectedFeature) {
    if (!props.selectedFeature) {
      ElMessage.warning('マトリクス表示には機能を選択してください')
    }
    return
  }

  await clearD3Selection(container.value)

  const d3 = await loadD3()
  const matrixData = buildMatrixData()
  const height = matrixData.departments.length * 60 + 150

  d3Selection = await initializeSVG(container.value, props.containerWidth, height)
  const { svg, g, zoom } = d3Selection

  if (!svg || !g || !zoom) return

  const cellWidth = Math.min(80, (props.containerWidth - 200) / matrixData.permissions.length)
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

  // Background click to clear selection
  svg.on('click', (event) => {
    if (event.target === svg.node()) {
      // Clear selection logic can be handled by parent
    }
  })

  await addZoomControls(svg, zoom)
}

// Watchers
watch(() => [props.departments, props.selectedFeature, props.containerWidth],
  () => renderMatrix(),
  { deep: true }
)

// Public methods for parent component
const getSVG = () => {
  return d3Selection.svg
}

// Expose methods to parent
defineExpose({
  getSVG
})

// Lifecycle
onMounted(() => {
  renderMatrix()
})

onUnmounted(() => {
  if (container.value) {
    clearD3Selection(container.value)
  }
})
</script>

<style scoped>
.matrix-visualization {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* D3 styles */
:deep(.matrix-row:hover rect) {
  fill: #e6f7ff !important;
}

:deep(.permission-cell:hover rect) {
  stroke: #40a9ff !important;
  stroke-width: 2 !important;
}

:deep(.permission-cell rect) {
  transition: all 0.3s ease;
}
</style>