<template>
  <div class="visualization-controls">
    <!-- Top Controls -->
    <div class="controls">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-select
            v-model="selectedCompany"
            placeholder="会社を選択"
            @change="handleCompanyChange"
            style="width: 100%"
            :loading="loading.companies"
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
            @change="handleFeatureChange"
            style="width: 100%"
            :loading="loading.features"
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
            @change="handleVisualizationTypeChange"
            style="width: 100%"
          >
            <el-option label="部署階層ツリー" value="tree" />
            <el-option label="継承フロー" value="flow" />
            <el-option label="権限マトリクス" value="matrix" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button @click="handleExport" type="primary" :loading="loading.export">
            <el-icon><Download /></el-icon>
            PNG出力
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- Legend -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import api from '@/api'
import type { Company, Feature, VisualizationType } from './VisualizationTypes'

interface Props {
  modelValue: {
    selectedCompany?: number
    selectedFeature?: number
    visualizationType: VisualizationType
  }
}

interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
  (e: 'company-change', companyId: number): void
  (e: 'feature-change', featureId: number): void
  (e: 'visualization-type-change', type: VisualizationType): void
  (e: 'export'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const selectedCompany = ref<number | undefined>(props.modelValue.selectedCompany)
const selectedFeature = ref<number | undefined>(props.modelValue.selectedFeature)
const visualizationType = ref<VisualizationType>(props.modelValue.visualizationType)
const companies = ref<Company[]>([])
const features = ref<Feature[]>([])
const loading = ref({
  companies: false,
  features: false,
  export: false
})

// Methods
const loadCompanies = async () => {
  try {
    loading.value.companies = true
    const response = await api.get('/api/companies')
    companies.value = response.data.data || []
  } catch (error) {
    ElMessage.error('会社情報の取得に失敗しました')
    console.error('[VisualizationControls] Error loading companies:', error)
  } finally {
    loading.value.companies = false
  }
}

const loadFeatures = async () => {
  try {
    loading.value.features = true
    const response = await api.get('/api/features')
    features.value = response.data.data || []
  } catch (error) {
    ElMessage.error('機能情報の取得に失敗しました')
    console.error('[VisualizationControls] Error loading features:', error)
  } finally {
    loading.value.features = false
  }
}

const updateModelValue = () => {
  emit('update:modelValue', {
    selectedCompany: selectedCompany.value,
    selectedFeature: selectedFeature.value,
    visualizationType: visualizationType.value
  })
}

const handleCompanyChange = () => {
  updateModelValue()
  if (selectedCompany.value) {
    emit('company-change', selectedCompany.value)
  }
}

const handleFeatureChange = () => {
  updateModelValue()
  if (selectedFeature.value) {
    emit('feature-change', selectedFeature.value)
  }
}

const handleVisualizationTypeChange = () => {
  updateModelValue()
  emit('visualization-type-change', visualizationType.value)
}

const handleExport = async () => {
  try {
    loading.value.export = true
    emit('export')
  } catch (error) {
    ElMessage.error('エクスポートに失敗しました')
    console.error('[VisualizationControls] Export error:', error)
  } finally {
    loading.value.export = false
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadCompanies(),
    loadFeatures()
  ])
})
</script>

<style scoped>
.visualization-controls {
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.controls {
  padding: 20px;
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

/* Responsive */
@media (max-width: 768px) {
  .legend-items {
    flex-wrap: wrap;
    gap: 12px;
  }
}
</style>