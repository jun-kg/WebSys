<template>
  <div class="inheritance-visualization">
    <!-- Controls Component -->
    <VisualizationControls
      v-model="controlsState"
      @company-change="handleCompanyChange"
      @feature-change="handleFeatureChange"
      @visualization-type-change="handleVisualizationTypeChange"
      @export="handleExport"
    />

    <!-- Main Visualization Container -->
    <div class="visualization-container">
      <div
        ref="chartContainer"
        class="chart-container"
        v-loading="loading"
        element-loading-text="可視化データを読み込み中..."
      >
        <!-- Dynamic Visualization Components (Lazy Loaded) -->
        <Suspense>
          <template #default>
            <TreeVisualization
              v-if="controlsState.visualizationType === 'tree'"
              :departments="departments"
              :selected-feature="controlsState.selectedFeature"
              :container-width="containerDimensions.width"
              :container-height="containerDimensions.height"
              @node-click="handleNodeClick"
              ref="treeVisualizationRef"
            />
            <FlowVisualization
              v-else-if="controlsState.visualizationType === 'flow'"
              :departments="departments"
              :selected-feature="controlsState.selectedFeature"
              :container-width="containerDimensions.width"
              :container-height="containerDimensions.height"
              @node-click="handleNodeClick"
              ref="flowVisualizationRef"
            />
            <MatrixVisualization
              v-else-if="controlsState.visualizationType === 'matrix'"
              :departments="departments"
              :selected-feature="controlsState.selectedFeature"
              :container-width="containerDimensions.width"
              :container-height="containerDimensions.height"
              @cell-click="handleMatrixCellClick"
              ref="matrixVisualizationRef"
            />
          </template>
          <template #fallback>
            <div class="loading-fallback">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>可視化コンポーネントを読み込み中...</span>
            </div>
          </template>
        </Suspense>
      </div>
    </div>

    <!-- Node Details Panel -->
    <NodeDetailsPanel
      :selected-node="selectedNode"
      :selected-feature="controlsState.selectedFeature"
      :features="features"
      @close="selectedNode = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, reactive, defineAsyncComponent } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { useResizeObserver } from '@vueuse/core'
import api from '@/api'
import { exportSVGToPNG } from './visualization/D3Loader'

// Lazy loaded components with dynamic imports
import VisualizationControls from './visualization/VisualizationControls.vue'
import NodeDetailsPanel from './visualization/NodeDetailsPanel.vue'

// Dynamic imports for heavy D3 components (lazy loading)
const TreeVisualization = defineAsyncComponent(() =>
  import('./visualization/TreeVisualization.vue')
)
const FlowVisualization = defineAsyncComponent(() =>
  import('./visualization/FlowVisualization.vue')
)
const MatrixVisualization = defineAsyncComponent(() =>
  import('./visualization/MatrixVisualization.vue')
)

import type {
  Department,
  Feature,
  VisualizationNode,
  VisualizationType
} from './visualization/VisualizationTypes'

// Props
interface Props {
  initialCompanyId?: number
  initialFeatureId?: number
}

const props = withDefaults(defineProps<Props>(), {
  initialCompanyId: undefined,
  initialFeatureId: undefined
})

// State
const controlsState = reactive({
  selectedCompany: props.initialCompanyId,
  selectedFeature: props.initialFeatureId,
  visualizationType: 'tree' as VisualizationType
})

const departments = ref<Department[]>([])
const features = ref<Feature[]>([])
const selectedNode = ref<VisualizationNode | null>(null)
const loading = ref(false)
const containerDimensions = reactive({
  width: 800,
  height: 600
})

// Refs
const chartContainer = ref<HTMLElement>()
const treeVisualizationRef = ref()
const flowVisualizationRef = ref()
const matrixVisualizationRef = ref()

// Methods
const loadCompanyData = async () => {
  if (!controlsState.selectedCompany) return

  try {
    loading.value = true
    console.log(`[InheritanceVisualization] Loading data for company ${controlsState.selectedCompany}`)

    const response = await api.get(`/api/permissions/inheritance/visualization/${controlsState.selectedCompany}`)
    departments.value = response.data.data.departments || []

    console.log(`[InheritanceVisualization] Loaded ${departments.value.length} departments`)
  } catch (error) {
    ElMessage.error('継承データの取得に失敗しました')
    console.error('[InheritanceVisualization] Error loading company data:', error)
  } finally {
    loading.value = false
  }
}

const updateContainerDimensions = () => {
  if (chartContainer.value) {
    const rect = chartContainer.value.getBoundingClientRect()
    containerDimensions.width = rect.width || 800
    containerDimensions.height = rect.height || 600
  }
}

// Event Handlers
const handleCompanyChange = async () => {
  await loadCompanyData()
  selectedNode.value = null
}

const handleFeatureChange = () => {
  selectedNode.value = null
}

const handleVisualizationTypeChange = () => {
  selectedNode.value = null
}

const handleNodeClick = (node: VisualizationNode) => {
  selectedNode.value = node
  console.log(`[InheritanceVisualization] Node clicked:`, node.name)
}

const handleMatrixCellClick = (dept: any, permissionType: string) => {
  ElMessage.info(`${dept.name} の ${permissionType} 権限をクリックしました`)
}

const handleExport = async () => {
  try {
    const currentVisualization =
      treeVisualizationRef.value ||
      flowVisualizationRef.value ||
      matrixVisualizationRef.value

    if (!currentVisualization) {
      ElMessage.warning('可視化データがありません')
      return
    }

    // Each visualization component should expose getSVG method
    const svg = currentVisualization.getSVG?.()
    if (svg) {
      await exportSVGToPNG(svg)
      ElMessage.success('可視化データをエクスポートしました')
    } else {
      ElMessage.warning('エクスポート可能な可視化データがありません')
    }
  } catch (error) {
    console.error('[InheritanceVisualization] Export error:', error)
    ElMessage.error('エクスポートに失敗しました')
  }
}

// Resize Observer
useResizeObserver(chartContainer, () => {
  nextTick(() => {
    updateContainerDimensions()
  })
})

// Lifecycle
onMounted(async () => {
  updateContainerDimensions()

  if (controlsState.selectedCompany) {
    await loadCompanyData()
  }
})

onUnmounted(() => {
  // Cleanup will be handled by individual components
})
</script>

<style scoped>
.inheritance-visualization {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
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

.loading-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
  gap: 12px;
}

.loading-fallback .el-icon {
  font-size: 24px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .inheritance-visualization {
    height: calc(100vh - 60px);
  }
}
</style>