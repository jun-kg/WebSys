<template>
  <div class="log-item">
    <div class="log-time">{{ formatTimestamp(log.timestamp) }}</div>
    <div class="log-content">
      <el-tag
        :color="LOG_LEVEL_COLORS[log.level]"
        size="small"
        effect="dark"
      >
        {{ LOG_LEVEL_NAMES[log.level] }}
      </el-tag>
      <span class="log-message">{{ log.message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LOG_LEVEL_COLORS, LOG_LEVEL_NAMES } from '@/types/log'
import type { LogEntry } from '@/types/log'

interface Props {
  log: LogEntry
}

defineProps<Props>()

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<style scoped>
.log-item {
  width: 100%;
}

.log-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.log-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-message {
  font-size: 14px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>