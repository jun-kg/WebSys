<template>
  <div class="feature-management">
    <!-- ページヘッダー -->
    <el-card class="page-header">
      <el-row align="middle" justify="space-between">
        <el-col :span="16">
          <h1 class="page-title">機能管理</h1>
          <p class="page-description">
            システム機能の登録・編集・削除と権限設定
          </p>
        </el-col>
        <el-col :span="8" class="text-right">
          <el-button
            type="primary"
            @click="showCreateDialog = true"
          >
            <template #icon>
              <Plus />
            </template>
            新規機能追加
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 検索・フィルター -->
    <el-card class="filter-section">
      <el-form
        :model="searchForm"
        inline
        class="search-form"
      >
        <el-form-item label="機能名">
          <el-input
            v-model="searchForm.name"
            placeholder="機能名で検索..."
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="カテゴリ">
          <el-select
            v-model="searchForm.category"
            placeholder="カテゴリを選択"
            clearable
          >
            <el-option
              v-for="category in categories"
              :key="category.code"
              :label="category.name"
              :value="category.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状態">
          <el-select
            v-model="searchForm.isActive"
            placeholder="状態を選択"
            clearable
          >
            <el-option label="有効" :value="true" />
            <el-option label="無効" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="handleSearch"
          >
            検索
          </el-button>
          <el-button
            @click="handleReset"
          >
            リセット
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 機能一覧テーブル -->
    <el-card>
      <el-table
        :data="features"
        v-loading="loading"
        stripe
        @row-click="handleRowClick"
      >
        <el-table-column prop="code" label="機能コード" width="120" sortable />
        <el-table-column prop="name" label="機能名" width="200" />
        <el-table-column prop="category" label="カテゴリ" width="120">
          <template #default="{ row }">
            <el-tag :type="getCategoryType(row.category)">
              {{ getCategoryName(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="説明" min-width="200" />
        <el-table-column prop="displayOrder" label="表示順" width="80" />
        <el-table-column prop="isMenuItem" label="メニュー表示" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isMenuItem ? 'success' : 'info'">
              {{ row.isMenuItem ? '表示' : '非表示' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状態" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '有効' : '無効' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <el-button
              text
              size="small"
              @click.stop="handleEdit(row)"
            >
              編集
            </el-button>
            <el-button
              text
              size="small"
              type="danger"
              @click.stop="handleDelete(row)"
            >
              削除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

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
    </el-card>

    <!-- 機能作成/編集ダイアログ -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingFeature ? '機能編集' : '機能追加'"
      width="600px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="featureFormRef"
        :model="featureForm"
        :rules="featureRules"
        label-width="120px"
      >
        <el-form-item label="機能コード" prop="code">
          <el-input
            v-model="featureForm.code"
            :disabled="!!editingFeature"
            placeholder="機能コード（英数字）"
          />
        </el-form-item>
        <el-form-item label="機能名" prop="name">
          <el-input
            v-model="featureForm.name"
            placeholder="機能名"
          />
        </el-form-item>
        <el-form-item label="説明">
          <el-input
            v-model="featureForm.description"
            type="textarea"
            placeholder="機能の説明"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="カテゴリ" prop="category">
          <el-select
            v-model="featureForm.category"
            placeholder="カテゴリを選択"
          >
            <el-option
              v-for="category in categories"
              :key="category.code"
              :label="category.name"
              :value="category.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="親機能">
          <el-select
            v-model="featureForm.parentId"
            placeholder="親機能を選択（なしの場合は空白）"
            clearable
          >
            <el-option
              v-for="feature in parentFeatureOptions"
              :key="feature.id"
              :label="feature.name"
              :value="feature.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="URLパターン">
          <el-input
            v-model="featureForm.urlPattern"
            placeholder="/features/*"
          />
        </el-form-item>
        <el-form-item label="APIパターン">
          <el-input
            v-model="featureForm.apiPattern"
            placeholder="/api/features/*"
          />
        </el-form-item>
        <el-form-item label="アイコン">
          <el-input
            v-model="featureForm.icon"
            placeholder="el-icon-setting"
          />
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="表示順">
              <el-input
                v-model.number="featureForm.displayOrder"
                type="number"
                placeholder="0"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="メニュー表示">
              <el-switch
                v-model="featureForm.isMenuItem"
                active-text="表示"
                inactive-text="非表示"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button
          @click="handleDialogClose"
        >
          キャンセル
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="handleSave"
        >
          {{ editingFeature ? '更新' : '作成' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElDialog, ElPagination } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
// Element Plus components are auto-imported
import { featureAPI } from '@/api/features'

// リアクティブデータ
const loading = ref(false)
const saving = ref(false)
const showCreateDialog = ref(false)
const editingFeature = ref(null)
const features = ref([])
const categories = ref([])

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