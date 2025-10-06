<template>
  <div class="approval-routes">
    <div class="page-header">
      <h1 class="page-title">承認ルート管理</h1>
      <div class="header-actions">
        <el-button
          type="primary"
          @click="showCreateDialog = true"
          v-if="hasPermission('APPROVAL_ROUTE_MANAGEMENT', 'CREATE')"
        >
          <el-icon><Plus /></el-icon>
          新規作成
        </el-button>
      </div>
    </div>

    <!-- 検索・フィルタ -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="検索">
          <el-input
            v-model="searchForm.search"
            placeholder="ルート名、説明で検索"
            style="width: 250px"
            clearable
            @input="handleSearch"
          />
        </el-form-item>
        <el-form-item label="ワークフロータイプ">
          <el-select
            v-model="searchForm.workflowTypeId"
            placeholder="すべて"
            style="width: 200px"
            clearable
            @change="handleSearch"
          >
            <el-option
              v-for="type in workflowTypes"
              :key="type.id"
              :label="type.name"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状態">
          <el-select
            v-model="searchForm.isActive"
            placeholder="すべて"
            style="width: 120px"
            clearable
            @change="handleSearch"
          >
            <el-option label="有効" :value="true" />
            <el-option label="無効" :value="false" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 承認ルート一覧 -->
    <el-card class="table-card">
      <el-table
        :data="approvalRoutes"
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column prop="name" label="ルート名" min-width="200" />
        <el-table-column prop="workflowType" label="ワークフロータイプ" width="200">
          <template #default="{ row }">
            {{ row.workflowType?.name }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="説明" min-width="250" show-overflow-tooltip />
        <el-table-column prop="stepsCount" label="ステップ数" width="100">
          <template #default="{ row }">
            {{ row.steps?.length || 0 }}ステップ
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状態" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '有効' : '無効' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="作成日" width="120">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewRoute(row)">詳細</el-button>
            <el-button
              size="small"
              type="primary"
              @click="editRoute(row)"
              v-if="hasPermission('APPROVAL_ROUTE_MANAGEMENT', 'EDIT')"
            >
              編集
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteRoute(row)"
              v-if="hasPermission('APPROVAL_ROUTE_MANAGEMENT', 'DELETE')"
            >
              削除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- ページネーション -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 作成・編集ダイアログ -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingItem ? '承認ルート編集' : '承認ルート作成'"
      width="1200px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="routeFormRef"
        :model="routeForm"
        :rules="routeRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="ワークフロー" prop="workflowTypeId">
              <el-select
                v-model="routeForm.workflowTypeId"
                placeholder="選択してください"
                style="width: 100%"
              >
                <el-option
                  v-for="type in workflowTypes"
                  :key="type.id"
                  :label="type.name"
                  :value="type.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="ルート名" prop="name">
              <el-input v-model="routeForm.name" placeholder="承認ルート名を入力" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="説明">
          <el-input
            v-model="routeForm.description"
            type="textarea"
            :rows="2"
            placeholder="承認ルートの説明を入力"
          />
        </el-form-item>

        <el-form-item label="状態">
          <el-switch
            v-model="routeForm.isActive"
            active-text="有効"
            inactive-text="無効"
          />
        </el-form-item>

        <!-- テンプレート選択 -->
        <el-form-item label="テンプレート">
          <div class="template-section">
            <el-select
              v-model="selectedTemplate"
              placeholder="テンプレートを選択して適用"
              style="width: 300px"
              @change="applyTemplate"
              clearable
            >
              <el-option
                v-for="template in routeTemplates"
                :key="template.id"
                :label="template.name"
                :value="template.id"
              >
                <div class="template-option">
                  <span class="template-name">{{ template.name }}</span>
                  <span class="template-desc">{{ template.description }}</span>
                </div>
              </el-option>
            </el-select>
            <el-text type="info" size="small" style="margin-left: 10px">
              テンプレートを選択すると、事前定義された承認フローが適用されます
            </el-text>
          </div>
        </el-form-item>

        <!-- 承認ステップ設定 - ビジュアルエディタ -->
        <div class="steps-section">
          <div class="steps-header">
            <h3>承認フロー設計</h3>
            <div class="header-actions-group">
              <el-button-group>
                <el-button :type="viewMode === 'visual' ? 'primary' : ''" @click="viewMode = 'visual'">
                  <el-icon><View /></el-icon>
                  ビジュアル
                </el-button>
                <el-button :type="viewMode === 'list' ? 'primary' : ''" @click="viewMode = 'list'">
                  <el-icon><List /></el-icon>
                  リスト
                </el-button>
              </el-button-group>
              <el-button type="primary" @click="addStep">
                <el-icon><Plus /></el-icon>
                ステップ追加
              </el-button>
            </div>
          </div>

          <!-- ビジュアルモード -->
          <div v-if="viewMode === 'visual'" class="visual-mode">
            <ApprovalFlowDiagram
              :steps="routeForm.steps"
              :users="users"
              :departments="departments"
              @step-add="handleStepAdd"
              @step-edit="handleStepEdit"
              @step-delete="handleStepDelete"
              @step-click="handleStepClick"
            />
          </div>

          <!-- リストモード -->
          <div v-else class="list-mode">
            <div v-if="routeForm.steps.length === 0" class="empty-steps">
              <el-empty description="承認ステップが設定されていません" />
            </div>

            <div v-else class="steps-container">
              <div
                v-for="(step, index) in routeForm.steps"
                :key="index"
                class="step-item"
              >
                <div class="step-header">
                  <div class="step-number">ステップ {{ index + 1 }}</div>
                  <div class="step-actions">
                    <el-button
                      size="small"
                      @click="moveStepUp(index)"
                      :disabled="index === 0"
                    >
                      <el-icon><ArrowUp /></el-icon>
                    </el-button>
                    <el-button
                      size="small"
                      @click="moveStepDown(index)"
                      :disabled="index === routeForm.steps.length - 1"
                    >
                      <el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <el-button
                      size="small"
                      type="danger"
                      @click="removeStep(index)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>

                <el-row :gutter="15">
                  <el-col :span="8">
                    <el-form-item label="ステップ名" :prop="`steps.${index}.stepName`">
                      <el-input
                        v-model="step.stepName"
                        placeholder="例: 部門長承認"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="承認者タイプ" :prop="`steps.${index}.approverType`">
                      <el-select
                        v-model="step.approverType"
                        placeholder="選択してください"
                        @change="onApproverTypeChange(step, index)"
                      >
                        <el-option label="特定ユーザー" value="USER" />
                        <el-option label="部署" value="DEPARTMENT" />
                        <el-option label="役割" value="ROLE" />
                        <el-option label="動的" value="DYNAMIC" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="承認者" :prop="`steps.${index}.approverValue`">
                      <!-- ユーザー選択 -->
                      <el-select
                        v-if="step.approverType === 'USER'"
                        v-model="step.approverValue"
                        placeholder="ユーザーを選択"
                        filterable
                      >
                        <el-option
                          v-for="user in users"
                          :key="user.id"
                          :label="user.name"
                          :value="user.id.toString()"
                        />
                      </el-select>

                      <!-- 部署選択 -->
                      <el-select
                        v-else-if="step.approverType === 'DEPARTMENT'"
                        v-model="step.approverValue"
                        placeholder="部署を選択"
                      >
                        <el-option
                          v-for="dept in departments"
                          :key="dept.id"
                          :label="dept.name"
                          :value="dept.id.toString()"
                        />
                      </el-select>

                      <!-- 役割選択 -->
                      <el-select
                        v-else-if="step.approverType === 'ROLE'"
                        v-model="step.approverValue"
                        placeholder="役割を選択"
                      >
                        <el-option label="管理者" value="ADMIN" />
                        <el-option label="マネージャー" value="MANAGER" />
                        <el-option label="一般ユーザー" value="USER" />
                      </el-select>

                      <!-- 動的条件 -->
                      <el-input
                        v-else-if="step.approverType === 'DYNAMIC'"
                        v-model="step.approverValue"
                        placeholder="例: 申請者の直属上司"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="15">
                  <el-col :span="6">
                    <el-form-item label="必須承認">
                      <el-switch v-model="step.isRequired" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="並列承認">
                      <el-switch v-model="step.isParallel" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="承認制限時間">
                      <el-input-number
                        v-model="step.timeoutHours"
                        :min="1"
                        :max="8760"
                        placeholder="時間"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="ステップ番号">
                      <el-input-number
                        v-model="step.stepNumber"
                        :min="1"
                        :max="999"
                        :disabled="true"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="自動承認条件">
                  <el-input
                    v-model="step.autoApprovalCondition"
                    placeholder="例: amount < 10000"
                  />
                </el-form-item>
              </div>
            </div>
          </div>
        </div>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelEdit">キャンセル</el-button>
          <el-button type="primary" @click="saveRoute" :loading="saving">
            {{ editingItem ? '更新' : '作成' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 詳細表示ダイアログ -->
    <el-dialog
      v-model="showDetailDialog"
      title="承認ルート詳細"
      width="900px"
    >
      <div v-if="selectedItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ルート名">{{ selectedItem.name }}</el-descriptions-item>
          <el-descriptions-item label="ワークフロータイプ">{{ selectedItem.workflowType?.name }}</el-descriptions-item>
          <el-descriptions-item label="状態">
            <el-tag :type="selectedItem.isActive ? 'success' : 'danger'">
              {{ selectedItem.isActive ? '有効' : '無効' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="ステップ数">{{ selectedItem.steps?.length || 0 }}ステップ</el-descriptions-item>
          <el-descriptions-item label="作成日" span="2">
            {{ formatDateTime(selectedItem.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedItem.description" style="margin-top: 20px;">
          <h4>説明</h4>
          <p>{{ selectedItem.description }}</p>
        </div>

        <!-- 承認フロー図 -->
        <div style="margin-top: 20px;">
          <h4>承認フロー</h4>
          <div class="flow-diagram">
            <div class="flow-start">申請開始</div>
            <template v-for="(step, index) in selectedItem.steps" :key="index">
              <div class="flow-arrow">↓</div>
              <div class="flow-step" :class="{ parallel: step.isParallel }">
                <div class="step-title">{{ step.stepName }}</div>
                <div class="step-info">
                  <div>{{ getApproverTypeLabel(step.approverType) }}: {{ getApproverName(step) }}</div>
                  <div class="step-details">
                    <span v-if="step.isRequired" class="required">必須</span>
                    <span v-if="step.isParallel" class="parallel">並列</span>
                    <span v-if="step.timeoutHours" class="timeout">{{ step.timeoutHours }}時間制限</span>
                  </div>
                </div>
              </div>
            </template>
            <div class="flow-arrow">↓</div>
            <div class="flow-end">完了</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, ArrowUp, ArrowDown, Delete, View, List } from '@element-plus/icons-vue'
import { hasPermission } from '@/utils/auth'
import { formatDate, formatDateTime } from '@/utils/date'
import ApprovalFlowDiagram from '@/components/workflow/ApprovalFlowDiagram.vue'

// リアクティブデータ
const loading = ref(false)
const saving = ref(false)
const approvalRoutes = ref([])
const workflowTypes = ref([])
const users = ref([])
const departments = ref([])

const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const editingItem = ref(null)
const selectedItem = ref(null)
const viewMode = ref<'visual' | 'list'>('visual')
const selectedTemplate = ref(null)

// 承認ルートテンプレート定義
const routeTemplates = ref([
  {
    id: 'simple',
    name: 'シンプル承認（1段階）',
    description: '上長1名による承認',
    steps: [
      {
        stepNumber: 1,
        stepName: '上長承認',
        approverType: 'ROLE',
        approverValue: 'MANAGER',
        isRequired: true,
        isParallel: false,
        isSequential: false,
        timeoutHours: 24,
        autoApprovalCondition: '',
        minimumApprovals: 1,
        canSkip: false
      }
    ]
  },
  {
    id: 'two-stage',
    name: '2段階承認',
    description: '課長 → 部長の順次承認',
    steps: [
      {
        stepNumber: 1,
        stepName: '課長承認',
        approverType: 'ROLE',
        approverValue: 'MANAGER',
        isRequired: true,
        isParallel: false,
        isSequential: true,
        timeoutHours: 24,
        autoApprovalCondition: '',
        minimumApprovals: 1,
        canSkip: false
      },
      {
        stepNumber: 2,
        stepName: '部長承認',
        approverType: 'ROLE',
        approverValue: 'ADMIN',
        isRequired: true,
        isParallel: false,
        isSequential: true,
        timeoutHours: 48,
        autoApprovalCondition: '',
        minimumApprovals: 1,
        canSkip: false
      }
    ]
  },
  {
    id: 'parallel',
    name: '並列承認',
    description: '複数の承認者が同時に承認（AND条件）',
    steps: [
      {
        stepNumber: 1,
        stepName: '並列承認（全員必須）',
        approverType: 'DEPARTMENT',
        approverValue: '',
        isRequired: true,
        isParallel: true,
        isSequential: false,
        parallelType: 'AND',
        timeoutHours: 48,
        autoApprovalCondition: '',
        minimumApprovals: 1,
        canSkip: false
      }
    ]
  },
  {
    id: 'or-parallel',
    name: 'OR並列承認',
    description: '複数の承認者のうち1名が承認すればOK（OR条件）',
    steps: [
      {
        stepNumber: 1,
        stepName: '並列承認（1名以上）',
        approverType: 'DEPARTMENT',
        approverValue: '',
        isRequired: true,
        isParallel: true,
        isSequential: false,
        parallelType: 'OR',
        timeoutHours: 48,
        autoApprovalCondition: '',
        minimumApprovals: 1,
        canSkip: false
      }
    ]
  },
  {
    id: 'three-stage',
    name: '3段階承認',
    description: '課長 → 部長 → 役員の順次承認',
    steps: [
      {
        stepNumber: 1,
        stepName: '課長承認',
        approverType: 'ROLE',
        approverValue: 'MANAGER',
        isRequired: true,
        isParallel: false,
        isSequential: true,
        timeoutHours: 24,
        autoApprovalCondition: '',
        minimumApprovals: 1,
        canSkip: false
      },
      {
        stepNumber: 2,
        stepName: '部長承認',
        approverType: 'ROLE',
        approverValue: 'ADMIN',
        isRequired: true,
        isParallel: false,
        isSequential: true,
        timeoutHours: 48,
        autoApprovalCondition: '',
        minimumApprovals: 1,
        canSkip: false
      },
      {
        stepNumber: 3,
        stepName: '役員承認',
        approverType: 'ROLE',
        approverValue: 'ADMIN',
        isRequired: true,
        isParallel: false,
        isSequential: true,
        timeoutHours: 72,
        autoApprovalCondition: '',
        minimumApprovals: 1,
        canSkip: false
      }
    ]
  },
  {
    id: 'conditional',
    name: '条件付き承認',
    description: '金額に応じて承認者が変わる',
    steps: [
      {
        stepNumber: 1,
        stepName: '少額: 課長承認',
        approverType: 'ROLE',
        approverValue: 'MANAGER',
        isRequired: true,
        isParallel: false,
        isSequential: false,
        timeoutHours: 24,
        autoApprovalCondition: 'amount < 100000',
        minimumApprovals: 1,
        canSkip: false
      },
      {
        stepNumber: 2,
        stepName: '高額: 部長承認',
        approverType: 'ROLE',
        approverValue: 'ADMIN',
        isRequired: true,
        isParallel: false,
        isSequential: true,
        timeoutHours: 48,
        autoApprovalCondition: 'amount >= 100000',
        minimumApprovals: 1,
        canSkip: false
      }
    ]
  },
  {
    id: 'auto-approval',
    name: '自動承認付き',
    description: '一定時間経過で自動承認される',
    steps: [
      {
        stepNumber: 1,
        stepName: '上長承認（24時間後自動承認）',
        approverType: 'ROLE',
        approverValue: 'MANAGER',
        isRequired: false,
        isParallel: false,
        isSequential: false,
        timeoutHours: 24,
        autoApprovalCondition: '',
        autoApproveHours: 24,
        minimumApprovals: 1,
        canSkip: true
      }
    ]
  }
])

const searchForm = reactive({
  search: '',
  workflowTypeId: null,
  isActive: null
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const routeForm = reactive({
  workflowTypeId: null,
  name: '',
  description: '',
  isActive: true,
  steps: []
})

const routeFormRef = ref<FormInstance>()

// バリデーションルール
const routeRules: FormRules = {
  workflowTypeId: [
    { required: true, message: 'ワークフロータイプを選択してください', trigger: 'change' }
  ],
  name: [
    { required: true, message: 'ルート名を入力してください', trigger: 'blur' },
    { min: 1, max: 200, message: '1-200文字で入力してください', trigger: 'blur' }
  ]
}

// メソッド
const fetchApprovalRoutes = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString()
    })

    if (searchForm.search) params.append('search', searchForm.search)
    if (searchForm.workflowTypeId) params.append('workflowTypeId', searchForm.workflowTypeId.toString())
    if (searchForm.isActive !== null) params.append('isActive', searchForm.isActive.toString())

    const response = await fetch(`/api/approval/routes?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      approvalRoutes.value = data.data
      pagination.total = data.pagination.total
    } else {
      ElMessage.error('承認ルート一覧の取得に失敗しました')
    }
  } catch (error) {
    ElMessage.error('通信エラーが発生しました')
  } finally {
    loading.value = false
  }
}

const fetchWorkflowTypes = async () => {
  try {
    const response = await fetch('/api/workflow/types?limit=100', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      workflowTypes.value = data.data.filter(type => type.isActive)
    }
  } catch (error) {
    console.error('ワークフロータイプの取得に失敗:', error)
  }
}

const fetchUsers = async () => {
  try {
    const response = await fetch('/api/users?limit=100', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      users.value = data.data
    }
  } catch (error) {
    console.error('ユーザー一覧の取得に失敗:', error)
  }
}

const fetchDepartments = async () => {
  try {
    const response = await fetch('/api/departments?limit=100', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      departments.value = data.data
    }
  } catch (error) {
    console.error('部署一覧の取得に失敗:', error)
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchApprovalRoutes()
}

const handleSizeChange = (val: number) => {
  pagination.limit = val
  fetchApprovalRoutes()
}

const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchApprovalRoutes()
}

const viewRoute = (item: any) => {
  selectedItem.value = item
  showDetailDialog.value = true
}

const editRoute = (item: any) => {
  editingItem.value = item
  Object.assign(routeForm, {
    workflowTypeId: item.workflowTypeId,
    name: item.name,
    description: item.description || '',
    isActive: item.isActive,
    steps: item.steps ? [...item.steps] : []
  })
  showCreateDialog.value = true
}

const deleteRoute = async (item: any) => {
  try {
    await ElMessageBox.confirm(
      `承認ルート「${item.name}」を削除しますか？`,
      '削除確認',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    )

    const response = await fetch(`/api/approval/routes/${item.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      ElMessage.success('承認ルートを削除しました')
      fetchApprovalRoutes()
    } else {
      const error = await response.json()
      ElMessage.error(error.error || '削除に失敗しました')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('削除に失敗しました')
    }
  }
}

const addStep = () => {
  const newStep = {
    stepNumber: routeForm.steps.length + 1,
    stepName: '',
    approverType: 'USER',
    approverValue: '',
    isRequired: true,
    isParallel: false,
    autoApprovalCondition: '',
    timeoutHours: 24
  }
  routeForm.steps.push(newStep)
  updateStepNumbers()
}

const removeStep = (index: number) => {
  routeForm.steps.splice(index, 1)
  updateStepNumbers()
}

const moveStepUp = (index: number) => {
  if (index > 0) {
    const temp = routeForm.steps[index]
    routeForm.steps[index] = routeForm.steps[index - 1]
    routeForm.steps[index - 1] = temp
    updateStepNumbers()
  }
}

const moveStepDown = (index: number) => {
  if (index < routeForm.steps.length - 1) {
    const temp = routeForm.steps[index]
    routeForm.steps[index] = routeForm.steps[index + 1]
    routeForm.steps[index + 1] = temp
    updateStepNumbers()
  }
}

const updateStepNumbers = () => {
  routeForm.steps.forEach((step, index) => {
    step.stepNumber = index + 1
  })
}

const onApproverTypeChange = (step: any, index: number) => {
  step.approverValue = ''
}

// ビジュアルダイアグラムからのイベントハンドラ
const handleStepAdd = (stepData: any) => {
  const newStep = {
    stepNumber: routeForm.steps.length + 1,
    stepName: stepData.stepName || `ステップ ${routeForm.steps.length + 1}`,
    approverType: stepData.approverType || 'USER',
    approverValue: stepData.approverValue || '',
    isRequired: stepData.isRequired ?? true,
    isParallel: stepData.isParallel ?? false,
    isSequential: stepData.isSequential ?? false,
    autoApprovalCondition: stepData.autoApprovalCondition || '',
    timeoutHours: stepData.timeoutHours || 24,
    minimumApprovals: stepData.minimumApprovals || 1,
    canSkip: stepData.canSkip ?? false
  }
  routeForm.steps.push(newStep)
  updateStepNumbers()
  ElMessage.success('ステップを追加しました')
}

const handleStepEdit = (stepData: any) => {
  const index = routeForm.steps.findIndex(s => s.stepNumber === stepData.stepNumber)
  if (index !== -1) {
    routeForm.steps[index] = { ...routeForm.steps[index], ...stepData }
    ElMessage.success('ステップを更新しました')
  }
}

const handleStepDelete = (step: any) => {
  const index = routeForm.steps.findIndex(s => s.stepNumber === step.stepNumber)
  if (index !== -1) {
    removeStep(index)
    ElMessage.success('ステップを削除しました')
  }
}

const handleStepClick = (step: any) => {
  // ステップクリック時の処理（詳細表示など）
  console.log('Step clicked:', step)
}

// テンプレート適用
const applyTemplate = () => {
  if (!selectedTemplate.value) return

  const template = routeTemplates.value.find(t => t.id === selectedTemplate.value)
  if (template) {
    routeForm.steps = JSON.parse(JSON.stringify(template.steps))
    updateStepNumbers()
    ElMessage.success(`テンプレート「${template.name}」を適用しました`)
  }
}

const saveRoute = async () => {
  if (!routeFormRef.value) return

  try {
    await routeFormRef.value.validate()

    if (routeForm.steps.length === 0) {
      ElMessage.error('承認ステップを少なくとも1つ設定してください')
      return
    }

    saving.value = true

    const url = editingItem.value
      ? `/api/approval/routes/${editingItem.value.id}`
      : '/api/approval/routes'

    const method = editingItem.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(routeForm)
    })

    if (response.ok) {
      ElMessage.success(editingItem.value ? '承認ルートを更新しました' : '承認ルートを作成しました')
      cancelEdit()
      fetchApprovalRoutes()
    } else {
      const error = await response.json()
      ElMessage.error(error.error || '保存に失敗しました')
    }
  } catch (error) {
    // バリデーションエラーの場合は何もしない
  } finally {
    saving.value = false
  }
}

const cancelEdit = () => {
  showCreateDialog.value = false
  editingItem.value = null
  Object.assign(routeForm, {
    workflowTypeId: null,
    name: '',
    description: '',
    isActive: true,
    steps: []
  })
  routeFormRef.value?.resetFields()
}

// ユーティリティ関数
const getApproverTypeLabel = (type: string) => {
  const labels = {
    USER: '特定ユーザー',
    DEPARTMENT: '部署',
    ROLE: '役割',
    DYNAMIC: '動的'
  }
  return labels[type] || type
}

const getApproverName = (step: any) => {
  switch (step.approverType) {
    case 'USER':
      const user = users.value.find(u => u.id.toString() === step.approverValue)
      return user ? user.name : step.approverValue
    case 'DEPARTMENT':
      const dept = departments.value.find(d => d.id.toString() === step.approverValue)
      return dept ? dept.name : step.approverValue
    case 'ROLE':
      const roleLabels = { ADMIN: '管理者', MANAGER: 'マネージャー', USER: '一般ユーザー' }
      return roleLabels[step.approverValue] || step.approverValue
    case 'DYNAMIC':
      return step.approverValue
    default:
      return step.approverValue
  }
}

// ライフサイクル
onMounted(() => {
  fetchApprovalRoutes()
  fetchWorkflowTypes()
  fetchUsers()
  fetchDepartments()
})
</script>

<style scoped>
.approval-routes {
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

.search-card, .table-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.detail-content {
  padding: 10px 0;
}

.steps-section {
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}

.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.steps-header h3 {
  margin: 0;
  color: #303133;
}

.header-actions-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.visual-mode {
  min-height: 400px;
  padding: 20px 0;
}

.list-mode {
  min-height: 200px;
}

.empty-steps {
  text-align: center;
  padding: 40px 0;
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.step-item {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 20px;
  background: #fafcff;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.step-number {
  font-weight: bold;
  color: #409eff;
  font-size: 16px;
}

.step-actions {
  display: flex;
  gap: 5px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* フロー図のスタイル */
.flow-diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-top: 15px;
}

.flow-start, .flow-end {
  padding: 10px 20px;
  background: #409eff;
  color: white;
  border-radius: 20px;
  font-weight: bold;
}

.flow-end {
  background: #67c23a;
}

.flow-step {
  padding: 15px 20px;
  background: white;
  border: 2px solid #dcdfe6;
  border-radius: 8px;
  text-align: center;
  min-width: 200px;
}

.flow-step.parallel {
  border-color: #e6a23c;
  background: #fdf6ec;
}

.step-title {
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.step-info {
  font-size: 12px;
  color: #606266;
}

.step-details {
  margin-top: 5px;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.step-details span {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
}

.required {
  background: #f56c6c;
  color: white;
}

.parallel {
  background: #e6a23c;
  color: white;
}

.timeout {
  background: #909399;
  color: white;
}

.flow-arrow {
  font-size: 20px;
  color: #409eff;
  font-weight: bold;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

.template-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.template-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-name {
  font-weight: 500;
  color: #303133;
}

.template-desc {
  font-size: 12px;
  color: #909399;
}
</style>