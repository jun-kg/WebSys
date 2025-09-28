<template>
  <el-row :gutter="16">
    <el-col
      :xs="12" :sm="12" :md="6" :lg="6"
      v-for="stat in statsCards"
      :key="stat.key"
    >
      <StatCard
        :stat="stat"
        @click="$emit('filter', stat.type)"
      />
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Document, Warning, Tools } from '@element-plus/icons-vue'
import StatCard from './StatCard.vue'
import type { Component } from 'vue'

interface StatsData {
  totalLogs?: number
  errorCount?: number
  warningCount?: number
}

interface Props {
  stats: StatsData | null
  bufferSize?: number
}

interface StatCardData {
  key: string
  title: string
  value: number
  icon: Component
  color: string
  type?: string
}

const props = defineProps<Props>()

const statsCards = computed<StatCardData[]>(() => [
  {
    key: 'total',
    title: '総ログ数',
    value: props.stats?.totalLogs || 0,
    icon: Document,
    color: '#409eff',
    type: 'all'
  },
  {
    key: 'errors',
    title: 'エラー数',
    value: props.stats?.errorCount || 0,
    icon: Warning,
    color: '#f56c6c',
    type: 'errors'
  },
  {
    key: 'warnings',
    title: '警告数',
    value: props.stats?.warningCount || 0,
    icon: Warning,
    color: '#e6a23c',
    type: 'warnings'
  },
  {
    key: 'buffer',
    title: 'バッファ',
    value: props.bufferSize || 0,
    icon: Tools,
    color: '#67c23a',
    type: 'buffer'
  }
])

defineEmits<{
  'filter': [type: string]
}>()
</script>

<style scoped>
/* スタイルは StatCard に委譲 */
</style>