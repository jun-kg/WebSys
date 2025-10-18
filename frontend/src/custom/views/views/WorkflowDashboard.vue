<template>
  <div class="workflow-dashboard">
    <div class="page-header">
      <h1 class="page-title">ワークフロー統計ダッシュボード</h1>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="〜"
          start-placeholder="開始日"
          end-placeholder="終了日"
          @change="fetchStatistics"
          style="margin-right: 15px;"
        />
        <el-button @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          更新
        </el-button>
      </div>
    </div>

    <!-- 概要統計カード -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon pending">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ statistics.pendingRequests || 0 }}</div>
              <div class="stat-label">承認待ち</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon approved">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ statistics.approvedRequests || 0 }}</div>
              <div class="stat-label">承認済み</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon rejected">
              <el-icon><Close /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ statistics.rejectedRequests || 0 }}</div>
              <div class="stat-label">却下</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon urgent">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ statistics.urgentRequests || 0 }}</div>
              <div class="stat-label">緊急申請</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 承認率表示 -->
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="approval-rate-card">
          <template #header>
            <span>承認率</span>
          </template>
          <div class="approval-rate-content">
            <el-progress
              :percentage="Math.round(statistics.approvalRate || 0)"
              :stroke-width="20"
              :text-inside="true"
              :color="getApprovalRateColor(statistics.approvalRate)"
            />
            <div class="approval-rate-details">
              <span>承認率: {{ (statistics.approvalRate || 0).toFixed(1) }}%</span>
              <span>（承認: {{ statistics.approvedRequests || 0 }}件 / 総申請: {{ getTotalRequests() }}件）</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- チャートセクション -->
    <el-row :gutter="20" class="chart-section">
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <span>ワークフロータイプ別申請数</span>
          </template>
          <div id="workflow-type-chart" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <span>月別申請推移</span>
          </template>
          <div id="monthly-trend-chart" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-section">
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <span>申請状態分布</span>
          </template>
          <div id="status-distribution-chart" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <span>部署別申請数</span>
          </template>
          <div id="department-chart" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 詳細テーブル -->
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="table-header">
              <span>最近の申請</span>
              <el-button type="text" @click="viewAllRequests">
                すべて表示 →
              </el-button>
            </div>
          </template>
          <el-table
            :data="recentRequests"
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
            <el-table-column prop="status" label="状態" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="申請日" width="120">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button size="small" @click="viewRequest(row)">詳細</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 承認者パフォーマンス -->
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>承認者パフォーマンス</span>
          </template>
          <el-table
            :data="approverPerformance"
            style="width: 100%"
          >
            <el-table-column prop="approverName" label="承認者" width="150" />
            <el-table-column prop="totalApprovals" label="承認件数" width="120" />
            <el-table-column prop="avgApprovalTime" label="平均承認時間" width="150">
              <template #default="{ row }">
                {{ formatApprovalTime(row.avgApprovalTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="approvalRate" label="承認率" width="120">
              <template #default="{ row }">
                {{ (row.approvalRate || 0).toFixed(1) }}%
              </template>
            </el-table-column>
            <el-table-column prop="pendingCount" label="承認待ち" width="120" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Clock, Check, Close, Warning } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { formatDate } from '@/utils/date'
// import * as echarts from 'echarts' // 一時的にコメントアウト

// echartsのモック
const echarts = {
  init: () => ({
    setOption: () => {},
    resize: () => {},
    dispose: () => {}
  })
}

const router = useRouter()

// リアクティブデータ
const loading = ref(false)
const dateRange = ref([])
const statistics = ref({})
const recentRequests = ref([])
const approverPerformance = ref([])
const chartInstances = ref({})

// メソッド
const fetchStatistics = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()

    if (dateRange.value && dateRange.value.length === 2) {
      params.append('dateFrom', dateRange.value[0].toISOString().split('T')[0])
      params.append('dateTo', dateRange.value[1].toISOString().split('T')[0])
    }

    const response = await fetch(`/api/workflow/dashboard/statistics?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      statistics.value = await response.json()
      await nextTick()
      initCharts()
    } else {
      ElMessage.error('統計データの取得に失敗しました')
    }
  } catch (error) {
    ElMessage.error('通信エラーが発生しました')
  } finally {
    loading.value = false
  }
}

const fetchRecentRequests = async () => {
  try {
    const response = await fetch('/api/workflow/requests?limit=10&sort=createdAt_desc', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      recentRequests.value = data.data
    }
  } catch (error) {
    console.error('最近の申請取得エラー:', error)
  }
}

const fetchApprovalStatistics = async () => {
  try {
    const params = new URLSearchParams()

    if (dateRange.value && dateRange.value.length === 2) {
      params.append('dateFrom', dateRange.value[0].toISOString().split('T')[0])
      params.append('dateTo', dateRange.value[1].toISOString().split('T')[0])
    }

    const response = await fetch(`/api/approval/statistics?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      approverPerformance.value = data.approverPerformance || []
    }
  } catch (error) {
    console.error('承認統計取得エラー:', error)
  }
}

const initCharts = () => {
  initWorkflowTypeChart()
  initMonthlyTrendChart()
  initStatusDistributionChart()
  initDepartmentChart()
}

const initWorkflowTypeChart = () => {
  const chartDom = document.getElementById('workflow-type-chart')
  if (!chartDom) return

  const chart = echarts.init(chartDom)
  chartInstances.value.workflowType = chart

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: statistics.value.workflowTypeData?.map(item => item.name) || []
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: '申請数',
      type: 'bar',
      data: statistics.value.workflowTypeData?.map(item => item.count) || [],
      itemStyle: {
        color: '#409EFF'
      }
    }]
  }

  chart.setOption(option)
}

const initMonthlyTrendChart = () => {
  const chartDom = document.getElementById('monthly-trend-chart')
  if (!chartDom) return

  const chart = echarts.init(chartDom)
  chartInstances.value.monthlyTrend = chart

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: statistics.value.monthlyData?.map(item => item.month) || []
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '申請数',
        type: 'line',
        data: statistics.value.monthlyData?.map(item => item.requests) || [],
        smooth: true,
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '承認数',
        type: 'line',
        data: statistics.value.monthlyData?.map(item => item.approvals) || [],
        smooth: true,
        itemStyle: { color: '#67C23A' }
      }
    ]
  }

  chart.setOption(option)
}

const initStatusDistributionChart = () => {
  const chartDom = document.getElementById('status-distribution-chart')
  if (!chartDom) return

  const chart = echarts.init(chartDom)
  chartInstances.value.statusDistribution = chart

  const statusData = [
    { name: '承認待ち', value: statistics.value.pendingRequests || 0, itemStyle: { color: '#E6A23C' } },
    { name: '承認済み', value: statistics.value.approvedRequests || 0, itemStyle: { color: '#67C23A' } },
    { name: '却下', value: statistics.value.rejectedRequests || 0, itemStyle: { color: '#F56C6C' } },
    { name: 'その他', value: (statistics.value.myRequests || 0) - (statistics.value.pendingRequests || 0) - (statistics.value.approvedRequests || 0) - (statistics.value.rejectedRequests || 0), itemStyle: { color: '#909399' } }
  ].filter(item => item.value > 0)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    series: [{
      name: '申請状態',
      type: 'pie',
      radius: ['40%', '70%'],
      data: statusData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }

  chart.setOption(option)
}

const initDepartmentChart = () => {
  const chartDom = document.getElementById('department-chart')
  if (!chartDom) return

  const chart = echarts.init(chartDom)
  chartInstances.value.department = chart

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: statistics.value.departmentData?.map(item => item.name) || []
    },
    series: [{
      name: '申請数',
      type: 'bar',
      data: statistics.value.departmentData?.map(item => item.count) || [],
      itemStyle: {
        color: '#67C23A'
      }
    }]
  }

  chart.setOption(option)
}

const refreshData = async () => {
  await Promise.all([
    fetchStatistics(),
    fetchRecentRequests(),
    fetchApprovalStatistics()
  ])
}

const viewAllRequests = () => {
  router.push('/workflow/requests')
}

const viewRequest = (item: any) => {
  router.push(`/workflow/requests/${item.id}`)
}

// ユーティリティ関数
const getTotalRequests = () => {
  const { pendingRequests = 0, approvedRequests = 0, rejectedRequests = 0 } = statistics.value
  return pendingRequests + approvedRequests + rejectedRequests
}

const getApprovalRateColor = (rate: number) => {
  if (rate >= 80) return '#67C23A'
  if (rate >= 60) return '#E6A23C'
  return '#F56C6C'
}

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

const formatApprovalTime = (hours: number) => {
  if (!hours) return '-'
  if (hours < 24) return `${Math.round(hours)}時間`
  return `${Math.round(hours / 24)}日`
}

// ライフサイクル
onMounted(() => {
  // デフォルトで過去30日間を設定
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  dateRange.value = [startDate, endDate]

  refreshData()

  // ウィンドウリサイズでチャートをリサイズ
  window.addEventListener('resize', () => {
    Object.values(chartInstances.value).forEach((chart: any) => {
      chart?.resize()
    })
  })
})

onUnmounted(() => {
  // チャートインスタンスを破棄
  Object.values(chartInstances.value).forEach((chart: any) => {
    chart?.dispose()
  })
  window.removeEventListener('resize', () => {})
})
</script>

<style scoped>
.workflow-dashboard {
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

.header-actions {
  display: flex;
  align-items: center;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 24px;
  color: white;
}

.stat-icon.pending {
  background: linear-gradient(135deg, #E6A23C, #F7BA2A);
}

.stat-icon.approved {
  background: linear-gradient(135deg, #67C23A, #85CE61);
}

.stat-icon.rejected {
  background: linear-gradient(135deg, #F56C6C, #F78989);
}

.stat-icon.urgent {
  background: linear-gradient(135deg, #F56C6C, #E6A23C);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.approval-rate-card {
  margin-bottom: 20px;
}

.approval-rate-content {
  padding: 20px 0;
}

.approval-rate-details {
  margin-top: 15px;
  text-align: center;
  color: #606266;
  font-size: 14px;
}

.approval-rate-details span {
  margin: 0 10px;
}

.chart-section {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-card__header) {
  background: #f8f9fa;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
}

:deep(.el-progress-bar__outer) {
  border-radius: 10px;
}

:deep(.el-progress-bar__inner) {
  border-radius: 10px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .header-actions {
    justify-content: center;
  }

  .stat-content {
    flex-direction: column;
    text-align: center;
  }

  .stat-icon {
    margin-right: 0;
    margin-bottom: 10px;
  }
}
</style>