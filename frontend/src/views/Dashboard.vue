<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover" v-loading="loading">
          <el-statistic title="総ユーザー数" :value="stats.overview?.totalUsers || 0" />
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover" v-loading="loading">
          <el-statistic title="アクティブユーザー" :value="stats.overview?.activeUsers || 0" />
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover" v-loading="loading">
          <el-statistic title="今日のログイン" :value="stats.overview?.todayLogins || 0" />
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover" v-loading="loading">
          <el-statistic title="処理済みタスク" :value="stats.overview?.processedTasks || 0" suffix="件" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :xs="24" :sm="24" :md="16" :lg="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近のアクティビティ</span>
            </div>
          </template>
          <el-table :data="stats.activities || []" style="width: 100%" v-loading="loading">
            <el-table-column label="時間" width="180">
              <template #default="scope">
                {{ formatTime(scope.row.time) }}
              </template>
            </el-table-column>
            <el-table-column prop="user" label="ユーザー" width="150" />
            <el-table-column prop="action" label="アクション" />
            <el-table-column prop="status" label="ステータス" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === '成功' ? 'success' : 'warning'">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :md="8" :lg="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>クイックアクション</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="handleNewUser">
              <el-icon><Plus /></el-icon>
              新規ユーザー追加
            </el-button>
            <el-button type="primary" @click="handleExport">
              <el-icon><Download /></el-icon>
              データエクスポート
            </el-button>
            <el-button type="primary" @click="handleSettings">
              <el-icon><Setting /></el-icon>
              システム設定
            </el-button>
            <el-button type="primary" @click="handleReports">
              <el-icon><Document /></el-icon>
              レポート生成
            </el-button>
          </div>
        </el-card>

        <el-card style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>システム状態</span>
            </div>
          </template>
          <div class="system-status" v-loading="loading">
            <div class="status-item">
              <span>API サーバー</span>
              <el-tag :type="getStatusType(stats.systemHealth?.api?.status)">
                {{ stats.systemHealth?.api?.message || '確認中' }}
              </el-tag>
            </div>
            <div class="status-item">
              <span>データベース</span>
              <el-tag :type="getStatusType(stats.systemHealth?.database?.status)">
                {{ stats.systemHealth?.database?.message || '確認中' }}
              </el-tag>
            </div>
            <div class="status-item">
              <span>メモリ使用率</span>
              <el-progress :percentage="stats.systemHealth?.performance?.memoryUsage || 0"
                          :status="getProgressStatus(stats.systemHealth?.performance?.memoryUsage)" />
            </div>
            <div class="status-item">
              <span>CPU使用率</span>
              <el-progress :percentage="stats.systemHealth?.performance?.cpuUsage || 0"
                          :status="getProgressStatus(stats.systemHealth?.performance?.cpuUsage)" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Download, Setting, Document } from '@element-plus/icons-vue'

interface DashboardStats {
  overview?: {
    totalUsers: number;
    activeUsers: number;
    todayLogins: number;
    processedTasks: number;
  };
  systemHealth?: {
    api: {
      status: string;
      message: string;
    };
    database: {
      status: string;
      message: string;
    };
    performance: {
      cpuUsage: number;
      memoryUsage: number;
    };
  };
  activities?: Array<{
    time: string;
    user: string;
    action: string;
    status: string;
  }>;
  logStats?: {
    total: number;
    errors: number;
    warnings: number;
    errorRate: number;
  };
}

const stats = ref<DashboardStats>({})
const loading = ref(true)
let refreshInterval: number | null = null

// APIから統計データを取得
const fetchDashboardStats = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('認証が必要です')
      return
    }

    const response = await fetch('/api/statistics/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (result.success) {
      stats.value = result.data
    } else {
      throw new Error(result.error?.message || 'データの取得に失敗しました')
    }
  } catch (error) {
    console.error('Dashboard stats fetch error:', error)
    ElMessage.error('統計データの取得に失敗しました')
  } finally {
    loading.value = false
  }
}

// システム状態に基づいてタグタイプを決定
const getStatusType = (status?: string) => {
  switch (status) {
    case 'healthy':
      return 'success'
    case 'warning':
      return 'warning'
    case 'error':
      return 'danger'
    default:
      return 'info'
  }
}

// CPU/メモリ使用率に基づいてプログレスバーのステータスを決定
const getProgressStatus = (percentage?: number) => {
  if (!percentage) return 'success'
  if (percentage < 50) return 'success'
  if (percentage < 80) return 'warning'
  return 'exception'
}

// 時刻をフォーマット
const formatTime = (timeString: string) => {
  try {
    const date = new Date(timeString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return timeString
  }
}

// リアルタイム更新の開始
const startAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  refreshInterval = window.setInterval(() => {
    fetchDashboardStats()
  }, 30000) // 30秒ごとに更新
}

// リアルタイム更新の停止
const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// ライフサイクルフック
onMounted(() => {
  fetchDashboardStats()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

const handleNewUser = () => {
  ElMessage.info('新規ユーザー追加機能は準備中です')
}

const handleExport = () => {
  ElMessage.info('データエクスポート機能は準備中です')
}

const handleSettings = () => {
  ElMessage.info('システム設定機能は準備中です')
}

const handleReports = () => {
  ElMessage.info('レポート生成機能は準備中です')
}
</script>

<style scoped>
.dashboard {
  height: 100%;
}

.stats-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-actions .el-button {
  width: 100%;
  justify-content: flex-start;
}

.system-status {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-item .el-progress {
  flex: 1;
  margin-left: 20px;
}
</style>