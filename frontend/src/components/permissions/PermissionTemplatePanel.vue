<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="権限テンプレート管理"
    width="800px"
    :destroy-on-close="true"
    @closed="$emit('closed')"
  >
    <div class="template-management">
      <!-- テンプレート一覧 -->
      <div class="template-list">
        <div class="template-header">
          <h4>保存済みテンプレート</h4>
          <el-button
            type="primary"
            size="small"
            @click="$emit('create-template')"
          >
            新規作成
          </el-button>
        </div>

        <el-table
          :data="templates"
          v-loading="loading"
        >
          <el-table-column prop="name" label="テンプレート名" />
          <el-table-column prop="description" label="説明" />
          <el-table-column prop="category" label="カテゴリ" width="100" />
          <el-table-column label="操作" width="180" align="center">
            <template #default="{ row }">
              <el-button
                size="small"
                @click="$emit('apply-template', row)"
                :disabled="!canApplyTemplate"
              >
                適用
              </el-button>
              <el-button
                v-if="!row.isPreset"
                size="small"
                type="danger"
                @click="$emit('delete-template', row)"
              >
                削除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <template #footer>
      <el-button
        @click="$emit('close')"
      >
        閉じる
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { PermissionTemplate } from '@/types/permissions'

interface Props {
  visible: boolean
  templates: PermissionTemplate[]
  loading?: boolean
  canApplyTemplate?: boolean
}

withDefaults(defineProps<Props>(), {
  visible: false,
  loading: false,
  canApplyTemplate: true
})

defineEmits<{
  'close': []
  'closed': []
  'create-template': []
  'apply-template': [template: PermissionTemplate]
  'delete-template': [template: PermissionTemplate]
}>()
</script>

<style scoped>
.template-management {
  min-height: 400px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.template-header h4 {
  margin: 0;
  font-size: 16px;
}

@media (max-width: 768px) {
  .template-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>