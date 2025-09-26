<template>
  <div class="permission-template">
    <!-- ページヘッダー -->
    <el-card class="page-header">
      <el-row align="middle" justify="space-between">
        <el-col :span="16">
          <h1 class="page-title">権限テンプレート管理</h1>
          <p class="page-description">
            権限テンプレートの作成・管理ができます。テンプレートを部署に適用して権限を一括設定できます。
          </p>
        </el-col>
        <el-col :span="8" class="text-right">
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            新規テンプレート作成
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- テンプレート一覧 -->
    <el-card class="template-list">
      <el-table
        :data="templates"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="name" label="テンプレート名" width="200">
          <template #default="scope">
            <el-tag v-if="scope.row.isPreset" type="info" size="small" class="preset-tag">
              プリセット
            </el-tag>
            {{ scope.row.name }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="説明" min-width="300" />
        <el-table-column prop="category" label="カテゴリ" width="150">
          <template #default="scope">
            <el-tag :type="getCategoryType(scope.row.category)">
              {{ scope.row.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="権限数" width="100" align="center">
          <template #default="scope">
            {{ scope.row.features?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button
              link
              type="primary"
              size="small"
              @click="viewTemplate(scope.row)"
            >
              詳細
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              @click="editTemplate(scope.row)"
              :disabled="scope.row.isPreset"
            >
              編集
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              @click="applyTemplate(scope.row)"
            >
              適用
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              @click="deleteTemplate(scope.row)"
              :disabled="scope.row.isPreset"
            >
              削除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- テンプレート作成/編集ダイアログ -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新規テンプレート作成' : 'テンプレート編集'"
      width="80%"
      @close="resetDialog"
    >
      <el-form
        ref="templateFormRef"
        :model="templateForm"
        :rules="templateRules"
        label-width="120px"
      >
        <el-form-item label="テンプレート名" prop="name">
          <el-input v-model="templateForm.name" placeholder="管理者用テンプレート" />
        </el-form-item>
        <el-form-item label="説明" prop="description">
          <el-input
            v-model="templateForm.description"
            type="textarea"
            :rows="3"
            placeholder="このテンプレートの用途や権限内容を説明"
          />
        </el-form-item>
        <el-form-item label="カテゴリ" prop="category">
          <el-select v-model="templateForm.category" placeholder="カテゴリを選択">
            <el-option label="管理者" value="ADMIN" />
            <el-option label="一般" value="GENERAL" />
            <el-option label="閲覧のみ" value="READONLY" />
            <el-option label="カスタム" value="CUSTOM" />
          </el-select>
        </el-form-item>

        <!-- 権限設定テーブル -->
        <el-divider>権限設定</el-divider>
        <el-table :data="features" style="width: 100%" max-height="400">
          <el-table-column prop="name" label="機能" width="200" fixed />
          <el-table-column prop="category" label="カテゴリ" width="120">
            <template #default="scope">
              <el-tag size="small">{{ scope.row.category }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="閲覧" width="80" align="center">
            <template #default="scope">
              <el-checkbox
                v-model="scope.row.permissions.canView"
                @change="handlePermissionChange(scope.row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="作成" width="80" align="center">
            <template #default="scope">
              <el-checkbox
                v-model="scope.row.permissions.canCreate"
                :disabled="!scope.row.permissions.canView"
              />
            </template>
          </el-table-column>
          <el-table-column label="編集" width="80" align="center">
            <template #default="scope">
              <el-checkbox
                v-model="scope.row.permissions.canEdit"
                :disabled="!scope.row.permissions.canView"
              />
            </template>
          </el-table-column>
          <el-table-column label="削除" width="80" align="center">
            <template #default="scope">
              <el-checkbox
                v-model="scope.row.permissions.canDelete"
                :disabled="!scope.row.permissions.canView"
              />
            </template>
          </el-table-column>
          <el-table-column label="承認" width="80" align="center">
            <template #default="scope">
              <el-checkbox
                v-model="scope.row.permissions.canApprove"
                :disabled="!scope.row.permissions.canView"
              />
            </template>
          </el-table-column>
          <el-table-column label="エクスポート" width="100" align="center">
            <template #default="scope">
              <el-checkbox
                v-model="scope.row.permissions.canExport"
                :disabled="!scope.row.permissions.canView"
              />
            </template>
          </el-table-column>
        </el-table>

        <!-- 一括設定ボタン -->
        <el-row class="batch-buttons" :gutter="10">
          <el-col :span="4">
            <el-button size="small" @click="setAllPermissions('all')">
              全て選択
            </el-button>
          </el-col>
          <el-col :span="4">
            <el-button size="small" @click="setAllPermissions('none')">
              全て解除
            </el-button>
          </el-col>
          <el-col :span="4">
            <el-button size="small" @click="setAllPermissions('read')">
              閲覧のみ
            </el-button>
          </el-col>
          <el-col :span="4">
            <el-button size="small" @click="setAllPermissions('write')">
              編集可能
            </el-button>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">キャンセル</el-button>
          <el-button type="primary" @click="saveTemplate" :loading="saving">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- テンプレート適用ダイアログ -->
    <el-dialog
      v-model="applyDialogVisible"
      title="テンプレート適用"
      width="600px"
    >
      <el-form>
        <el-form-item label="適用先部署">
          <el-select
            v-model="selectedDepartments"
            multiple
            placeholder="部署を選択"
            style="width: 100%"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-alert
          type="warning"
          :closable="false"
          show-icon
        >
          選択した部署の現在の権限設定は上書きされます。
        </el-alert>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="applyDialogVisible = false">キャンセル</el-button>
          <el-button
            type="primary"
            @click="confirmApplyTemplate"
            :loading="applying"
          >
            適用
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- テンプレート詳細ダイアログ -->
    <el-dialog
      v-model="viewDialogVisible"
      title="テンプレート詳細"
      width="70%"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="テンプレート名">
          {{ currentTemplate?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="カテゴリ">
          <el-tag :type="getCategoryType(currentTemplate?.category)">
            {{ currentTemplate?.category }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="説明" :span="2">
          {{ currentTemplate?.description }}
        </el-descriptions-item>
        <el-descriptions-item label="作成日時">
          {{ formatDate(currentTemplate?.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新日時">
          {{ formatDate(currentTemplate?.updatedAt) }}
        </el-descriptions-item>
      </el-descriptions>

      <el-divider>権限設定</el-divider>
      <el-table :data="currentTemplate?.features" style="width: 100%" max-height="400">
        <el-table-column prop="featureName" label="機能" width="200" />
        <el-table-column prop="featureCategory" label="カテゴリ" width="120">
          <template #default="scope">
            <el-tag size="small">{{ scope.row.featureCategory }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="権限" min-width="300">
          <template #default="scope">
            <el-space>
              <el-tag v-if="scope.row.permissions.canView" type="success">閲覧</el-tag>
              <el-tag v-if="scope.row.permissions.canCreate" type="primary">作成</el-tag>
              <el-tag v-if="scope.row.permissions.canEdit" type="warning">編集</el-tag>
              <el-tag v-if="scope.row.permissions.canDelete" type="danger">削除</el-tag>
              <el-tag v-if="scope.row.permissions.canApprove" type="info">承認</el-tag>
              <el-tag v-if="scope.row.permissions.canExport">エクスポート</el-tag>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Document } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import * as permissionApi from '@/api/permissions';
import * as featureApi from '@/api/features';
import { departmentAPI as departmentApi } from '@/api/departments';

// Types
interface PermissionTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  isPreset: boolean;
  displayOrder: number;
  features: Array<{
    featureId: number;
    featureCode: string;
    featureName: string;
    featureCategory: string;
    permissions: {
      canView: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canApprove: boolean;
      canExport: boolean;
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

interface Feature {
  id: number;
  code: string;
  name: string;
  category: string;
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canExport: boolean;
  };
}

// Store
const authStore = useAuthStore();

// Data
const loading = ref(false);
const saving = ref(false);
const applying = ref(false);
const templates = ref<PermissionTemplate[]>([]);
const features = ref<Feature[]>([]);
const departments = ref<any[]>([]);
const dialogVisible = ref(false);
const viewDialogVisible = ref(false);
const applyDialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const currentTemplate = ref<PermissionTemplate | null>(null);
const selectedDepartments = ref<number[]>([]);
const templateFormRef = ref();

const templateForm = reactive({
  id: null as number | null,
  name: '',
  description: '',
  category: 'CUSTOM',
  companyId: 1,
  features: [] as any[]
});

const templateRules = {
  name: [
    { required: true, message: 'テンプレート名を入力してください', trigger: 'blur' },
    { min: 2, max: 50, message: '2～50文字で入力してください', trigger: 'blur' }
  ],
  category: [
    { required: true, message: 'カテゴリを選択してください', trigger: 'change' }
  ]
};

// Methods
const loadTemplates = async () => {
  loading.value = true;
  try {
    const response = await permissionApi.getPermissionTemplates(1);
    templates.value = response.data || [];
  } catch (error) {
    console.error('Error loading templates:', error);
    ElMessage.error('テンプレートの読み込みに失敗しました');
  } finally {
    loading.value = false;
  }
};

const loadFeatures = async () => {
  try {
    const response = await featureApi.getFeatures();
    features.value = response.data.map((feature: any) => ({
      ...feature,
      permissions: {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canExport: false
      }
    }));
  } catch (error) {
    console.error('Error loading features:', error);
    ElMessage.error('機能一覧の読み込みに失敗しました');
  }
};

const loadDepartments = async () => {
  try {
    const response = await departmentApi.getDepartments({ companyId: 1 });
    departments.value = response.data || [];
  } catch (error) {
    console.error('Error loading departments:', error);
  }
};

const showCreateDialog = () => {
  dialogMode.value = 'create';
  resetDialog();
  loadFeatures();
  dialogVisible.value = true;
};

const editTemplate = (template: PermissionTemplate) => {
  dialogMode.value = 'edit';
  currentTemplate.value = template;

  // テンプレートデータをフォームに設定
  templateForm.id = template.id;
  templateForm.name = template.name;
  templateForm.description = template.description || '';
  templateForm.category = template.category;

  // 権限設定を復元
  loadFeatures().then(() => {
    template.features.forEach(tf => {
      const feature = features.value.find(f => f.id === tf.featureId);
      if (feature) {
        feature.permissions = { ...tf.permissions };
      }
    });
  });

  dialogVisible.value = true;
};

const viewTemplate = (template: PermissionTemplate) => {
  currentTemplate.value = template;
  viewDialogVisible.value = true;
};

const applyTemplate = (template: PermissionTemplate) => {
  currentTemplate.value = template;
  selectedDepartments.value = [];
  applyDialogVisible.value = true;
};

const deleteTemplate = async (template: PermissionTemplate) => {
  try {
    await ElMessageBox.confirm(
      `テンプレート「${template.name}」を削除してもよろしいですか？`,
      '削除確認',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    );

    await permissionApi.deletePermissionTemplate(template.id);
    ElMessage.success('テンプレートを削除しました');
    loadTemplates();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error deleting template:', error);
      ElMessage.error('削除に失敗しました');
    }
  }
};

const saveTemplate = async () => {
  try {
    await templateFormRef.value.validate();
    saving.value = true;

    // 権限設定を収集
    const templateFeatures = features.value
      .filter(f => f.permissions.canView)
      .map(f => ({
        featureId: f.id,
        ...f.permissions
      }));

    const data = {
      ...templateForm,
      features: templateFeatures
    };

    if (dialogMode.value === 'create') {
      await permissionApi.createPermissionTemplate(data);
      ElMessage.success('テンプレートを作成しました');
    } else {
      await permissionApi.updatePermissionTemplate(templateForm.id!, data);
      ElMessage.success('テンプレートを更新しました');
    }

    dialogVisible.value = false;
    loadTemplates();
  } catch (error) {
    console.error('Error saving template:', error);
    ElMessage.error('保存に失敗しました');
  } finally {
    saving.value = false;
  }
};

const confirmApplyTemplate = async () => {
  if (selectedDepartments.value.length === 0) {
    ElMessage.warning('適用先部署を選択してください');
    return;
  }

  try {
    applying.value = true;

    for (const deptId of selectedDepartments.value) {
      await permissionApi.applyPermissionTemplate(
        currentTemplate.value!.id,
        deptId
      );
    }

    ElMessage.success('テンプレートを適用しました');
    applyDialogVisible.value = false;
  } catch (error) {
    console.error('Error applying template:', error);
    ElMessage.error('適用に失敗しました');
  } finally {
    applying.value = false;
  }
};

const handlePermissionChange = (feature: Feature) => {
  if (!feature.permissions.canView) {
    // 閲覧権限を外したら他の権限も全て外す
    feature.permissions.canCreate = false;
    feature.permissions.canEdit = false;
    feature.permissions.canDelete = false;
    feature.permissions.canApprove = false;
    feature.permissions.canExport = false;
  }
};

const setAllPermissions = (mode: 'all' | 'none' | 'read' | 'write') => {
  features.value.forEach(feature => {
    switch (mode) {
      case 'all':
        feature.permissions = {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canApprove: true,
          canExport: true
        };
        break;
      case 'none':
        feature.permissions = {
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canApprove: false,
          canExport: false
        };
        break;
      case 'read':
        feature.permissions = {
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canApprove: false,
          canExport: true
        };
        break;
      case 'write':
        feature.permissions = {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: false,
          canApprove: false,
          canExport: true
        };
        break;
    }
  });
};

const resetDialog = () => {
  templateForm.id = null;
  templateForm.name = '';
  templateForm.description = '';
  templateForm.category = 'CUSTOM';
  templateForm.features = [];

  features.value.forEach(f => {
    f.permissions = {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canApprove: false,
      canExport: false
    };
  });
};

const getCategoryType = (category: string) => {
  const types: Record<string, string> = {
    ADMIN: 'danger',
    GENERAL: 'primary',
    READONLY: 'info',
    CUSTOM: 'warning'
  };
  return types[category] || 'info';
};

const formatDate = (date?: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('ja-JP');
};

// Lifecycle
onMounted(() => {
  loadTemplates();
  loadDepartments();
});
</script>

<style scoped>
.permission-template {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.template-list {
  margin-bottom: 20px;
}

.preset-tag {
  margin-right: 8px;
}

.batch-buttons {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.text-right {
  text-align: right;
}

.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>