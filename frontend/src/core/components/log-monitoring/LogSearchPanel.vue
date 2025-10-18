<template>
  <el-card>
    <template #header>
      <div class="search-header">
        <span>🔍 ログ検索</span>
        <el-button @click="toggleAdvanced" type="text">
          {{ showAdvanced ? '簡易検索' : '詳細検索' }}
        </el-button>
      </div>
    </template>

    <el-form :model="searchForm" @submit.prevent="handleSearch">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="キーワード">
            <el-input
              v-model="searchForm.query"
              placeholder="メッセージ検索"
              clearable
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="レベル">
            <el-select
              v-model="searchForm.levels"
              multiple
              placeholder="ログレベル選択"
              style="width: 100%"
            >
              <el-option
                v-for="(name, level) in LOG_LEVEL_NAMES"
                :key="level"
                :label="name"
                :value="Number(level)"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <AdvancedSearchOptions
        v-if="showAdvanced"
        v-model="searchForm"
      />

      <el-form-item>
        <el-button
          type="primary"
          @click="handleSearch"
          :loading="loading"
          icon="Search"
        >
          検索
        </el-button>
        <el-button @click="resetSearch" icon="Refresh">
          リセット
        </el-button>
        <el-button
          type="warning"
          @click="$emit('export')"
          icon="Download"
        >
          エクスポート
        </el-button>
      </el-form-item>
    </el-form>

    <SearchResults
      :results="results"
      :loading="loading"
      :total="total"
      :current-page="currentPage"
      :page-size="pageSize"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
      @show-detail="$emit('show-detail', $event)"
    />
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { LOG_LEVEL_NAMES } from '@/types/log'
import AdvancedSearchOptions from './AdvancedSearchOptions.vue'
import SearchResults from './SearchResults.vue'
import type { LogEntry } from '@/types/log'

interface SearchForm {
  query: string
  levels: number[]
  categories: string[]
  dateRange: string[]
}

interface Props {
  loading?: boolean
  results: LogEntry[]
  total: number
  currentPage: number
  pageSize: number
}

const props = defineProps<Props>()

const showAdvanced = ref(false)
const searchForm = reactive<SearchForm>({
  query: '',
  levels: [],
  categories: [],
  dateRange: []
})

const toggleAdvanced = () => {
  showAdvanced.value = !showAdvanced.value
}

const handleSearch = () => {
  emit('search', { ...searchForm })
}

const resetSearch = () => {
  Object.assign(searchForm, {
    query: '',
    levels: [],
    categories: [],
    dateRange: []
  })
  emit('reset')
}

const handlePageChange = (page: number) => {
  emit('page-change', page)
}

const handleSizeChange = (size: number) => {
  emit('size-change', size)
}

const emit = defineEmits<{
  'search': [params: SearchForm]
  'reset': []
  'page-change': [page: number]
  'size-change': [size: number]
  'show-detail': [log: LogEntry]
  'export': []
}>()
</script>

<style scoped>
.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 16px;
}
</style>