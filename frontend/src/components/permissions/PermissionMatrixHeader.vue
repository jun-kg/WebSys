<template>
  <el-card class="page-header">
    <el-row align="middle" justify="space-between">
      <el-col :span="16">
        <h1 class="page-title">部署×機能権限マトリクス</h1>
        <p class="page-description">
          部署ごとの機能権限を一覧表示・編集できます
        </p>
      </el-col>
      <el-col :span="8" class="text-right">
        <el-button
          type="primary"
          @click="$emit('save-all')"
          :loading="saving"
        >
          <el-icon><Document /></el-icon>
          一括保存
        </el-button>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { Document } from '@element-plus/icons-vue'

interface Props {
  saving?: boolean
}

withDefaults(defineProps<Props>(), {
  saving: false
})

defineEmits<{
  'save-all': []
}>()
</script>

<style scoped>
.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.page-description {
  color: var(--el-text-color-secondary);
  margin-top: 8px;
  margin-bottom: 0;
}

.text-right {
  text-align: right;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 20px;
  }

  .text-right {
    text-align: left;
    margin-top: 16px;
  }
}
</style>