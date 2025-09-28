<template>
  <div class="tree-visualization" ref="container"></div>
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

// Constants
const NODE_WIDTH = 200
const NODE_HEIGHT = 80
const LEVEL_HEIGHT = 120

// Methods
const buildTreeData = (): VisualizationNode[] => {
  const nodeMap = new Map<number, VisualizationNode>()

  // Convert departments to visualization nodes
  props.departments.forEach(dept => {
    const permissions = props.selectedFeature
      ? (dept.effectivePermissions || []).filter(p => p.featureId === props.selectedFeature)
      : []

    nodeMap.set(dept.id, {
      id: dept.id.toString(),
      name: dept.name,
      level: dept.level,
      parentId: dept.parentId?.toString(),
      permissions: permissions,
      inheritanceRules: dept.inheritanceRules || [],
      children: [],
      parentName: dept.parentId ? props.departments.find(d => d.id === dept.parentId)?.name : undefined,
      childrenCount: props.departments.filter(d => d.parentId === dept.id).length
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

const getMaxDepth = (node: VisualizationNode): number => {
  if (!node.children || node.children.length === 0) {
    return node.level
  }
  return Math.max(...node.children.map(child => getMaxDepth(child)))
}

const getNodeColor = (node: VisualizationNode): string => {
  if (!props.selectedFeature) return '#e6f7ff'

  const permission = node.permissions.find(p => p.featureId === props.selectedFeature)
  if (!permission) return '#f5f5f5'

  if (permission.source === 'direct') return '#52c41a'
  if (permission.source === 'inherited') return '#faad14'
  return '#f5f5f5'
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

const renderTree = async () => {
  if (!container.value) return

  await clearD3Selection(container.value)

  const treeData = buildTreeData()
  if (!treeData.length) return

  const d3 = await loadD3()
  const maxDepth = d3.max(treeData, d => getMaxDepth(d)) || 0
  const height = (maxDepth + 1) * LEVEL_HEIGHT + 100

  d3Selection = await initializeSVG(container.value, props.containerWidth, height)
  const { svg, g, zoom } = d3Selection

  if (!svg || !g || !zoom) return

  // D3 tree layout
  const tree = d3.tree<VisualizationNode>()
    .size([props.containerWidth - 100, height - 100])

  const root = d3.hierarchy(treeData[0])
  tree(root)

  // Links (connections between nodes)
  g.selectAll('.link')
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
  if (props.selectedFeature) {
    nodes.append('circle')
      .attr('cx', NODE_WIDTH / 2 - 20)
      .attr('cy', -NODE_HEIGHT / 2 + 20)
      .attr('r', 8)
      .attr('fill', d => getPermissionColor(d.data))
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
  }

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
  () => renderTree(),
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
  renderTree()
})

onUnmounted(() => {
  if (container.value) {
    clearD3Selection(container.value)
  }
})
</script>

<style scoped>
.tree-visualization {
  width: 100%;
  height: 100%;
  overflow: hidden;
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
</style>