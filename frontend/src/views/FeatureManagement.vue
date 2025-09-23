<template>
  <div class="feature-management">
    <!-- ページヘッダー -->
    <CommonCard variant="bordered" class="page-header" responsive>
      <CommonRow align="middle" justify="space-between">
        <CommonCol :span="16">
          <h1 class="page-title">機能管理</h1>
          <p class="page-description">
            システム機能の登録・編集・削除と権限設定
          </p>
        </CommonCol>
        <CommonCol :span="8" class="text-right">
          <CommonButton
            variant="primary"
            @click="showCreateDialog = true"
            responsive
            touch-optimized
          >
            <template #prefix>
              <Icon name="plus" />
            </template>
            新規機能追加
          </CommonButton>
        </CommonCol>
      </CommonRow>
    </CommonCard>

    <!-- 検索・フィルター -->
    <CommonCard variant="default" class="filter-section" responsive>
      <CommonForm
        :model="searchForm"
        variant="inline"
        class="search-form"
        responsive
      >
        <CommonFormItem label="機能名">
          <CommonInput
            v-model="searchForm.name"
            variant="search"
            placeholder="機能名で検索..."
            :clearable="true"
            @clear="handleSearch"
            @keyup.enter="handleSearch"
            responsive
          />
        </CommonFormItem>
        <CommonFormItem label="カテゴリ">
          <CommonSelect
            v-model="searchForm.category"
            variant="searchable"
            placeholder="カテゴリを選択"
            :clearable="true"
            responsive
          >
            <CommonOption
              v-for="category in categories"
              :key="category.code"
              :label="category.name"
              :value="category.code"
            />
          </CommonSelect>
        </CommonFormItem>
        <CommonFormItem label="状態">
          <CommonSelect
            v-model="searchForm.isActive"
            placeholder="状態を選択"
            :clearable="true"
            responsive
          >
            <CommonOption label="有効" :value="true" />
            <CommonOption label="無効" :value="false" />
          </CommonSelect>
        </CommonFormItem>
        <CommonFormItem>
          <CommonButton
            variant="primary"
            @click="handleSearch"
            responsive
          >
            検索
          </CommonButton>
          <CommonButton
            variant="default"
            @click="handleReset"
            responsive
          >
            リセット
          </CommonButton>
        </CommonFormItem>
      </CommonForm>
    </CommonCard>

    <!-- 機能一覧テーブル -->
    <CommonCard variant="default" responsive>
      <CommonTable
        :data="features"
        :loading="loading"
        variant="striped"
        responsive
        @row-click="handleRowClick"
      >
        <CommonTableColumn prop="code" label="機能コード" width="120" sortable />
        <CommonTableColumn prop="name" label="機能名" width="200" />
        <CommonTableColumn prop="category" label="カテゴリ" width="120">
          <template #default="{ row }">
            <CommonTag :type="getCategoryType(row.category)">
              {{ getCategoryName(row.category) }}
            </CommonTag>
          </template>
        </CommonTableColumn>
        <CommonTableColumn prop="description" label="説明" min-width="200" />
        <CommonTableColumn prop="displayOrder" label="表示順" width="80" />
        <CommonTableColumn prop="isMenuItem" label="メニュー表示" width="100" align="center">
          <template #default="{ row }">
            <CommonTag :type="row.isMenuItem ? 'success' : 'info'">
              {{ row.isMenuItem ? '表示' : '非表示' }}
            </CommonTag>
          </template>
        </CommonTableColumn>
        <CommonTableColumn prop="isActive" label="状態" width="80" align="center">
          <template #default="{ row }">
            <CommonTag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '有効' : '無効' }}
            </CommonTag>
          </template>
        </CommonTableColumn>
        <CommonTableColumn label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <CommonButton
              variant="ghost"
              size="small"
              @click.stop="handleEdit(row)"
            >
              編集
            </CommonButton>
            <CommonButton
              variant="ghost"
              size="small"
              type="danger"
              @click.stop="handleDelete(row)"
            >
              削除
            </CommonButton>
          </template>
        </CommonTableColumn>
      </CommonTable>

      <!-- ページネーション -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </CommonCard>

    <!-- 機能作成/編集ダイアログ -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingFeature ? '機能編集' : '機能追加'"
      width="600px"
      :before-close="handleDialogClose"
    >
      <CommonForm
        ref="featureFormRef"
        :model="featureForm"
        :rules="featureRules"
        variant="default"
        responsive
      >
        <CommonFormItem label="機能コード" prop="code">
          <CommonInput
            v-model="featureForm.code"
            :disabled="!!editingFeature"
            placeholder="機能コード（英数字）"
            responsive
          />
        </CommonFormItem>
        <CommonFormItem label="機能名" prop="name">
          <CommonInput
            v-model="featureForm.name"
            placeholder="機能名"
            responsive
          />
        </CommonFormItem>
        <CommonFormItem label="説明">
          <CommonInput
            v-model="featureForm.description"
            type="textarea"
            placeholder="機能の説明"
            :rows="3"
            responsive
          />
        </CommonFormItem>
        <CommonFormItem label="カテゴリ" prop="category">
          <CommonSelect
            v-model="featureForm.category"
            placeholder="カテゴリを選択"
            responsive
          >
            <CommonOption
              v-for="category in categories"
              :key="category.code"
              :label="category.name"
              :value="category.code"
            />
          </CommonSelect>
        </CommonFormItem>
        <CommonFormItem label="親機能">
          <CommonSelect
            v-model="featureForm.parentId"
            placeholder="親機能を選択（なしの場合は空白）"
            :clearable="true"
            responsive
          >
            <CommonOption
              v-for="feature in parentFeatureOptions"
              :key="feature.id"
              :label="feature.name"
              :value="feature.id"
            />
          </CommonSelect>
        </CommonFormItem>
        <CommonFormItem label="URLパターン">
          <CommonInput
            v-model="featureForm.urlPattern"
            placeholder="/features/*"
            responsive
          />
        </CommonFormItem>
        <CommonFormItem label="APIパターン">
          <CommonInput
            v-model="featureForm.apiPattern"
            placeholder="/api/features/*"
            responsive
          />
        </CommonFormItem>
        <CommonFormItem label="アイコン">
          <CommonInput
            v-model="featureForm.icon"
            placeholder="el-icon-setting"
            responsive
          />
        </CommonFormItem>
        <CommonRow>
          <CommonCol :span="12">
            <CommonFormItem label="表示順">
              <CommonInput
                v-model.number="featureForm.displayOrder"
                type="number"
                placeholder="0"
                responsive
              />
            </CommonFormItem>
          </CommonCol>
          <CommonCol :span="12">
            <CommonFormItem label="メニュー表示">
              <CommonSwitch
                v-model="featureForm.isMenuItem"
                active-text="表示"
                inactive-text="非表示"
              />
            </CommonFormItem>
          </CommonCol>
        </CommonRow>
      </CommonForm>

      <template #footer>
        <CommonButton
          variant="default"
          @click="handleDialogClose"
          responsive
        >
          キャンセル
        </CommonButton>
        <CommonButton
          variant="primary"
          :loading="saving"
          @click="handleSave"
          responsive
        >
          {{ editingFeature ? '更新' : '作成' }}
        </CommonButton>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElDialog, ElPagination } from 'element-plus'
import {
  CommonCard,
  CommonRow,
  CommonCol,
  CommonForm,
  CommonFormItem,
  CommonInput,
  CommonSelect,
  CommonOption,
  CommonButton,
  CommonTable,
  CommonTableColumn,
  CommonTag,
  CommonSwitch
} from '@company/shared-components'
import { featureAPI } from '@/api/features'

// リアクティブデータ
const loading = ref(false)
const saving = ref(false)
const showCreateDialog = ref(false)
const editingFeature = ref(null)
const features = ref([])
const categories = ref([])
const parentFeatureOptions = ref([])

// 検索フォーム
const searchForm = reactive({
  name: '',
  category: '',
  isActive: null
})

// ページネーション
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 機能フォーム
const featureForm = reactive({
  code: '',
  name: '',
  description: '',
  category: '',
  parentId: null,
  urlPattern: '',
  apiPattern: '',
  icon: '',
  displayOrder: 0,
  isMenuItem: true
})

// バリデーションルール
const featureRules = {
  code: [
    { required: true, message: '機能コードを入力してください', trigger: 'blur' },
    { pattern: /^[A-Z][A-Z0-9_]*$/, message: '英大文字、数字、アンダースコアのみ使用可能', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '機能名を入力してください', trigger: 'blur' }
  ],
  category: [
    { required: true, message: 'カテゴリを選択してください', trigger: 'change' }
  ]
}

// フォーム参照
const featureFormRef = ref(null)

// 計算プロパティ
const parentFeatureOptions = computed(() => {
  return features.value.filter(f => f.isActive && (!editingFeature.value || f.id !== editingFeature.value.id))
})

// ライフサイクル
onMounted(() => {
  loadFeatures()
  loadCategories()
})

// メソッド
async function loadFeatures() {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }

    const response = await featureAPI.getFeatures(params)
    features.value = response.data.features
    pagination.total = response.data.pagination?.total || response.data.features.length
  } catch (error) {
    console.error('機能一覧の取得に失敗しました:', error)
    ElMessage.error('機能一覧の取得に失敗しました')
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const response = await featureAPI.getCategories()
    categories.value = response.data.categories
  } catch (error) {
    console.error('カテゴリの取得に失敗しました:', error)
  }
}

function handleSearch() {
  pagination.page = 1
  loadFeatures()
}

function handleReset() {
  Object.assign(searchForm, {
    name: '',
    category: '',
    isActive: null
  })
  pagination.page = 1
  loadFeatures()
}

function handlePageChange(page: number) {
  pagination.page = page
  loadFeatures()
}

function handleSizeChange(size: number) {
  pagination.limit = size
  pagination.page = 1
  loadFeatures()
}

function handleRowClick(row: any) {
  // 行クリックで詳細表示などの処理
}

function handleEdit(row: any) {
  editingFeature.value = row
  Object.assign(featureForm, {
    code: row.code,
    name: row.name,
    description: row.description || '',
    category: row.category,
    parentId: row.parentId,
    urlPattern: row.urlPattern || '',
    apiPattern: row.apiPattern || '',
    icon: row.icon || '',
    displayOrder: row.displayOrder || 0,
    isMenuItem: row.isMenuItem
  })
  showCreateDialog.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      `機能「${row.name}」を削除してもよろしいですか？`,
      '確認',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    )

    await featureAPI.deleteFeature(row.id)
    ElMessage.success('機能を削除しました')
    loadFeatures()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('機能の削除に失敗しました:', error)
      ElMessage.error('機能の削除に失敗しました')
    }
  }
}

async function handleSave() {
  try {
    await featureFormRef.value?.validate()
    saving.value = true

    if (editingFeature.value) {
      await featureAPI.updateFeature(editingFeature.value.id, featureForm)
      ElMessage.success('機能を更新しました')
    } else {
      await featureAPI.createFeature(featureForm)
      ElMessage.success('機能を作成しました')
    }

    handleDialogClose()
    loadFeatures()
  } catch (error) {
    if (error.errors) {
      // バリデーションエラー
      return
    }
    console.error('機能の保存に失敗しました:', error)
    ElMessage.error('機能の保存に失敗しました')
  } finally {
    saving.value = false
  }
}

function handleDialogClose() {
  showCreateDialog.value = false
  editingFeature.value = null
  Object.assign(featureForm, {
    code: '',
    name: '',
    description: '',
    category: '',
    parentId: null,
    urlPattern: '',
    apiPattern: '',
    icon: '',
    displayOrder: 0,
    isMenuItem: true
  })
  featureFormRef.value?.clearValidate()
}

function getCategoryType(category: string): string {
  const types: Record<string, string> = {
    'SYSTEM': 'danger',
    'USER_MGMT': 'warning',
    'LOG_MGMT': 'info',
    'FEATURE_MGMT': 'success',
    'REPORT': 'primary',
    'DASHBOARD': 'default',
    'CUSTOM': 'default'
  }
  return types[category] || 'default'
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    'SYSTEM': 'システム管理',
    'USER_MGMT': 'ユーザー管理',
    'LOG_MGMT': 'ログ管理',
    'FEATURE_MGMT': '機能管理',
    'REPORT': 'レポート',
    'DASHBOARD': 'ダッシュボード',
    'CUSTOM': 'カスタム'
  }
  return names[category] || category
}
</script>

<style scoped>
.feature-management {
  padding: 24px;
}

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

.filter-section {
  margin-bottom: 24px;
}

.search-form {
  width: 100%;
}

.pagination-wrapper {
  margin-top: 24px;
  text-align: right;
}

.text-right {
  text-align: right;
}

@media (max-width: 768px) {
  .feature-management {
    padding: 16px;
  }

  .page-title {
    font-size: 20px;
  }

  .text-right {
    text-align: left;
    margin-top: 16px;
  }
}
</style>