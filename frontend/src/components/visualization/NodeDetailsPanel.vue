<template>
  <div class="node-details-panel" v-if="selectedNode">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>{{ selectedNode.name }} の権限詳細</span>
          <el-button @click="handleClose" type="text">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </template>

      <div class="node-details">
        <!-- 基本情報 -->
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

        <!-- 権限詳細 -->
        <div class="detail-section" v-if="selectedFeature">
          <h4>{{ getFeatureName(selectedFeature) }} の権限</h4>
          <div class="permission-grid">
            <div
              v-for="permission in formattedPermissions"
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

        <!-- 継承ルール -->
        <div class="detail-section" v-if="selectedNode.inheritanceRules && selectedNode.inheritanceRules.length > 0">
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

        <!-- 権限統計 -->
        <div class="detail-section" v-if="permissionStats">
          <h4>権限統計</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ permissionStats.totalPermissions }}</div>
              <div class="stat-label">総権限数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ permissionStats.directPermissions }}</div>
              <div class="stat-label">直接権限</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ permissionStats.inheritedPermissions }}</div>
              <div class="stat-label">継承権限</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ Math.round(permissionStats.coveragePercentage) }}%</div>
              <div class="stat-label">権限カバー率</div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Close, View, Edit, Delete, Plus, Check, Upload } from '@element-plus/icons-vue'
import type { VisualizationNode, Feature } from './VisualizationTypes'

interface Props {
  selectedNode: VisualizationNode | null
  selectedFeature?: number
  features: Feature[]
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Computed
const getFeatureName = computed(() => (featureId: number) => {
  const feature = props.features.find(f => f.id === featureId)
  return feature ? feature.name : 'Unknown'
})

const formattedPermissions = computed(() => {
  if (!props.selectedNode || !props.selectedFeature) return []

  const permission = props.selectedNode.permissions.find(p => p.featureId === props.selectedFeature)
  if (!permission) return []

  return [
    {
      type: 'view',
      label: '参照',
      enabled: permission.canView,
      source: permission.source || 'direct'
    },
    {
      type: 'create',
      label: '作成',
      enabled: permission.canCreate,
      source: permission.source || 'direct'
    },
    {
      type: 'edit',
      label: '編集',
      enabled: permission.canEdit,
      source: permission.source || 'direct'
    },
    {
      type: 'delete',
      label: '削除',
      enabled: permission.canDelete,
      source: permission.source || 'direct'
    },
    {
      type: 'approve',
      label: '承認',
      enabled: permission.canApprove,
      source: permission.source || 'direct'
    },
    {
      type: 'export',
      label: 'エクスポート',
      enabled: permission.canExport,
      source: permission.source || 'direct'
    }
  ]
})

const permissionStats = computed(() => {
  if (!props.selectedNode || !props.selectedFeature) return null

  const permissions = formattedPermissions.value
  const totalPermissions = permissions.length
  const enabledPermissions = permissions.filter(p => p.enabled).length
  const directPermissions = permissions.filter(p => p.enabled && p.source === 'direct').length
  const inheritedPermissions = permissions.filter(p => p.enabled && p.source === 'inherited').length
  const coveragePercentage = totalPermissions > 0 ? (enabledPermissions / totalPermissions) * 100 : 0

  return {
    totalPermissions: enabledPermissions,
    directPermissions,
    inheritedPermissions,
    coveragePercentage
  }
})

// Methods
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

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
.node-details-panel {
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
  transition: all 0.3s ease;
}

.permission-item.active {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #1890ff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

/* Responsive */
@media (max-width: 1200px) {
  .node-details-panel {
    width: 300px;
  }
}

@media (max-width: 768px) {
  .node-details-panel {
    position: static;
    width: 100%;
    margin-top: 20px;
  }

  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .stat-item {
    padding: 8px 4px;
  }

  .stat-value {
    font-size: 16px;
  }

  .stat-label {
    font-size: 10px;
  }
}
</style>