<template>
  <el-dialog
    v-model="visible"
    title="権限情報エクスポート"
    width="500px"
    @closed="$emit('closed')"
  >
    <div class="export-options">
      <el-form label-width="120px">
        <el-form-item label="エクスポート形式">
          <el-radio-group v-model="exportFormat">
            <el-radio label="csv">CSV形式</el-radio>
            <el-radio label="excel">Excel形式</el-radio>
            <el-radio label="json">JSON形式</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="対象データ">
          <el-checkbox-group v-model="includeOptions">
            <el-checkbox label="permissions">権限マトリクス</el-checkbox>
            <el-checkbox label="templates">権限テンプレート</el-checkbox>
            <el-checkbox label="audit">監査ログ</el-checkbox>
            <el-checkbox label="inheritance">権限継承情報</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="フィルター">
          <div class="filter-options">
            <el-checkbox v-model="useCurrentFilter">
              現在のフィルター条件を適用
            </el-checkbox>
            <div v-if="currentFilter" class="current-filter-info">
              <div v-if="currentFilter.departmentIds.length > 0">
                部署: {{ currentFilter.departmentIds.length }}件選択
              </div>
              <div v-if="currentFilter.category">
                カテゴリ: {{ currentFilter.category }}
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="期間指定" v-if="includeOptions.includes('audit')">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="〜"
            start-placeholder="開始日"
            end-placeholder="終了日"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="詳細オプション">
          <el-checkbox-group v-model="detailOptions">
            <el-checkbox label="includeInactive">無効な機能も含める</el-checkbox>
            <el-checkbox label="includeComments">コメントを含める</el-checkbox>
            <el-checkbox label="includeTimestamps">タイムスタンプを含める</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <div class="export-summary">
        <h4>エクスポート概要</h4>
        <ul>
          <li>形式: {{ getFormatLabel(exportFormat) }}</li>
          <li>対象: {{ includeOptions.map(opt => getOptionLabel(opt)).join(', ') }}</li>
          <li>フィルター: {{ useCurrentFilter ? '適用' : '全件' }}</li>
          <li v-if="dateRange">期間: {{ dateRange[0] }} 〜 {{ dateRange[1] }}</li>
        </ul>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('close')">
        キャンセル
      </el-button>
      <el-button
        type="primary"
        @click="handleExport"
        :loading="exporting"
        :disabled="includeOptions.length === 0"
      >
        エクスポート実行
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PermissionFilter } from '@/types/permissions'

interface ExportOptions {
  format: string
  include: string[]
  useCurrentFilter: boolean
  dateRange?: string[]
  details: string[]
}

interface Props {
  visible: boolean
  currentFilter?: PermissionFilter
  exporting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  exporting: false
})

const emit = defineEmits<{
  'close': []
  'closed': []
  'export': [options: ExportOptions]
}>()

const exportFormat = ref('csv')
const includeOptions = ref(['permissions'])
const useCurrentFilter = ref(true)
const dateRange = ref<string[] | null>(null)
const detailOptions = ref<string[]>([])

function getFormatLabel(format: string): string {
  const labels: Record<string, string> = {
    csv: 'CSV形式',
    excel: 'Excel形式',
    json: 'JSON形式'
  }
  return labels[format] || format
}

function getOptionLabel(option: string): string {
  const labels: Record<string, string> = {
    permissions: '権限マトリクス',
    templates: '権限テンプレート',
    audit: '監査ログ',
    inheritance: '権限継承情報'
  }
  return labels[option] || option
}

function handleExport() {
  if (includeOptions.value.length > 0) {
    emit('export', {
      format: exportFormat.value,
      include: includeOptions.value,
      useCurrentFilter: useCurrentFilter.value,
      dateRange: dateRange.value || undefined,
      details: detailOptions.value
    })
  }
}
</script>

<style scoped>
.export-options {
  max-height: 600px;
  overflow-y: auto;
}

.filter-options {
  width: 100%;
}

.current-filter-info {
  margin-top: 8px;
  padding: 8px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.export-summary {
  margin-top: 20px;
  padding: 16px;
  background-color: var(--el-bg-color-page);
  border-radius: 4px;
}

.export-summary h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.export-summary ul {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.export-summary li {
  margin-bottom: 4px;
}
</style>