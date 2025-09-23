<template>
  <div class="alert-rules">
    <el-row :gutter="20" class="mb-4">
      <el-col :span="24">
        <el-card class="header-card">
          <template #header>
            <div class="card-header">
              <span class="title">アラートルール管理</span>
              <el-button-group>
                <el-button
                  type="primary"
                  @click="refreshRules"
                  :loading="loading"
                  icon="Refresh"
                >
                  更新
                </el-button>
                <el-button
                  type="success"
                  @click="showCreateDialog"
                  icon="Plus"
                  v-if="authStore.user?.role === 'ADMIN'"
                >
                  新規作成
                </el-button>
              </el-button-group>
            </div>
          </template>

          <!-- 統計情報 -->
          <el-row :gutter="16" class="mb-4">
            <el-col :xs="12" :sm="12" :md="6" :lg="6">
              <el-card :body-style="{ padding: '20px' }" shadow="hover">
                <el-statistic
                  :value="rules.length"
                  title="総ルール数"
                >
                  <template #prefix>
                    <el-icon style="color: #409EFF"><Document /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :xs="12" :sm="12" :md="6" :lg="6">
              <el-card :body-style="{ padding: '20px' }" shadow="hover">
                <el-statistic
                  :value="enabledRulesCount"
                  title="有効ルール数"
                >
                  <template #prefix>
                    <el-icon style="color: #67C23A"><Check /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :xs="12" :sm="12" :md="6" :lg="6">
              <el-card :body-style="{ padding: '20px' }" shadow="hover">
                <el-statistic
                  :value="disabledRulesCount"
                  title="無効ルール数"
                >
                  <template #prefix>
                    <el-icon style="color: #F56C6C"><Close /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :xs="12" :sm="12" :md="6" :lg="6">
              <el-card :body-style="{ padding: '20px' }" shadow="hover">
                <el-statistic
                  :value="criticalRulesCount"
                  title="クリティカルルール数"
                >
                  <template #prefix>
                    <el-icon style="color: #E6A23C"><Warning /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <!-- アラートルール一覧 -->
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>アラートルール一覧</span>
              <div class="filter-controls">
                <el-radio-group v-model="statusFilter" @change="refreshRules">
                  <el-radio-button label="all">全て</el-radio-button>
                  <el-radio-button label="enabled">有効</el-radio-button>
                  <el-radio-button label="disabled">無効</el-radio-button>
                </el-radio-group>
              </div>
            </div>
          </template>

          <el-table
            :data="rules"
            :loading="loading"
            stripe
            size="default"
          >
            <el-table-column prop="name" label="ルール名" min-width="200">
              <template #default="{ row }">
                <div class="rule-name">
                  <strong>{{ row.name }}</strong>
                  <div class="rule-description" v-if="row.description">
                    {{ row.description }}
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="条件" min-width="250">
              <template #default="{ row }">
                <div class="rule-conditions">
                  <el-tag v-if="row.level" size="small" :type="getLevelTagType(row.level)">
                    {{ getLevelName(row.level) }}
                  </el-tag>
                  <el-tag v-if="row.category" size="small" type="info">
                    {{ getCategoryName(row.category) }}
                  </el-tag>
                  <el-tag v-if="row.source" size="small" type="warning">
                    {{ getSourceName(row.source) }}
                  </el-tag>
                  <div v-if="row.messagePattern" class="message-pattern">
                    パターン: "{{ row.messagePattern }}"
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="閾値" width="120">
              <template #default="{ row }">
                <div class="threshold-info">
                  <div>{{ row.thresholdCount }}回</div>
                  <div class="text-xs text-gray-500">{{ row.thresholdPeriod }}秒間</div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="通知先" width="120">
              <template #default="{ row }">
                <el-tag
                  v-for="channel in row.notificationChannels"
                  :key="channel"
                  size="small"
                  class="mr-1"
                >
                  {{ channel }}
                </el-tag>
                <span v-if="row.notificationChannels.length === 0" class="text-gray-400">
                  なし
                </span>
              </template>
            </el-table-column>

            <el-table-column prop="isEnabled" label="状態" width="80">
              <template #default="{ row }">
                <el-tag :type="row.isEnabled ? 'success' : 'danger'" size="small">
                  {{ row.isEnabled ? '有効' : '無効' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="createdAt" label="作成日時" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="200" v-if="authStore.user?.role === 'ADMIN'">
              <template #default="{ row }">
                <el-button-group size="small">
                  <el-button @click="toggleRule(row)" :type="row.isEnabled ? 'warning' : 'success'">
                    {{ row.isEnabled ? '無効化' : '有効化' }}
                  </el-button>
                  <el-button @click="testRule(row)" type="info">テスト</el-button>
                  <el-button @click="editRule(row)" type="primary">編集</el-button>
                  <el-button @click="deleteRule(row)" type="danger">削除</el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>

          <!-- ページネーション -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :small="false"
              :total="total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="refreshRules"
              @current-change="refreshRules"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 作成/編集ダイアログ -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingRule ? 'アラートルール編集' : 'アラートルール作成'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="120px">
        <el-form-item label="ルール名" prop="name" required>
          <el-input v-model="form.name" placeholder="アラートルールの名前を入力" />
        </el-form-item>

        <el-form-item label="説明" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="ルールの説明を入力"
          />
        </el-form-item>

        <el-form-item label="ログレベル" prop="level">
          <el-select v-model="form.level" placeholder="ログレベルを選択" clearable>
            <el-option label="全レベル" :value="null" />
            <el-option label="FATAL (60)" :value="60" />
            <el-option label="ERROR (50)" :value="50" />
            <el-option label="WARN (40)" :value="40" />
            <el-option label="INFO (30)" :value="30" />
            <el-option label="DEBUG (20)" :value="20" />
            <el-option label="TRACE (10)" :value="10" />
          </el-select>
        </el-form-item>

        <el-form-item label="カテゴリ" prop="category">
          <el-select v-model="form.category" placeholder="カテゴリを選択" clearable>
            <el-option label="全カテゴリ" value="" />
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

        <el-form-item label="ソース" prop="source">
          <el-select v-model="form.source" placeholder="ソースを選択" clearable>
            <el-option label="全ソース" value="" />
            <el-option label="フロントエンド" value="frontend" />
            <el-option label="バックエンド" value="backend" />
            <el-option label="データベース" value="database" />
            <el-option label="インフラ" value="infrastructure" />
          </el-select>
        </el-form-item>

        <el-form-item label="メッセージパターン" prop="messagePattern">
          <el-input
            v-model="form.messagePattern"
            placeholder="メッセージに含まれるキーワード"
          />
        </el-form-item>

        <el-form-item label="閾値カウント" prop="thresholdCount" required>
          <el-input-number
            v-model="form.thresholdCount"
            :min="1"
            :max="1000"
            placeholder="発動する回数"
          />
          <span class="ml-2 text-gray-500">回以上で発動</span>
        </el-form-item>

        <el-form-item label="閾値期間" prop="thresholdPeriod" required>
          <el-input-number
            v-model="form.thresholdPeriod"
            :min="1"
            :max="86400"
            placeholder="期間（秒）"
          />
          <span class="ml-2 text-gray-500">秒間で評価</span>
        </el-form-item>

        <el-form-item label="通知チャンネル" prop="notificationChannels">
          <el-select
            v-model="form.notificationChannels"
            multiple
            placeholder="通知先を選択"
          >
            <el-option label="WebSocket" value="websocket" />
            <el-option label="メール" value="email" />
            <el-option label="Slack" value="slack" />
            <el-option label="Teams" value="teams" />
          </el-select>
        </el-form-item>

        <el-form-item label="有効状態" prop="isEnabled">
          <el-switch v-model="form.isEnabled" />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">キャンセル</el-button>
          <el-button type="primary" @click="saveRule" :loading="saving">
            {{ editingRule ? '更新' : '作成' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- テスト結果ダイアログ -->
    <el-dialog
      v-model="testDialogVisible"
      title="アラートルールテスト結果"
      width="500px"
    >
      <div v-if="testResult">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="マッチングログ数">
            {{ testResult.matchingLogs }}件
          </el-descriptions-item>
          <el-descriptions-item label="閾値">
            {{ testResult.thresholdCount }}件以上
          </el-descriptions-item>
          <el-descriptions-item label="発動状況">
            <el-tag :type="testResult.wouldTrigger ? 'danger' : 'success'">
              {{ testResult.wouldTrigger ? '発動する' : '発動しない' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="テスト期間">
            {{ testResult.testPeriod }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Check,
  Close,
  Warning,
  Plus,
  Refresh
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import {
  LOG_LEVEL_NAMES,
  LOG_CATEGORY_NAMES,
  LOG_SOURCE_NAMES
} from '@/types/log'

const authStore = useAuthStore()

// 状態管理
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const testDialogVisible = ref(false)
const rules = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const statusFilter = ref('all')
const editingRule = ref(null)
const testResult = ref(null)

// フォーム
const formRef = ref()
const form = reactive({
  name: '',
  description: '',
  level: null,
  category: '',
  source: '',
  messagePattern: '',
  thresholdCount: 1,
  thresholdPeriod: 300,
  notificationChannels: ['websocket'],
  isEnabled: true
})

const formRules = {
  name: [
    { required: true, message: 'ルール名は必須です', trigger: 'blur' },
    { min: 1, max: 255, message: '1〜255文字で入力してください', trigger: 'blur' }
  ],
  thresholdCount: [
    { required: true, message: '閾値カウントは必須です', trigger: 'blur' },
    { type: 'number', min: 1, message: '1以上の数値を入力してください', trigger: 'blur' }
  ],
  thresholdPeriod: [
    { required: true, message: '閾値期間は必須です', trigger: 'blur' },
    { type: 'number', min: 1, message: '1以上の数値を入力してください', trigger: 'blur' }
  ]
}

// 計算値
const enabledRulesCount = computed(() => rules.value.filter(rule => rule.isEnabled).length)
const disabledRulesCount = computed(() => rules.value.filter(rule => !rule.isEnabled).length)
const criticalRulesCount = computed(() => rules.value.filter(rule => rule.level >= 50).length)

// メソッド
const refreshRules = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      pageSize: pageSize.value.toString()
    })

    if (statusFilter.value !== 'all') {
      params.append('isEnabled', (statusFilter.value === 'enabled').toString())
    }

    const data = await api.get(`/alert-rules?${params}`)
    rules.value = data.rules
    total.value = data.total
  } catch (error: any) {
    ElMessage.error(error.message || 'アラートルールの取得に失敗しました')
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  editingRule.value = null
  Object.assign(form, {
    name: '',
    description: '',
    level: null,
    category: '',
    source: '',
    messagePattern: '',
    thresholdCount: 1,
    thresholdPeriod: 300,
    notificationChannels: ['websocket'],
    isEnabled: true
  })
  dialogVisible.value = true
}

const editRule = (rule: any) => {
  editingRule.value = rule
  Object.assign(form, {
    name: rule.name,
    description: rule.description || '',
    level: rule.level,
    category: rule.category || '',
    source: rule.source || '',
    messagePattern: rule.messagePattern || '',
    thresholdCount: rule.thresholdCount,
    thresholdPeriod: rule.thresholdPeriod,
    notificationChannels: rule.notificationChannels || [],
    isEnabled: rule.isEnabled
  })
  dialogVisible.value = true
}

const saveRule = async () => {
  try {
    await formRef.value.validate()
    saving.value = true

    const endpoint = editingRule.value
      ? `/alert-rules/${editingRule.value.id}`
      : `/alert-rules`

    let data
    if (editingRule.value) {
      data = await api.put(endpoint, form)
    } else {
      data = await api.post(endpoint, form)
    }

    ElMessage.success(data.message || 'アラートルールを保存しました')
    dialogVisible.value = false
    refreshRules()
  } catch (error: any) {
    ElMessage.error(error.message)
  } finally {
    saving.value = false
  }
}

const toggleRule = async (rule: any) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/alert-rules/${rule.id}/toggle`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (!response.ok) {
      throw new Error('ルール状態の切り替えに失敗しました')
    }

    const data = await response.json()
    ElMessage.success(data.message)
    refreshRules()
  } catch (error: any) {
    ElMessage.error(error.message)
  }
}

const testRule = async (rule: any) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/alert-rules/${rule.id}/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (!response.ok) {
      throw new Error('ルールテストに失敗しました')
    }

    const data = await response.json()
    testResult.value = data.result
    testDialogVisible.value = true
  } catch (error: any) {
    ElMessage.error(error.message)
  }
}

const deleteRule = async (rule: any) => {
  try {
    await ElMessageBox.confirm(
      `アラートルール「${rule.name}」を削除しますか？`,
      '確認',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    )

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/alert-rules/${rule.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (!response.ok) {
      throw new Error('アラートルールの削除に失敗しました')
    }

    const data = await response.json()
    ElMessage.success(data.message)
    refreshRules()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message)
    }
  }
}

// ヘルパー関数
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('ja-JP')
}

const getLevelName = (level: number) => {
  return LOG_LEVEL_NAMES[level] || level.toString()
}

const getLevelTagType = (level: number) => {
  if (level >= 60) return 'danger'
  if (level >= 50) return 'danger'
  if (level >= 40) return 'warning'
  return 'info'
}

const getCategoryName = (category: string) => {
  return LOG_CATEGORY_NAMES[category] || category
}

const getSourceName = (source: string) => {
  return LOG_SOURCE_NAMES[source] || source
}

// マウント時にデータ取得
onMounted(() => {
  refreshRules()
})
</script>

<style scoped>
.alert-rules {
  padding: 20px;
}

.header-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rule-name .rule-description {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.rule-conditions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-pattern {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.threshold-info {
  text-align: center;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.text-xs {
  font-size: 12px;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-gray-500 {
  color: #6b7280;
}

.mr-1 {
  margin-right: 4px;
}

.ml-2 {
  margin-left: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>