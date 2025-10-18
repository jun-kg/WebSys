<template>
  <div class="workflow-requests">
    <div class="page-header">
      <h1 class="page-title">ワークフロー申請管理</h1>
      <div class="header-actions">
        <el-button
          type="primary"
          @click="showCreateDialog = true"
          v-if="hasPermission('WORKFLOW_REQUEST', 'CREATE')"
        >
          <el-icon><Plus /></el-icon>
          新規申請
        </el-button>
      </div>
    </div>

    <!-- 検索・フィルタ -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="検索">
          <el-input
            v-model="searchForm.search"
            placeholder="タイトル、申請番号で検索"
            style="width: 250px"
            clearable
            @input="handleSearch"
          />
        </el-form-item>
        <el-form-item label="ワークフロータイプ">
          <el-select
            v-model="searchForm.workflowTypeId"
            placeholder="すべて"
            style="width: 200px"
            clearable
            @change="handleSearch"
          >
            <el-option
              v-for="type in workflowTypes"
              :key="type.id"
              :label="type.name"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状態">
          <el-select
            v-model="searchForm.status"
            placeholder="すべて"
            style="width: 150px"
            clearable
            @change="handleSearch"
          >
            <el-option label="下書き" value="DRAFT" />
            <el-option label="申請中" value="SUBMITTED" />
            <el-option label="承認中" value="IN_PROGRESS" />
            <el-option label="承認済み" value="APPROVED" />
            <el-option label="却下" value="REJECTED" />
            <el-option label="キャンセル" value="CANCELLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="申請者">
          <el-select
            v-model="searchForm.requesterId"
            placeholder="すべて"
            style="width: 150px"
            clearable
            filterable
            @change="handleSearch"
          >
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 申請一覧 -->
    <el-card class="table-card">
      <el-table
        :data="requests"
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column prop="requestNumber" label="申請番号" width="150" />
        <el-table-column prop="title" label="タイトル" min-width="200" show-overflow-tooltip />
        <el-table-column prop="workflowType" label="種類" width="150">
          <template #default="{ row }">
            {{ row.workflowType?.name }}
          </template>
        </el-table-column>
        <el-table-column prop="requester" label="申請者" width="120">
          <template #default="{ row }">
            {{ row.requester?.name }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金額" width="120">
          <template #default="{ row }">
            <span v-if="row.amount">¥{{ row.amount.toLocaleString() }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="優先度" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityTagType(row.priority)">
              {{ getPriorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状態" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dueDate" label="期限日" width="120">
          <template #default="{ row }">
            <span v-if="row.dueDate">{{ formatDate(row.dueDate) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申請日" width="120">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewRequest(row)">詳細</el-button>
            <el-button
              v-if="row.status === 'DRAFT'"
              size="small"
              type="primary"
              @click="editRequest(row)"
            >
              編集
            </el-button>
            <el-button
              v-if="row.status === 'DRAFT'"
              size="small"
              type="success"
              @click="submitRequest(row)"
            >
              提出
            </el-button>
            <el-button
              v-if="['SUBMITTED', 'IN_PROGRESS'].includes(row.status)"
              size="small"
              type="danger"
              @click="cancelRequest(row)"
            >
              キャンセル
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

    <!-- 申請作成・編集ダイアログ -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingItem ? '申請編集' : '新規申請'"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="requestFormRef"
        :model="requestForm"
        :rules="requestRules"
        label-width="120px"
      >
        <el-form-item label="ワークフロー" prop="workflowTypeId">
          <el-select
            v-model="requestForm.workflowTypeId"
            placeholder="選択してください"
            style="width: 100%"
            @change="onWorkflowTypeChange"
          >
            <el-option
              v-for="type in workflowTypes"
              :key="type.id"
              :label="type.name"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="タイトル" prop="title">
          <el-input v-model="requestForm.title" placeholder="申請のタイトルを入力" />
        </el-form-item>
        <el-form-item label="説明">
          <el-input
            v-model="requestForm.description"
            type="textarea"
            :rows="3"
            placeholder="申請の詳細説明を入力"
          />
        </el-form-item>
        <el-form-item label="金額" v-if="selectedWorkflowType?.maxAmount">
          <el-input-number
            v-model="requestForm.amount"
            :min="0"
            :max="selectedWorkflowType.maxAmount"
            :step="100"
            style="width: 200px"
          />
          <span style="margin-left: 10px; color: #999;">
            円（上限: ¥{{ selectedWorkflowType.maxAmount.toLocaleString() }}）
          </span>
        </el-form-item>
        <el-form-item label="優先度">
          <el-select v-model="requestForm.priority" style="width: 150px">
            <el-option label="低" value="LOW" />
            <el-option label="通常" value="NORMAL" />
            <el-option label="高" value="HIGH" />
            <el-option label="緊急" value="URGENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="期限日">
          <el-date-picker
            v-model="requestForm.dueDate"
            type="date"
            placeholder="期限日を選択"
            :disabled-date="disabledDate"
            style="width: 200px"
          />
        </el-form-item>

        <!-- 動的フォーム項目 -->
        <div v-if="selectedWorkflowType?.formSchema" class="dynamic-form">
          <h4>申請内容</h4>
          <template v-for="field in dynamicFields" :key="field.name">
            <el-form-item :label="field.label" :prop="`formData.${field.name}`">
              <!-- テキスト入力 -->
              <el-input
                v-if="field.type === 'text'"
                v-model="requestForm.formData[field.name]"
                :placeholder="field.placeholder"
              />
              <!-- 数値入力 -->
              <el-input-number
                v-else-if="field.type === 'number'"
                v-model="requestForm.formData[field.name]"
                :min="field.min"
                :max="field.max"
                :step="field.step || 1"
              />
              <!-- 日付選択 -->
              <el-date-picker
                v-else-if="field.type === 'date'"
                v-model="requestForm.formData[field.name]"
                type="date"
                :placeholder="field.placeholder"
              />
              <!-- 選択肢 -->
              <el-select
                v-else-if="field.type === 'select'"
                v-model="requestForm.formData[field.name]"
                :placeholder="field.placeholder"
              >
                <el-option
                  v-for="option in field.options"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </template>
        </div>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelEdit">キャンセル</el-button>
          <el-button @click="saveDraft" :loading="saving">下書き保存</el-button>
          <el-button type="primary" @click="saveAndSubmit" :loading="saving">
            保存して提出
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 詳細表示ダイアログ -->
    <el-dialog
      v-model="showDetailDialog"
      title="申請詳細"
      width="800px"
    >
      <div v-if="selectedItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申請番号">{{ selectedItem.requestNumber }}</el-descriptions-item>
          <el-descriptions-item label="タイトル">{{ selectedItem.title }}</el-descriptions-item>
          <el-descriptions-item label="ワークフロー">{{ selectedItem.workflowType?.name }}</el-descriptions-item>
          <el-descriptions-item label="申請者">{{ selectedItem.requester?.name }}</el-descriptions-item>
          <el-descriptions-item label="状態">
            <el-tag :type="getStatusTagType(selectedItem.status)">
              {{ getStatusLabel(selectedItem.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="優先度">
            <el-tag :type="getPriorityTagType(selectedItem.priority)">
              {{ getPriorityLabel(selectedItem.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金額">
            <span v-if="selectedItem.amount">¥{{ selectedItem.amount.toLocaleString() }}</span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="期限日">
            <span v-if="selectedItem.dueDate">{{ formatDate(selectedItem.dueDate) }}</span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="申請日" span="2">
            {{ formatDateTime(selectedItem.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedItem.description" style="margin-top: 20px;">
          <h4>説明</h4>
          <p>{{ selectedItem.description }}</p>
        </div>

        <div v-if="selectedItem.formData && Object.keys(selectedItem.formData).length" style="margin-top: 20px;">
          <h4>申請内容</h4>
          <el-descriptions border>
            <el-descriptions-item
              v-for="(value, key) in selectedItem.formData"
              :key="key"
              :label="key"
            >
              {{ value }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 承認履歴 -->
        <div style="margin-top: 20px;">
          <h4>承認履歴</h4>
          <el-timeline>
            <el-timeline-item
              v-for="history in approvalHistory"
              :key="history.id"
              :timestamp="formatDateTime(history.createdAt)"
              :type="getHistoryType(history.action)"
            >
              <h4>{{ getActionLabel(history.action) }}</h4>
              <p>承認者: {{ history.approver?.name }}</p>
              <p v-if="history.comment">コメント: {{ history.comment }}</p>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>

    <!-- 提出確認ダイアログ -->
    <el-dialog
      v-model="showSubmitDialog"
      title="申請提出確認"
      width="500px"
    >
      <p>この申請を提出しますか？提出後は編集できなくなります。</p>
      <el-form :model="submitForm" label-width="80px">
        <el-form-item label="コメント">
          <el-input
            v-model="submitForm.comment"
            type="textarea"
            :rows="3"
            placeholder="提出時のコメント（任意）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSubmitDialog = false">キャンセル</el-button>
          <el-button type="primary" @click="confirmSubmit" :loading="submitting">
            提出
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { hasPermission } from '@/utils/auth'
import { formatDate, formatDateTime } from '@/utils/date'

// リアクティブデータ
const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const requests = ref([])
const workflowTypes = ref([])
const users = ref([])
const approvalHistory = ref([])
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showSubmitDialog = ref(false)
const editingItem = ref(null)
const selectedItem = ref(null)
const submittingItem = ref(null)

const searchForm = reactive({
  search: '',
  workflowTypeId: null,
  status: '',
  requesterId: null
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const requestForm = reactive({
  workflowTypeId: null,
  title: '',
  description: '',
  amount: 0,
  priority: 'NORMAL',
  dueDate: null,
  formData: {}
})

const submitForm = reactive({
  comment: ''
})

const requestFormRef = ref<FormInstance>()

// バリデーションルール
const requestRules: FormRules = {
  workflowTypeId: [
    { required: true, message: 'ワークフロータイプを選択してください', trigger: 'change' }
  ],
  title: [
    { required: true, message: 'タイトルを入力してください', trigger: 'blur' },
    { min: 1, max: 100, message: '1-100文字で入力してください', trigger: 'blur' }
  ]
}

// 算出プロパティ
const selectedWorkflowType = computed(() => {
  return workflowTypes.value.find(type => type.id === requestForm.workflowTypeId)
})

const dynamicFields = computed(() => {
  if (!selectedWorkflowType.value?.formSchema?.fields) return []
  return selectedWorkflowType.value.formSchema.fields
})

// メソッド
const fetchRequests = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString()
    })

    if (searchForm.search) params.append('search', searchForm.search)
    if (searchForm.workflowTypeId) params.append('workflowTypeId', searchForm.workflowTypeId.toString())
    if (searchForm.status) params.append('status', searchForm.status)
    if (searchForm.requesterId) params.append('requesterId', searchForm.requesterId.toString())

    const response = await fetch(`/api/workflow/requests?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      requests.value = data.data
      pagination.total = data.pagination.total
    } else {
      ElMessage.error('申請一覧の取得に失敗しました')
    }
  } catch (error) {
    ElMessage.error('通信エラーが発生しました')
  } finally {
    loading.value = false
  }
}

const fetchWorkflowTypes = async () => {
  try {
    const response = await fetch('/api/workflow/types?limit=100', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      workflowTypes.value = data.data.filter(type => type.isActive)
    }
  } catch (error) {
    console.error('ワークフロータイプの取得に失敗:', error)
  }
}

const fetchUsers = async () => {
  try {
    const response = await fetch('/api/users?limit=100', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      users.value = data.data
    }
  } catch (error) {
    console.error('ユーザー一覧の取得に失敗:', error)
  }
}

const fetchApprovalHistory = async (requestId: number) => {
  try {
    const response = await fetch(`/api/approval/requests/${requestId}/history`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      approvalHistory.value = await response.json()
    }
  } catch (error) {
    console.error('承認履歴の取得に失敗:', error)
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchRequests()
}

const handleSizeChange = (val: number) => {
  pagination.limit = val
  fetchRequests()
}

const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchRequests()
}

const viewRequest = async (item: any) => {
  selectedItem.value = item
  await fetchApprovalHistory(item.id)
  showDetailDialog.value = true
}

const editRequest = (item: any) => {
  editingItem.value = item
  Object.assign(requestForm, {
    workflowTypeId: item.workflowTypeId,
    title: item.title,
    description: item.description || '',
    amount: item.amount || 0,
    priority: item.priority || 'NORMAL',
    dueDate: item.dueDate ? new Date(item.dueDate) : null,
    formData: item.formData || {}
  })
  showCreateDialog.value = true
}

const submitRequest = (item: any) => {
  submittingItem.value = item
  submitForm.comment = ''
  showSubmitDialog.value = true
}

const cancelRequest = async (item: any) => {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      'キャンセルの理由を入力してください',
      '申請キャンセル',
      {
        confirmButtonText: 'キャンセル実行',
        cancelButtonText: '取消',
        inputPlaceholder: 'キャンセル理由',
        inputValidator: (value) => {
          if (!value) return 'キャンセル理由を入力してください'
          if (value.length > 1000) return '1000文字以内で入力してください'
          return true
        }
      }
    )

    const response = await fetch(`/api/workflow/requests/${item.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ reason })
    })

    if (response.ok) {
      ElMessage.success('申請をキャンセルしました')
      fetchRequests()
    } else {
      const error = await response.json()
      ElMessage.error(error.error || 'キャンセルに失敗しました')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('キャンセルに失敗しました')
    }
  }
}

const onWorkflowTypeChange = () => {
  requestForm.formData = {}
  if (selectedWorkflowType.value?.formSchema?.fields) {
    selectedWorkflowType.value.formSchema.fields.forEach(field => {
      requestForm.formData[field.name] = field.defaultValue || ''
    })
  }
}

const saveDraft = async () => {
  await saveRequest('DRAFT')
}

const saveAndSubmit = async () => {
  await saveRequest('SUBMITTED')
}

const saveRequest = async (status: string) => {
  if (!requestFormRef.value) return

  try {
    await requestFormRef.value.validate()
    saving.value = true

    const url = editingItem.value
      ? `/api/workflow/requests/${editingItem.value.id}`
      : '/api/workflow/requests'

    const method = editingItem.value ? 'PUT' : 'POST'

    const requestData = {
      ...requestForm,
      status,
      dueDate: requestForm.dueDate ? requestForm.dueDate.toISOString().split('T')[0] : null
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(requestData)
    })

    if (response.ok) {
      const message = status === 'DRAFT' ? '下書きを保存しました' : '申請を提出しました'
      ElMessage.success(message)
      cancelEdit()
      fetchRequests()
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

const confirmSubmit = async () => {
  if (!submittingItem.value) return

  submitting.value = true
  try {
    const response = await fetch(`/api/workflow/requests/${submittingItem.value.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ comment: submitForm.comment })
    })

    if (response.ok) {
      ElMessage.success('申請を提出しました')
      showSubmitDialog.value = false
      submittingItem.value = null
      fetchRequests()
    } else {
      const error = await response.json()
      ElMessage.error(error.error || '提出に失敗しました')
    }
  } catch (error) {
    ElMessage.error('提出に失敗しました')
  } finally {
    submitting.value = false
  }
}

const cancelEdit = () => {
  showCreateDialog.value = false
  editingItem.value = null
  Object.assign(requestForm, {
    workflowTypeId: null,
    title: '',
    description: '',
    amount: 0,
    priority: 'NORMAL',
    dueDate: null,
    formData: {}
  })
  requestFormRef.value?.resetFields()
}

const disabledDate = (time: Date) => {
  return time.getTime() < Date.now() - 8.64e7 // 昨日以前は選択不可
}

// ラベル・タグタイプ関数
const getStatusLabel = (status: string) => {
  const labels = {
    DRAFT: '下書き',
    SUBMITTED: '申請中',
    IN_PROGRESS: '承認中',
    APPROVED: '承認済み',
    REJECTED: '却下',
    CANCELLED: 'キャンセル'
  }
  return labels[status] || status
}

const getStatusTagType = (status: string) => {
  const types = {
    DRAFT: 'info',
    SUBMITTED: 'warning',
    IN_PROGRESS: 'primary',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'info'
  }
  return types[status] || 'info'
}

const getPriorityLabel = (priority: string) => {
  const labels = {
    LOW: '低',
    NORMAL: '通常',
    HIGH: '高',
    URGENT: '緊急'
  }
  return labels[priority] || priority
}

const getPriorityTagType = (priority: string) => {
  const types = {
    LOW: 'info',
    NORMAL: 'primary',
    HIGH: 'warning',
    URGENT: 'danger'
  }
  return types[priority] || 'primary'
}

const getActionLabel = (action: string) => {
  const labels = {
    PENDING: '承認待ち',
    APPROVE: '承認',
    REJECT: '却下',
    RETURN: '差し戻し',
    DELEGATE: '委譲'
  }
  return labels[action] || action
}

const getHistoryType = (action: string) => {
  const types = {
    PENDING: 'primary',
    APPROVE: 'success',
    REJECT: 'danger',
    RETURN: 'warning',
    DELEGATE: 'info'
  }
  return types[action] || 'primary'
}

// ライフサイクル
onMounted(() => {
  fetchRequests()
  fetchWorkflowTypes()
  fetchUsers()
})
</script>

<style scoped>
.workflow-requests {
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

.dynamic-form {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.dynamic-form h4 {
  margin: 0 0 20px 0;
  color: #303133;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: #909399;
}
</style>