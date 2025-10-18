<template>
  <div class="flow-visualization" ref="container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { loadD3, initializeSVG, clearD3Selection, addZoomControls } from './D3Loader'
import type { VisualizationNode, Department, D3Selection } from './VisualizationTypes'

interface Props {
  departments: Department[]
  selectedFeature?: number
  containerWidth: number
  containerHeight: number
}

interface Emits {
  (e: 'node-click', node: VisualizationNode): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Refs
const container = ref<HTMLElement>()

// D3 objects
let d3Selection: D3Selection = {}

// Methods
const buildFlowData = (): VisualizationNode[] => {
  if (!props.selectedFeature) return []

  return props.departments
    .filter(dept => {
      const permission = dept.effectivePermissions?.find(p => p.featureId === props.selectedFeature)
      return permission && (permission.source === 'inherited' || hasDirectPermission(dept))
    })
    .map(dept => ({
      id: dept.id.toString(),
      name: dept.name,
      level: dept.level,
      parentId: dept.parentId?.toString(),
      permissions: dept.effectivePermissions?.filter(p => p.featureId === props.selectedFeature) || [],
      inheritanceRules: dept.inheritanceRules || [],
      parentName: dept.parentId ? props.departments.find(d => d.id === dept.parentId)?.name : undefined,
      childrenCount: props.departments.filter(d => d.parentId === dept.id).length
    }))
    .sort((a, b) => a.level - b.level)
}

const hasDirectPermission = (dept: Department): boolean => {
  if (!props.selectedFeature) return false
  const permission = dept.effectivePermissions?.find(p => p.featureId === props.selectedFeature)
  return permission?.source === 'direct'
}

const hasInheritedPermission = (node: VisualizationNode): boolean => {
  if (!props.selectedFeature) return false
  const permission = node.permissions.find(p => p.featureId === props.selectedFeature)
  return permission?.source === 'inherited'
}

const getPermissionColor = (node: VisualizationNode): string => {
  if (!props.selectedFeature) return '#d9d9d9'

  const permission = node.permissions.find(p => p.featureId === props.selectedFeature)
  if (!permission) return '#ff4d4f'

  const hasAnyPermission = permission.canView || permission.canCreate ||
                          permission.canEdit || permission.canDelete ||
                          permission.canApprove || permission.canExport

  if (hasAnyPermission) {
    return permission.source === 'direct' ? '#52c41a' : '#faad14'
  }
  return '#ff4d4f'
}

const handleNodeClick = (node: VisualizationNode) => {
  emit('node-click', node)
}

const renderFlow = async () => {
  if (!container.value || !props.selectedFeature) return

  await clearD3Selection(container.value)

  const d3 = await loadD3()
  const flowData = buildFlowData()
  const height = Math.max(400, flowData.length * 100)

  d3Selection = await initializeSVG(container.value, props.containerWidth, height)
  const { svg, g, zoom } = d3Selection

  if (!svg || !g || !zoom) return

  // Create flow layout
  const nodeSpacing = props.containerWidth / (flowData.length + 1)

  flowData.forEach((node, index) => {
    node.x = nodeSpacing * (index + 1)
    node.y = height / 2
  })

  // Draw inheritance arrows
  const inheritanceLinks: Array<{ source: VisualizationNode; target: VisualizationNode }> = []
  flowData.forEach(node => {
    const parent = flowData.find(n => n.id === node.parentId)
    if (parent && hasInheritedPermission(node)) {
      inheritanceLinks.push({ source: parent, target: node })
    }
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
  () => renderFlow(),
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
  renderFlow()
})

onUnmounted(() => {
  if (container.value) {
    clearD3Selection(container.value)
  }
})
</script>

<style scoped>
.flow-visualization {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* D3 styles */
:deep(.flow-link) {
  animation: flow 2s ease-in-out infinite;
}

@keyframes flow {
  0%, 100% { stroke-dasharray: 5 5; stroke-dashoffset: 0; }
  50% { stroke-dashoffset: 10; }
}

:deep(.flow-node circle) {
  transition: all 0.3s ease;
}

:deep(.flow-node:hover circle) {
  stroke: #40a9ff !important;
  stroke-width: 3 !important;
}
</style>