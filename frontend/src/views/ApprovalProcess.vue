<template>
  <div class="approval-process">
    <div class="page-header">
      <h1 class="page-title">承認処理</h1>
      <div class="header-stats">
        <el-statistic
          title="承認待ち件数"
          :value="pendingCount"
          :loading="loading"
        />
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
        <el-form-item label="優先度">
          <el-select
            v-model="searchForm.priority"
            placeholder="すべて"
            style="width: 120px"
            clearable
            @change="handleSearch"
          >
            <el-option label="緊急" value="URGENT" />
            <el-option label="高" value="HIGH" />
            <el-option label="通常" value="NORMAL" />
            <el-option label="低" value="LOW" />
          </el-select>
        </el-form-item>
        <el-form-item label="期限">
          <el-select
            v-model="searchForm.dueFilter"
            placeholder="すべて"
            style="width: 150px"
            clearable
            @change="handleSearch"
          >
            <el-option label="今日まで" value="today" />
            <el-option label="明日まで" value="tomorrow" />
            <el-option label="1週間以内" value="week" />
            <el-option label="期限超過" value="overdue" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 承認待ち一覧 -->
    <el-card class="table-card">
      <div class="table-header">
        <h3>承認待ち申請</h3>
        <div class="batch-actions">
          <el-button
            type="success"
            :disabled="!selectedItems.length"
            @click="batchApprove"
          >
            一括承認 ({{ selectedItems.length }})
          </el-button>
          <el-button
            type="danger"
            :disabled="!selectedItems.length"
            @click="batchReject"
          >
            一括却下 ({{ selectedItems.length }})
          </el-button>
        </div>
      </div>

      <el-table
        :data="pendingRequests"
        v-loading="loading"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
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
        <el-table-column prop="dueDate" label="期限日" width="120">
          <template #default="{ row }">
            <span
              v-if="row.dueDate"
              :class="{ 'overdue': isOverdue(row.dueDate), 'urgent': isUrgent(row.dueDate) }"
            >
              {{ formatDate(row.dueDate) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="waitingDays" label="待機日数" width="100">
          <template #default="{ row }">
            {{ getWaitingDays(row.createdAt) }}日
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewRequest(row)">詳細</el-button>
            <el-button
              size="small"
              type="success"
              @click="approveRequest(row)"
            >
              承認
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="rejectRequest(row)"
            >
              却下
            </el-button>
            <el-button
              size="small"
              type="warning"
              @click="returnRequest(row)"
            >
              差し戻し
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

    <!-- 承認・却下ダイアログ -->
    <el-dialog
      v-model="showApprovalDialog"
      :title="approvalAction === 'APPROVE' ? '承認確認' : '却下確認'"
      width="600px"
    >
      <div v-if="processingItem">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申請番号">{{ processingItem.requestNumber }}</el-descriptions-item>
          <el-descriptions-item label="タイトル">{{ processingItem.title }}</el-descriptions-item>
          <el-descriptions-item label="申請者">{{ processingItem.requester?.name }}</el-descriptions-item>
          <el-descriptions-item label="金額">
            <span v-if="processingItem.amount">¥{{ processingItem.amount.toLocaleString() }}</span>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px;">
          <h4>{{ approvalAction === 'APPROVE' ? '承認' : '却下' }}理由・コメント</h4>
          <el-input
            v-model="approvalForm.comment"
            type="textarea"
            :rows="4"
            :placeholder="approvalAction === 'APPROVE' ? '承認コメント（任意）' : '却下理由を入力してください'"
            maxlength="1000"
            show-word-limit
          />
        </div>

        <!-- 代理承認の場合 -->
        <div v-if="isDelegated" style="margin-top: 15px;">
          <el-alert
            title="代理承認"
            type="info"
            :description="`${delegatedBy?.name}様の代理として承認を行います`"
            :closable="false"
          />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showApprovalDialog = false">キャンセル</el-button>
          <el-button
            :type="approvalAction === 'APPROVE' ? 'success' : 'danger'"
            @click="confirmApproval"
            :loading="processing"
          >
            {{ approvalAction === 'APPROVE' ? '承認' : '却下' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 差し戻しダイアログ -->
    <el-dialog
      v-model="showReturnDialog"
      title="差し戻し確認"
      width="600px"
    >
      <div v-if="processingItem">
        <p>申請「{{ processingItem.title }}」を申請者に差し戻しますか？</p>

        <div style="margin-top: 20px;">
          <h4>差し戻し理由 <span style="color: red;">*</span></h4>
          <el-input
            v-model="returnForm.reason"
            type="textarea"
            :rows="4"
            placeholder="差し戻し理由を入力してください"
            maxlength="1000"
            show-word-limit
          />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showReturnDialog = false">キャンセル</el-button>
          <el-button
            type="warning"
            @click="confirmReturn"
            :loading="processing"
            :disabled="!returnForm.reason"
          >
            差し戻し
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 詳細表示ダイアログ -->
    <el-dialog
      v-model="showDetailDialog"
      title="申請詳細"
      width="900px"
    >
      <div v-if="selectedItem" class="detail-content">
        <!-- 基本情報 -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申請番号">{{ selectedItem.requestNumber }}</el-descriptions-item>
          <el-descriptions-item label="タイトル">{{ selectedItem.title }}</el-descriptions-item>
          <el-descriptions-item label="ワークフロー">{{ selectedItem.workflowType?.name }}</el-descriptions-item>
          <el-descriptions-item label="申請者">{{ selectedItem.requester?.name }}</el-descriptions-item>
          <el-descriptions-item label="部署">{{ selectedItem.department?.name }}</el-descriptions-item>
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

        <!-- 説明 -->
        <div v-if="selectedItem.description" style="margin-top: 20px;">
          <h4>説明</h4>
          <p style="background: #f5f7fa; padding: 15px; border-radius: 4px;">
            {{ selectedItem.description }}
          </p>
        </div>

        <!-- 申請内容 -->
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
              <p v-if="history.delegatedBy">代理承認: {{ history.delegatedBy?.name }}様の代理</p>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 承認アクション -->
        <div class="approval-actions" style="margin-top: 30px; text-align: center; border-top: 1px solid #ebeef5; padding-top: 20px;">
          <el-button
            type="success"
            size="large"
            @click="approveRequest(selectedItem)"
            style="margin-right: 15px;"
          >
            <el-icon><Check /></el-icon>
            承認
          </el-button>
          <el-button
            type="danger"
            size="large"
            @click="rejectRequest(selectedItem)"
            style="margin-right: 15px;"
          >
            <el-icon><Close /></el-icon>
            却下
          </el-button>
          <el-button
            type="warning"
            size="large"
            @click="returnRequest(selectedItem)"
          >
            <el-icon><RefreshLeft /></el-icon>
            差し戻し
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 一括処理ダイアログ -->
    <el-dialog
      v-model="showBatchDialog"
      :title="batchAction === 'APPROVE' ? '一括承認確認' : '一括却下確認'"
      width="700px"
    >
      <div>
        <p>以下の{{ selectedItems.length }}件の申請を{{ batchAction === 'APPROVE' ? '承認' : '却下' }}しますか？</p>

        <el-table :data="selectedItems" max-height="300">
          <el-table-column prop="requestNumber" label="申請番号" width="150" />
          <el-table-column prop="title" label="タイトル" show-overflow-tooltip />
          <el-table-column prop="requester.name" label="申請者" width="120" />
        </el-table>

        <div style="margin-top: 20px;">
          <h4>{{ batchAction === 'APPROVE' ? '承認' : '却下' }}コメント</h4>
          <el-input
            v-model="batchForm.comment"
            type="textarea"
            :rows="3"
            :placeholder="batchAction === 'APPROVE' ? '一括承認コメント（任意）' : '一括却下理由を入力してください'"
            maxlength="1000"
            show-word-limit
          />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showBatchDialog = false">キャンセル</el-button>
          <el-button
            :type="batchAction === 'APPROVE' ? 'success' : 'danger'"
            @click="confirmBatchProcess"
            :loading="processing"
          >
            {{ batchAction === 'APPROVE' ? '一括承認' : '一括却下' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close, RefreshLeft } from '@element-plus/icons-vue'
import { formatDate, formatDateTime } from '@/utils/date'

// リアクティブデータ
const loading = ref(false)
const processing = ref(false)
const pendingRequests = ref([])
const workflowTypes = ref([])
const approvalHistory = ref([])
const selectedItems = ref([])
const pendingCount = ref(0)

const showApprovalDialog = ref(false)
const showReturnDialog = ref(false)
const showDetailDialog = ref(false)
const showBatchDialog = ref(false)

const processingItem = ref(null)
const selectedItem = ref(null)
const approvalAction = ref('')
const batchAction = ref('')
const isDelegated = ref(false)
const delegatedBy = ref(null)

const searchForm = reactive({
  search: '',
  workflowTypeId: null,
  priority: '',
  dueFilter: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const approvalForm = reactive({
  comment: ''
})

const returnForm = reactive({
  reason: ''
})

const batchForm = reactive({
  comment: ''
})

// メソッド
const fetchPendingRequests = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString()
    })

    if (searchForm.search) params.append('search', searchForm.search)
    if (searchForm.workflowTypeId) params.append('workflowTypeId', searchForm.workflowTypeId.toString())
    if (searchForm.priority) params.append('priority', searchForm.priority)

    const response = await fetch(`/api/workflow/pending-approvals?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      pendingRequests.value = data.data
      pagination.total = data.pagination.total
      pendingCount.value = data.pagination.total
    } else {
      ElMessage.error('承認待ち一覧の取得に失敗しました')
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
  fetchPendingRequests()
}

const handleSizeChange = (val: number) => {
  pagination.limit = val
  fetchPendingRequests()
}

const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchPendingRequests()
}

const handleSelectionChange = (selection: any[]) => {
  selectedItems.value = selection
}

const viewRequest = async (item: any) => {
  selectedItem.value = item
  await fetchApprovalHistory(item.id)
  showDetailDialog.value = true
}

const approveRequest = (item: any) => {
  processingItem.value = item
  approvalAction.value = 'APPROVE'
  approvalForm.comment = ''
  showApprovalDialog.value = true
}

const rejectRequest = (item: any) => {
  processingItem.value = item
  approvalAction.value = 'REJECT'
  approvalForm.comment = ''
  showApprovalDialog.value = true
}

const returnRequest = (item: any) => {
  processingItem.value = item
  returnForm.reason = ''
  showReturnDialog.value = true
}

const confirmApproval = async () => {
  if (!processingItem.value) return

  processing.value = true
  try {
    const response = await fetch(`/api/approval/requests/${processingItem.value.id}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        action: approvalAction.value,
        comment: approvalForm.comment
      })
    })

    if (response.ok) {
      const message = approvalAction.value === 'APPROVE' ? '承認しました' : '却下しました'
      ElMessage.success(message)
      showApprovalDialog.value = false
      showDetailDialog.value = false
      fetchPendingRequests()
    } else {
      const error = await response.json()
      ElMessage.error(error.error || '処理に失敗しました')
    }
  } catch (error) {
    ElMessage.error('処理に失敗しました')
  } finally {
    processing.value = false
  }
}

const confirmReturn = async () => {
  if (!processingItem.value || !returnForm.reason) return

  processing.value = true
  try {
    const response = await fetch(`/api/approval/requests/${processingItem.value.id}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        action: 'RETURN',
        comment: returnForm.reason
      })
    })

    if (response.ok) {
      ElMessage.success('差し戻しました')
      showReturnDialog.value = false
      showDetailDialog.value = false
      fetchPendingRequests()
    } else {
      const error = await response.json()
      ElMessage.error(error.error || '差し戻しに失敗しました')
    }
  } catch (error) {
    ElMessage.error('差し戻しに失敗しました')
  } finally {
    processing.value = false
  }
}

const batchApprove = () => {
  batchAction.value = 'APPROVE'
  batchForm.comment = ''
  showBatchDialog.value = true
}

const batchReject = () => {
  batchAction.value = 'REJECT'
  batchForm.comment = ''
  showBatchDialog.value = true
}

const confirmBatchProcess = async () => {
  if (!selectedItems.value.length) return

  processing.value = true
  try {
    const promises = selectedItems.value.map(item =>
      fetch(`/api/approval/requests/${item.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: batchAction.value,
          comment: batchForm.comment
        })
      })
    )

    const results = await Promise.allSettled(promises)
    const successCount = results.filter(result => result.status === 'fulfilled').length
    const failCount = results.length - successCount

    if (successCount > 0) {
      const message = batchAction.value === 'APPROVE'
        ? `${successCount}件を承認しました`
        : `${successCount}件を却下しました`
      ElMessage.success(message)
    }

    if (failCount > 0) {
      ElMessage.warning(`${failCount}件の処理に失敗しました`)
    }

    showBatchDialog.value = false
    selectedItems.value = []
    fetchPendingRequests()
  } catch (error) {
    ElMessage.error('一括処理に失敗しました')
  } finally {
    processing.value = false
  }
}

// ユーティリティ関数
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

const isOverdue = (dueDate: string) => {
  return new Date(dueDate) < new Date()
}

const isUrgent = (dueDate: string) => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return new Date(dueDate) <= tomorrow
}

const getWaitingDays = (createdAt: string) => {
  const created = new Date(createdAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - created.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// ライフサイクル
onMounted(() => {
  fetchPendingRequests()
  fetchWorkflowTypes()
})
</script>

<style scoped>
.approval-process {
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

.header-stats {
  display: flex;
  gap: 30px;
}

.search-card, .table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.table-header h3 {
  margin: 0;
  color: #303133;
}

.batch-actions {
  display: flex;
  gap: 10px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.detail-content {
  padding: 10px 0;
}

.approval-actions {
  background: #f8f9fa;
  margin: -20px -20px 0 -20px;
  padding: 20px;
  border-radius: 0 0 6px 6px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.overdue {
  color: #f56c6c;
  font-weight: bold;
}

.urgent {
  color: #e6a23c;
  font-weight: bold;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: #909399;
}

:deep(.el-statistic__content) {
  font-size: 28px;
}

:deep(.el-statistic__title) {
  font-size: 14px;
  color: #909399;
}
</style>