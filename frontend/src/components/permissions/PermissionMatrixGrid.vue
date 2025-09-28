<template>
  <el-card>
    <div class="matrix-container" v-loading="loading">
      <!-- 凡例 -->
      <div class="legend-section">
        <h3>権限記号</h3>
        <div class="legend-items">
          <span v-for="(desc, code) in legend" :key="code" class="legend-item">
            <el-tag size="small">{{ code }}</el-tag>
            <span>{{ desc }}</span>
          </span>
        </div>
      </div>

      <!-- マトリクステーブル -->
      <div class="matrix-table" v-if="matrixData.length > 0">
        <el-table
          :data="matrixData"
          border
          style="width: 100%"
        >
          <!-- 部署名列 -->
          <el-table-column
            prop="departmentName"
            label="部署名"
            fixed="left"
            width="150"
          />

          <!-- 機能列 -->
          <el-table-column
            v-for="feature in visibleFeatures"
            :key="feature.code"
            :label="feature.name"
            width="120"
            align="center"
          >
            <template #header>
              <div class="feature-header">
                <div class="feature-name">{{ feature.name }}</div>
                <div class="feature-code">{{ feature.code }}</div>
              </div>
            </template>
            <template #default="{ row }">
              <div class="permission-cell">
                <span
                  class="permission-display"
                  :class="{
                    'has-permissions': getFeaturePermissions(row, feature.code) !== '-',
                    'no-permissions': getFeaturePermissions(row, feature.code) === '-'
                  }"
                  @click="$emit('edit-permission', row.departmentId, feature)"
                >
                  {{ getFeaturePermissions(row, feature.code) }}
                </span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- データなしの場合 -->
      <div v-else-if="!loading" class="no-data">
        <el-empty description="表示するデータがありません" />
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type { PermissionMatrixData, Feature, Legend } from '@/types/permissions'

interface Props {
  loading?: boolean
  matrixData: PermissionMatrixData[]
  visibleFeatures: Feature[]
  legend: Legend
}

withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits<{
  'edit-permission': [departmentId: number, feature: Feature]
}>()

function getFeaturePermissions(row: PermissionMatrixData, featureCode: string): string {
  const feature = row.features.find(f => f.featureCode === featureCode)
  return feature?.permissions || '-'
}
</script>

<style scoped>
.matrix-container {
  min-height: 400px;
}

.legend-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--el-bg-color-page);
  border-radius: 4px;
}

.legend-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.matrix-table {
  overflow-x: auto;
}

.feature-header {
  text-align: center;
}

.feature-name {
  font-weight: 600;
  font-size: 12px;
  line-height: 1.2;
}

.feature-code {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.permission-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
}

.permission-display {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 40px;
  text-align: center;
  font-family: monospace;
  font-weight: 600;
}

.permission-display.has-permissions {
  background-color: var(--el-color-success-light-8);
  color: var(--el-color-success);
  border: 1px solid var(--el-color-success-light-5);
}

.permission-display.no-permissions {
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color-light);
}

.permission-display:hover {
  background-color: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}

.no-data {
  padding: 40px;
  text-align: center;
}

@media (max-width: 768px) {
  .legend-items {
    flex-direction: column;
    gap: 8px;
  }
}
</style>