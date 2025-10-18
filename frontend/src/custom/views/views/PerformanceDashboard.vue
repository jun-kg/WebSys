<template>
  <div class="performance-dashboard">
    <el-card class="dashboard-header">
      <template #header>
        <div class="card-header">
          <h1>パフォーマンス監視ダッシュボード</h1>
          <div class="header-actions">
            <el-button @click="refreshMetrics" :loading="loading">
              <el-icon><Refresh /></el-icon>
              更新
            </el-button>
            <el-button @click="exportReport" type="primary">
              <el-icon><Download /></el-icon>
              レポート出力
            </el-button>
          </div>
        </div>
      </template>

      <!-- パフォーマンススコア -->
      <div class="score-section">
        <div class="score-card">
          <div class="score-value" :class="getScoreClass(performanceScore)">
            {{ performanceScore }}
          </div>
          <div class="score-label">パフォーマンススコア</div>
        </div>
        <div class="score-details">
          <div class="device-info">
            <el-tag>{{ metrics.deviceType }}</el-tag>
            <el-tag type="info">{{ metrics.connection }}</el-tag>
            <el-tag type="warning">{{ metrics.viewport.width }}×{{ metrics.viewport.height }}</el-tag>
          </div>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20">
      <!-- Core Web Vitals -->
      <el-col :xs="24" :md="16">
        <el-card class="metrics-card">
          <template #header>
            <h3>Core Web Vitals</h3>
          </template>

          <div class="metrics-grid">
            <div class="metric-item" v-for="vital in coreWebVitals" :key="vital.name">
              <div class="metric-header">
                <span class="metric-name">{{ vital.name }}</span>
                <el-tag :type="getMetricType(vital.value, vital.thresholds)" size="small">
                  {{ getMetricStatus(vital.value, vital.thresholds) }}
                </el-tag>
              </div>
              <div class="metric-value">
                {{ formatMetricValue(vital.value, vital.unit) }}
              </div>
              <div class="metric-bar">
                <div
                  class="metric-progress"
                  :class="getMetricType(vital.value, vital.thresholds)"
                  :style="{ width: getProgressWidth(vital.value, vital.thresholds) }"
                ></div>
              </div>
              <div class="metric-description">{{ vital.description }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- リアルタイムメトリクス -->
      <el-col :xs="24" :md="8">
        <el-card class="realtime-card">
          <template #header>
            <h3>リアルタイム監視</h3>
          </template>

          <div class="realtime-metrics">
            <div class="realtime-item">
              <el-icon class="metric-icon"><Timer /></el-icon>
              <div class="metric-info">
                <div class="metric-label">ルート変更時間</div>
                <div class="metric-value">{{ formatTime(metrics.routeChangeTime) }}</div>
              </div>
            </div>

            <div class="realtime-item">
              <el-icon class="metric-icon"><Connection /></el-icon>
              <div class="metric-info">
                <div class="metric-label">API応答時間</div>
                <div class="metric-value">{{ formatTime(metrics.apiResponseTime) }}</div>
              </div>
            </div>

            <div class="realtime-item">
              <el-icon class="metric-icon"><Cpu /></el-icon>
              <div class="metric-info">
                <div class="metric-label">メモリ使用率</div>
                <div class="metric-value">{{ formatMemory(metrics.memoryUsage) }}</div>
              </div>
            </div>
          </div>

          <!-- メモリ使用率グラフ -->
          <div class="memory-chart" v-if="memoryHistory.length > 0">
            <div class="chart-title">メモリ使用率推移</div>
            <canvas ref="memoryCanvas" width="300" height="120"></canvas>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 問題と提案 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="issues-card">
          <template #header>
            <h3>パフォーマンス問題と改善提案</h3>
          </template>

          <div v-if="issues.length === 0" class="no-issues">
            <el-icon class="success-icon"><SuccessFilled /></el-icon>
            <p>パフォーマンス上の問題は検出されませんでした</p>
          </div>

          <div v-else class="issues-list">
            <div
              v-for="(issue, index) in issues"
              :key="index"
              class="issue-item"
            >
              <el-icon class="issue-icon"><WarningFilled /></el-icon>
              <div class="issue-content">
                <div class="issue-title">{{ issue }}</div>
                <div class="issue-suggestion">{{ getIssueSuggestion(issue) }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 詳細ログ -->
    <el-row style="margin-top: 20px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <h3>パフォーマンスログ</h3>
          </template>

          <el-table :data="performanceLog" height="300">
            <el-table-column prop="timestamp" label="時刻" width="180">
              <template #default="scope">
                {{ formatTimestamp(scope.row.timestamp) }}
              </template>
            </el-table-column>
            <el-table-column prop="type" label="種別" width="120">
              <template #default="scope">
                <el-tag :type="getLogType(scope.row.type)" size="small">
                  {{ scope.row.type }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="メッセージ" />
            <el-table-column prop="value" label="値" width="100">
              <template #default="scope">
                {{ scope.row.value ? scope.row.value.toFixed(0) : '-' }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Download, Timer, Connection, Cpu, SuccessFilled, WarningFilled } from '@element-plus/icons-vue'
import { usePerformanceMonitor } from '@/utils/performanceMonitor'

interface CoreWebVital {
  name: string
  value: number | null
  unit: string
  description: string
  thresholds: { good: number; needsImprovement: number }
}

interface PerformanceLog {
  timestamp: number
  type: string
  message: string
  value?: number
}

const { getMetrics, evaluatePerformance } = usePerformanceMonitor()

const loading = ref(false)
const performanceScore = ref(100)
const issues = ref<string[]>([])
const metrics = ref(getMetrics())
const memoryHistory = ref<number[]>([])
const performanceLog = ref<PerformanceLog[]>([])
const memoryCanvas = ref<HTMLCanvasElement>()

let monitoringInterval: number

const coreWebVitals = ref<CoreWebVital[]>([
  {
    name: 'FCP',
    value: metrics.value.FCP,
    unit: 'ms',
    description: 'First Contentful Paint - 最初のコンテンツ描画時間',
    thresholds: { good: 1800, needsImprovement: 3000 }
  },
  {
    name: 'LCP',
    value: metrics.value.LCP,
    unit: 'ms',
    description: 'Largest Contentful Paint - 最大コンテンツ描画時間',
    thresholds: { good: 2500, needsImprovement: 4000 }
  },
  {
    name: 'FID',
    value: metrics.value.FID,
    unit: 'ms',
    description: 'First Input Delay - 初回入力遅延',
    thresholds: { good: 100, needsImprovement: 300 }
  },
  {
    name: 'CLS',
    value: metrics.value.CLS,
    unit: '',
    description: 'Cumulative Layout Shift - 累積レイアウトシフト',
    thresholds: { good: 0.1, needsImprovement: 0.25 }
  }
])

const refreshMetrics = async () => {
  loading.value = true
  try {
    metrics.value = getMetrics()
    const evaluation = evaluatePerformance()
    performanceScore.value = evaluation.score
    issues.value = evaluation.issues

    // Core Web Vitals更新
    coreWebVitals.value.forEach(vital => {
      vital.value = (metrics.value as any)[vital.name]
    })

    // メモリ履歴更新
    if (metrics.value.memoryUsage !== null) {
      memoryHistory.value.push(metrics.value.memoryUsage)
      if (memoryHistory.value.length > 20) {
        memoryHistory.value.shift()
      }
      drawMemoryChart()
    }

    // ログ追加
    addPerformanceLog('METRICS_UPDATED', 'パフォーマンスメトリクス更新', performanceScore.value)

  } catch (error) {
    ElMessage.error('メトリクス取得に失敗しました')
  } finally {
    loading.value = false
  }
}

const exportReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    score: performanceScore.value,
    metrics: metrics.value,
    issues: issues.value,
    coreWebVitals: coreWebVitals.value
  }

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `performance-report-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)

  ElMessage.success('レポートを出力しました')
}

const drawMemoryChart = () => {
  if (!memoryCanvas.value || memoryHistory.value.length === 0) return

  const canvas = memoryCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height
  const padding = 20

  ctx.clearRect(0, 0, width, height)

  // グリッド描画
  ctx.strokeStyle = '#e4e7ed'
  ctx.lineWidth = 1

  // 水平線
  for (let i = 0; i <= 4; i++) {
    const y = padding + (height - 2 * padding) * i / 4
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding, y)
    ctx.stroke()
  }

  // 垂直線
  for (let i = 0; i <= 5; i++) {
    const x = padding + (width - 2 * padding) * i / 5
    ctx.beginPath()
    ctx.moveTo(x, padding)
    ctx.lineTo(x, height - padding)
    ctx.stroke()
  }

  // データライン描画
  ctx.strokeStyle = '#409eff'
  ctx.lineWidth = 2
  ctx.beginPath()

  memoryHistory.value.forEach((value, index) => {
    const x = padding + (width - 2 * padding) * index / (memoryHistory.value.length - 1)
    const y = height - padding - (height - 2 * padding) * value

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })

  ctx.stroke()

  // 危険ライン
  if (memoryHistory.value.some(v => v > 0.8)) {
    ctx.strokeStyle = '#f56c6c'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    const dangerY = height - padding - (height - 2 * padding) * 0.8
    ctx.beginPath()
    ctx.moveTo(padding, dangerY)
    ctx.lineTo(width - padding, dangerY)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

const addPerformanceLog = (type: string, message: string, value?: number) => {
  performanceLog.value.unshift({
    timestamp: Date.now(),
    type,
    message,
    value
  })

  if (performanceLog.value.length > 100) {
    performanceLog.value.pop()
  }
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'score-excellent'
  if (score >= 70) return 'score-good'
  if (score >= 50) return 'score-needs-improvement'
  return 'score-poor'
}

const getMetricType = (value: number | null, thresholds: { good: number; needsImprovement: number }) => {
  if (value === null) return 'info'
  if (value <= thresholds.good) return 'success'
  if (value <= thresholds.needsImprovement) return 'warning'
  return 'danger'
}

const getMetricStatus = (value: number | null, thresholds: { good: number; needsImprovement: number }) => {
  if (value === null) return '未計測'
  if (value <= thresholds.good) return '良好'
  if (value <= thresholds.needsImprovement) return '要改善'
  return '不良'
}

const getProgressWidth = (value: number | null, thresholds: { good: number; needsImprovement: number }) => {
  if (value === null) return '0%'
  const max = thresholds.needsImprovement * 2
  const width = Math.min(100, (value / max) * 100)
  return `${width}%`
}

const formatMetricValue = (value: number | null, unit: string) => {
  if (value === null) return '未計測'
  if (unit === '') return value.toFixed(3)
  return `${value.toFixed(0)}${unit}`
}

const formatTime = (value: number | null) => {
  if (value === null) return '未計測'
  return `${value.toFixed(0)}ms`
}

const formatMemory = (value: number | null) => {
  if (value === null) return '未計測'
  return `${(value * 100).toFixed(1)}%`
}

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}

const getLogType = (type: string) => {
  switch (type) {
    case 'ERROR': return 'danger'
    case 'WARNING': return 'warning'
    case 'INFO': return 'info'
    default: return ''
  }
}

const getIssueSuggestion = (issue: string) => {
  if (issue.includes('FCP')) return '画像最適化、CSSの非同期読み込みを検討してください'
  if (issue.includes('LCP')) return 'メインコンテンツの優先読み込み、CDN使用を検討してください'
  if (issue.includes('FID')) return 'JavaScriptの遅延実行、長いタスクの分割を検討してください'
  if (issue.includes('CLS')) return '画像・広告サイズの事前指定を検討してください'
  if (issue.includes('メモリ')) return 'メモリリークの確認、不要なイベントリスナーの削除を検討してください'
  return 'パフォーマンスプロファイラーでの詳細調査を推奨します'
}

onMounted(() => {
  refreshMetrics()

  // 10秒ごとに自動更新
  monitoringInterval = window.setInterval(() => {
    refreshMetrics()
  }, 10000)

  addPerformanceLog('DASHBOARD_OPENED', 'パフォーマンスダッシュボード表示')
})

onUnmounted(() => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
  }
})
</script>

<style scoped>
.performance-dashboard {
  padding: 20px;
}

.dashboard-header .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.score-section {
  display: flex;
  align-items: center;
  gap: 30px;
  margin-top: 20px;
}

.score-card {
  text-align: center;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 8px;
}

.score-value.score-excellent {
  color: #67c23a;
}

.score-value.score-good {
  color: #e6a23c;
}

.score-value.score-needs-improvement {
  color: #f56c6c;
}

.score-value.score-poor {
  color: #f56c6c;
}

.score-label {
  font-size: 14px;
  color: #606266;
}

.device-info {
  display: flex;
  gap: 10px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.metric-item {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-name {
  font-weight: 600;
  font-size: 16px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  margin: 10px 0;
}

.metric-bar {
  height: 6px;
  background: #e4e7ed;
  border-radius: 3px;
  overflow: hidden;
  margin: 10px 0;
}

.metric-progress {
  height: 100%;
  transition: width 0.3s ease;
}

.metric-progress.success {
  background: #67c23a;
}

.metric-progress.warning {
  background: #e6a23c;
}

.metric-progress.danger {
  background: #f56c6c;
}

.metric-description {
  font-size: 12px;
  color: #909399;
}

.realtime-metrics {
  margin-bottom: 20px;
}

.realtime-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.realtime-item:last-child {
  border-bottom: none;
}

.metric-icon {
  font-size: 20px;
  color: #409eff;
}

.metric-info {
  flex: 1;
}

.metric-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.metric-info .metric-value {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.memory-chart {
  margin-top: 20px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

.no-issues {
  text-align: center;
  padding: 40px;
}

.success-icon {
  font-size: 48px;
  color: #67c23a;
  margin-bottom: 16px;
}

.issues-list {
  max-height: 300px;
  overflow-y: auto;
}

.issue-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #ebeef5;
}

.issue-item:last-child {
  border-bottom: none;
}

.issue-icon {
  font-size: 20px;
  color: #e6a23c;
  margin-top: 2px;
}

.issue-content {
  flex: 1;
}

.issue-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.issue-suggestion {
  font-size: 12px;
  color: #909399;
}

@media (max-width: 768px) {
  .score-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-header .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
}
</style>