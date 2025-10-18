<template>
  <div class="workflow-types">
    <div class="page-header">
      <h1 class="page-title">ワークフロータイプ管理</h1>
      <div class="header-actions">
        <el-button
          type="primary"
          @click="showCreateDialog = true"
          v-if="hasPermission('WORKFLOW_MANAGEMENT', 'CREATE')"
        >
          <el-icon><Plus /></el-icon>
          新規作成
        </el-button>
      </div>
    </div>

    <!-- 検索・フィルタ -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="検索">
          <el-input
            v-model="searchForm.search"
            placeholder="名前、コード、説明で検索"
            style="width: 250px"
            clearable
            @input="handleSearch"
          />
        </el-form-item>
        <el-form-item label="カテゴリ">
          <el-select
            v-model="searchForm.category"
            placeholder="すべて"
            style="width: 150px"
            clearable
            @change="handleSearch"
          >
            <el-option label="経費" value="EXPENSE" />
            <el-option label="休暇" value="LEAVE" />
            <el-option label="購買" value="PURCHASE" />
            <el-option label="一般" value="GENERAL" />
            <el-option label="ユーザー管理" value="USER_MANAGEMENT" />
            <el-option label="部署管理" value="DEPARTMENT_MANAGEMENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="状態">
          <el-select
            v-model="searchForm.isActive"
            placeholder="すべて"
            style="width: 120px"
            clearable
            @change="handleSearch"
          >
            <el-option label="有効" :value="true" />
            <el-option label="無効" :value="false" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ワークフロータイプ一覧 -->
    <el-card class="table-card">
      <el-table
        :data="workflowTypes"
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column prop="code" label="コード" width="120" />
        <el-table-column prop="name" label="名前" min-width="200" />
        <el-table-column prop="category" label="カテゴリ" width="140">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)">
              {{ getCategoryLabel(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="説明" min-width="250" show-overflow-tooltip />
        <el-table-column prop="maxAmount" label="金額上限" width="120">
          <template #default="{ row }">
            <span v-if="row.maxAmount">¥{{ row.maxAmount.toLocaleString() }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状態" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '有効' : '無効' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="作成日" width="120">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              @click="viewWorkflowType(row)"
            >
              詳細
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="editWorkflowType(row)"
              v-if="hasPermission('WORKFLOW_MANAGEMENT', 'EDIT')"
            >
              編集
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteWorkflowType(row)"
              v-if="hasPermission('WORKFLOW_MANAGEMENT', 'DELETE')"
            >
              削除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- ページネーション -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 作成・編集ダイアログ -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingItem ? 'ワークフロータイプ編集' : 'ワークフロータイプ作成'"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="workflowTypeFormRef"
        :model="workflowTypeForm"
        :rules="workflowTypeRules"
        label-width="120px"
      >
        <el-form-item label="コード" prop="code">
          <el-input
            v-model="workflowTypeForm.code"
            placeholder="例: EXPENSE_REQUEST"
            :disabled="!!editingItem"
          />
        </el-form-item>
        <el-form-item label="名前" prop="name">
          <el-input v-model="workflowTypeForm.name" placeholder="例: 経費申請" />
        </el-form-item>
        <el-form-item label="カテゴリ" prop="category">
          <el-select v-model="workflowTypeForm.category" style="width: 100%">
            <el-option label="経費" value="EXPENSE" />
            <el-option label="休暇" value="LEAVE" />
            <el-option label="購買" value="PURCHASE" />
            <el-option label="一般" value="GENERAL" />
            <el-option label="ユーザー管理" value="USER_MANAGEMENT" />
            <el-option label="部署管理" value="DEPARTMENT_MANAGEMENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="説明">
          <el-input
            v-model="workflowTypeForm.description"
            type="textarea"
            :rows="3"
            placeholder="ワークフロータイプの説明を入力してください"
          />
        </el-form-item>
        <el-form-item label="金額上限">
          <el-input-number
            v-model="workflowTypeForm.maxAmount"
            :min="0"
            :max="999999999999.99"
            :step="1000"
            style="width: 200px"
          />
          <span style="margin-left: 10px; color: #999;">円（0は制限なし）</span>
        </el-form-item>
        <el-form-item label="添付ファイル">
          <el-checkbox v-model="workflowTypeForm.requireAttachment">必須</el-checkbox>
        </el-form-item>
        <el-form-item label="一括処理">
          <el-checkbox v-model="workflowTypeForm.allowBulk">許可</el-checkbox>
        </el-form-item>
        <el-form-item label="表示順序">
          <el-input-number
            v-model="workflowTypeForm.displayOrder"
            :min="1"
            :max="999"
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="状態">
          <el-switch
            v-model="workflowTypeForm.isActive"
            active-text="有効"
            inactive-text="無効"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelEdit">キャンセル</el-button>
          <el-button type="primary" @click="saveWorkflowType" :loading="saving">
            {{ editingItem ? '更新' : '作成' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 詳細表示ダイアログ -->
    <el-dialog
      v-model="showDetailDialog"
      title="ワークフロータイプ詳細"
      width="700px"
    >
      <div v-if="selectedItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="コード">{{ selectedItem.code }}</el-descriptions-item>
          <el-descriptions-item label="名前">{{ selectedItem.name }}</el-descriptions-item>
          <el-descriptions-item label="カテゴリ">
            <el-tag :type="getCategoryTagType(selectedItem.category)">
              {{ getCategoryLabel(selectedItem.category) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状態">
            <el-tag :type="selectedItem.isActive ? 'success' : 'danger'">
              {{ selectedItem.isActive ? '有効' : '無効' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金額上限">
            <span v-if="selectedItem.maxAmount">¥{{ selectedItem.maxAmount.toLocaleString() }}</span>
            <span v-else>制限なし</span>
          </el-descriptions-item>
          <el-descriptions-item label="添付ファイル">
            {{ selectedItem.requireAttachment ? '必須' : '任意' }}
          </el-descriptions-item>
          <el-descriptions-item label="一括処理">
            {{ selectedItem.allowBulk ? '許可' : '禁止' }}
          </el-descriptions-item>
          <el-descriptions-item label="表示順序">{{ selectedItem.displayOrder }}</el-descriptions-item>
          <el-descriptions-item label="作成日" span="2">
            {{ formatDateTime(selectedItem.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新日" span="2">
            {{ formatDateTime(selectedItem.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedItem.description" style="margin-top: 20px;">
          <h4>説明</h4>
          <p>{{ selectedItem.description }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { workflowTypeRules } from '@/utils/validation'
import { hasPermission } from '@/utils/auth'
import { formatDate, formatDateTime } from '@/utils/date'

// リアクティブデータ
const loading = ref(false)
const saving = ref(false)
const workflowTypes = ref([])
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const editingItem = ref(null)
const selectedItem = ref(null)

const searchForm = reactive({
  search: '',
  category: '',
  isActive: null
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const workflowTypeForm = reactive({
  code: '',
  name: '',
  category: '',
  description: '',
  maxAmount: 0,
  requireAttachment: false,
  allowBulk: false,
  displayOrder: 1,
  isActive: true,
  formSchema: {}
})

const workflowTypeFormRef = ref<FormInstance>()

// バリデーションルール
const workflowTypeRules: FormRules = {
  code: [
    { required: true, message: 'コードを入力してください', trigger: 'blur' },
    { min: 1, max: 50, message: '1-50文字で入力してください', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '英数字、アンダースコア、ハイフンのみ使用可能です', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '名前を入力してください', trigger: 'blur' },
    { min: 1, max: 100, message: '1-100文字で入力してください', trigger: 'blur' }
  ],
  category: [
    { required: true, message: 'カテゴリを選択してください', trigger: 'change' }
  ]
}

// メソッド
const fetchWorkflowTypes = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString()
    })

    if (searchForm.search) params.append('search', searchForm.search)
    if (searchForm.category) params.append('category', searchForm.category)
    if (searchForm.isActive !== null) params.append('isActive', searchForm.isActive.toString())

    const response = await fetch(`/api/workflow/types?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      workflowTypes.value = data.data
      pagination.total = data.pagination.total
    } else {
      ElMessage.error('ワークフロータイプの取得に失敗しました')
    }
  } catch (error) {
    ElMessage.error('通信エラーが発生しました')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchWorkflowTypes()
}

const handleSizeChange = (val: number) => {
  pagination.limit = val
  fetchWorkflowTypes()
}

const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchWorkflowTypes()
}

const viewWorkflowType = (item: any) => {
  selectedItem.value = item
  showDetailDialog.value = true
}

const editWorkflowType = (item: any) => {
  editingItem.value = item
  Object.assign(workflowTypeForm, {
    code: item.code,
    name: item.name,
    category: item.category,
    description: item.description || '',
    maxAmount: item.maxAmount || 0,
    requireAttachment: item.requireAttachment || false,
    allowBulk: item.allowBulk || false,
    displayOrder: item.displayOrder || 1,
    isActive: item.isActive
  })
  showCreateDialog.value = true
}

const deleteWorkflowType = async (item: any) => {
  try {
    await ElMessageBox.confirm(
      `ワークフロータイプ「${item.name}」を削除しますか？`,
      '削除確認',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    )

    const response = await fetch(`/api/workflow/types/${item.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      ElMessage.success('ワークフロータイプを削除しました')
      fetchWorkflowTypes()
    } else {
      const error = await response.json()
      ElMessage.error(error.error || '削除に失敗しました')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('削除に失敗しました')
    }
  }
}

const saveWorkflowType = async () => {
  if (!workflowTypeFormRef.value) return

  try {
    await workflowTypeFormRef.value.validate()
    saving.value = true

    const url = editingItem.value
      ? `/api/workflow/types/${editingItem.value.id}`
      : '/api/workflow/types'

    const method = editingItem.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        ...workflowTypeForm,
        formSchema: workflowTypeForm.formSchema || {}
      })
    })

    if (response.ok) {
      ElMessage.success(editingItem.value ? 'ワークフロータイプを更新しました' : 'ワークフロータイプを作成しました')
      cancelEdit()
      fetchWorkflowTypes()
    } else {
      const error = await response.json()
      ElMessage.error(error.error || '保存に失敗しました')
    }
  } catch (error) {
    // バリデーションエラーの場合は何もしない
  } finally {
    saving.value = false
  }
}

const cancelEdit = () => {
  showCreateDialog.value = false
  editingItem.value = null
  Object.assign(workflowTypeForm, {
    code: '',
    name: '',
    category: '',
    description: '',
    maxAmount: 0,
    requireAttachment: false,
    allowBulk: false,
    displayOrder: 1,
    isActive: true,
    formSchema: {}
  })
  workflowTypeFormRef.value?.resetFields()
}

const getCategoryLabel = (category: string) => {
  const labels = {
    EXPENSE: '経費',
    LEAVE: '休暇',
    PURCHASE: '購買',
    GENERAL: '一般',
    USER_MANAGEMENT: 'ユーザー管理',
    DEPARTMENT_MANAGEMENT: '部署管理'
  }
  return labels[category] || category
}

const getCategoryTagType = (category: string) => {
  const types = {
    EXPENSE: 'warning',
    LEAVE: 'success',
    PURCHASE: 'primary',
    GENERAL: 'info',
    USER_MANAGEMENT: 'danger',
    DEPARTMENT_MANAGEMENT: 'danger'
  }
  return types[category] || 'info'
}

// ライフサイクル
onMounted(() => {
  fetchWorkflowTypes()
})
</script>

<style scoped>
.workflow-types {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.search-card, .table-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.detail-content {
  padding: 10px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
}
</style>