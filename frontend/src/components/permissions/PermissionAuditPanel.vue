<template>
  <div class="audit-panel">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>権限変更履歴</span>
          <el-button
            type="primary"
            size="small"
            @click="$emit('refresh')"
            :loading="loading"
          >
            更新
          </el-button>
        </div>
      </template>

      <div class="audit-filters">
        <el-form inline>
          <el-form-item label="期間">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="〜"
              start-placeholder="開始日"
              end-placeholder="終了日"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="$emit('date-range-change', dateRange)"
            />
          </el-form-item>
          <el-form-item label="部署">
            <el-select
              v-model="selectedDepartment"
              placeholder="部署を選択"
              clearable
              @change="$emit('department-change', selectedDepartment)"
            >
              <el-option
                v-for="dept in departments"
                :key="dept.id"
                :label="dept.name"
                :value="dept.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <el-table
        :data="auditLogs"
        v-loading="loading"
        stripe
      >
        <el-table-column prop="timestamp" label="変更日時" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="departmentName" label="部署" width="150" />
        <el-table-column prop="featureName" label="機能" width="150" />
        <el-table-column prop="action" label="操作" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getActionType(row.action)"
              size="small"
            >
              {{ row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="実行者" width="120" />
        <el-table-column label="変更内容">
          <template #default="{ row }">
            <div class="change-details">
              <div v-if="row.oldPermissions" class="permission-change">
                <span class="label">変更前:</span>
                <span class="permissions">{{ formatPermissions(row.oldPermissions) }}</span>
              </div>
              <div v-if="row.newPermissions" class="permission-change">
                <span class="label">変更後:</span>
                <span class="permissions">{{ formatPermissions(row.newPermissions) }}</span>
              </div>
              <div v-if="row.comment" class="comment">
                <span class="label">コメント:</span>
                <span>{{ row.comment }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination" v-if="total > 0">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="$emit('page-change', $event)"
          @size-change="$emit('page-size-change', $event)"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Department } from '@/types/permissions'

interface AuditLog {
  id: number
  timestamp: string
  departmentName: string
  featureName: string
  action: string
  userName: string
  oldPermissions?: string
  newPermissions?: string
  comment?: string
}

interface Props {
  auditLogs: AuditLog[]
  departments: Department[]
  loading?: boolean
  total?: number
  currentPage?: number
  pageSize?: number
}

withDefaults(defineProps<Props>(), {
  loading: false,
  total: 0,
  currentPage: 1,
  pageSize: 20
})

defineEmits<{
  'refresh': []
  'date-range-change': [dateRange: string[] | null]
  'department-change': [departmentId: number | null]
  'page-change': [page: number]
  'page-size-change': [size: number]
}>()

const dateRange = ref<string[] | null>(null)
const selectedDepartment = ref<number | null>(null)

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('ja-JP')
}

function getActionType(action: string): string {
  switch (action) {
    case '作成': return 'success'
    case '更新': return 'warning'
    case '削除': return 'danger'
    default: return 'info'
  }
}

function formatPermissions(permissions: string): string {
  if (!permissions) return '-'
  return permissions.split('').join(' ')
}
</script>

<style scoped>
.audit-panel {
  margin-top: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.audit-filters {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.change-details {
  font-size: 12px;
}

.permission-change,
.comment {
  margin-bottom: 4px;
}

.label {
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-right: 8px;
}

.permissions {
  font-family: monospace;
  background-color: var(--el-fill-color-light);
  padding: 2px 4px;
  border-radius: 2px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
