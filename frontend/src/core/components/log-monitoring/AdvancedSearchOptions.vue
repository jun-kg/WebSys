<template>
  <div class="advanced-options">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="期間">
          <el-date-picker
            v-model="form.dateRange"
            type="datetimerange"
            range-separator="〜"
            start-placeholder="開始日時"
            end-placeholder="終了日時"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="カテゴリ">
          <el-select
            v-model="form.categories"
            multiple
            placeholder="カテゴリ選択"
            style="width: 100%"
          >
            <el-option
              v-for="(name, category) in LOG_CATEGORY_NAMES"
              :key="category"
              :label="name"
              :value="category"
            />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LOG_CATEGORY_NAMES } from '@/types/log'

interface SearchForm {
  query: string
  levels: number[]
  categories: string[]
  dateRange: string[]
}

interface Props {
  modelValue: SearchForm
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: SearchForm]
}>()

const form = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<style scoped>
.advanced-options {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}
</style>