<template>
  <div class="bulk-user-operations">
    <PageHeader title="一括ユーザー操作" icon="Upload">
      <template #actions>
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>
          エクスポート
        </el-button>
      </template>
    </PageHeader>

    <!-- エクスポートダイアログ -->
    <el-dialog v-model="exportDialogVisible" title="ユーザー情報エクスポート" width="600px">
      <el-form :model="exportForm" label-width="140px">
        <el-form-item label="会社">
          <el-select v-model="exportForm.companyId" placeholder="全て" clearable>
            <el-option
              v-for="company in companies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部署">
          <el-select v-model="exportForm.departmentId" placeholder="全て" clearable>
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="役職">
          <el-select v-model="exportForm.role" placeholder="全て" clearable>
            <el-option label="管理者" value="ADMIN" />
            <el-option label="マネージャー" value="MANAGER" />
            <el-option label="ユーザー" value="USER" />
            <el-option label="ゲスト" value="GUEST" />
          </el-select>
        </el-form-item>
        <el-form-item label="ステータス">
          <el-radio-group v-model="exportForm.statusFilter">
            <el-radio label="active">有効のみ</el-radio>
            <el-radio label="inactive">無効のみ</el-radio>
            <el-radio label="all">全て</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportDialogVisible = false">キャンセル</el-button>
        <el-button type="primary" @click="executeExport" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          エクスポート実行
        </el-button>
      </template>
    </el-dialog>

    <el-card class="import-card">
      <template #header>
        <div class="card-header">
          <span>CSVインポート</span>
        </div>
      </template>

      <!-- ステップ表示 -->
      <el-steps :active="currentStep" finish-status="success" align-center style="margin-bottom: 30px">
        <el-step title="ファイル選択" icon="Upload" />
        <el-step title="バリデーション" icon="Check" />
        <el-step title="インポート実行" icon="Finished" />
      </el-steps>

      <!-- ステップ1: ファイル選択 -->
      <div v-if="currentStep === 0" class="step-content">
        <el-alert
          title="CSVファイル形式"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <p>以下の列を含むCSVファイルをアップロードしてください:</p>
          <ul>
            <li>ユーザー名 (必須)</li>
            <li>メールアドレス (必須)</li>
            <li>氏名 (必須)</li>
            <li>社員コード</li>
            <li>役職 (ADMIN, MANAGER, USER, GUEST)</li>
            <li>会社ID</li>
            <li>部署ID</li>
            <li>有効/無効 (有効 or 無効)</li>
          </ul>
          <p style="margin-top: 10px">
            <el-link type="primary" @click="downloadTemplate">
              <el-icon><Download /></el-icon>
              テンプレートをダウンロード
            </el-link>
          </p>
        </el-alert>

        <el-upload
          ref="uploadRef"
          drag
          :auto-upload="false"
          :limit="1"
          accept=".csv"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            ファイルをドラッグまたは<em>クリックしてアップロード</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              CSV ファイル (最大 5MB)
            </div>
          </template>
        </el-upload>

        <div v-if="selectedFile" class="file-info">
          <el-icon><Document /></el-icon>
          <span>{{ selectedFile.name }}</span>
          <el-button type="danger" size="small" text @click="clearFile">
            <el-icon><Delete /></el-icon>
            削除
          </el-button>
        </div>

        <div class="step-actions">
          <el-button
            type="primary"
            @click="validateFile"
            :disabled="!selectedFile"
            :loading="validating"
          >
            次へ: バリデーション
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- ステップ2: バリデーション結果 -->
      <div v-if="currentStep === 1" class="step-content">
        <el-alert
          :title="validationResult.isValid ? 'バリデーション成功' : 'バリデーションエラー'"
          :type="validationResult.isValid ? 'success' : 'warning'"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <p>総レコード数: {{ validationResult.totalRecords }}</p>
          <p>有効レコード数: {{ validationResult.validRecords }}</p>
          <p>無効レコード数: {{ validationResult.invalidRecords }}</p>
        </el-alert>

        <!-- エラー詳細 -->
        <div v-if="validationResult.errors && validationResult.errors.length > 0">
          <h3>エラー詳細</h3>
          <el-table :data="validationResult.errors" stripe max-height="400">
            <el-table-column prop="rowNumber" label="行番号" width="100" />
            <el-table-column prop="field" label="フィールド" width="150" />
            <el-table-column prop="value" label="値" width="150" />
            <el-table-column prop="message" label="エラーメッセージ" />
            <el-table-column prop="errorType" label="種別" width="120">
              <template #default="scope">
                <el-tag :type="getErrorTypeColor(scope.row.errorType)">
                  {{ scope.row.errorType }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="step-actions">
          <el-button @click="backToFileSelect">
            <el-icon><ArrowLeft /></el-icon>
            戻る
          </el-button>
          <el-button
            type="primary"
            @click="currentStep = 2"
            :disabled="!validationResult.isValid"
          >
            次へ: インポート実行
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- ステップ3: インポート実行 -->
      <div v-if="currentStep === 2" class="step-content">
        <el-alert
          title="インポート確認"
          type="warning"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <p>{{ validationResult.validRecords }} 件のユーザーをインポートします。</p>
          <p>この操作は取り消せません。よろしいですか?</p>
        </el-alert>

        <div v-if="importResult" class="import-result">
          <el-result
            :icon="importResult.failedRecords === 0 ? 'success' : 'warning'"
            :title="importResult.failedRecords === 0 ? 'インポート完了' : 'インポート完了（エラーあり）'"
          >
            <template #sub-title>
              <p>成功: {{ importResult.successRecords }} 件</p>
              <p>失敗: {{ importResult.failedRecords }} 件</p>
            </template>
            <template #extra>
              <el-button type="primary" @click="resetImport">
                新規インポート
              </el-button>
            </template>
          </el-result>

          <!-- インポートエラー詳細 -->
          <div v-if="importResult.errors && importResult.errors.length > 0" style="margin-top: 20px">
            <h3>エラー詳細</h3>
            <el-table :data="importResult.errors" stripe max-height="400">
              <el-table-column prop="rowNumber" label="行番号" width="100" />
              <el-table-column prop="field" label="フィールド" width="150" />
              <el-table-column prop="message" label="エラーメッセージ" />
            </el-table>
          </div>
        </div>

        <div v-else class="step-actions">
          <el-button @click="currentStep = 1">
            <el-icon><ArrowLeft /></el-icon>
            戻る
          </el-button>
          <el-button
            type="danger"
            @click="executeImport"
            :loading="importing"
          >
            <el-icon><Check /></el-icon>
            インポート実行
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- インポート履歴 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>インポート履歴</span>
          <el-button type="primary" size="small" @click="loadHistory">
            <el-icon><Refresh /></el-icon>
            更新
          </el-button>
        </div>
      </template>

      <el-table :data="historyList" stripe v-loading="historyLoading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="fileName" label="ファイル名" width="200" />
        <el-table-column prop="totalRecords" label="総件数" width="100" />
        <el-table-column prop="successRecords" label="成功" width="100">
          <template #default="scope">
            <el-tag type="success">{{ scope.row.successRecords }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="failedRecords" label="失敗" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.failedRecords > 0" type="danger">
              {{ scope.row.failedRecords }}
            </el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="ステータス" width="120">
          <template #default="scope">
            <el-tag :type="getStatusColor(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="importer.name" label="実行者" width="120" />
        <el-table-column prop="importedAt" label="実行日時" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.importedAt) }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="historyPagination.total > 0"
        v-model:current-page="historyPagination.page"
        v-model:page-size="historyPagination.limit"
        :total="historyPagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @current-change="loadHistory"
        @size-change="loadHistory"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type UploadFile, type UploadInstance } from 'element-plus'
import {
  Upload,
  Download,
  Check,
  ArrowRight,
  ArrowLeft,
  Delete,
  Document,
  UploadFilled,
  Refresh
} from '@element-plus/icons-vue'
import PageHeader from '@/components/navigation/PageHeader.vue'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// State
const currentStep = ref(0)
const selectedFile = ref<File | null>(null)
const uploadRef = ref<UploadInstance>()
const validating = ref(false)
const importing = ref(false)
const exportLoading = ref(false)
const exportDialogVisible = ref(false)
const historyLoading = ref(false)

const validationResult = reactive<any>({
  isValid: false,
  totalRecords: 0,
  validRecords: 0,
  invalidRecords: 0,
  errors: []
})

const importResult = ref<any>(null)

const exportForm = reactive({
  companyId: null,
  departmentId: null,
  role: null,
  statusFilter: 'active'
})

const companies = ref<any[]>([])
const departments = ref<any[]>([])

const historyList = ref<any[]>([])
const historyPagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})

// Methods
const handleFileChange = (file: UploadFile) => {
  selectedFile.value = file.raw || null
}

const handleExceed = () => {
  ElMessage.warning('一度に1つのファイルのみアップロードできます')
}

const clearFile = () => {
  selectedFile.value = null
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

const validateFile = async () => {
  if (!selectedFile.value) return

  validating.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const token = localStorage.getItem('token')
    const response = await axios.post(
      `${API_BASE_URL}/api/bulk-operations/users/validate`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      }
    )

    if (response.data.success) {
      Object.assign(validationResult, response.data.data)
      currentStep.value = 1
      ElMessage.success('バリデーションが完了しました')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'バリデーションに失敗しました')
  } finally {
    validating.value = false
  }
}

const executeImport = async () => {
  if (!selectedFile.value) return

  try {
    await ElMessageBox.confirm(
      `${validationResult.validRecords} 件のユーザーをインポートします。よろしいですか?`,
      '確認',
      {
        confirmButtonText: '実行',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    )

    importing.value = true

    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const token = localStorage.getItem('token')
    const response = await axios.post(
      `${API_BASE_URL}/api/bulk-operations/users/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      }
    )

    if (response.data.success) {
      importResult.value = response.data.data
      ElMessage.success('インポートが完了しました')
      loadHistory()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || 'インポートに失敗しました')
    }
  } finally {
    importing.value = false
  }
}

const backToFileSelect = () => {
  currentStep.value = 0
  clearFile()
  Object.assign(validationResult, {
    isValid: false,
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    errors: []
  })
}

const resetImport = () => {
  currentStep.value = 0
  importResult.value = null
  clearFile()
  Object.assign(validationResult, {
    isValid: false,
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    errors: []
  })
}

const handleExport = () => {
  exportDialogVisible.value = true
}

const executeExport = async () => {
  exportLoading.value = true

  try {
    const params: any = {}
    if (exportForm.companyId) params.companyId = exportForm.companyId
    if (exportForm.departmentId) params.departmentId = exportForm.departmentId
    if (exportForm.role) params.role = exportForm.role

    if (exportForm.statusFilter === 'active') {
      params.isActive = true
    } else if (exportForm.statusFilter === 'inactive') {
      params.isActive = false
    } else {
      params.includeInactive = true
    }

    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_BASE_URL}/api/bulk-operations/users/export`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      },
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    ElMessage.success('エクスポートが完了しました')
    exportDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error('エクスポートに失敗しました')
  } finally {
    exportLoading.value = false
  }
}

const downloadTemplate = () => {
  const template = `ユーザー名,メールアドレス,氏名,社員コード,役職,会社ID,部署ID,有効/無効
user001,user001@example.com,山田太郎,EMP001,USER,1,1,有効
user002,user002@example.com,佐藤花子,EMP002,MANAGER,1,2,有効`

  const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'user_import_template.csv'
  link.click()
}

const loadHistory = async () => {
  historyLoading.value = true

  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_BASE_URL}/api/bulk-operations/history`, {
      params: {
        page: historyPagination.page,
        limit: historyPagination.limit
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (response.data.success) {
      historyList.value = response.data.data
      Object.assign(historyPagination, response.data.pagination)
    }
  } catch (error: any) {
    ElMessage.error('履歴の取得に失敗しました')
  } finally {
    historyLoading.value = false
  }
}

const loadCompanies = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_BASE_URL}/api/companies`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    companies.value = response.data.data || []
  } catch (error) {
    console.error('Failed to load companies:', error)
  }
}

const loadDepartments = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_BASE_URL}/api/departments`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    departments.value = response.data.data || []
  } catch (error) {
    console.error('Failed to load departments:', error)
  }
}

const getErrorTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    REQUIRED: 'danger',
    FORMAT: 'warning',
    DUPLICATE: 'danger',
    NOT_FOUND: 'warning',
    INVALID: 'danger'
  }
  return colors[type] || 'info'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    COMPLETED: 'success',
    PROCESSING: 'warning',
    FAILED: 'danger',
    PENDING: 'info'
  }
  return colors[status] || 'info'
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('ja-JP')
}

onMounted(() => {
  loadHistory()
  loadCompanies()
  loadDepartments()
})
</script>

<style scoped>
.bulk-user-operations {
  padding: 20px;
}

.import-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-content {
  min-height: 300px;
  padding: 20px 0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 30px;
}

.import-result {
  margin-top: 20px;
}

.el-upload__tip ul {
  margin: 10px 0;
  padding-left: 20px;
}
</style>
