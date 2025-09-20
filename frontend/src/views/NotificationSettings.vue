<template>
  <div class="notification-settings">
    <el-page-header @back="$router.back()" content="通知設定" />

    <div class="settings-container">
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <span>通知設定</span>
            <el-button @click="loadConfig" :loading="loading" circle>
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </template>

        <!-- 通知チャンネル状態表示 -->
        <el-row :gutter="20" class="channel-status">
          <el-col :xs="24" :sm="12" :md="8">
            <el-card class="channel-card">
              <template #header>
                <div class="channel-header">
                  <el-icon><Message /></el-icon>
                  <span>Slack</span>
                </div>
              </template>
              <div class="channel-content">
                <el-tag
                  :type="config.availableChannels?.slack ? 'success' : 'danger'"
                  class="status-tag"
                >
                  {{ config.availableChannels?.slack ? '設定済み' : '未設定' }}
                </el-tag>
                <div v-if="config.slackConfig" class="config-details">
                  <p><strong>チャンネル:</strong> {{ config.slackConfig.channel }}</p>
                  <p><strong>ユーザー名:</strong> {{ config.slackConfig.username }}</p>
                </div>
                <el-button
                  @click="testNotification('slack')"
                  :disabled="!config.availableChannels?.slack"
                  :loading="testLoading.slack"
                  type="primary"
                  size="small"
                  class="test-button"
                >
                  テスト送信
                </el-button>
              </div>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8">
            <el-card class="channel-card">
              <template #header>
                <div class="channel-header">
                  <el-icon><Monitor /></el-icon>
                  <span>Email</span>
                </div>
              </template>
              <div class="channel-content">
                <el-tag
                  :type="config.availableChannels?.email ? 'success' : 'danger'"
                  class="status-tag"
                >
                  {{ config.availableChannels?.email ? '設定済み' : '未設定' }}
                </el-tag>
                <div v-if="config.emailConfig" class="config-details">
                  <p><strong>送信者:</strong> {{ config.emailConfig.from }}</p>
                  <p><strong>宛先:</strong> {{ config.emailConfig.to?.join(', ') }}</p>
                </div>
                <el-button
                  @click="testNotification('email')"
                  :disabled="!config.availableChannels?.email"
                  :loading="testLoading.email"
                  type="primary"
                  size="small"
                  class="test-button"
                >
                  テスト送信
                </el-button>
              </div>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8">
            <el-card class="channel-card">
              <template #header>
                <div class="channel-header">
                  <el-icon><ChatLineSquare /></el-icon>
                  <span>Teams</span>
                </div>
              </template>
              <div class="channel-content">
                <el-tag
                  :type="config.availableChannels?.teams ? 'success' : 'danger'"
                  class="status-tag"
                >
                  {{ config.availableChannels?.teams ? '設定済み' : '未設定' }}
                </el-tag>
                <el-button
                  @click="testNotification('teams')"
                  :disabled="!config.availableChannels?.teams"
                  :loading="testLoading.teams"
                  type="primary"
                  size="small"
                  class="test-button"
                >
                  テスト送信
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- カスタム通知送信 -->
        <el-divider content-position="left">カスタム通知送信</el-divider>

        <el-form :model="customNotification" label-width="120px">
          <el-form-item label="タイトル">
            <el-input v-model="customNotification.title" placeholder="通知のタイトルを入力" />
          </el-form-item>

          <el-form-item label="メッセージ">
            <el-input
              v-model="customNotification.message"
              type="textarea"
              :rows="3"
              placeholder="通知のメッセージを入力"
            />
          </el-form-item>

          <el-form-item label="レベル">
            <el-radio-group v-model="customNotification.level">
              <el-radio-button label="info">情報</el-radio-button>
              <el-radio-button label="warning">警告</el-radio-button>
              <el-radio-button label="error">エラー</el-radio-button>
              <el-radio-button label="critical">重要</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="送信先">
            <el-checkbox-group v-model="customNotification.channels">
              <el-checkbox
                label="slack"
                :disabled="!config.availableChannels?.slack"
              >
                Slack
              </el-checkbox>
              <el-checkbox
                label="email"
                :disabled="!config.availableChannels?.email"
              >
                Email
              </el-checkbox>
              <el-checkbox
                label="teams"
                :disabled="!config.availableChannels?.teams"
              >
                Teams
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item>
            <el-button
              @click="sendCustomNotification"
              :loading="sendLoading"
              type="primary"
              :disabled="!customNotification.title || !customNotification.message || customNotification.channels.length === 0"
            >
              通知送信
            </el-button>
            <el-button @click="resetCustomNotification">
              リセット
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 環境変数設定ガイド -->
        <el-divider content-position="left">環境変数設定ガイド</el-divider>

        <el-collapse>
          <el-collapse-item title="Slack設定" name="slack">
            <p>Slack通知を有効にするには、以下の環境変数を設定してください：</p>
            <el-table :data="slackEnvVars" border size="small">
              <el-table-column prop="name" label="環境変数" width="200" />
              <el-table-column prop="description" label="説明" />
              <el-table-column prop="example" label="例" />
            </el-table>
          </el-collapse-item>

          <el-collapse-item title="Email設定" name="email">
            <p>Email通知を有効にするには、以下の環境変数を設定してください：</p>
            <el-table :data="emailEnvVars" border size="small">
              <el-table-column prop="name" label="環境変数" width="200" />
              <el-table-column prop="description" label="説明" />
              <el-table-column prop="example" label="例" />
            </el-table>
          </el-collapse-item>

          <el-collapse-item title="Teams設定" name="teams">
            <p>Teams通知を有効にするには、以下の環境変数を設定してください：</p>
            <el-table :data="teamsEnvVars" border size="small">
              <el-table-column prop="name" label="環境変数" width="200" />
              <el-table-column prop="description" label="説明" />
              <el-table-column prop="example" label="例" />
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Message, Monitor, ChatLineSquare } from '@element-plus/icons-vue'
import api from '../utils/api'

// リアクティブデータ
const loading = ref(false)
const sendLoading = ref(false)
const testLoading = reactive({
  slack: false,
  email: false,
  teams: false
})

const config = ref<any>({
  availableChannels: {
    slack: false,
    email: false,
    teams: false
  },
  slackConfig: null,
  emailConfig: null
})

const customNotification = reactive({
  title: '',
  message: '',
  level: 'info',
  channels: [] as string[]
})

// 環境変数設定ガイド用データ
const slackEnvVars = [
  {
    name: 'SLACK_WEBHOOK_URL',
    description: 'SlackのWebhook URL（必須）',
    example: 'https://hooks.slack.com/services/...'
  },
  {
    name: 'SLACK_CHANNEL',
    description: '投稿先チャンネル（任意）',
    example: '#alerts'
  },
  {
    name: 'SLACK_USERNAME',
    description: 'ボット名（任意）',
    example: 'Log Monitor'
  },
  {
    name: 'SLACK_ICON',
    description: 'アイコン絵文字（任意）',
    example: ':warning:'
  }
]

const emailEnvVars = [
  {
    name: 'SMTP_HOST',
    description: 'SMTPサーバーホスト（必須）',
    example: 'smtp.gmail.com'
  },
  {
    name: 'SMTP_PORT',
    description: 'SMTPポート（任意、デフォルト: 587）',
    example: '587'
  },
  {
    name: 'SMTP_SECURE',
    description: 'SSL/TLS使用（任意、デフォルト: false）',
    example: 'true'
  },
  {
    name: 'SMTP_USER',
    description: 'SMTPユーザー名（必須）',
    example: 'your-email@gmail.com'
  },
  {
    name: 'SMTP_PASS',
    description: 'SMTPパスワード（必須）',
    example: 'your-app-password'
  },
  {
    name: 'EMAIL_FROM',
    description: '送信者アドレス（任意）',
    example: 'noreply@company.com'
  },
  {
    name: 'EMAIL_TO',
    description: '宛先アドレス（カンマ区切り）',
    example: 'admin@company.com,ops@company.com'
  }
]

const teamsEnvVars = [
  {
    name: 'TEAMS_WEBHOOK_URL',
    description: 'TeamsのWebhook URL（必須）',
    example: 'https://outlook.office.com/webhook/...'
  }
]

// メソッド
const loadConfig = async () => {
  loading.value = true
  try {
    const response = await api.get('/notifications/config')
    config.value = response.data
  } catch (error) {
    console.error('設定読み込みエラー:', error)
    ElMessage.error('設定の読み込みに失敗しました')
  } finally {
    loading.value = false
  }
}

const testNotification = async (channel: 'slack' | 'email' | 'teams') => {
  testLoading[channel] = true
  try {
    const response = await api.post('/notifications/test', { channel })
    ElMessage.success(response.data.message)
  } catch (error: any) {
    console.error(`${channel}テスト送信エラー:`, error)
    ElMessage.error(error.response?.data?.error || `${channel}テスト送信に失敗しました`)
  } finally {
    testLoading[channel] = false
  }
}

const sendCustomNotification = async () => {
  sendLoading.value = true
  try {
    const response = await api.post('/notifications/send', customNotification)
    ElMessage.success(response.data.message)
    resetCustomNotification()
  } catch (error: any) {
    console.error('カスタム通知送信エラー:', error)
    ElMessage.error(error.response?.data?.error || 'カスタム通知送信に失敗しました')
  } finally {
    sendLoading.value = false
  }
}

const resetCustomNotification = () => {
  customNotification.title = ''
  customNotification.message = ''
  customNotification.level = 'info'
  customNotification.channels = []
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.notification-settings {
  padding: 20px;
}

.settings-container {
  margin-top: 20px;
}

.settings-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.channel-status {
  margin-bottom: 30px;
}

.channel-card {
  height: 280px;
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.channel-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 180px;
}

.status-tag {
  align-self: flex-start;
}

.config-details {
  flex: 1;
  font-size: 14px;
  color: #606266;
}

.config-details p {
  margin: 5px 0;
  word-break: break-all;
}

.test-button {
  align-self: flex-start;
  margin-top: auto;
}

.el-table {
  margin-top: 10px;
}

.el-form {
  margin-top: 20px;
}

.el-divider {
  margin: 30px 0 20px 0;
}

.el-collapse {
  margin-top: 20px;
}

/* スマホ対応 */
@media (max-width: 768px) {
  .notification-settings {
    padding: 10px;
  }

  .settings-card {
    margin: 0 10px;
  }

  .card-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .channel-status .el-col {
    margin-bottom: 20px;
  }

  .channel-card {
    height: auto;
    min-height: 220px;
  }

  .config-details p {
    font-size: 12px;
    word-break: break-all;
    overflow-wrap: break-word;
  }

  .el-form {
    padding: 0;
  }

  .el-form-item {
    margin-bottom: 15px;
  }

  .el-table {
    font-size: 12px;
  }

  .el-table .el-table__cell {
    padding: 8px 4px;
  }

  .el-button {
    width: 100%;
    margin-bottom: 10px;
  }

  .test-button {
    width: auto;
    margin-bottom: 0;
  }
}

@media (max-width: 480px) {
  .settings-card {
    margin: 0 5px;
  }

  .channel-card {
    min-height: 200px;
  }

  .el-radio-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .el-checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}
</style>