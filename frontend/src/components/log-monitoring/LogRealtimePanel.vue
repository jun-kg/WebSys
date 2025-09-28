<template>
  <el-card>
    <template #header>
      <div class="panel-header">
        <span>📡 リアルタイムログ</span>
        <el-button @click="$emit('clear')" size="small" type="text">
          クリア
        </el-button>
      </div>
    </template>

    <div class="realtime-logs">
      <div
        v-for="log in displayLogs"
        :key="log.id"
        class="realtime-log-item"
        :class="`level-${log.level}`"
        @click="$emit('show-detail', log)"
      >
        <LogItem :log="log" />
      </div>

      <div v-if="logs.length === 0" class="no-logs">
        リアルタイムログを待機中...
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LogItem from './LogItem.vue'
import type { LogEntry } from '@/types/log'

interface Props {
  logs: LogEntry[]
  maxItems?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxItems: 10
})

const displayLogs = computed(() =>
  props.logs.slice(0, props.maxItems)
)

defineEmits<{
  'clear': []
  'show-detail': [log: LogEntry]
}>()
</script>

<style scoped>
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.realtime-logs {
  max-height: 300px;
  overflow-y: auto;
}

.realtime-log-item {
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  border-left: 3px solid #dcdfe6;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
  animation: fadeInUp 0.3s ease;
  cursor: pointer;
}

.realtime-log-item:hover {
  background-color: #ecf5ff;
  border-left-color: #409eff;
}

.realtime-log-item.level-60,
.realtime-log-item.level-50 {
  border-left-color: #f56c6c;
  background-color: #fef0f0;
}

.realtime-log-item.level-40 {
  border-left-color: #e6a23c;
  background-color: #fdf5e6;
}

.realtime-log-item.level-30 {
  border-left-color: #409eff;
  background-color: #ecf5ff;
}

.no-logs {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-style: italic;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>