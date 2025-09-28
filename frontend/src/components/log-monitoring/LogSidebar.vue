<template>
  <div class="log-sidebar">
    <!-- 最新ログ -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>最新ログ</span>
          <el-button-group size="small">
            <el-button
              :type="filter === 'all' ? 'primary' : ''"
              @click="$emit('filter-change', 'all')"
              size="small"
            >
              全て
            </el-button>
            <el-button
              :type="filter === 'errors' ? 'danger' : ''"
              @click="$emit('filter-change', 'errors')"
              size="small"
            >
              エラー
            </el-button>
            <el-button
              :type="filter === 'warnings' ? 'warning' : ''"
              @click="$emit('filter-change', 'warnings')"
              size="small"
            >
              警告
            </el-button>
          </el-button-group>
        </div>
      </template>

      <div v-if="filteredLogs.length === 0" class="no-logs">
        {{ getEmptyMessage() }}
      </div>

      <div v-else>
        <div
          v-for="log in displayLogs"
          :key="log.id"
          class="recent-log-item"
          :class="getLogItemClass(log.level)"
          @click="$emit('show-detail', log)"
        >
          <div class="log-header">
            <el-tag
              :color="LOG_LEVEL_COLORS[log.level]"
              size="small"
              effect="dark"
            >
              {{ LOG_LEVEL_NAMES[log.level] }}
            </el-tag>
            <span class="timestamp">{{ formatRelativeTime(log.timestamp) }}</span>
          </div>
          <div class="log-message">{{ log.message }}</div>
        </div>
      </div>
    </el-card>

    <!-- ログ送信テスト -->
    <el-card>
      <template #header>
        <span>ログ送信テスト</span>
      </template>

      <LogTestForm
        @send="$emit('send-test', $event)"
        :loading="testLoading"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LOG_LEVEL_COLORS, LOG_LEVEL_NAMES } from '@/types/log'
import LogTestForm from './LogTestForm.vue'
import type { LogEntry, LogLevel } from '@/types/log'

interface Props {
  logs: LogEntry[]
  filter: 'all' | 'errors' | 'warnings'
  maxItems?: number
  testLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxItems: 5
})

const filteredLogs = computed(() => {
  switch (props.filter) {
    case 'errors':
      return props.logs.filter(log => log.level >= 50) // ERROR以上
    case 'warnings':
      return props.logs.filter(log => log.level === 40) // WARN
    default:
      return props.logs
  }
})

const displayLogs = computed(() =>
  filteredLogs.value.slice(0, props.maxItems)
)

const getLogItemClass = (level: LogLevel) => {
  if (level >= 50) return 'log-item-error'
  if (level === 40) return 'log-item-warning'
  return ''
}

const getEmptyMessage = () => {
  switch (props.filter) {
    case 'errors':
      return 'エラーログはありません'
    case 'warnings':
      return '警告ログはありません'
    default:
      return '最新ログはありません'
  }
}

const formatRelativeTime = (timestamp: string) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now.getTime() - time.getTime()

  if (diff < 60000) {
    return `${Math.floor(diff / 1000)}秒前`
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分前`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}時間前`
  } else {
    return time.toLocaleDateString('ja-JP')
  }
}

defineEmits<{
  'filter-change': [filter: 'all' | 'errors' | 'warnings']
  'show-detail': [log: LogEntry]
  'send-test': [testData: any]
}>()
</script>

<style scoped>
.log-sidebar {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recent-log-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.recent-log-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px 0 rgba(64, 158, 255, 0.1);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.timestamp {
  font-size: 12px;
  color: #909399;
}

.log-message {
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-item-error {
  border-left: 4px solid #f56c6c;
  background-color: #fef0f0;
}

.log-item-warning {
  border-left: 4px solid #e6a23c;
  background-color: #fdf6ec;
}

.no-logs {
  text-align: center;
  color: #909399;
  padding: 20px;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>