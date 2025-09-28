<template>
  <el-dialog
    v-model="visible"
    title="ログエクスポート"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form :model="exportForm" label-width="100px">
      <el-form-item label="形式">
        <el-radio-group v-model="exportForm.format">
          <el-radio label="json">JSON形式</el-radio>
          <el-radio label="csv">CSV形式</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="期間">
        <el-date-picker
          v-model="exportForm.dateRange"
          type="datetimerange"
          range-separator="〜"
          start-placeholder="開始日時"
          end-placeholder="終了日時"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="フィルター">
        <el-checkbox-group v-model="exportForm.includeSections">
          <el-checkbox label="errors">エラーログ</el-checkbox>
          <el-checkbox label="warnings">警告ログ</el-checkbox>
          <el-checkbox label="info">情報ログ</el-checkbox>
          <el-checkbox label="debug">デバッグログ</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="最大件数">
        <el-input-number
          v-model="exportForm.maxRecords"
          :min="100"
          :max="10000"
          :step="100"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">キャンセル</el-button>
        <el-button
          type="primary"
          @click="handleExport"
          :loading="exporting"
          icon="Download"
        >
          エクスポート
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Download } from '@element-plus/icons-vue'

interface ExportForm {
  format: 'json' | 'csv'
  dateRange: string[]
  includeSections: string[]
  maxRecords: number
}

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'export': [options: ExportForm]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const exporting = ref(false)

const exportForm = reactive<ExportForm>({
  format: 'json',
  dateRange: [],
  includeSections: ['errors', 'warnings', 'info'],
  maxRecords: 1000
})

const handleExport = async () => {
  exporting.value = true
  try {
    await emit('export', { ...exportForm })
    visible.value = false
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>