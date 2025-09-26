<template>
  <div class="permission-inheritance">
    <!-- ヘッダー -->
    <div class="page-header">
      <h1>権限継承管理</h1>
      <el-button type="primary" @click="showVisualization">
        <el-icon><View /></el-icon>
        継承関係の可視化
      </el-button>
    </div>

    <!-- 部署選択 -->
    <el-card class="department-selector">
      <template #header>
        <div class="card-header">
          <span>部署選択</span>
        </div>
      </template>

      <el-tree
        :data="departmentTree"
        :props="treeProps"
        @node-click="handleDepartmentSelect"
        highlight-current
        default-expand-all
        node-key="id"
      >
        <template #default="{ node, data }">
          <span class="tree-node">
            <el-icon><Folder /></el-icon>
            <span>{{ data.name }}</span>
            <el-tag
              v-if="data.parentId"
              size="small"
              type="info"
              class="ml-2"
            >
              {{ data.level }}階層
            </el-tag>
          </span>
        </template>
      </el-tree>
    </el-card>

    <!-- 権限継承ルール設定 -->
    <el-card v-if="selectedDepartment" class="inheritance-rules">
      <template #header>
        <div class="card-header">
          <span>{{ selectedDepartment.name }} の権限継承ルール</span>
          <el-button
            type="primary"
            size="small"
            @click="saveRules"
            :loading="saving"
          >
            保存
          </el-button>
        </div>
      </template>

      <!-- 親部署情報 -->
      <div v-if="parentDepartment" class="parent-info">
        <el-alert
          :title="`親部署: ${parentDepartment.name}`"
          type="info"
          show-icon
          :closable="false"
        />
      </div>

      <!-- 継承ルール表 -->
      <el-table
        :data="inheritanceRules"
        stripe
        class="mt-4"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column prop="featureName" label="機能" width="200">
          <template #default="{ row }">
            <div class="feature-name">
              <el-icon><Menu /></el-icon>
              <span>{{ row.featureName }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="inheritType" label="継承タイプ" width="150">
          <template #default="{ row }">
            <el-select
              v-model="row.inheritType"
              size="small"
              @change="updateInheritType(row)"
            >
              <el-option label="全て継承" value="ALL" />
              <el-option label="部分継承" value="PARTIAL" />
              <el-option label="継承なし" value="NONE" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="継承する権限" min-width="400">
          <template #default="{ row }">
            <div v-if="row.inheritType !== 'NONE'" class="permission-checks">
              <el-checkbox
                v-model="row.inheritView"
                :disabled="row.inheritType === 'ALL'"
              >
                参照
              </el-checkbox>
              <el-checkbox
                v-model="row.inheritCreate"
                :disabled="row.inheritType === 'ALL'"
              >
                作成
              </el-checkbox>
              <el-checkbox
                v-model="row.inheritEdit"
                :disabled="row.inheritType === 'ALL'"
              >
                編集
              </el-checkbox>
              <el-checkbox
                v-model="row.inheritDelete"
                :disabled="row.inheritType === 'ALL'"
              >
                削除
              </el-checkbox>
              <el-checkbox
                v-model="row.inheritApprove"
                :disabled="row.inheritType === 'ALL'"
              >
                承認
              </el-checkbox>
              <el-checkbox
                v-model="row.inheritExport"
                :disabled="row.inheritType === 'ALL'"
              >
                エクスポート
              </el-checkbox>
            </div>
            <el-tag v-else type="info">継承なし</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="優先度" width="100">
          <template #default="{ row }">
            <el-input-number
              v-model="row.priority"
              :min="0"
              :max="999"
              size="small"
            />
          </template>
        </el-table-column>
      </el-table>

      <!-- 一括操作 -->
      <div class="bulk-actions mt-4">
        <el-button @click="applyToSelected('ALL')">
          選択項目を「全て継承」に設定
        </el-button>
        <el-button @click="applyToSelected('PARTIAL')">
          選択項目を「部分継承」に設定
        </el-button>
        <el-button @click="applyToSelected('NONE')">
          選択項目を「継承なし」に設定
        </el-button>
      </div>
    </el-card>

    <!-- 実効権限プレビュー -->
    <el-card v-if="selectedDepartment" class="effective-permissions">
      <template #header>
        <div class="card-header">
          <span>実効権限プレビュー</span>
          <el-button
            type="text"
            @click="refreshEffectivePermissions"
            :loading="loadingEffective"
          >
            <el-icon><Refresh /></el-icon>
            更新
          </el-button>
        </div>
      </template>

      <el-table :data="effectivePermissions" stripe>
        <el-table-column prop="featureName" label="機能" width="200" />

        <el-table-column label="権限" min-width="400">
          <template #default="{ row }">
            <div class="permission-badges">
              <el-tag v-if="row.canView" type="success" size="small">参照</el-tag>
              <el-tag v-if="row.canCreate" type="success" size="small">作成</el-tag>
              <el-tag v-if="row.canEdit" type="warning" size="small">編集</el-tag>
              <el-tag v-if="row.canDelete" type="danger" size="small">削除</el-tag>
              <el-tag v-if="row.canApprove" type="primary" size="small">承認</el-tag>
              <el-tag v-if="row.canExport" type="info" size="small">エクスポート</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="source" label="取得元" width="150">
          <template #default="{ row }">
            <el-tag :type="row.source === 'direct' ? 'primary' : 'warning'">
              {{ row.source === 'direct' ? '直接設定' : '継承' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="inheritedFrom" label="継承元" width="200">
          <template #default="{ row }">
            <span v-if="row.inheritedFrom">
              {{ getDepartmentName(row.inheritedFrom) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 可視化ダイアログ -->
    <el-dialog
      v-model="visualizationDialog"
      title="権限継承関係の可視化"
      width="95%"
      top="2vh"
      custom-class="visualization-dialog"
    >
      <InheritanceVisualization
        :initial-company-id="1"
        :initial-feature-id="selectedDepartment ? features.find(f => f.id)?.id : undefined"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Folder, Menu, Refresh } from '@element-plus/icons-vue'
import api from '@/api'
import InheritanceVisualization from '@/components/InheritanceVisualization.vue'

interface Department {
  id: number
  name: string
  parentId: number | null
  level: number
  children?: Department[]
}

interface InheritanceRule {
  id?: number
  departmentId: number
  featureId: number
  featureName: string
  inheritType: 'ALL' | 'PARTIAL' | 'NONE'
  inheritView: boolean
  inheritCreate: boolean
  inheritEdit: boolean
  inheritDelete: boolean
  inheritApprove: boolean
  inheritExport: boolean
  priority: number
}

interface EffectivePermission {
  featureId: number
  featureName: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
  canExport: boolean
  source: 'direct' | 'inherited'
  inheritedFrom?: number
}

// State
const departmentTree = ref<Department[]>([])
const selectedDepartment = ref<Department | null>(null)
const parentDepartment = ref<Department | null>(null)
const inheritanceRules = ref<InheritanceRule[]>([])
const effectivePermissions = ref<EffectivePermission[]>([])
const selectedRules = ref<InheritanceRule[]>([])
const features = ref<any[]>([])
const departments = ref<Map<number, Department>>(new Map())

// Loading states
const loading = ref(false)
const saving = ref(false)
const loadingEffective = ref(false)

// Dialog
const visualizationDialog = ref(false)

// Tree props
const treeProps = {
  children: 'children',
  label: 'name'
}

// Methods
const loadDepartments = async () => {
  try {
    loading.value = true
    const response = await api.get('/api/departments')
    const depts = response.data.data || []

    // Build department map and tree
    departments.value.clear()
    depts.forEach((dept: Department) => {
      departments.value.set(dept.id, dept)
    })

    departmentTree.value = buildTree(depts)
  } catch (error) {
    ElMessage.error('部署情報の取得に失敗しました')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const loadFeatures = async () => {
  try {
    const response = await api.get('/api/features')
    features.value = response.data.data || []
  } catch (error) {
    ElMessage.error('機能情報の取得に失敗しました')
    console.error(error)
  }
}

const buildTree = (departments: Department[]): Department[] => {
  const map = new Map<number, Department>()
  const tree: Department[] = []

  departments.forEach(dept => {
    map.set(dept.id, { ...dept, children: [] })
  })

  departments.forEach(dept => {
    if (dept.parentId) {
      const parent = map.get(dept.parentId)
      if (parent) {
        parent.children!.push(map.get(dept.id)!)
      }
    } else {
      tree.push(map.get(dept.id)!)
    }
  })

  return tree
}

const handleDepartmentSelect = async (department: Department) => {
  selectedDepartment.value = department

  // Get parent department
  if (department.parentId) {
    parentDepartment.value = departments.value.get(department.parentId) || null
  } else {
    parentDepartment.value = null
  }

  // Load inheritance rules
  await loadInheritanceRules(department.id)

  // Load effective permissions
  await loadEffectivePermissions(department.id)
}

const loadInheritanceRules = async (departmentId: number) => {
  try {
    const response = await api.get(`/api/permissions/inheritance/rules/${departmentId}`)
    const existingRules = response.data.data || []

    // Create rules for all features
    inheritanceRules.value = features.value.map(feature => {
      const existing = existingRules.find((r: any) => r.featureId === feature.id)

      if (existing) {
        return {
          ...existing,
          featureName: feature.name
        }
      }

      // Default rule
      return {
        departmentId,
        featureId: feature.id,
        featureName: feature.name,
        inheritType: 'ALL',
        inheritView: true,
        inheritCreate: false,
        inheritEdit: false,
        inheritDelete: false,
        inheritApprove: false,
        inheritExport: false,
        priority: 0
      }
    })
  } catch (error) {
    ElMessage.error('継承ルールの取得に失敗しました')
    console.error(error)
  }
}

const loadEffectivePermissions = async (departmentId: number) => {
  try {
    loadingEffective.value = true
    const response = await api.get(`/api/permissions/inheritance/effective/${departmentId}`)
    const permissions = response.data.data || []

    effectivePermissions.value = permissions.map((perm: any) => {
      const feature = features.value.find(f => f.id === perm.featureId)
      return {
        ...perm,
        featureName: feature?.name || 'Unknown'
      }
    })
  } catch (error) {
    ElMessage.error('実効権限の取得に失敗しました')
    console.error(error)
  } finally {
    loadingEffective.value = false
  }
}

const updateInheritType = (rule: InheritanceRule) => {
  if (rule.inheritType === 'ALL') {
    // Set all permissions to true for ALL type
    rule.inheritView = true
    rule.inheritCreate = true
    rule.inheritEdit = true
    rule.inheritDelete = true
    rule.inheritApprove = true
    rule.inheritExport = true
  } else if (rule.inheritType === 'NONE') {
    // Set all permissions to false for NONE type
    rule.inheritView = false
    rule.inheritCreate = false
    rule.inheritEdit = false
    rule.inheritDelete = false
    rule.inheritApprove = false
    rule.inheritExport = false
  }
}

const saveRules = async () => {
  try {
    saving.value = true

    const response = await api.put('/api/permissions/inheritance/rules/bulk', {
      rules: inheritanceRules.value
    })

    ElMessage.success('継承ルールを保存しました')

    // Reload effective permissions
    if (selectedDepartment.value) {
      await loadEffectivePermissions(selectedDepartment.value.id)
    }
  } catch (error) {
    ElMessage.error('継承ルールの保存に失敗しました')
    console.error(error)
  } finally {
    saving.value = false
  }
}

const handleSelectionChange = (selection: InheritanceRule[]) => {
  selectedRules.value = selection
}

const applyToSelected = (type: 'ALL' | 'PARTIAL' | 'NONE') => {
  selectedRules.value.forEach(rule => {
    rule.inheritType = type
    updateInheritType(rule)
  })
}

const refreshEffectivePermissions = async () => {
  if (selectedDepartment.value) {
    await loadEffectivePermissions(selectedDepartment.value.id)
  }
}

const getDepartmentName = (departmentId: number): string => {
  return departments.value.get(departmentId)?.name || `部署 #${departmentId}`
}

const showVisualization = async () => {
  visualizationDialog.value = true
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadDepartments(),
    loadFeatures()
  ])
})
</script>

<style scoped>
.permission-inheritance {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 24px;
  margin: 0;
}

.el-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.department-selector {
  max-width: 400px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.parent-info {
  margin-bottom: 20px;
}

.feature-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.permission-checks {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.permission-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bulk-actions {
  display: flex;
  gap: 12px;
}

.mt-4 {
  margin-top: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.visualization-container {
  width: 100%;
  height: 600px;
  overflow: auto;
}

:deep(.visualization-dialog) {
  .el-dialog__body {
    padding: 0;
    height: 85vh;
    overflow: hidden;
  }
}
</style>