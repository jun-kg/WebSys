<template>
  <el-card class="header-card">
    <template #header>
      <div class="card-header">
        <span class="title">ログ監視システム</span>
        <el-button-group>
          <el-button
            type="primary"
            @click="$emit('refresh')"
            :loading="loading"
            icon="Refresh"
          >
            更新
          </el-button>
          <el-button
            type="danger"
            @click="$emit('toggle-errors')"
            :icon="showingErrorsOnly ? 'View' : 'Warning'"
            :loading="searchLoading"
          >
            {{ showingErrorsOnly ? '全ログ表示' : 'エラーのみ表示' }}
          </el-button>
          <el-button
            type="success"
            @click="$emit('test-log')"
            icon="Check"
          >
            テストログ送信
          </el-button>
          <el-button
            type="warning"
            @click="$emit('test-error')"
            icon="Warning"
          >
            テストエラー送信
          </el-button>
        </el-button-group>

        <!-- WebSocket接続状況 -->
        <WebSocketStatus
          :status="connectionStatus"
          :latency="latency"
        />
      </div>
    </template>

    <slot />
  </el-card>
</template>

<script setup lang="ts">
import { Refresh, View, Warning, Check } from '@element-plus/icons-vue'
import WebSocketStatus from './WebSocketStatus.vue'

interface Props {
  loading?: boolean
  searchLoading?: boolean
  showingErrorsOnly?: boolean
  connectionStatus: string
  latency: number
}

defineProps<Props>()

defineEmits<{
  'refresh': []
  'toggle-errors': []
  'test-log': []
  'test-error': []
}>()
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 12px;
  }
}
</style>