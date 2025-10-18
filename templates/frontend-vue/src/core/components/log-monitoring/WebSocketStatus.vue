<template>
  <div class="websocket-status">
    <el-tag
      :type="status === 'connected' ? 'success' :
            status === 'connecting' ? 'warning' : 'danger'"
      :icon="status === 'connected' ? 'Check' :
            status === 'connecting' ? 'Loading' : 'Close'"
      size="small"
    >
      {{ statusText }}
    </el-tag>
    <span v-if="status === 'connected' && latency > 0" class="latency">
      ({{ latency }}ms)
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check, Loading, Close } from '@element-plus/icons-vue'

interface Props {
  status: string
  latency: number
}

const props = defineProps<Props>()

const statusText = computed(() => {
  switch (props.status) {
    case 'connected':
      return 'リアルタイム監視中'
    case 'connecting':
      return '接続中...'
    default:
      return '切断'
  }
})
</script>

<style scoped>
.websocket-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.latency {
  font-size: 12px;
  color: #909399;
}
</style>