<template>
  <div class="log-monitoring">
    <!-- ヘッダー -->
    <el-row :gutter="20" class="mb-4">
      <el-col :span="24">
        <LogMonitoringHeader
          :loading="statsLoading"
          :search-loading="searchLoading"
          :showing-errors-only="showingErrorsOnly"
          :connection-status="webSocket.connectionStatus.value"
          :latency="webSocket.latency.value"
          @refresh="refreshStats"
          @toggle-errors="showErrorsOnly"
          @test-log="testLog"
          @test-error="sendTestErrorLog"
        >
          <LogStatsDashboard
            :stats="stats"
            :buffer-size="logService.bufferSize.value"
            @filter="handleStatsFilter"
          />
        </LogMonitoringHeader>
      </el-col>
    </el-row>

    <!-- リアルタイムログとアラート -->
    <el-row :gutter="20" class="mb-4" v-if="webSocket.isConnected.value">
      <el-col :xs="24" :sm="24" :md="12" :lg="12">
        <LogRealtimePanel
          :logs="webSocket.newLogs.value"
          @clear="webSocket.clearLogs"
          @show-detail="showLogDetail"
        />
      </el-col>
      <el-col :xs="24" :sm="24" :md="12" :lg="12">
        <LogAlertPanel
          :alerts="webSocket.alerts.value"
          @clear="webSocket.clearAlerts"
          @dismiss="webSocket.dismissAlert"
        />
      </el-col>
    </el-row>

    <!-- 検索とサイドバー -->
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="16" :lg="16">
        <LogSearchPanel
          :loading="searchLoading"
          :results="logs"
          :total="total"
          :current-page="currentPage"
          :page-size="pageSize"
          @search="performSearch"
          @reset="resetSearch"
          @page-change="handlePageChange"
          @size-change="handleSizeChange"
          @show-detail="showLogDetail"
          @export="showExportDialog"
        />
      </el-col>

      <el-col :xs="24" :sm="24" :md="8" :lg="8">
        <LogSidebar
          :logs="recentLogs"
          :filter="sidebarFilter"
          :test-loading="sendingTestLog"
          @filter-change="setSidebarFilter"
          @show-detail="showLogDetail"
          @send-test="sendTestLog"
        />
      </el-col>
    </el-row>

    <!-- ログ詳細ダイアログ -->
    <LogDetailDialog
      v-model="logDetailVisible"
      :log="selectedLog"
    />

    <!-- エクスポートダイアログ -->
    <LogExportDialog
      v-model="exportDialogVisible"
      @export="handleExport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useLogService, useLogSearch, useRealtimeStats } from '@core/composables/useLogService'
import { useWebSocket, useWebSocketHeartbeat } from '@core/composables/useWebSocket'
import { useAuthStore } from '@custom/stores/auth'
import type { LogEntry } from '@/types/log'

// コンポーネントインポート
import LogMonitoringHeader from '@/components/log-monitoring/LogMonitoringHeader.vue'
import LogStatsDashboard from '@/components/log-monitoring/LogStatsDashboard.vue'
import LogRealtimePanel from '@/components/log-monitoring/LogRealtimePanel.vue'
import LogAlertPanel from '@/components/log-monitoring/LogAlertPanel.vue'
import LogSearchPanel from '@/components/log-monitoring/LogSearchPanel.vue'
import LogSidebar from '@/components/log-monitoring/LogSidebar.vue'
import LogDetailDialog from '@/components/log-monitoring/LogDetailDialog.vue'
import LogExportDialog from '@/components/log-monitoring/LogExportDialog.vue'

// Composables
const logService = useLogService()
const logSearch = useLogSearch()
const realtimeStats = useRealtimeStats()
const webSocket = useWebSocket()
const authStore = useAuthStore()
useWebSocketHeartbeat(webSocket)

// 状態管理
const { stats, loading: statsLoading, fetchStats: refreshStats } = realtimeStats
const { logs, loading: searchLoading, total, currentPage, pageSize, search: searchLogs } = logSearch

// UI状態
const logDetailVisible = ref(false)
const exportDialogVisible = ref(false)
const selectedLog = ref<LogEntry | null>(null)
const sendingTestLog = ref(false)
const showingErrorsOnly = ref(false)
const sidebarFilter = ref<'all' | 'errors' | 'warnings'>('all')

// 計算プロパティ
const recentLogs = computed(() => stats.value?.recentLogs || [])

// イベントハンドラ
const showLogDetail = (log: LogEntry) => {
  selectedLog.value = log
  logDetailVisible.value = true
}

const showExportDialog = () => {
  exportDialogVisible.value = true
}

const handleStatsFilter = (type: string) => {
  // 統計カードクリック時のフィルタ処理
  console.log('Stats filter:', type)
}

const performSearch = (params: any) => {
  searchLogs(params)
}

const resetSearch = () => {
  logSearch.resetSearch()
  performSearch({})
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  performSearch({})
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  performSearch({})
}

const setSidebarFilter = (filter: 'all' | 'errors' | 'warnings') => {
  sidebarFilter.value = filter
}

const showErrorsOnly = () => {
  showingErrorsOnly.value = !showingErrorsOnly.value
  // エラーフィルタロジック実装
}

const testLog = () => {
  logService.logInfo('ログ監視システム画面からのテストログ', {
    source: 'frontend',
    category: 'SYS'
  })
  ElMessage.success('テストログを送信しました')
}

const sendTestErrorLog = () => {
  // テストエラーログ送信ロジック
  ElMessage.warning('テストエラーログを送信しました')
}

const sendTestLog = async (testData: any) => {
  sendingTestLog.value = true
  try {
    await logService.sendLog(
      logService.createLogEntry(testData.level, testData.category, testData.message, {
        source: 'frontend'
      })
    )
    ElMessage.success('テストログを送信しました')
  } finally {
    sendingTestLog.value = false
  }
}

const handleExport = async (options: any) => {
  // エクスポート処理実装
  console.log('Export options:', options)
  ElMessage.success('エクスポートを開始しました')
}

// ライフサイクル
onMounted(() => {
  logService.startAutoFlush()
  searchLogs()
  logService.logInfo('ログ監視システム画面を表示', {
    source: 'frontend',
    category: 'USER'
  })
})

onUnmounted(() => {
  logService.stopAutoFlush()
})
</script>

<style scoped>
.log-monitoring {
  padding: 20px;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>