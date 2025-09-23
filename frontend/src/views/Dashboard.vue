<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover">
          <el-statistic title="総ユーザー数" :value="168" />
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover">
          <el-statistic title="アクティブユーザー" :value="93" />
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover">
          <el-statistic title="今日の訪問数" :value="56" />
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <el-card shadow="hover">
          <el-statistic title="処理済みタスク" :value="234" suffix="件" />
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
          <el-table :data="activityData" style="width: 100%">
            <el-table-column prop="time" label="時間" width="180" />
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
          <div class="system-status">
            <div class="status-item">
              <span>API サーバー</span>
              <el-tag type="success">正常</el-tag>
            </div>
            <div class="status-item">
              <span>データベース</span>
              <el-tag type="success">正常</el-tag>
            </div>
            <div class="status-item">
              <span>メモリ使用率</span>
              <el-progress :percentage="45" />
            </div>
            <div class="status-item">
              <span>CPU使用率</span>
              <el-progress :percentage="30" status="success" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Download, Setting, Document } from '@element-plus/icons-vue'
// import { CommonButton, CommonCard, CommonTable, CommonTag, CommonRow, CommonCol, CommonStatistic, CommonProgress, CommonTableColumn } from '@company/shared-components'

const activityData = ref([
  {
    time: '2025-01-19 10:30:00',
    user: '田中太郎',
    action: 'ユーザー情報を更新',
    status: '成功'
  },
  {
    time: '2025-01-19 10:15:00',
    user: '山田花子',
    action: 'レポートを生成',
    status: '成功'
  },
  {
    time: '2025-01-19 09:45:00',
    user: '鈴木一郎',
    action: 'データをインポート',
    status: '処理中'
  },
  {
    time: '2025-01-19 09:30:00',
    user: '佐藤美咲',
    action: 'ログイン',
    status: '成功'
  }
])

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