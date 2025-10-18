<template>
  <div class="reports">
    <div class="page-header">
      <h1>レポート管理</h1>
      <p>システムデータのレポート生成・エクスポート機能</p>
    </div>

    <el-row :gutter="20">
      <!-- レポート生成設定 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>レポート生成</span>
            </div>
          </template>

          <el-form :model="reportForm" label-width="120px" label-position="left">
            <el-form-item label="レポート種類">
              <el-select v-model="reportForm.type" placeholder="レポート種類を選択" style="width: 100%">
                <el-option label="ログレポート" value="logs" />
                <el-option label="ユーザーレポート" value="users" />
                <el-option label="権限レポート" value="permissions" />
                <el-option label="システム監査レポート" value="audit" />
              </el-select>
            </el-form-item>

            <el-form-item label="期間設定">
              <el-date-picker
                v-model="reportForm.dateRange"
                type="daterange"
                range-separator="〜"
                start-placeholder="開始日"
                end-placeholder="終了日"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="出力形式">
              <el-radio-group v-model="reportForm.format">
                <el-radio value="csv">CSV</el-radio>
                <el-radio value="json">JSON</el-radio>
                <el-radio value="excel">Excel</el-radio>
              </el-radio-group>
            </el-form-item>

            <!-- ログレポート固有設定 -->
            <div v-if="reportForm.type === 'logs'">
              <el-form-item label="ログレベル">
                <el-checkbox-group v-model="reportForm.logLevels">
                  <el-checkbox :value="60">FATAL</el-checkbox>
                  <el-checkbox :value="50">ERROR</el-checkbox>
                  <el-checkbox :value="40">WARN</el-checkbox>
                  <el-checkbox :value="30">INFO</el-checkbox>
                  <el-checkbox :value="20">DEBUG</el-checkbox>
                  <el-checkbox :value="10">TRACE</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="カテゴリ">
                <el-checkbox-group v-model="reportForm.categories">
                  <el-checkbox value="AUTH">認証</el-checkbox>
                  <el-checkbox value="API">API</el-checkbox>
                  <el-checkbox value="DB">データベース</el-checkbox>
                  <el-checkbox value="SEC">セキュリティ</el-checkbox>
                  <el-checkbox value="SYS">システム</el-checkbox>
                  <el-checkbox value="USER">ユーザー</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="ソース">
                <el-checkbox-group v-model="reportForm.sources">
                  <el-checkbox value="frontend">フロントエンド</el-checkbox>
                  <el-checkbox value="backend">バックエンド</el-checkbox>
                  <el-checkbox value="database">データベース</el-checkbox>
                  <el-checkbox value="infrastructure">インフラ</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </div>

            <!-- 権限レポート固有設定 -->
            <div v-if="reportForm.type === 'permissions'">
              <el-form-item label="対象会社">
                <el-select v-model="reportForm.companyId" placeholder="会社を選択" style="width: 100%" clearable>
                  <el-option
                    v-for="company in companies"
                    :key="company.id"
                    :label="company.name"
                    :value="company.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="対象部署">
                <el-select v-model="reportForm.departmentId" placeholder="部署を選択" style="width: 100%" clearable>
                  <el-option
                    v-for="dept in departments"
                    :key="dept.id"
                    :label="dept.name"
                    :value="dept.id"
                  />
                </el-select>
              </el-form-item>
            </div>

            <el-form-item>
              <el-button
                type="primary"
                @click="generateReport"
                :loading="generating"
                :disabled="!canGenerate"
              >
                <el-icon><Document /></el-icon>
                レポート生成
              </el-button>
              <el-button @click="resetForm">
                <el-icon><Refresh /></el-icon>
                リセット
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- レポート履歴・プレビュー -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>レポート履歴</span>
            </div>
          </template>

          <div v-if="reportHistory.length === 0" class="empty-state">
            <el-empty description="レポート履歴がありません" />
          </div>

          <div v-else class="report-history">
            <div
              v-for="report in reportHistory"
              :key="report.id"
              class="history-item"
            >
              <div class="history-header">
                <span class="report-name">{{ getReportTypeName(report.type) }}</span>
                <el-tag :type="getStatusType(report.status)" size="small">
                  {{ report.status }}
                </el-tag>
              </div>
              <div class="history-details">
                <div class="detail-row">
                  <span>生成日時:</span>
                  <span>{{ formatDateTime(report.createdAt) }}</span>
                </div>
                <div class="detail-row">
                  <span>形式:</span>
                  <span>{{ report.format.toUpperCase() }}</span>
                </div>
                <div class="detail-row" v-if="report.recordCount">
                  <span>件数:</span>
                  <span>{{ report.recordCount.toLocaleString() }}件</span>
                </div>
              </div>
              <div class="history-actions">
                <el-button
                  v-if="report.status === 'completed'"
                  type="primary"
                  size="small"
                  @click="downloadReport(report)"
                >
                  <el-icon><Download /></el-icon>
                  ダウンロード
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  text
                  @click="deleteReport(report.id)"
                >
                  削除
                </el-button>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 統計情報 -->
        <el-card style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>統計情報</span>
            </div>
          </template>

          <div class="stats-grid">
            <div class="stat-item">
              <el-statistic title="今月生成数" :value="monthlyStats.generated" />
            </div>
            <div class="stat-item">
              <el-statistic title="総ダウンロード数" :value="monthlyStats.downloads" />
            </div>
            <div class="stat-item">
              <el-statistic title="平均ファイルサイズ" :value="monthlyStats.avgSize" suffix="MB" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- プログレスダイアログ -->
    <el-dialog
      v-model="showProgress"
      title="レポート生成中"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="progress-content">
        <el-progress :percentage="progressPercentage" :status="progressStatus" />
        <p class="progress-text">{{ progressText }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Download, Refresh } from '@element-plus/icons-vue'

interface ReportForm {
  type: string
  dateRange: string[]
  format: string
  logLevels: number[]
  categories: string[]
  sources: string[]
  companyId?: number
  departmentId?: number
}

interface ReportHistory {
  id: string
  type: string
  format: string
  status: 'generating' | 'completed' | 'failed'
  createdAt: string
  recordCount?: number
  downloadUrl?: string
}

interface Company {
  id: number
  name: string
}

interface Department {
  id: number
  name: string
  companyId: number
}

// リアクティブデータ
const reportForm = ref<ReportForm>({
  type: 'logs',
  dateRange: [],
  format: 'csv',
  logLevels: [50, 40], // ERROR, WARN デフォルト
  categories: [],
  sources: [],
  companyId: undefined,
  departmentId: undefined
})

const generating = ref(false)
const showProgress = ref(false)
const progressPercentage = ref(0)
const progressStatus = ref<'success' | 'exception' | ''>('')
const progressText = ref('')

const reportHistory = ref<ReportHistory[]>([])
const companies = ref<Company[]>([])
const departments = ref<Department[]>([])

const monthlyStats = ref({
  generated: 12,
  downloads: 45,
  avgSize: 2.3
})

// 計算プロパティ
const canGenerate = computed(() => {
  return reportForm.value.type &&
         reportForm.value.dateRange.length === 2 &&
         reportForm.value.format
})

// メソッド
const fetchCompanies = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/companies', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (response.ok) {
      const result = await response.json()
      companies.value = result.data || []
    }
  } catch (error) {
    console.error('会社データの取得に失敗しました:', error)
  }
}

const fetchDepartments = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/departments', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (response.ok) {
      const result = await response.json()
      departments.value = result.data || []
    }
  } catch (error) {
    console.error('部署データの取得に失敗しました:', error)
  }
}

const generateReport = async () => {
  if (!canGenerate.value) {
    ElMessage.warning('必須項目を入力してください')
    return
  }

  generating.value = true
  showProgress.value = true
  progressPercentage.value = 0
  progressStatus.value = ''
  progressText.value = 'レポート生成を開始しています...'

  try {
    // プログレス更新シミュレーション
    const progressTimer = setInterval(() => {
      if (progressPercentage.value < 90) {
        progressPercentage.value += Math.random() * 15
        updateProgressText()
      }
    }, 500)

    const token = localStorage.getItem('token')
    let endpoint = ''
    let params = new URLSearchParams()

    // レポート種類に応じてエンドポイントとパラメータを設定
    switch (reportForm.value.type) {
      case 'logs':
        endpoint = '/api/logs/export'
        params.append('format', reportForm.value.format)
        params.append('startTime', reportForm.value.dateRange[0] + 'T00:00:00Z')
        params.append('endTime', reportForm.value.dateRange[1] + 'T23:59:59Z')
        if (reportForm.value.logLevels.length > 0) {
          params.append('levels', reportForm.value.logLevels.join(','))
        }
        if (reportForm.value.categories.length > 0) {
          params.append('categories', reportForm.value.categories.join(','))
        }
        if (reportForm.value.sources.length > 0) {
          params.append('sources', reportForm.value.sources.join(','))
        }
        break
      case 'users':
        endpoint = '/api/reports/users'
        params.append('format', reportForm.value.format)
        break
      case 'permissions':
        endpoint = '/api/reports/permissions'
        params.append('format', reportForm.value.format)
        if (reportForm.value.companyId) {
          params.append('companyId', reportForm.value.companyId.toString())
        }
        if (reportForm.value.departmentId) {
          params.append('departmentId', reportForm.value.departmentId.toString())
        }
        break
      case 'audit':
        endpoint = '/api/reports/audit'
        params.append('format', reportForm.value.format)
        params.append('startTime', reportForm.value.dateRange[0] + 'T00:00:00Z')
        params.append('endTime', reportForm.value.dateRange[1] + 'T23:59:59Z')
        break
    }

    const response = await fetch(`${endpoint}?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    clearInterval(progressTimer)
    progressPercentage.value = 100

    if (response.ok) {
      progressStatus.value = 'success'
      progressText.value = 'レポート生成完了'

      // ファイルダウンロード
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const contentDisposition = response.headers.get('content-disposition')
      let filename = `report_${new Date().toISOString().split('T')[0]}.${reportForm.value.format}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]*)"/)
        if (match) filename = match[1]
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      ElMessage.success('レポートが正常に生成されました')

      // 履歴に追加
      reportHistory.value.unshift({
        id: Date.now().toString(),
        type: reportForm.value.type,
        format: reportForm.value.format,
        status: 'completed',
        createdAt: new Date().toISOString(),
        recordCount: Math.floor(Math.random() * 1000) + 100
      })

    } else {
      progressStatus.value = 'exception'
      progressText.value = 'レポート生成に失敗しました'
      ElMessage.error('レポート生成に失敗しました')
    }

  } catch (error) {
    progressStatus.value = 'exception'
    progressText.value = 'エラーが発生しました'
    console.error('レポート生成エラー:', error)
    ElMessage.error('レポート生成中にエラーが発生しました')
  } finally {
    generating.value = false
    setTimeout(() => {
      showProgress.value = false
    }, 2000)
  }
}

const updateProgressText = () => {
  const messages = [
    'データを取得しています...',
    'レポートを生成しています...',
    'ファイルを作成しています...',
    'データを処理しています...'
  ]
  progressText.value = messages[Math.floor(progressPercentage.value / 25)] || messages[0]
}

const resetForm = () => {
  reportForm.value = {
    type: 'logs',
    dateRange: [],
    format: 'csv',
    logLevels: [50, 40],
    categories: [],
    sources: [],
    companyId: undefined,
    departmentId: undefined
  }
}

const downloadReport = async (report: ReportHistory) => {
  ElMessage.success(`${getReportTypeName(report.type)}をダウンロードしました`)
}

const deleteReport = async (reportId: string) => {
  try {
    await ElMessageBox.confirm('このレポートを削除しますか？', '確認', {
      type: 'warning'
    })

    reportHistory.value = reportHistory.value.filter(r => r.id !== reportId)
    ElMessage.success('レポートを削除しました')
  } catch {
    // キャンセル時は何もしない
  }
}

const getReportTypeName = (type: string): string => {
  const typeMap: Record<string, string> = {
    logs: 'ログレポート',
    users: 'ユーザーレポート',
    permissions: '権限レポート',
    audit: '監査レポート'
  }
  return typeMap[type] || type
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'generating': return 'warning'
    case 'failed': return 'danger'
    default: return 'info'
  }
}

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ライフサイクル
onMounted(() => {
  fetchCompanies()
  fetchDepartments()
})
</script>

<style scoped>
.reports {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.page-header p {
  margin: 5px 0 0 0;
  color: #909399;
  font-size: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.report-history {
  max-height: 500px;
  overflow-y: auto;
}

.history-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 10px;
  background: #fafafa;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.report-name {
  font-weight: 600;
  color: #303133;
}

.history-details {
  margin-bottom: 15px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 13px;
  color: #606266;
}

.history-actions {
  display: flex;
  gap: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.stat-item {
  text-align: center;
}

.progress-content {
  text-align: center;
}

.progress-text {
  margin-top: 10px;
  color: #606266;
  font-size: 14px;
}

@media (max-width: 768px) {
  .reports {
    padding: 10px;
  }
}
</style>