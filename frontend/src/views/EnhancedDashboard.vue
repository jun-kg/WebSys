<template>
  <div class="enhanced-dashboard">
    <PageHeader title="管理ダッシュボード" icon="DataAnalysis">
      <template #actions>
        <el-button-group>
          <el-button :type="timeRange === 'today' ? 'primary' : ''" @click="timeRange = 'today'">今日</el-button>
          <el-button :type="timeRange === 'week' ? 'primary' : ''" @click="timeRange = 'week'">今週</el-button>
          <el-button :type="timeRange === 'month' ? 'primary' : ''" @click="timeRange = 'month'">今月</el-button>
        </el-button-group>
        <el-button @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          更新
        </el-button>
      </template>
    </PageHeader>

    <!-- 統計カード -->
    <el-row :gutter="20" class="stats-section">
      <el-col :xs="24" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalUsers || 0 }}</div>
              <div class="stat-label">総ユーザー数</div>
              <div class="stat-trend" :class="stats.userTrend > 0 ? 'positive' : 'negative'">
                <el-icon v-if="stats.userTrend > 0"><ArrowUp /></el-icon>
                <el-icon v-else><ArrowDown /></el-icon>
                {{ Math.abs(stats.userTrend || 0) }}% 前期比
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingApprovals || 0 }}</div>
              <div class="stat-label">承認待ち</div>
              <div class="stat-trend" :class="stats.approvalTrend < 0 ? 'positive' : 'negative'">
                <el-icon v-if="stats.approvalTrend < 0"><ArrowDown /></el-icon>
                <el-icon v-else><ArrowUp /></el-icon>
                {{ Math.abs(stats.approvalTrend || 0) }}% 前期比
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
              <el-icon><SuccessFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.completedTasks || 0 }}</div>
              <div class="stat-label">完了タスク</div>
              <div class="stat-trend positive">
                <el-icon><ArrowUp /></el-icon>
                {{ stats.taskCompletionRate || 0 }}% 完了率
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.activeAlerts || 0 }}</div>
              <div class="stat-label">アクティブアラート</div>
              <div class="stat-trend" :class="stats.alertTrend < 0 ? 'positive' : 'negative'">
                <el-icon v-if="stats.alertTrend < 0"><ArrowDown /></el-icon>
                <el-icon v-else><ArrowUp /></el-icon>
                {{ Math.abs(stats.alertTrend || 0) }}% 前期比
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- メインコンテンツ -->
    <el-row :gutter="20" class="content-section">
      <!-- 左カラム -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16">
        <!-- アクティビティタイムライン -->
        <el-card class="activity-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><Clock /></el-icon> 最近のアクティビティ</span>
              <el-link type="primary" @click="viewAllActivities">すべて表示 →</el-link>
            </div>
          </template>
          <el-timeline v-loading="loading">
            <el-timeline-item
              v-for="(activity, index) in recentActivities"
              :key="index"
              :timestamp="formatTime(activity.timestamp)"
              :type="getActivityType(activity.type)"
            >
              <div class="activity-item">
                <div class="activity-header">
                  <el-avatar :size="32" :src="activity.userAvatar">{{ activity.userName?.charAt(0) }}</el-avatar>
                  <div class="activity-info">
                    <div class="activity-user">{{ activity.userName }}</div>
                    <div class="activity-action">{{ activity.action }}</div>
                  </div>
                </div>
                <div class="activity-details" v-if="activity.details">{{ activity.details }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <!-- ワークフロー統計 -->
        <el-card class="workflow-stats-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><Histogram /></el-icon> ワークフロー統計</span>
              <el-select v-model="workflowPeriod" size="small" style="width: 120px">
                <el-option label="今日" value="today" />
                <el-option label="今週" value="week" />
                <el-option label="今月" value="month" />
              </el-select>
            </div>
          </template>
          <div class="workflow-stats">
            <div class="workflow-stat-item">
              <div class="workflow-stat-header">
                <span>申請中</span>
                <el-tag type="info">{{ workflowStats.pending || 0 }}</el-tag>
              </div>
              <el-progress
                :percentage="calculatePercentage(workflowStats.pending, workflowStats.total)"
                :stroke-width="12"
                :show-text="false"
                color="#909399"
              />
            </div>
            <div class="workflow-stat-item">
              <div class="workflow-stat-header">
                <span>承認済み</span>
                <el-tag type="success">{{ workflowStats.approved || 0 }}</el-tag>
              </div>
              <el-progress
                :percentage="calculatePercentage(workflowStats.approved, workflowStats.total)"
                :stroke-width="12"
                :show-text="false"
                color="#67c23a"
              />
            </div>
            <div class="workflow-stat-item">
              <div class="workflow-stat-header">
                <span>却下</span>
                <el-tag type="danger">{{ workflowStats.rejected || 0 }}</el-tag>
              </div>
              <el-progress
                :percentage="calculatePercentage(workflowStats.rejected, workflowStats.total)"
                :stroke-width="12"
                :show-text="false"
                color="#f56c6c"
              />
            </div>
            <div class="workflow-stat-item">
              <div class="workflow-stat-header">
                <span>差し戻し</span>
                <el-tag type="warning">{{ workflowStats.returned || 0 }}</el-tag>
              </div>
              <el-progress
                :percentage="calculatePercentage(workflowStats.returned, workflowStats.total)"
                :stroke-width="12"
                :show-text="false"
                color="#e6a23c"
              />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右カラム -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8">
        <!-- クイックアクション -->
        <el-card class="quick-actions-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><Lightning /></el-icon> クイックアクション</span>
            </div>
          </template>
          <div class="quick-actions-grid">
            <div class="quick-action-item" @click="navigateTo('/users')">
              <div class="action-icon" style="background: #409eff">
                <el-icon><User /></el-icon>
              </div>
              <div class="action-label">ユーザー管理</div>
            </div>
            <div class="quick-action-item" @click="navigateTo('/workflow-requests')">
              <div class="action-icon" style="background: #67c23a">
                <el-icon><Document /></el-icon>
              </div>
              <div class="action-label">申請作成</div>
            </div>
            <div class="quick-action-item" @click="navigateTo('/approval-process')">
              <div class="action-icon" style="background: #e6a23c">
                <el-icon><Check /></el-icon>
              </div>
              <div class="action-label">承認処理</div>
            </div>
            <div class="quick-action-item" @click="navigateTo('/reports')">
              <div class="action-icon" style="background: #f56c6c">
                <el-icon><DataAnalysis /></el-icon>
              </div>
              <div class="action-label">レポート</div>
            </div>
            <div class="quick-action-item" @click="navigateTo('/departments')">
              <div class="action-icon" style="background: #909399">
                <el-icon><Grid /></el-icon>
              </div>
              <div class="action-label">部署管理</div>
            </div>
            <div class="quick-action-item" @click="navigateTo('/bulk-operations')">
              <div class="action-icon" style="background: #606266">
                <el-icon><Upload /></el-icon>
              </div>
              <div class="action-label">一括操作</div>
            </div>
          </div>
        </el-card>

        <!-- システムヘルス -->
        <el-card class="system-health-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><Monitor /></el-icon> システムヘルス</span>
              <el-tag :type="getSystemHealthType()" size="small">
                {{ getSystemHealthStatus() }}
              </el-tag>
            </div>
          </template>
          <div class="health-metrics">
            <div class="health-metric">
              <div class="metric-label">
                <el-icon><Cpu /></el-icon>
                CPU使用率
              </div>
              <div class="metric-value">
                <el-progress
                  :percentage="systemHealth.cpuUsage || 0"
                  :status="getProgressStatus(systemHealth.cpuUsage)"
                />
              </div>
            </div>
            <div class="health-metric">
              <div class="metric-label">
                <el-icon><Odometer /></el-icon>
                メモリ使用率
              </div>
              <div class="metric-value">
                <el-progress
                  :percentage="systemHealth.memoryUsage || 0"
                  :status="getProgressStatus(systemHealth.memoryUsage)"
                />
              </div>
            </div>
            <div class="health-metric">
              <div class="metric-label">
                <el-icon><Connection /></el-icon>
                データベース
              </div>
              <div class="metric-value">
                <el-tag :type="systemHealth.dbStatus === 'healthy' ? 'success' : 'danger'">
                  {{ systemHealth.dbStatus === 'healthy' ? '正常' : 'エラー' }}
                </el-tag>
              </div>
            </div>
            <div class="health-metric">
              <div class="metric-label">
                <el-icon><Link /></el-icon>
                WebSocket
              </div>
              <div class="metric-value">
                <el-tag :type="systemHealth.wsConnections > 0 ? 'success' : 'info'">
                  {{ systemHealth.wsConnections || 0 }} 接続
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>

        <!-- アラート一覧 -->
        <el-card class="alerts-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><Bell /></el-icon> アクティブアラート</span>
              <el-badge :value="activeAlerts.length" :max="99" />
            </div>
          </template>
          <el-empty v-if="activeAlerts.length === 0" description="アラートはありません" :image-size="60" />
          <div v-else class="alerts-list">
            <div
              v-for="(alert, index) in activeAlerts.slice(0, 5)"
              :key="index"
              class="alert-item"
              :class="`alert-${alert.severity}`"
            >
              <el-icon class="alert-icon">
                <Warning v-if="alert.severity === 'high'" />
                <InfoFilled v-else />
              </el-icon>
              <div class="alert-content">
                <div class="alert-message">{{ alert.message }}</div>
                <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
              </div>
            </div>
          </div>
          <el-link v-if="activeAlerts.length > 5" type="primary" @click="navigateTo('/alert-rules')">
            すべてのアラートを表示 →
          </el-link>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Refresh, User, Document, SuccessFilled, Warning, Clock, Histogram,
  Lightning, Check, DataAnalysis, Grid, Upload, Monitor, Cpu, Odometer,
  Connection, Link, Bell, InfoFilled, ArrowUp, ArrowDown
} from '@element-plus/icons-vue'
import PageHeader from '@/components/navigation/PageHeader.vue'

const router = useRouter()
const loading = ref(false)
const timeRange = ref('today')
const workflowPeriod = ref('today')

// 統計データ
const stats = reactive({
  totalUsers: 0,
  userTrend: 0,
  pendingApprovals: 0,
  approvalTrend: 0,
  completedTasks: 0,
  taskCompletionRate: 0,
  activeAlerts: 0,
  alertTrend: 0
})

// アクティビティデータ
const recentActivities = ref<any[]>([])

// ワークフロー統計
const workflowStats = reactive({
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  returned: 0
})

// システムヘルス
const systemHealth = reactive({
  cpuUsage: 0,
  memoryUsage: 0,
  dbStatus: 'healthy',
  wsConnections: 0
})

// アクティブアラート
const activeAlerts = ref<any[]>([])

// データ取得
const refreshData = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

    // 統計データ取得
    const statsRes = await fetch(`${baseUrl}/api/statistics/dashboard?range=${timeRange.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const statsData = await statsRes.json()
    if (statsData.success) {
      Object.assign(stats, statsData.data.overview || {})
      recentActivities.value = statsData.data.activities || []
      Object.assign(workflowStats, statsData.data.workflow || {})
      activeAlerts.value = statsData.data.alerts || []
    }

    // システムヘルス取得
    const healthRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const healthData = await healthRes.json()
    if (healthData.status === 'OK') {
      systemHealth.cpuUsage = Math.round(Math.random() * 100) // モックデータ
      systemHealth.memoryUsage = Math.round(Math.random() * 100)
      systemHealth.dbStatus = 'healthy'
      systemHealth.wsConnections = healthData.websocket?.connections || 0
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    ElMessage.error('データの取得に失敗しました')
  } finally {
    loading.value = false
  }
}

// ヘルパー関数
const formatTime = (timestamp: string) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  if (hours < 24) return `${hours}時間前`
  if (days < 7) return `${days}日前`
  return date.toLocaleDateString('ja-JP')
}

const getActivityType = (type: string) => {
  const types: Record<string, any> = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
    approve: 'success',
    reject: 'danger'
  }
  return types[type] || 'info'
}

const calculatePercentage = (value: number, total: number) => {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

const getProgressStatus = (percentage: number) => {
  if (percentage < 50) return 'success'
  if (percentage < 80) return 'warning'
  return 'exception'
}

const getSystemHealthType = () => {
  const avgUsage = (systemHealth.cpuUsage + systemHealth.memoryUsage) / 2
  if (avgUsage < 50 && systemHealth.dbStatus === 'healthy') return 'success'
  if (avgUsage < 80) return 'warning'
  return 'danger'
}

const getSystemHealthStatus = () => {
  const avgUsage = (systemHealth.cpuUsage + systemHealth.memoryUsage) / 2
  if (avgUsage < 50 && systemHealth.dbStatus === 'healthy') return '正常'
  if (avgUsage < 80) return '注意'
  return '警告'
}

const navigateTo = (path: string) => {
  router.push(path)
}

const viewAllActivities = () => {
  router.push('/logs')
}

// 自動更新
let refreshInterval: number | null = null
const startAutoRefresh = () => {
  refreshInterval = window.setInterval(refreshData, 60000) // 1分ごと
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

onMounted(() => {
  refreshData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.enhanced-dashboard {
  padding: 20px;
  background: #f0f2f5;
  min-height: 100vh;
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
  margin-bottom: 20px;
}

.stat-card-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-trend.positive {
  color: #67c23a;
}

.stat-trend.negative {
  color: #f56c6c;
}

.content-section {
  margin-top: 20px;
}

.activity-card,
.workflow-stats-card,
.quick-actions-card,
.system-health-card,
.alerts-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.card-header span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-item {
  padding: 8px 0;
}

.activity-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.activity-info {
  flex: 1;
}

.activity-user {
  font-weight: 600;
  color: #303133;
}

.activity-action {
  font-size: 14px;
  color: #606266;
}

.activity-details {
  font-size: 13px;
  color: #909399;
  margin-left: 44px;
}

.workflow-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.workflow-stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workflow-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.quick-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 8px;
  background: #f5f7fa;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-action-item:hover {
  background: #e4e7ed;
  transform: translateY(-2px);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.action-label {
  font-size: 13px;
  color: #606266;
  text-align: center;
}

.health-metrics {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.health-metric {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid;
}

.alert-item.alert-high {
  background: #fef0f0;
  border-left-color: #f56c6c;
}

.alert-item.alert-medium {
  background: #fdf6ec;
  border-left-color: #e6a23c;
}

.alert-item.alert-low {
  background: #f0f9ff;
  border-left-color: #409eff;
}

.alert-icon {
  font-size: 20px;
  margin-top: 2px;
}

.alert-content {
  flex: 1;
}

.alert-message {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.alert-time {
  font-size: 12px;
  color: #909399;
}

@media (max-width: 768px) {
  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
