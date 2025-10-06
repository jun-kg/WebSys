<template>
  <div class="approval-flow-diagram">
    <div class="flow-canvas" ref="canvasRef">
      <!-- 開始ノード -->
      <div class="flow-node start-node">
        <div class="node-icon">
          <el-icon><CirclePlus /></el-icon>
        </div>
        <div class="node-label">開始</div>
      </div>

      <!-- 承認ステップノード -->
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="flow-step"
        :class="{ 'active-step': step.id === activeStepId }"
      >
        <div class="flow-connector">
          <div class="connector-line"></div>
          <el-icon class="connector-arrow"><ArrowDown /></el-icon>
        </div>

        <div
          class="flow-node step-node"
          :class="getStepClass(step)"
          @click="selectStep(step)"
        >
          <div class="step-header">
            <div class="step-number">STEP {{ index + 1 }}</div>
            <el-tag :type="getStepTypeTag(step.type)" size="small">
              {{ getStepTypeLabel(step.type) }}
            </el-tag>
          </div>

          <div class="step-content">
            <div class="step-approvers">
              <el-icon><User /></el-icon>
              <span>{{ getApproverLabel(step) }}</span>
            </div>

            <!-- 並列承認 -->
            <div v-if="step.isParallel" class="step-parallel">
              <el-tag type="info" size="small">
                <el-icon><Share /></el-icon>
                並列承認 ({{ step.parallelType }})
              </el-tag>
              <span v-if="step.parallelType === 'OR'">
                最低 {{ step.minimumApprovals }} 名
              </span>
            </div>

            <!-- 直列承認 -->
            <div v-if="step.isSequential" class="step-sequential">
              <el-tag type="warning" size="small">
                <el-icon><Sort /></el-icon>
                直列承認
              </el-tag>
              <span>順番に承認</span>
            </div>

            <!-- 自動承認 -->
            <div v-if="step.autoApproveHours" class="step-auto">
              <el-tag type="success" size="small">
                <el-icon><Timer /></el-icon>
                自動承認
              </el-tag>
              <span>{{ step.autoApproveHours }}時間後</span>
            </div>

            <!-- 条件分岐 -->
            <div v-if="step.condition" class="step-condition">
              <el-icon><Filter /></el-icon>
              <span>条件付き</span>
            </div>
          </div>

          <div class="step-actions" v-if="editable">
            <el-button-group size="small">
              <el-button @click.stop="editStep(step)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button @click.stop="deleteStep(step)" type="danger">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-button-group>
          </div>
        </div>

        <!-- 条件分岐の矢印 -->
        <div v-if="step.condition" class="branch-indicator">
          <div class="branch-line left"></div>
          <div class="branch-line right"></div>
        </div>
      </div>

      <!-- 追加ボタン -->
      <div v-if="editable" class="add-step-button">
        <div class="flow-connector">
          <div class="connector-line"></div>
          <el-icon class="connector-arrow"><ArrowDown /></el-icon>
        </div>
        <el-button type="primary" circle @click="addStep">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>

      <!-- 終了ノード -->
      <div class="flow-node end-node">
        <div class="flow-connector">
          <div class="connector-line"></div>
          <el-icon class="connector-arrow"><ArrowDown /></el-icon>
        </div>
        <div class="node-icon">
          <el-icon><CircleCheck /></el-icon>
        </div>
        <div class="node-label">完了</div>
      </div>
    </div>

    <!-- ステップ設定パネル -->
    <el-drawer
      v-model="showStepConfig"
      :title="editingStep ? `STEP ${editingStepIndex + 1} 設定` : '新規ステップ'"
      size="500px"
    >
      <el-form :model="stepForm" label-width="120px" v-if="showStepConfig">
        <el-form-item label="承認者タイプ">
          <el-select v-model="stepForm.approverType" placeholder="選択してください">
            <el-option label="ユーザー指定" value="USER" />
            <el-option label="部署指定" value="DEPARTMENT" />
            <el-option label="役職指定" value="ROLE" />
            <el-option label="動的設定" value="DYNAMIC" />
          </el-select>
        </el-form-item>

        <el-form-item label="承認者">
          <el-input v-model="stepForm.approverValue" placeholder="承認者を入力" />
        </el-form-item>

        <el-form-item label="承認タイプ">
          <el-radio-group v-model="stepForm.approvalMode">
            <el-radio label="single">単一承認</el-radio>
            <el-radio label="parallel">並列承認</el-radio>
            <el-radio label="sequential">直列承認</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="stepForm.approvalMode === 'parallel'" label="並列タイプ">
          <el-radio-group v-model="stepForm.parallelType">
            <el-radio label="AND">全員承認必須</el-radio>
            <el-radio label="OR">最低承認数</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="stepForm.parallelType === 'OR'" label="最低承認数">
          <el-input-number v-model="stepForm.minimumApprovals" :min="1" />
        </el-form-item>

        <el-form-item label="自動承認">
          <el-switch v-model="stepForm.enableAutoApprove" />
        </el-form-item>

        <el-form-item v-if="stepForm.enableAutoApprove" label="自動承認時間">
          <el-input-number v-model="stepForm.autoApproveHours" :min="1" :max="168" />
          <span style="margin-left: 8px">時間後</span>
        </el-form-item>

        <el-form-item label="スキップ可能">
          <el-switch v-model="stepForm.canSkip" />
        </el-form-item>

        <el-form-item label="条件設定">
          <el-switch v-model="stepForm.enableCondition" />
        </el-form-item>

        <el-form-item v-if="stepForm.enableCondition" label="条件">
          <el-input
            v-model="stepForm.conditionExpression"
            type="textarea"
            :rows="3"
            placeholder="例: amount > 10000"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showStepConfig = false">キャンセル</el-button>
        <el-button type="primary" @click="saveStep">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  CirclePlus, CircleCheck, ArrowDown, User, Share, Sort, Timer,
  Filter, Edit, Delete, Plus
} from '@element-plus/icons-vue'

interface ApprovalStep {
  id: string
  stepNumber: number
  approverType: string
  approverValue: any
  isParallel: boolean
  parallelType?: string
  minimumApprovals?: number
  isSequential: boolean
  autoApproveHours?: number
  canSkip: boolean
  condition?: any
  type?: string
}

interface Props {
  steps?: ApprovalStep[]
  editable?: boolean
  activeStepId?: string
}

const props = withDefaults(defineProps<Props>(), {
  steps: () => [],
  editable: true,
  activeStepId: ''
})

const emit = defineEmits(['update:steps', 'step-click', 'step-add', 'step-edit', 'step-delete'])

const canvasRef = ref<HTMLElement>()
const showStepConfig = ref(false)
const editingStep = ref<ApprovalStep | null>(null)
const editingStepIndex = ref(-1)

const stepForm = reactive({
  approverType: 'USER',
  approverValue: '',
  approvalMode: 'single',
  parallelType: 'AND',
  minimumApprovals: 1,
  enableAutoApprove: false,
  autoApproveHours: 24,
  canSkip: false,
  enableCondition: false,
  conditionExpression: ''
})

const getStepClass = (step: ApprovalStep) => {
  const classes = []
  if (step.isParallel) classes.push('parallel-step')
  if (step.isSequential) classes.push('sequential-step')
  if (step.condition) classes.push('conditional-step')
  return classes.join(' ')
}

const getStepTypeTag = (type?: string) => {
  const types: Record<string, string> = {
    parallel: 'info',
    sequential: 'warning',
    auto: 'success',
    conditional: 'primary'
  }
  return types[type || ''] || ''
}

const getStepTypeLabel = (type?: string) => {
  const labels: Record<string, string> = {
    parallel: '並列',
    sequential: '直列',
    auto: '自動',
    conditional: '条件付き'
  }
  return labels[type || ''] || '標準'
}

const getApproverLabel = (step: ApprovalStep) => {
  const typeLabels: Record<string, string> = {
    USER: 'ユーザー',
    DEPARTMENT: '部署',
    ROLE: '役職',
    DYNAMIC: '動的設定'
  }
  return `${typeLabels[step.approverType] || ''}: ${step.approverValue || '未設定'}`
}

const selectStep = (step: ApprovalStep) => {
  emit('step-click', step)
}

const addStep = () => {
  showStepConfig.value = true
  editingStep.value = null
  editingStepIndex.value = -1
  resetStepForm()
}

const editStep = (step: ApprovalStep) => {
  editingStep.value = step
  editingStepIndex.value = props.steps.findIndex(s => s.id === step.id)
  loadStepForm(step)
  showStepConfig.value = true
}

const deleteStep = async (step: ApprovalStep) => {
  try {
    await ElMessageBox.confirm(
      'このステップを削除してもよろしいですか？',
      '確認',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    )
    emit('step-delete', step)
    ElMessage.success('ステップを削除しました')
  } catch {
    // キャンセル
  }
}

const saveStep = () => {
  const stepData: Partial<ApprovalStep> = {
    approverType: stepForm.approverType,
    approverValue: stepForm.approverValue,
    isParallel: stepForm.approvalMode === 'parallel',
    parallelType: stepForm.approvalMode === 'parallel' ? stepForm.parallelType : undefined,
    minimumApprovals: stepForm.parallelType === 'OR' ? stepForm.minimumApprovals : undefined,
    isSequential: stepForm.approvalMode === 'sequential',
    autoApproveHours: stepForm.enableAutoApprove ? stepForm.autoApproveHours : undefined,
    canSkip: stepForm.canSkip,
    condition: stepForm.enableCondition ? { expression: stepForm.conditionExpression } : undefined
  }

  if (editingStep.value) {
    emit('step-edit', { ...editingStep.value, ...stepData })
  } else {
    emit('step-add', stepData)
  }

  showStepConfig.value = false
  ElMessage.success(editingStep.value ? 'ステップを更新しました' : 'ステップを追加しました')
}

const resetStepForm = () => {
  Object.assign(stepForm, {
    approverType: 'USER',
    approverValue: '',
    approvalMode: 'single',
    parallelType: 'AND',
    minimumApprovals: 1,
    enableAutoApprove: false,
    autoApproveHours: 24,
    canSkip: false,
    enableCondition: false,
    conditionExpression: ''
  })
}

const loadStepForm = (step: ApprovalStep) => {
  Object.assign(stepForm, {
    approverType: step.approverType,
    approverValue: step.approverValue,
    approvalMode: step.isSequential ? 'sequential' : step.isParallel ? 'parallel' : 'single',
    parallelType: step.parallelType || 'AND',
    minimumApprovals: step.minimumApprovals || 1,
    enableAutoApprove: !!step.autoApproveHours,
    autoApproveHours: step.autoApproveHours || 24,
    canSkip: step.canSkip,
    enableCondition: !!step.condition,
    conditionExpression: step.condition?.expression || ''
  })
}
</script>

<style scoped>
.approval-flow-diagram {
  position: relative;
  width: 100%;
  min-height: 600px;
}

.flow-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.flow-node {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  min-width: 280px;
  transition: all 0.3s;
}

.flow-node:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.start-node,
.end-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
}

.start-node {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.end-node {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.node-icon {
  font-size: 48px;
}

.node-label {
  font-size: 18px;
  font-weight: 600;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.flow-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.connector-line {
  width: 2px;
  height: 40px;
  background: #dcdfe6;
}

.connector-arrow {
  font-size: 24px;
  color: #909399;
  margin-top: -8px;
}

.step-node {
  cursor: pointer;
  width: 100%;
  max-width: 400px;
}

.step-node.active-step {
  border: 2px solid #409eff;
  box-shadow: 0 4px 20px rgba(64, 158, 255, 0.3);
}

.step-node.parallel-step {
  border-left: 4px solid #409eff;
}

.step-node.sequential-step {
  border-left: 4px solid #e6a23c;
}

.step-node.conditional-step {
  border-left: 4px solid #f56c6c;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.step-number {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.step-approvers {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #303133;
}

.step-parallel,
.step-sequential,
.step-auto,
.step-condition {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
}

.add-step-button {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.branch-indicator {
  position: relative;
  width: 200px;
  height: 60px;
  margin-top: -20px;
}

.branch-line {
  position: absolute;
  top: 0;
  width: 100px;
  height: 2px;
  background: #dcdfe6;
}

.branch-line.left {
  left: 0;
  transform: rotate(-30deg);
  transform-origin: right center;
}

.branch-line.right {
  right: 0;
  transform: rotate(30deg);
  transform-origin: left center;
}

@media (max-width: 768px) {
  .step-node {
    max-width: 100%;
  }
}
</style>
