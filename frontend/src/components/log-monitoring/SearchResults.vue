<template>
  <div class="search-results">
    <!-- ログ一覧テーブル -->
    <el-table
      :data="results"
      :loading="loading"
      height="400"
      stripe
      size="small"
    >
      <el-table-column prop="timestamp" label="時刻" width="180">
        <template #default="{ row }">
          {{ formatTimestamp(row.timestamp) }}
        </template>
      </el-table-column>

      <el-table-column prop="level" label="レベル" width="80">
        <template #default="{ row }">
          <el-tag
            :color="LOG_LEVEL_COLORS[row.level]"
            size="small"
            effect="dark"
          >
            {{ LOG_LEVEL_NAMES[row.level] }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="category" label="カテゴリ" width="100">
        <template #default="{ row }">
          <el-tag size="small">
            {{ LOG_CATEGORY_NAMES[row.category] }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        prop="message"
        label="メッセージ"
        min-width="300"
        show-overflow-tooltip
      />

      <el-table-column prop="source" label="ソース" width="100">
        <template #default="{ row }">
          <el-tag type="info" size="small">
            {{ LOG_SOURCE_NAMES[row.source] }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="user" label="ユーザー" width="120">
        <template #default="{ row }">
          {{ row.user?.name || '-' }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="80">
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            link
            @click="$emit('show-detail', row)"
            icon="View"
          >
            詳細
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ページネーション -->
    <div class="pagination">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="$emit('size-change', $event)"
        @current-change="$emit('page-change', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { View } from '@element-plus/icons-vue'
import {
  LOG_LEVEL_COLORS,
  LOG_LEVEL_NAMES,
  LOG_CATEGORY_NAMES,
  LOG_SOURCE_NAMES
} from '@/types/log'
import type { LogEntry } from '@/types/log'

interface Props {
  results: LogEntry[]
  loading?: boolean
  total: number
  currentPage: number
  pageSize: number
}

defineProps<Props>()

defineEmits<{
  'show-detail': [log: LogEntry]
  'page-change': [page: number]
  'size-change': [size: number]
}>()

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('ja-JP')
}
</script>

<style scoped>
.search-results {
  margin-top: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>