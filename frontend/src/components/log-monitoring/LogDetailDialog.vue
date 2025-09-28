<template>
  <el-dialog
    v-model="visible"
    title="ログ詳細"
    width="80%"
    :close-on-click-modal="false"
  >
    <div v-if="log">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">
          {{ log.id }}
        </el-descriptions-item>
        <el-descriptions-item label="時刻">
          {{ formatTimestamp(log.timestamp) }}
        </el-descriptions-item>
        <el-descriptions-item label="レベル">
          <el-tag :color="LOG_LEVEL_COLORS[log.level]" effect="dark">
            {{ LOG_LEVEL_NAMES[log.level] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="カテゴリ">
          <el-tag>{{ LOG_CATEGORY_NAMES[log.category] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="ソース">
          <el-tag type="info">{{ LOG_SOURCE_NAMES[log.source] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="ユーザー">
          {{ log.user?.name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="セッションID">
          {{ log.sessionId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="トレースID">
          {{ log.traceId || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-divider>メッセージ</el-divider>
      <pre class="log-content">{{ log.message }}</pre>

      <el-divider v-if="log.details">詳細情報</el-divider>
      <pre v-if="log.details" class="log-content">{{ formatJSON(log.details) }}</pre>

      <el-divider v-if="log.error">エラー情報</el-divider>
      <pre v-if="log.error" class="log-content error">{{ formatJSON(log.error) }}</pre>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">閉じる</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  LOG_LEVEL_COLORS,
  LOG_LEVEL_NAMES,
  LOG_CATEGORY_NAMES,
  LOG_SOURCE_NAMES
} from '@/types/log'
import type { LogEntry } from '@/types/log'

interface Props {
  modelValue: boolean
  log: LogEntry | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('ja-JP')
}

const formatJSON = (obj: any) => {
  return JSON.stringify(obj, null, 2)
}
</script>

<style scoped>
.log-content {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.log-content.error {
  background: #fef0f0;
  border: 1px solid #f56c6c;
}
</style>