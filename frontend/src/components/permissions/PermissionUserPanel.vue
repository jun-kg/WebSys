<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="`権限設定: ${departmentName} - ${feature?.name}`"
    width="500px"
    @closed="$emit('closed')"
  >
    <div class="permission-editor">
      <h4>{{ feature?.name }} ({{ feature?.code }})</h4>
      <div class="permission-checkboxes">
        <el-checkbox
          v-model="localPermissions.canView"
          label="閲覧 (V)"
          border
        />
        <el-checkbox
          v-model="localPermissions.canCreate"
          label="作成 (C)"
          border
        />
        <el-checkbox
          v-model="localPermissions.canEdit"
          label="編集 (E)"
          border
        />
        <el-checkbox
          v-model="localPermissions.canDelete"
          label="削除 (D)"
          border
        />
        <el-checkbox
          v-model="localPermissions.canApprove"
          label="承認 (A)"
          border
        />
        <el-checkbox
          v-model="localPermissions.canExport"
          label="出力 (X)"
          border
        />
      </div>
      <div class="inherit-setting">
        <el-checkbox
          v-model="localPermissions.inheritFromParent"
          label="親部署から権限を継承する"
        />
      </div>
    </div>

    <template #footer>
      <el-button
        @click="$emit('close')"
      >
        キャンセル
      </el-button>
      <el-button
        type="primary"
        @click="handleSave"
        :loading="saving"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Feature, PermissionSet } from '@/types/permissions'

interface Props {
  visible: boolean
  departmentId?: number
  departmentName?: string
  feature?: Feature
  permissions?: PermissionSet & { inheritFromParent: boolean }
  saving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  saving: false
})

const emit = defineEmits<{
  'close': []
  'closed': []
  'save': [data: {
    departmentId: number
    featureId: number
    permissions: PermissionSet & { inheritFromParent: boolean }
  }]
}>()

const localPermissions = reactive<PermissionSet & { inheritFromParent: boolean }>({
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canExport: false,
  inheritFromParent: true
})

// プロップスが変更されたらローカル状態を更新
watch(() => props.permissions, (newPermissions) => {
  if (newPermissions) {
    Object.assign(localPermissions, newPermissions)
  } else {
    // デフォルト値
    Object.assign(localPermissions, {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canApprove: false,
      canExport: false,
      inheritFromParent: true
    })
  }
}, { immediate: true })

function handleSave() {
  if (props.departmentId && props.feature) {
    emit('save', {
      departmentId: props.departmentId,
      featureId: props.feature.id,
      permissions: { ...localPermissions }
    })
  }
}
</script>

<style scoped>
.permission-editor h4 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
}

.permission-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.inherit-setting {
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-light);
}

@media (max-width: 768px) {
  .permission-checkboxes {
    grid-template-columns: 1fr;
  }
}
</style>