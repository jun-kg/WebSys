<template>
  <div class="system-health">
    <!-- ヘッダー -->
    <div class="page-header">
      <h1>システム監視ダッシュボード</h1>
      <div class="header-actions">
        <el-button @click="refreshData" :loading="loading" type="primary">
          <el-icon><Refresh /></el-icon>
          更新
        </el-button>
        <el-button @click="runLoadTest" :loading="loadTesting" type="warning">
          <el-icon><Lightning /></el-icon>
          負荷テスト
        </el-button>
        <el-switch
          v-model="autoRefresh"
          @change="toggleAutoRefresh"
          active-text="自動更新"
          class="ml-4"
        />
      </div>
    </div>

    <!-- 全体ステータス -->
    <el-row :gutter="20" class="status-overview">
      <el-col :span="6">
        <el-card shadow="hover" class="status-card">
          <div class="status-indicator">
            <el-icon
              :size="48"
              :color="getStatusColor(healthStatus?.status || 'unhealthy')"
            >
              <component :is="getStatusIcon(healthStatus?.status || 'unhealthy')" />
            </el-icon>
            <div class="status-text">
              <h3>システム状態</h3>
              <p>{{ getStatusLabel(healthStatus?.status || 'unhealthy') }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-content">
            <el-icon :size="32" color="#409EFF"><Monitor /></el-icon>
            <div class="metric-text">
              <h4>CPU使用率</h4>
              <p>{{ healthStatus?.metrics.cpu.usage.toFixed(1) || 0 }}%</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-content">
            <el-icon :size="32" color="#67C23A"><MemoryCard /></el-icon>
            <div class="metric-text">
              <h4>メモリ使用率</h4>
              <p>{{ healthStatus?.metrics.memory.percentage.toFixed(1) || 0 }}%</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-content">
            <el-icon :size="32" color="#E6A23C"><Timer /></el-icon>
            <div class="metric-text">
              <h4>稼働時間</h4>
              <p>{{ formatUptime(healthStatus?.metrics.application.uptime || 0) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- サービス状態 -->
    <el-row :gutter="20" class="service-status">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>データベース</span>
              <el-tag :type="getTagType(healthStatus?.services.database.status)">
                {{ getStatusLabel(healthStatus?.services.database.status) }}
              </el-tag>
            </div>
          </template>
          <div class="service-details">
            <div class="detail-item">
              <span class="label">応答時間:</span>
              <span class="value">{{ healthStatus?.services.database.responseTime || 0 }}ms</span>
            </div>
            <div class="detail-item" v-if="healthStatus?.services.database.details">
              <span class="label">接続プール:</span>
              <span class="value">{{ healthStatus.services.database.details.connectionPool }}</span>
            </div>
            <div class="detail-item" v-if="healthStatus?.services.database.details">
              <span class="label">パフォーマンス:</span>
              <span class="value">{{ healthStatus.services.database.details.queryPerformance }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>アプリケーション</span>
              <el-tag :type="getTagType(healthStatus?.services.application.status)">
                {{ getStatusLabel(healthStatus?.services.application.status) }}
              </el-tag>
            </div>
          </template>
          <div class="service-details">
            <div class="detail-item">
              <span class="label">アクティブセッション:</span>
              <span class="value">{{ healthStatus?.services.application.details?.activeSessions || 0 }}</span>
            </div>
            <div class="detail-item">
              <span class="label">エラー率:</span>
              <span class="value">{{ healthStatus?.services.application.details?.errorRate || '0%' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">総リクエスト数:</span>
              <span class="value">{{ healthStatus?.services.application.details?.totalRequests || 0 }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>システム</span>
              <el-tag :type="getTagType(healthStatus?.services.system.status)">
                {{ getStatusLabel(healthStatus?.services.system.status) }}
              </el-tag>
            </div>
          </template>
          <div class="service-details">
            <div class="detail-item">
              <span class="label">CPUコア数:</span>
              <span class="value">{{ healthStatus?.metrics.cpu.cores || 0 }}</span>
            </div>
            <div class="detail-item">
              <span class="label">ロードアベレージ:</span>
              <span class="value">{{ healthStatus?.metrics.cpu.loadAverage?.[0]?.toFixed(2) || 0 }}</span>
            </div>
            <div class="detail-item">
              <span class="label">アクティブ接続:</span>
              <span class="value">{{ healthStatus?.metrics.network.activeConnections || 0 }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 詳細メトリクス -->
    <el-row :gutter="20" class="detailed-metrics">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>メモリ使用状況</span>
              <el-progress
                :percentage="healthStatus?.metrics.memory.percentage || 0"
                :color="getProgressColor(healthStatus?.metrics.memory.percentage || 0)"
              />
            </div>
          </template>
          <div class="memory-details">
            <div class="memory-item">
              <span class="label">使用中:</span>
              <span class="value">{{ formatBytes(healthStatus?.metrics.memory.used || 0) }}</span>
            </div>
            <div class="memory-item">
              <span class="label">空き:</span>
              <span class="value">{{ formatBytes(healthStatus?.metrics.memory.free || 0) }}</span>
            </div>
            <div class="memory-item">
              <span class="label">総容量:</span>
              <span class="value">{{ formatBytes(healthStatus?.metrics.memory.total || 0) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>ディスク使用状況</span>
              <el-progress
                :percentage="healthStatus?.metrics.disk.percentage || 0"
                :color="getProgressColor(healthStatus?.metrics.disk.percentage || 0)"
              />
            </div>
          </template>
          <div class="disk-details">
            <div class="disk-item">
              <span class="label">使用中:</span>
              <span class="value">{{ formatBytes(healthStatus?.metrics.disk.used || 0) }}</span>
            </div>
            <div class="disk-item">
              <span class="label">空き:</span>
              <span class="value">{{ formatBytes(healthStatus?.metrics.disk.free || 0) }}</span>
            </div>
            <div class="disk-item">
              <span class="label">総容量:</span>
              <span class="value">{{ formatBytes(healthStatus?.metrics.disk.total || 0) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ヘルスチェック履歴 -->
    <el-card shadow="hover" class="health-history">
      <template #header>
        <div class="card-header">
          <span>ヘルスチェック履歴</span>
          <el-button @click="loadHistory" size="small">
            <el-icon><Refresh /></el-icon>
            履歴更新
          </el-button>
        </div>
      </template>
      <el-table :data="healthHistory" stripe>
        <el-table-column prop="timestamp" label="時刻" width="200">
          <template #default="{ row }">
            {{ formatDateTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="ステータス" width="120">
          <template #default="{ row }">
            <el-tag :type="getTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="services.database.responseTime" label="DB応答" width="100">
          <template #default="{ row }">
            {{ row.services.database.responseTime || 0 }}ms
          </template>
        </el-table-column>
        <el-table-column prop="metrics.cpu.usage" label="CPU" width="80">
          <template #default="{ row }">
            {{ row.metrics.cpu.usage?.toFixed(1) || 0 }}%
          </template>
        </el-table-column>
        <el-table-column prop="metrics.memory.percentage" label="メモリ" width="80">
          <template #default="{ row }">
            {{ row.metrics.memory.percentage?.toFixed(1) || 0 }}%
          </template>
        </el-table-column>
        <el-table-column prop="metrics.application.activeSessions" label="セッション" width="100">
          <template #default="{ row }">
            {{ row.metrics.application.activeSessions || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button @click="showDetails(row)" size="small" type="text">
              詳細
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 負荷テスト結果ダイアログ -->
    <el-dialog v-model="loadTestDialog" title="負荷テスト結果" width="60%">
      <div v-if="loadTestResult" class="load-test-results">
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="result-item">
              <span class="label">実行時間:</span>
              <span class="value">{{ (loadTestResult.duration / 1000).toFixed(1) }}秒</span>
            </div>
            <div class="result-item">
              <span class="label">総リクエスト数:</span>
              <span class="value">{{ loadTestResult.requests }}</span>
            </div>
            <div class="result-item">
              <span class="label">失敗数:</span>
              <span class="value">{{ loadTestResult.failures }}</span>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="result-item">
              <span class="label">成功率:</span>
              <span class="value">{{ loadTestResult.successRate.toFixed(1) }}%</span>
            </div>
            <div class="result-item">
              <span class="label">平均応答時間:</span>
              <span class="value">{{ loadTestResult.averageResponseTime.toFixed(1) }}ms</span>
            </div>
            <div class="result-item">
              <span class="label">スループット:</span>
              <span class="value">{{ loadTestResult.requestsPerSecond.toFixed(1) }} req/sec</span>
            </div>
          </el-col>
        </el-row>
        <el-alert
          :title="`負荷テスト完了 - ${loadTestResult.successRate >= 95 ? '良好' : '要改善'}`"
          :type="loadTestResult.successRate >= 95 ? 'success' : 'warning'"
          class="mt-4"
        />
      </div>
    </el-dialog>

    <!-- 詳細情報ダイアログ -->
    <el-dialog v-model="detailDialog" title="ヘルスチェック詳細" width="70%">
      <div v-if="selectedHealth">
        <pre>{{ JSON.stringify(selectedHealth, null, 2) }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  Lightning,
  Monitor,
  MemoryCard,
  Timer,
  CircleCheck,
  Warning,
  CircleClose,
  QuestionFilled
} from '@element-plus/icons-vue'
import {
  getHealthStatus,
  getHealthHistory,
  runLoadTest,
  formatBytes,
  formatUptime,
  getStatusColor,
  getStatusIcon,
  type HealthStatus,
  type LoadTestResult
} from '@/api/health'

// State
const healthStatus = ref<HealthStatus | null>(null)
const healthHistory = ref<HealthStatus[]>([])
const loadTestResult = ref<LoadTestResult | null>(null)
const selectedHealth = ref<HealthStatus | null>(null)

// Loading states
const loading = ref(false)
const loadTesting = ref(false)
const autoRefresh = ref(false)

// Dialog states
const loadTestDialog = ref(false)
const detailDialog = ref(false)

// Auto refresh interval
let refreshInterval: NodeJS.Timeout | null = null

// WebSocket connection
let socket: Socket | null = null

// Methods
const refreshData = async () => {
  try {
    loading.value = true
    const [health] = await Promise.all([
      getHealthStatus()
    ])
    healthStatus.value = health
  } catch (error) {
    ElMessage.error('ヘルスチェックの取得に失敗しました')
    console.error('Health check error:', error)
  } finally {
    loading.value = false
  }
}

const loadHistory = async () => {
  try {
    const history = await getHealthHistory(10)
    healthHistory.value = history.history
  } catch (error) {
    ElMessage.error('履歴の取得に失敗しました')
    console.error('History error:', error)
  }
}

const performLoadTest = async () => {
  try {
    loadTesting.value = true
    const result = await runLoadTest()
    loadTestResult.value = result
    loadTestDialog.value = true
    ElMessage.success('負荷テストが完了しました')
  } catch (error) {
    ElMessage.error('負荷テストに失敗しました')
    console.error('Load test error:', error)
  } finally {
    loadTesting.value = false
  }
}

const toggleAutoRefresh = () => {
  if (autoRefresh.value) {
    refreshInterval = setInterval(refreshData, 30000) // 30秒間隔
    ElMessage.success('自動更新を開始しました（30秒間隔）')
  } else {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
    ElMessage.info('自動更新を停止しました')
  }
}

const showDetails = (health: HealthStatus) => {
  selectedHealth.value = health
  detailDialog.value = true
}

// Utility functions
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'healthy': return '正常'
    case 'degraded': return '注意'
    case 'unhealthy': return '異常'
    default: return '不明'
  }
}

const getTagType = (status: string): string => {
  switch (status) {
    case 'healthy': return 'success'
    case 'degraded': return 'warning'
    case 'unhealthy': return 'danger'
    default: return 'info'
  }
}

const getProgressColor = (percentage: number): string => {
  if (percentage < 70) return '#67C23A'
  if (percentage < 90) return '#E6A23C'
  return '#F56C6C'
}

const formatDateTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('ja-JP')
}

// WebSocket functions
const connectWebSocket = () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return

    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8000', {
      auth: { token },
      path: '/socket.io/'
    })

    socket.on('connect', () => {
      console.log('Health WebSocket connected')
      socket?.emit('join-room', 'system-health')
    })

    socket.on('disconnect', () => {
      console.log('Health WebSocket disconnected')
    })

    socket.on('health-update', (data: any) => {
      console.log('Health update received:', data)
      if (data.data) {
        healthStatus.value = data.data
      }
    })

    socket.on('health-alert', (data: any) => {
      console.log('Health alert received:', data)
      if (data.data) {
        const alert = data.data
        let messageType: 'success' | 'warning' | 'error' | 'info' = 'info'

        switch (alert.level) {
          case 'critical':
            messageType = 'error'
            break
          case 'error':
            messageType = 'error'
            break
          case 'warning':
            messageType = 'warning'
            break
          case 'info':
            messageType = 'success'
            break
        }

        ElMessage({
          type: messageType,
          message: `[${alert.service}] ${alert.message}`,
          duration: 5000,
          showClose: true
        })
      }
    })

    socket.on('connect_error', (error) => {
      console.error('Health WebSocket connection error:', error)
    })
  } catch (error) {
    console.error('Failed to connect to WebSocket:', error)
  }
}

const disconnectWebSocket = () => {
  if (socket) {
    socket.emit('leave-room', 'system-health')
    socket.disconnect()
    socket = null
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    refreshData(),
    loadHistory()
  ])

  // WebSocket接続を開始
  connectWebSocket()
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  // WebSocket接続を終了
  disconnectWebSocket()
})
</script>

<style scoped>
.system-health {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 24px;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-overview,
.service-status,
.detailed-metrics {
  margin-bottom: 20px;
}

.status-card {
  text-align: center;
}

.status-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.status-text h3 {
  margin: 0;
  font-size: 18px;
}

.status-text p {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #666;
}

.metric-card {
  height: 100%;
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-text h4 {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.metric-text p {
  margin: 4px 0 0 0;
  font-size: 20px;
  font-weight: bold;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.service-details,
.memory-details,
.disk-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item,
.memory-item,
.disk-item,
.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #666;
  font-size: 14px;
}

.value {
  font-weight: bold;
}

.health-history {
  margin-top: 20px;
}

.load-test-results {
  padding: 20px;
}

.mt-4 {
  margin-top: 16px;
}

.ml-4 {
  margin-left: 16px;
}
</style>