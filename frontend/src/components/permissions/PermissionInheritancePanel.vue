<template>
  <el-dialog
    v-model="visible"
    title="権限テンプレート作成"
    width="600px"
    :destroy-on-close="true"
    @closed="$emit('closed')"
  >
    <div class="create-template">
      <el-form :model="formData" label-width="120px">
        <el-form-item label="テンプレート名" required>
          <el-input
            v-model="formData.name"
            placeholder="テンプレート名を入力"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="説明">
          <el-input
            v-model="formData.description"
            type="textarea"
            placeholder="テンプレートの説明を入力"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="カテゴリ">
          <el-select v-model="formData.category" placeholder="カテゴリを選択">
            <el-option label="管理者" value="ADMIN" />
            <el-option label="マネージャー" value="MANAGER" />
            <el-option label="一般ユーザー" value="USER" />
            <el-option label="読み取り専用" value="READONLY" />
            <el-option label="カスタム" value="CUSTOM" />
          </el-select>
        </el-form-item>
        <el-form-item label="参照部署">
          <el-select
            v-model="formData.sourceDepartmentId"
            placeholder="権限をコピーする部署を選択"
            @change="$emit('source-department-change', formData.sourceDepartmentId)"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="getDisplayName(dept)"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <div v-if="sourcePermissions.length > 0" class="permission-preview">
          <h5>設定される権限プレビュー</h5>
          <div class="permission-grid">
            <div
              v-for="perm in sourcePermissions"
              :key="perm.featureCode"
              class="permission-item"
            >
              <div class="feature-name">{{ perm.featureName }}</div>
              <div class="permission-badges">
                <el-tag v-if="getPermissionValue(perm.permissions, 'canView')" size="small">V</el-tag>
                <el-tag v-if="getPermissionValue(perm.permissions, 'canCreate')" size="small">C</el-tag>
                <el-tag v-if="getPermissionValue(perm.permissions, 'canEdit')" size="small">E</el-tag>
                <el-tag v-if="getPermissionValue(perm.permissions, 'canDelete')" size="small">D</el-tag>
                <el-tag v-if="getPermissionValue(perm.permissions, 'canApprove')" size="small">A</el-tag>
                <el-tag v-if="getPermissionValue(perm.permissions, 'canExport')" size="small">X</el-tag>
              </div>
            </div>
          </div>
        </div>
      </el-form>
    </div>

    <template #footer>
      <el-button
        @click="$emit('close')"
      >
        キャンセル
      </el-button>
      <el-button
        type="primary"
        @click="handleCreate"
        :loading="creating"
        :disabled="!formData.name || sourcePermissions.length === 0"
      >
        作成
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Department, FeaturePermission, PermissionSet } from '@/types/permissions'

interface TemplateFormData {
  name: string
  description: string
  category: string
  sourceDepartmentId: number | null
}

interface Props {
  visible: boolean
  departments: Department[]
  sourcePermissions: FeaturePermission[]
  creating?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  creating: false
})

const emit = defineEmits<{
  'close': []
  'closed': []
  'create': [data: TemplateFormData & { permissions: FeaturePermission[] }]
  'source-department-change': [departmentId: number]
}>()

const formData = reactive<TemplateFormData>({
  name: '',
  description: '',
  category: 'CUSTOM',
  sourceDepartmentId: null
})

// ダイアログが閉じられたときにフォームをクリア
watch(() => props.visible, (visible) => {
  if (!visible) {
    formData.name = ''
    formData.description = ''
    formData.category = 'CUSTOM'
    formData.sourceDepartmentId = null
  }
})

function getDisplayName(dept: Department): string {
  const indent = '　'.repeat(dept.level - 1)
  return `${indent}${dept.name} (${dept.code})`
}

function getPermissionValue(permissions: string | PermissionSet, key: keyof PermissionSet): boolean {
  if (typeof permissions === 'string') {
    // 文字列形式の権限（例: "VCE"）からブール値を取得
    const permMap: Record<keyof PermissionSet, string> = {
      canView: 'V',
      canCreate: 'C',
      canEdit: 'E',
      canDelete: 'D',
      canApprove: 'A',
      canExport: 'X'
    }
    return permissions.includes(permMap[key])
  }
  return permissions[key] || false
}

function handleCreate() {
  if (formData.name && props.sourcePermissions.length > 0) {
    emit('create', {
      ...formData,
      permissions: props.sourcePermissions
    })
  }
}
</script>

<style scoped>
.create-template {
  max-height: 600px;
  overflow-y: auto;
}

.permission-preview {
  margin-top: 20px;
  padding: 16px;
  background-color: var(--el-bg-color-page);
  border-radius: 4px;
}

.permission-preview h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.permission-item {
  padding: 8px 12px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-light);
}

.feature-name {
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 4px;
}

.permission-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .permission-grid {
    grid-template-columns: 1fr;
  }
}
</style>