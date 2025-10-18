<template>
  <el-card class="filter-section">
    <el-form
      :model="filterForm"
      inline
      class="filter-form"
    >
      <el-form-item label="部署">
        <el-select
          v-model="filterForm.departmentIds"
          placeholder="部署を選択（複数選択可能）"
          clearable
          multiple
          collapse-tags
          style="min-width: 300px"
          @change="$emit('department-change', filterForm.departmentIds)"
        >
          <el-option
            v-for="dept in departments"
            :key="dept.id"
            :label="getDisplayName(dept)"
            :value="dept.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="機能カテゴリ">
        <el-select
          v-model="filterForm.category"
          placeholder="カテゴリを選択"
          clearable
          @change="$emit('category-change', filterForm.category)"
        >
          <el-option
            v-for="category in categories"
            :key="category.code"
            :label="category.name"
            :value="category.code"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="$emit('refresh')"
          :loading="loading"
        >
          表示更新
        </el-button>
        <el-button
          @click="$emit('export')"
        >
          CSV出力
        </el-button>
        <el-button
          type="success"
          @click="$emit('open-template-dialog')"
        >
          テンプレート管理
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Department, Category, PermissionFilter } from '@/types/permissions'

interface Props {
  departments: Department[]
  categories: Category[]
  initialFilter?: PermissionFilter
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  'department-change': [departmentIds: number[]]
  'category-change': [category: string]
  'refresh': []
  'export': []
  'open-template-dialog': []
  'filter-change': [filter: PermissionFilter]
}>()

const filterForm = reactive<PermissionFilter>({
  departmentIds: props.initialFilter?.departmentIds || [],
  category: props.initialFilter?.category || ''
})

// フィルターの変更を監視して親に通知
watch(filterForm, (newFilter) => {
  emit('filter-change', { ...newFilter })
}, { deep: true })

function getDisplayName(dept: Department): string {
  const indent = '　'.repeat(dept.level - 1)
  return `${indent}${dept.name} (${dept.code})`
}

// 初期値を設定
if (props.initialFilter) {
  Object.assign(filterForm, props.initialFilter)
}
</script>

<style scoped>
.filter-section {
  margin-bottom: 24px;
}

.filter-form {
  width: 100%;
}
</style>