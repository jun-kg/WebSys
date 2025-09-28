<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>🚨 リアルタイムアラート</span>
        <el-button @click="$emit('clear')" size="small" type="text">
          クリア
        </el-button>
      </div>
    </template>

    <div class="realtime-alerts">
      <div
        v-for="(alert, index) in displayAlerts"
        :key="index"
        class="realtime-alert-item"
        :class="`alert-${alert.level}`"
      >
        <div class="alert-header">
          <el-tag
            :type="getAlertTagType(alert.level)"
            size="small"
          >
            {{ alert.level.toUpperCase() }}
          </el-tag>
          <el-button
            @click="$emit('dismiss', index)"
            size="small"
            type="text"
            icon="Close"
          />
        </div>
        <div class="alert-message">{{ alert.message }}</div>
        <div v-if="alert.timestamp" class="alert-time">
          {{ formatTimestamp(alert.timestamp) }}
        </div>
      </div>

      <div v-if="alerts.length === 0" class="no-alerts">
        アラートはありません
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Close } from '@element-plus/icons-vue'

interface Alert {
  level: string
  message: string
  timestamp?: string
  metadata?: any
}

interface Props {
  alerts: Alert[]
  maxItems?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxItems: 5
})

const displayAlerts = computed(() =>
  props.alerts.slice(0, props.maxItems)
)

const getAlertTagType = (level: string) => {
  switch (level) {
    case 'critical':
    case 'error':
      return 'danger'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
}

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

defineEmits<{
  'clear': []
  'dismiss': [index: number]
}>()
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.realtime-alerts {
  max-height: 300px;
  overflow-y: auto;
}

.realtime-alert-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  transition: all 0.3s ease;
  animation: slideInRight 0.3s ease;
}

.realtime-alert-item.alert-critical {
  border-color: #f56c6c;
  background-color: #fef0f0;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.2);
}

.realtime-alert-item.alert-error {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.realtime-alert-item.alert-warning {
  border-color: #e6a23c;
  background-color: #fdf5e6;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.alert-message {
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.alert-time {
  font-size: 12px;
  color: #909399;
}

.no-alerts {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-style: italic;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>