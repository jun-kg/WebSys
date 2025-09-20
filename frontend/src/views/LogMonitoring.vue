<template>
  <div class="log-monitoring">
    <el-row :gutter="20" class="mb-4">
      <el-col :span="24">
        <el-card class="header-card">
          <template #header>
            <div class="card-header">
              <span class="title">ログ監視システム</span>
              <el-button-group>
                <el-button
                  type="primary"
                  @click="refreshStats"
                  :loading="statsLoading"
                  icon="Refresh"
                >
                  更新
                </el-button>
                <el-button
                  type="danger"
                  @click="showErrorsOnly"
                  :icon="showingErrorsOnly ? 'View' : 'Warning'"
                  :loading="searchLoading"
                >
                  {{ showingErrorsOnly ? '全ログ表示' : 'エラーのみ表示' }}
                </el-button>
                <el-button
                  type="success"
                  @click="testLog"
                  icon="Check"
                >
                  テストログ送信
                </el-button>
                <el-button
                  type="warning"
                  @click="sendTestErrorLog"
                  icon="Warning"
                >
                  テストエラー送信
                </el-button>
              </el-button-group>

              <!-- WebSocket接続状況 -->
              <div class="websocket-status">
                <el-tag
                  :type="webSocket.connectionStatus.value === 'connected' ? 'success' :
                        webSocket.connectionStatus.value === 'connecting' ? 'warning' : 'danger'"
                  :icon="webSocket.connectionStatus.value === 'connected' ? 'Check' :
                        webSocket.connectionStatus.value === 'connecting' ? 'Loading' : 'Close'"
                  size="small"
                >
                  {{ webSocket.connectionStatus.value === 'connected' ? 'リアルタイム監視中' :
                     webSocket.connectionStatus.value === 'connecting' ? '接続中...' : '切断' }}
                </el-tag>
                <span v-if="webSocket.isConnected.value && webSocket.latency.value > 0" class="latency">
                  ({{ webSocket.latency.value }}ms)
                </span>
              </div>
            </div>
        </template>

        <!-- リアルタイム統計 -->
        <el-row :gutter="16">
          <el-col :xs="12" :sm="12" :md="6" :lg="6" v-for="stat in statsCards" :key="stat.key">
            <el-card :body-style="{ padding: '20px' }" shadow="hover">
              <el-statistic
                :value="stat.value"
                :title="stat.title"
                :precision="0"
              >
                <template #prefix>
                  <el-icon :style="{ color: stat.color }">
                    <component :is="stat.icon" />
                  </el-icon>
                </template>
              </el-statistic>
            </el-card>
          </el-col>
        </el-row>
      </el-card>
    </el-col>
  </el-row>

  <!-- リアルタイムログとアラート -->
  <el-row :gutter="20" class="mb-4" v-if="webSocket.isConnected.value">
    <el-col :xs="24" :sm="24" :md="12" :lg="12">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>📡 リアルタイムログ</span>
            <el-button @click="webSocket.clearLogs" size="small" type="text">クリア</el-button>
          </div>
        </template>
        <div class="realtime-logs">
          <div
            v-for="log in webSocket.newLogs.value.slice(0, 10)"
            :key="log.id"
            class="realtime-log-item"
            :class="`level-${log.level}`"
          >
            <div class="log-time">{{ formatTimestamp(log.timestamp) }}</div>
            <div class="log-content">
              <el-tag :color="LOG_LEVEL_COLORS[log.level]" size="small" effect="dark">
                {{ LOG_LEVEL_NAMES[log.level] }}
              </el-tag>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
          <div v-if="webSocket.newLogs.value.length === 0" class="no-logs">
            リアルタイムログを待機中...
          </div>
        </div>
      </el-card>
    </el-col>

    <el-col :xs="24" :sm="24" :md="12" :lg="12">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>🚨 リアルタイムアラート</span>
            <el-button @click="webSocket.clearAlerts" size="small" type="text">クリア</el-button>
          </div>
        </template>
        <div class="realtime-alerts">
          <div
            v-for="(alert, index) in webSocket.alerts.value.slice(0, 5)"
            :key="index"
            class="realtime-alert-item"
            :class="`alert-${alert.level}`"
          >
            <div class="alert-header">
              <el-tag
                :type="alert.level === 'critical' ? 'danger' :
                      alert.level === 'error' ? 'danger' :
                      alert.level === 'warning' ? 'warning' : 'info'"
                size="small"
              >
                {{ alert.level.toUpperCase() }}
              </el-tag>
              <el-button
                @click="webSocket.dismissAlert(index)"
                size="small"
                type="text"
                icon="Close"
              />
            </div>
            <div class="alert-message">{{ alert.message }}</div>
          </div>
          <div v-if="webSocket.alerts.value.length === 0" class="no-alerts">
            アラートはありません
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>

  <!-- 検索フォーム -->
  <el-row :gutter="20" class="mb-4">
    <el-col :span="24">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>🔍 ログ検索</span>
            <el-button @click="toggleSearchForm" type="text" icon="Search">
              {{ searchFormVisible ? '検索フォームを閉じる' : '詳細検索を開く' }}
            </el-button>
          </div>
        </template>

        <!-- 検索フォーム -->
        <el-collapse-transition>
          <div v-show="searchFormVisible" class="search-form mb-4">
            <el-form :model="searchForm" label-width="100px" :inline="true">
              <el-form-item label="期間">
                <el-date-picker
                  v-model="searchForm.dateRange"
                  type="datetimerange"
                  range-separator="〜"
                  start-placeholder="開始日時"
                  end-placeholder="終了日時"
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                />
              </el-form-item>

              <el-form-item label="レベル">
                <el-select
                  v-model="searchForm.levels"
                  multiple
                  placeholder="ログレベル選択"
                  style="width: 200px"
                >
                  <el-option
                    v-for="level in LOG_LEVELS"
                    :key="level.value"
                    :label="level.label"
                    :value="level.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="カテゴリ">
                <el-select
                  v-model="searchForm.categories"
                  multiple
                  placeholder="カテゴリ選択"
                  style="width: 200px"
                >
                  <el-option label="認証" value="AUTH" />
                  <el-option label="API" value="API" />
                  <el-option label="データベース" value="DB" />
                  <el-option label="セキュリティ" value="SEC" />
                  <el-option label="システム" value="SYS" />
                  <el-option label="ユーザー" value="USER" />
                  <el-option label="パフォーマンス" value="PERF" />
                  <el-option label="エラー" value="ERR" />
                </el-select>
              </el-form-item>

              <el-form-item label="検索">
                <el-input
                  v-model="searchForm.query"
                  placeholder="メッセージ検索"
                  style="width: 200px"
                  clearable
                />
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="performSearch" :loading="searchLoading" icon="Search">
                  検索
                </el-button>
                <el-button @click="resetSearch" icon="Refresh">
                  リセット
                </el-button>
                <el-dropdown @command="exportLogs">
                  <el-button type="warning" icon="Download">
                    エクスポート <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="json">JSON形式</el-dropdown-item>
                      <el-dropdown-item command="csv">CSV形式</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </el-form-item>
            </el-form>
          </div>
        </el-collapse-transition>
      </el-card>
    </el-col>
  </el-row>

    <el-row :gutter="20">
      <!-- ログ検索 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>ログ検索</span>
              <el-button @click="toggleSearchForm" :icon="searchFormVisible ? 'ArrowUp' : 'ArrowDown'">
                {{ searchFormVisible ? '検索条件を隠す' : '検索条件を表示' }}
              </el-button>
            </div>
          </template>

          <!-- 検索フォーム -->
          <el-collapse-transition>
            <div v-show="searchFormVisible" class="search-form mb-4">
              <el-form :model="searchForm" label-width="100px" :inline="true">
                <el-form-item label="期間">
                  <el-date-picker
                    v-model="searchForm.dateRange"
                    type="datetimerange"
                    range-separator="〜"
                    start-placeholder="開始日時"
                    end-placeholder="終了日時"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                  />
                </el-form-item>

                <el-form-item label="レベル">
                  <el-select
                    v-model="searchForm.levels"
                    multiple
                    placeholder="ログレベル選択"
                    style="width: 200px"
                  >
                    <el-option
                      v-for="(name, level) in LOG_LEVEL_NAMES"
                      :key="level"
                      :label="name"
                      :value="Number(level)"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="カテゴリ">
                  <el-select
                    v-model="searchForm.categories"
                    multiple
                    placeholder="カテゴリ選択"
                    style="width: 200px"
                  >
                    <el-option
                      v-for="(name, category) in LOG_CATEGORY_NAMES"
                      :key="category"
                      :label="name"
                      :value="category"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="キーワード">
                  <el-input
                    v-model="searchForm.query"
                    placeholder="メッセージ検索"
                    style="width: 200px"
                    clearable
                  />
                </el-form-item>

                <el-form-item>
                  <el-button type="primary" @click="performSearch" :loading="searchLoading" icon="Search">
                    検索
                  </el-button>
                  <el-button @click="resetSearch" icon="Refresh">
                    リセット
                  </el-button>
                  <el-dropdown @command="exportLogs">
                    <el-button type="warning" icon="Download">
                      エクスポート <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="json">JSON形式</el-dropdown-item>
                        <el-dropdown-item command="csv">CSV形式</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-form-item>
              </el-form>
            </div>
          </el-collapse-transition>

          <!-- ログ一覧 -->
          <el-table
            :data="logs"
            :loading="searchLoading"
            height="500"
            stripe
            size="small"
          >
            <el-table-column prop="timestamp" label="時刻" width="180">
              <template #default="{ row }">
                {{ formatTimestamp(row.timestamp) }}
              </template>
            </el-table-column>

            <el-table-column prop="level" label="レベル" width="80">
              <template #default="{ row }">
                <el-tag
                  :color="LOG_LEVEL_COLORS[row.level]"
                  size="small"
                  effect="dark"
                >
                  {{ LOG_LEVEL_NAMES[row.level] }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="category" label="カテゴリ" width="100">
              <template #default="{ row }">
                <el-tag size="small">
                  {{ LOG_CATEGORY_NAMES[row.category] }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="message" label="メッセージ" min-width="300" show-overflow-tooltip />

            <el-table-column prop="source" label="ソース" width="100">
              <template #default="{ row }">
                <el-tag type="info" size="small">
                  {{ LOG_SOURCE_NAMES[row.source] }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="user" label="ユーザー" width="120">
              <template #default="{ row }">
                {{ row.user?.name || '-' }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="primary"
                  link
                  @click="showLogDetail(row)"
                  icon="View"
                >
                  詳細
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- ページネーション -->
          <div class="pagination mt-4">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[20, 50, 100]"
              :total="total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="performSearch"
              @current-change="performSearch"
            />
          </div>
        </el-card>
      </el-col>

      <!-- サイドパネル -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8">
        <el-card class="mb-4">
          <template #header>
            <div class="card-header">
              <span>最新ログ</span>
              <el-button-group size="small">
                <el-button
                  :type="sidebarFilter === 'all' ? 'primary' : ''"
                  @click="setSidebarFilter('all')"
                  size="small"
                >
                  全て
                </el-button>
                <el-button
                  :type="sidebarFilter === 'errors' ? 'danger' : ''"
                  @click="setSidebarFilter('errors')"
                  size="small"
                >
                  エラー
                </el-button>
                <el-button
                  :type="sidebarFilter === 'warnings' ? 'warning' : ''"
                  @click="setSidebarFilter('warnings')"
                  size="small"
                >
                  警告
                </el-button>
              </el-button-group>
            </div>
          </template>

          <div v-if="filteredRecentLogs.length === 0" class="text-center text-gray-500">
            {{ sidebarFilter === 'all' ? '最新ログはありません' :
               sidebarFilter === 'errors' ? 'エラーログはありません' : '警告ログはありません' }}
          </div>

          <div v-else>
            <div
              v-for="log in filteredRecentLogs.slice(0, 5)"
              :key="log.id"
              class="recent-log-item"
              :class="getLogItemClass(log.level)"
              @click="showLogDetail(log)"
            >
              <div class="log-header">
                <el-tag
                  :color="LOG_LEVEL_COLORS[log.level]"
                  size="small"
                  effect="dark"
                >
                  {{ LOG_LEVEL_NAMES[log.level] }}
                </el-tag>
                <span class="timestamp">{{ formatRelativeTime(log.timestamp) }}</span>
              </div>
              <div class="log-message">{{ log.message }}</div>
            </div>
          </div>
        </el-card>

        <!-- ログ送信テスト -->
        <el-card>
          <template #header>
            <span>ログ送信テスト</span>
          </template>

          <el-form :model="testLogForm" label-width="80px" size="small">
            <el-form-item label="レベル">
              <el-select v-model="testLogForm.level" style="width: 100%">
                <el-option
                  v-for="(name, level) in LOG_LEVEL_NAMES"
                  :key="level"
                  :label="name"
                  :value="Number(level)"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="カテゴリ">
              <el-select v-model="testLogForm.category" style="width: 100%">
                <el-option
                  v-for="(name, category) in LOG_CATEGORY_NAMES"
                  :key="category"
                  :label="name"
                  :value="category"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="メッセージ">
              <el-input
                v-model="testLogForm.message"
                type="textarea"
                :rows="3"
                placeholder="ログメッセージを入力"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                @click="sendTestLog"
                :loading="sendingTestLog"
                style="width: 100%"
              >
                送信
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- ログ詳細ダイアログ -->
    <el-dialog
      v-model="logDetailVisible"
      title="ログ詳細"
      width="80%"
      :close-on-click-modal="false"
    >
      <div v-if="selectedLog">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ selectedLog.id }}</el-descriptions-item>
          <el-descriptions-item label="時刻">{{ formatTimestamp(selectedLog.timestamp) }}</el-descriptions-item>
          <el-descriptions-item label="レベル">
            <el-tag :color="LOG_LEVEL_COLORS[selectedLog.level]" effect="dark">
              {{ LOG_LEVEL_NAMES[selectedLog.level] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="カテゴリ">
            <el-tag>{{ LOG_CATEGORY_NAMES[selectedLog.category] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="ソース">
            <el-tag type="info">{{ LOG_SOURCE_NAMES[selectedLog.source] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="ユーザー">{{ selectedLog.user?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="セッションID">{{ selectedLog.sessionId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="トレースID">{{ selectedLog.traceId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="ホスト名">{{ selectedLog.hostname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="サービス">{{ selectedLog.service || '-' }}</el-descriptions-item>
          <el-descriptions-item label="環境">{{ selectedLog.environment || '-' }}</el-descriptions-item>
          <el-descriptions-item label="タグ">
            <el-tag v-for="tag in selectedLog.tags" :key="tag" size="small" class="mr-1">
              {{ tag }}
            </el-tag>
            <span v-if="!selectedLog.tags?.length">-</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>メッセージ</el-divider>
        <pre class="log-message-detail">{{ selectedLog.message }}</pre>

        <el-divider v-if="selectedLog.details">詳細情報</el-divider>
        <pre v-if="selectedLog.details" class="log-details">{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>

        <el-divider v-if="selectedLog.error">エラー情報</el-divider>
        <pre v-if="selectedLog.error" class="log-error">{{ JSON.stringify(selectedLog.error, null, 2) }}</pre>

        <el-divider v-if="selectedLog.performance">パフォーマンス情報</el-divider>
        <pre v-if="selectedLog.performance" class="log-performance">{{ JSON.stringify(selectedLog.performance, null, 2) }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Document,
  Warning,
  CircleCheck,
  Tools,
  Search,
  ArrowUp,
  ArrowDown,
  Refresh,
  Check,
  View,
  Download
} from '@element-plus/icons-vue'
import { useLogService, useLogSearch, useRealtimeStats } from '@/composables/useLogService'
import { useWebSocket, useWebSocketHeartbeat } from '@/composables/useWebSocket'
import { useAuthStore } from '@/stores/auth'
import {
  LOG_LEVEL_NAMES,
  LOG_LEVEL_COLORS,
  LOG_CATEGORY_NAMES,
  LOG_SOURCE_NAMES,
  LOG_LEVELS
} from '@/types/log'
import type { LogEntry, LogLevel, LogCategory } from '@/types/log'

// Composables
const logService = useLogService()
const logSearch = useLogSearch()
const realtimeStats = useRealtimeStats()
const webSocket = useWebSocket()
const authStore = useAuthStore()
useWebSocketHeartbeat(webSocket)

// リアルタイム統計
const { stats, loading: statsLoading, fetchStats: refreshStats } = realtimeStats

// ログ検索
const {
  logs,
  loading: searchLoading,
  total,
  currentPage,
  pageSize,
  search: searchLogs
} = logSearch

// UI状態
const searchFormVisible = ref(false)
const logDetailVisible = ref(false)
const selectedLog = ref<LogEntry | null>(null)
const sendingTestLog = ref(false)
const showingErrorsOnly = ref(false)
const sidebarFilter = ref<'all' | 'errors' | 'warnings'>('all')

// 検索フォーム
const searchForm = reactive({
  dateRange: [] as string[],
  levels: [] as number[],
  categories: [] as string[],
  query: ''
})

// テストログフォーム
const testLogForm = reactive({
  level: 30 as LogLevel,
  category: 'SYS' as LogCategory,
  message: 'テストログメッセージ'
})

// 統計カード
const statsCards = computed(() => [
  {
    key: 'total',
    title: '総ログ数',
    value: stats.value?.totalLogs || 0,
    icon: Document,
    color: '#409eff'
  },
  {
    key: 'errors',
    title: 'エラー数',
    value: stats.value?.errorCount || 0,
    icon: Warning,
    color: '#f56c6c'
  },
  {
    key: 'warnings',
    title: '警告数',
    value: stats.value?.warningCount || 0,
    icon: Warning,
    color: '#e6a23c'
  },
  {
    key: 'buffer',
    title: 'バッファ',
    value: logService.bufferSize.value,
    icon: Tools,
    color: '#67c23a'
  }
])

// 最新ログ
const recentLogs = computed(() => stats.value?.recentLogs || [])

// フィルタされた最新ログ
const filteredRecentLogs = computed(() => {
  const logs = recentLogs.value
  switch (sidebarFilter.value) {
    case 'errors':
      return logs.filter(log => log.level >= 50) // ERROR以上
    case 'warnings':
      return logs.filter(log => log.level === 40) // WARN
    default:
      return logs
  }
})

// メソッド
const toggleSearchForm = () => {
  searchFormVisible.value = !searchFormVisible.value
}

const resetSearch = () => {
  Object.assign(searchForm, {
    dateRange: [],
    levels: [],
    categories: [],
    query: ''
  })
  logSearch.resetSearch()
  performSearch()
}

// ログエクスポート機能
const exportLogs = async (format: 'json' | 'csv') => {
  try {
    const params = new URLSearchParams()

    // 検索条件をエクスポートパラメータに追加
    if (searchForm.levels.length > 0) {
      params.append('levels', searchForm.levels.join(','))
    }
    if (searchForm.categories.length > 0) {
      params.append('categories', searchForm.categories.join(','))
    }
    if (searchForm.query) {
      params.append('query', searchForm.query)
    }
    if (searchForm.dateRange.length === 2) {
      params.append('startTime', searchForm.dateRange[0])
      params.append('endTime', searchForm.dateRange[1])
    }
    params.append('format', format)

    // API エンドポイントを呼び出してファイルをダウンロード
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/logs/export?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (!response.ok) {
      throw new Error('エクスポートに失敗しました')
    }

    // ファイルダウンロード
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs_${new Date().toISOString().split('T')[0]}.${format}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    ElMessage.success(`ログを${format.toUpperCase()}形式でエクスポートしました`)
  } catch (error: any) {
    console.error('Export error:', error)
    ElMessage.error('エクスポートに失敗しました: ' + error.message)
  }
}

const showLogDetail = (log: LogEntry) => {
  selectedLog.value = log
  logDetailVisible.value = true
}

const testLog = () => {
  logService.logInfo('ログ監視システム画面からのテストログ', {
    source: 'frontend',
    category: 'SYS',
    details: { action: 'test_from_ui', timestamp: new Date().toISOString() }
  })
  ElMessage.success('テストログを送信しました')
}

const sendTestErrorLog = () => {
  // テストエラーログを複数レベルで送信
  const testErrors = [
    {
      level: 50,
      message: 'テストエラー: データベース接続失敗',
      category: 'DB',
      error: {
        name: 'ConnectionError',
        message: 'Failed to connect to database',
        code: 'DB_CONNECTION_FAILED'
      }
    },
    {
      level: 40,
      message: 'テスト警告: API応答時間が遅延',
      category: 'PERF',
      details: { responseTime: 5000, threshold: 3000 }
    },
    {
      level: 60,
      message: 'テスト致命的エラー: システム停止',
      category: 'SYS',
      error: {
        name: 'SystemCrashError',
        message: 'Critical system failure detected',
        code: 'SYSTEM_CRASH'
      }
    }
  ]

  testErrors.forEach((errorLog, index) => {
    setTimeout(() => {
      logService.sendLog(
        logService.createLogEntry(
          errorLog.level as LogLevel,
          errorLog.category as LogCategory,
          errorLog.message,
          {
            source: 'frontend',
            details: errorLog.details || { action: 'test_error_from_ui', index },
            error: errorLog.error
          }
        )
      )
    }, index * 500) // 500ms間隔で送信
  })

  ElMessage.warning('テストエラーログを送信しました (3件)')

  // 少し後にログを更新
  setTimeout(() => {
    searchLogs()
    refreshStats()
  }, 2000)
}

// 検索パラメータを適用して検索を実行
const performSearch = () => {
  const params: any = {
    page: 1,
    pageSize: pageSize.value
  }

  // 検索フォームからパラメータを追加
  if (searchForm.levels.length > 0) {
    params.levels = searchForm.levels
  }
  if (searchForm.categories.length > 0) {
    params.categories = searchForm.categories
  }
  if (searchForm.query) {
    params.query = searchForm.query
  }
  if (searchForm.dateRange.length === 2) {
    params.startTime = searchForm.dateRange[0]
    params.endTime = searchForm.dateRange[1]
  }

  searchLogs(params)
}

const showErrorsOnly = () => {
  showingErrorsOnly.value = !showingErrorsOnly.value

  if (showingErrorsOnly.value) {
    // エラーレベル以上のログのみ表示
    Object.assign(searchForm, {
      levels: [60, 50], // FATAL, ERROR
      dateRange: [],
      categories: [],
      query: ''
    })
    ElMessage.info('エラーログのみ表示中')
  } else {
    // 全ログ表示に戻す
    resetSearch()
    ElMessage.info('全ログを表示中')
  }

  performSearch()
}

const setSidebarFilter = (filter: 'all' | 'errors' | 'warnings') => {
  sidebarFilter.value = filter
}

const getLogItemClass = (level: LogLevel) => {
  if (level >= 50) return 'log-item-error'
  if (level === 40) return 'log-item-warning'
  return ''
}

const sendTestLog = async () => {
  if (!testLogForm.message.trim()) {
    ElMessage.warning('メッセージを入力してください')
    return
  }

  try {
    sendingTestLog.value = true

    await logService.sendLog(
      logService.createLogEntry(
        testLogForm.level,
        testLogForm.category,
        testLogForm.message,
        {
          source: 'frontend',
          details: { action: 'manual_test_log', ui_sent: true }
        }
      )
    )

    ElMessage.success('テストログを送信しました')
    testLogForm.message = 'テストログメッセージ'

    // ログ検索を更新
    setTimeout(() => {
      searchLogs()
      refreshStats()
    }, 1000)

  } catch (error) {
    console.error('テストログ送信エラー:', error)
    ElMessage.error('テストログ送信に失敗しました')
  } finally {
    sendingTestLog.value = false
  }
}

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('ja-JP')
}

const formatRelativeTime = (timestamp: string) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now.getTime() - time.getTime()

  if (diff < 60000) {
    return `${Math.floor(diff / 1000)}秒前`
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分前`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}時間前`
  } else {
    return time.toLocaleDateString('ja-JP')
  }
}

// 初期化
onMounted(() => {
  logService.startAutoFlush()
  searchLogs()

  // 画面表示ログ
  logService.logInfo('ログ監視システム画面を表示', {
    source: 'frontend',
    category: 'USER',
    details: { page: 'log-monitoring' }
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.search-form {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
}

.pagination {
  display: flex;
  justify-content: center;
}

.recent-log-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.recent-log-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px 0 rgba(64, 158, 255, 0.1);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.timestamp {
  font-size: 12px;
  color: #909399;
}

.log-message {
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-message-detail,
.log-details,
.log-error,
.log-performance {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.mr-1 {
  margin-right: 4px;
}

.text-center {
  text-align: center;
}

.text-gray-500 {
  color: #909399;
}

.log-item-error {
  border-left: 4px solid #f56c6c;
  background-color: #fef0f0;
}

.log-item-warning {
  border-left: 4px solid #e6a23c;
  background-color: #fdf6ec;
}

/* WebSocket接続状況 */
.websocket-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

.latency {
  font-size: 12px;
  color: #909399;
}

/* リアルタイムログ */
.realtime-logs {
  max-height: 300px;
  overflow-y: auto;
}

.realtime-log-item {
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  border-left: 3px solid #dcdfe6;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
  animation: fadeInUp 0.3s ease;
}

.realtime-log-item.level-60,
.realtime-log-item.level-50 {
  border-left-color: #f56c6c;
  background-color: #fef0f0;
}

.realtime-log-item.level-40 {
  border-left-color: #e6a23c;
  background-color: #fdf5e6;
}

.realtime-log-item.level-30 {
  border-left-color: #409eff;
  background-color: #ecf5ff;
}

.log-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.log-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-message {
  font-size: 14px;
  flex: 1;
}

.no-logs,
.no-alerts {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-style: italic;
}

/* リアルタイムアラート */
.realtime-alerts {
  max-height: 300px;
  overflow-y: auto;
}

.realtime-alert-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  transition: all 0.3s ease;
  animation: slideInRight 0.3s ease;
}

.realtime-alert-item.alert-critical {
  border-color: #f56c6c;
  background-color: #fef0f0;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.2);
}

.realtime-alert-item.alert-error {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.realtime-alert-item.alert-warning {
  border-color: #e6a23c;
  background-color: #fdf5e6;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.alert-message {
  font-size: 14px;
  line-height: 1.4;
}

/* アニメーション */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>