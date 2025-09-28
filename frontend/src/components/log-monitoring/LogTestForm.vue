<template>
  <el-form :model="testForm" label-width="80px" size="small">
    <el-form-item label="レベル">
      <el-select v-model="testForm.level" style="width: 100%">
        <el-option
          v-for="(name, level) in LOG_LEVEL_NAMES"
          :key="level"
          :label="name"
          :value="Number(level)"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="カテゴリ">
      <el-select v-model="testForm.category" style="width: 100%">
        <el-option
          v-for="(name, category) in LOG_CATEGORY_NAMES"
          :key="category"
          :label="name"
          :value="category"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="メッセージ">
      <el-input
        v-model="testForm.message"
        type="textarea"
        :rows="3"
        placeholder="ログメッセージを入力"
      />
    </el-form-item>

    <el-form-item>
      <el-button
        type="primary"
        @click="handleSend"
        :loading="loading"
        style="width: 100%"
      >
        送信
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { LOG_LEVEL_NAMES, LOG_CATEGORY_NAMES } from '@/types/log'
import type { LogLevel, LogCategory } from '@/types/log'

interface TestForm {
  level: LogLevel
  category: LogCategory
  message: string
}

interface Props {
  loading?: boolean
}

defineProps<Props>()

const testForm = reactive<TestForm>({
  level: 30,
  category: 'SYS',
  message: 'テストログメッセージ'
})

const emit = defineEmits<{
  'send': [data: TestForm]
}>()

const handleSend = () => {
  if (!testForm.message.trim()) {
    return
  }
  emit('send', { ...testForm })
}
</script>

<style scoped>
/* フォームスタイルはElement Plusに委譲 */
</style>