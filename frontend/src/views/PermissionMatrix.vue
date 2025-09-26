<template>
  <div class="permission-matrix">
    <!-- ページヘッダー -->
    <el-card class="page-header">
      <el-row align="middle" justify="space-between">
        <el-col :span="16">
          <h1 class="page-title">部署×機能権限マトリクス</h1>
          <p class="page-description">
            部署ごとの機能権限を一覧表示・編集できます
          </p>
        </el-col>
        <el-col :span="8" class="text-right">
          <el-button
            type="primary"
            @click="handleSaveAll"
            :loading="saving"
          >
            <el-icon><Document /></el-icon>
            一括保存
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- フィルター・検索 -->
    <el-card class="filter-section">
      <el-form
        :model="filterForm"
        inline
        class="filter-form"
      >
        <el-form-item label="部署">
          <el-select
            v-model="filterForm.departmentIds"
            placeholder="部署を選択（複数選択可能）"
            clearable
            multiple
            collapse-tags
            style="min-width: 300px"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="getDisplayName(dept)"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="機能カテゴリ">
          <el-select
            v-model="filterForm.category"
            placeholder="カテゴリを選択"
            clearable
          >
            <el-option
              v-for="category in categories"
              :key="category.code"
              :label="category.name"
              :value="category.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="loadPermissionMatrix"
            :loading="loading"
          >
            表示更新
          </el-button>
          <el-button
            @click="handleExport"
          >
            CSV出力
          </el-button>
          <el-button
            type="success"
            @click="openTemplateDialog"
          >
            テンプレート管理
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 権限マトリクス表示 -->
    <el-card>
      <div class="matrix-container" v-loading="loading">
        <!-- 凡例 -->
        <div class="legend-section">
          <h3>権限記号</h3>
          <div class="legend-items">
            <span v-for="(desc, code) in legend" :key="code" class="legend-item">
              <el-tag size="small">{{ code }}</el-tag>
              <span>{{ desc }}</span>
            </span>
          </div>
        </div>

        <!-- マトリクステーブル -->
        <div class="matrix-table" v-if="matrixData.length > 0">
          <el-table
            :data="matrixData"
            border
            style="width: 100%"
          >
            <!-- 部署名列 -->
            <el-table-column
              prop="departmentName"
              label="部署名"
              fixed="left"
              width="150"
            />

            <!-- 機能列 -->
            <el-table-column
              v-for="feature in visibleFeatures"
              :key="feature.code"
              :label="feature.name"
              width="120"
              align="center"
            >
              <template #header>
                <div class="feature-header">
                  <div class="feature-name">{{ feature.name }}</div>
                  <div class="feature-code">{{ feature.code }}</div>
                </div>
              </template>
              <template #default="{ row }">
                <div class="permission-cell">
                  <span
                    class="permission-display"
                    :class="{
                      'has-permissions': getFeaturePermissions(row, feature.code) !== '-',
                      'no-permissions': getFeaturePermissions(row, feature.code) === '-'
                    }"
                    @click="openPermissionDialog(row.departmentId, feature)"
                  >
                    {{ getFeaturePermissions(row, feature.code) }}
                  </span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- データなしの場合 -->
        <div v-else-if="!loading" class="no-data">
          <el-empty description="表示するデータがありません" />
        </div>
      </div>
    </el-card>

    <!-- 権限編集ダイアログ -->
    <el-dialog
      v-model="showPermissionDialog"
      :title="`権限設定: ${selectedDepartmentName} - ${selectedFeature?.name}`"
      width="500px"
    >
      <div class="permission-editor">
        <h4>{{ selectedFeature?.name }} ({{ selectedFeature?.code }})</h4>
        <div class="permission-checkboxes">
          <el-checkbox
            v-model="editingPermissions.canView"
            label="閲覧 (V)"
            border
          />
          <el-checkbox
            v-model="editingPermissions.canCreate"
            label="作成 (C)"
            border
          />
          <el-checkbox
            v-model="editingPermissions.canEdit"
            label="編集 (E)"
            border
          />
          <el-checkbox
            v-model="editingPermissions.canDelete"
            label="削除 (D)"
            border
          />
          <el-checkbox
            v-model="editingPermissions.canApprove"
            label="承認 (A)"
            border
          />
          <el-checkbox
            v-model="editingPermissions.canExport"
            label="出力 (X)"
            border
          />
        </div>
        <div class="inherit-setting">
          <el-checkbox
            v-model="editingPermissions.inheritFromParent"
            label="親部署から権限を継承する"
          />
        </div>
      </div>

      <template #footer>
        <el-button
          @click="closePermissionDialog"
        >
          キャンセル
        </el-button>
        <el-button
          type="primary"
          @click="savePermission"
          :loading="savingPermission"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 権限テンプレート管理ダイアログ -->
    <el-dialog
      v-model="showTemplateDialog"
      title="権限テンプレート管理"
      width="800px"
      :destroy-on-close="true"
    >
      <div class="template-management">
        <!-- テンプレート一覧 -->
        <div class="template-list">
          <div class="template-header">
            <h4>保存済みテンプレート</h4>
            <el-button
              type="primary"
              size="small"
              @click="showCreateTemplateDialog = true"
            >
              新規作成
            </el-button>
          </div>

          <el-table
            :data="templates"
            v-loading="loadingTemplates"
          >
            <el-table-column prop="name" label="テンプレート名" />
            <el-table-column prop="description" label="説明" />
            <el-table-column prop="category" label="カテゴリ" width="100" />
            <el-table-column label="操作" width="180" align="center">
              <template #default="{ row }">
                <el-button
                  size="small"
                  @click="applyTemplate(row)"
                  :disabled="filterForm.departmentIds.length === 0"
                >
                  適用
                </el-button>
                <el-button
                  v-if="!row.isPreset"
                  size="small"
                  type="danger"
                  @click="deleteTemplate(row)"
                >
                  削除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button
          @click="closeTemplateDialog"
        >
          閉じる
        </el-button>
      </template>
    </el-dialog>

    <!-- テンプレート作成ダイアログ -->
    <el-dialog
      v-model="showCreateTemplateDialog"
      title="権限テンプレート作成"
      width="600px"
      :destroy-on-close="true"
    >
      <div class="create-template">
        <el-form :model="newTemplate" label-width="120px">
          <el-form-item label="テンプレート名" required>
            <el-input
              v-model="newTemplate.name"
              placeholder="テンプレート名を入力"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="説明">
            <el-input
              v-model="newTemplate.description"
              type="textarea"
              placeholder="テンプレートの説明を入力"
              :rows="3"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="カテゴリ">
            <el-select v-model="newTemplate.category" placeholder="カテゴリを選択">
              <el-option label="管理者" value="ADMIN" />
              <el-option label="マネージャー" value="MANAGER" />
              <el-option label="一般ユーザー" value="USER" />
              <el-option label="読み取り専用" value="READONLY" />
              <el-option label="カスタム" value="CUSTOM" />
            </el-select>
          </el-form-item>
          <el-form-item label="参照部署">
            <el-select
              v-model="templateSourceDepartment"
              placeholder="権限をコピーする部署を選択"
              @change="loadSourcePermissions"
            >
              <el-option
                v-for="dept in departments"
                :key="dept.id"
                :label="getDisplayName(dept)"
                :value="dept.id"
              />
            </el-select>
          </el-form-item>

          <div v-if="sourcePermissions.length > 0" class="permission-preview">
            <h5>設定される権限プレビュー</h5>
            <div class="permission-grid">
              <div
                v-for="perm in sourcePermissions"
                :key="perm.featureCode"
                class="permission-item"
              >
                <div class="feature-name">{{ perm.featureName }}</div>
                <div class="permission-badges">
                  <el-tag v-if="perm.permissions.canView" size="small">V</el-tag>
                  <el-tag v-if="perm.permissions.canCreate" size="small">C</el-tag>
                  <el-tag v-if="perm.permissions.canEdit" size="small">E</el-tag>
                  <el-tag v-if="perm.permissions.canDelete" size="small">D</el-tag>
                  <el-tag v-if="perm.permissions.canApprove" size="small">A</el-tag>
                  <el-tag v-if="perm.permissions.canExport" size="small">X</el-tag>
                </div>
              </div>
            </div>
          </div>
        </el-form>
      </div>

      <template #footer>
        <el-button
          @click="closeCreateTemplateDialog"
        >
          キャンセル
        </el-button>
        <el-button
          type="primary"
          @click="createTemplate"
          :loading="creatingTemplate"
          :disabled="!newTemplate.name || sourcePermissions.length === 0"
        >
          作成
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElLoading, ElEmpty, ElDialog, ElCheckbox, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElTag } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
// Element Plus components are auto-imported
import { permissionAPI, type PermissionTemplate } from '@/api/permissions'
import { departmentAPI } from '@/api/departments'
import { featureAPI } from '@/api/features'

// リアクティブデータ
const loading = ref(false)
const saving = ref(false)
const savingPermission = ref(false)
const showPermissionDialog = ref(false)
const showTemplateDialog = ref(false)
const showCreateTemplateDialog = ref(false)
const loadingTemplates = ref(false)
const creatingTemplate = ref(false)

const departments = ref([])
const categories = ref([])
const features = ref([])
const matrixData = ref([])
const legend = ref({})
const permissionChanges = ref(new Map())
const templates = ref<PermissionTemplate[]>([])
const sourcePermissions = ref([])
const templateSourceDepartment = ref(null)

// フィルターフォーム
const filterForm = reactive({
  departmentIds: [],
  category: ''
})

// 権限編集ダイアログ
const selectedDepartmentId = ref(null)
const selectedDepartmentName = ref('')
const selectedFeature = ref(null)
const editingPermissions = reactive({
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canExport: false,
  inheritFromParent: true
})

// テンプレート作成フォーム
const newTemplate = reactive({
  name: '',
  description: '',
  category: 'CUSTOM'
})

// 計算プロパティ
const visibleFeatures = computed(() => {
  if (!filterForm.category) {
    return features.value
  }
  return features.value.filter(f => f.category === filterForm.category)
})

// ライフサイクル
onMounted(() => {
  loadInitialData()
})

// メソッド
async function loadInitialData() {
  try {
    loading.value = true

    // 会社IDは現在のユーザーの会社から取得（実際の実装では認証情報から取得）
    const companyId = 1

    const [deptResponse, categoryResponse, featureResponse] = await Promise.all([
      departmentAPI.getDepartmentTree({ companyId }),
      featureAPI.getCategories(),
      featureAPI.getFeatures({ isActive: true })
    ])

    departments.value = flattenDepartments(deptResponse.data.tree)
    categories.value = categoryResponse.data.categories
    features.value = featureResponse.data.features

    // 初期表示用に最初の数部署を選択
    if (departments.value.length > 0) {
      filterForm.departmentIds = departments.value.slice(0, Math.min(5, departments.value.length)).map(d => d.id)
    }

    await loadPermissionMatrix()
  } catch (error) {
    console.error('初期データの読み込みに失敗しました:', error)
    ElMessage.error('初期データの読み込みに失敗しました')
  } finally {
    loading.value = false
  }
}

async function loadPermissionMatrix() {
  if (filterForm.departmentIds.length === 0) {
    ElMessage.warning('部署を選択してください')
    return
  }

  try {
    loading.value = true

    const companyId = 1
    const response = await permissionAPI.getPermissionMatrix(companyId, filterForm.departmentIds)

    matrixData.value = response.data.matrix
    legend.value = response.data.legend

    // 変更をクリア
    permissionChanges.value.clear()
  } catch (error) {
    console.error('権限マトリクスの取得に失敗しました:', error)
    ElMessage.error('権限マトリクスの取得に失敗しました')
  } finally {
    loading.value = false
  }
}

function flattenDepartments(tree: any[], result: any[] = []): any[] {
  tree.forEach(dept => {
    result.push(dept)
    if (dept.children && dept.children.length > 0) {
      flattenDepartments(dept.children, result)
    }
  })
  return result
}

function getDisplayName(dept: any): string {
  const indent = '　'.repeat(dept.level - 1)
  return `${indent}${dept.name} (${dept.code})`
}

function getFeaturePermissions(row: any, featureCode: string): string {
  const feature = row.features.find(f => f.featureCode === featureCode)
  return feature?.permissions || '-'
}

async function openPermissionDialog(departmentId: number, feature: any) {
  try {
    selectedDepartmentId.value = departmentId
    selectedFeature.value = feature

    const dept = departments.value.find(d => d.id === departmentId)
    selectedDepartmentName.value = dept?.name || ''

    // 現在の権限設定を取得
    const response = await permissionAPI.getDepartmentPermissions(departmentId)
    const permissions = response.data.permissions.find(p => p.featureCode === feature.code)

    if (permissions) {
      Object.assign(editingPermissions, {
        canView: permissions.permissions.canView,
        canCreate: permissions.permissions.canCreate,
        canEdit: permissions.permissions.canEdit,
        canDelete: permissions.permissions.canDelete,
        canApprove: permissions.permissions.canApprove,
        canExport: permissions.permissions.canExport,
        inheritFromParent: permissions.inheritFromParent
      })
    } else {
      // デフォルト値
      Object.assign(editingPermissions, {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canExport: false,
        inheritFromParent: true
      })
    }

    showPermissionDialog.value = true
  } catch (error) {
    console.error('権限情報の取得に失敗しました:', error)
    ElMessage.error('権限情報の取得に失敗しました')
  }
}

function closePermissionDialog() {
  showPermissionDialog.value = false
  selectedDepartmentId.value = null
  selectedFeature.value = null
  selectedDepartmentName.value = ''
}

async function savePermission() {
  try {
    savingPermission.value = true

    const updateData = {
      permissions: [{
        featureId: selectedFeature.value.id,
        canView: editingPermissions.canView,
        canCreate: editingPermissions.canCreate,
        canEdit: editingPermissions.canEdit,
        canDelete: editingPermissions.canDelete,
        canApprove: editingPermissions.canApprove,
        canExport: editingPermissions.canExport,
        inheritFromParent: editingPermissions.inheritFromParent
      }]
    }

    await permissionAPI.updateDepartmentPermissions(selectedDepartmentId.value, updateData)

    ElMessage.success('権限を更新しました')
    closePermissionDialog()

    // マトリクスを再読み込み
    await loadPermissionMatrix()
  } catch (error) {
    console.error('権限の更新に失敗しました:', error)
    ElMessage.error('権限の更新に失敗しました')
  } finally {
    savingPermission.value = false
  }
}

async function handleSaveAll() {
  if (permissionChanges.value.size === 0) {
    ElMessage.info('変更がありません')
    return
  }

  try {
    saving.value = true

    // 変更された権限を一括更新
    for (const [departmentId, changes] of permissionChanges.value) {
      await permissionAPI.updateDepartmentPermissions(departmentId, { permissions: changes })
    }

    ElMessage.success('全ての変更を保存しました')
    permissionChanges.value.clear()
    await loadPermissionMatrix()
  } catch (error) {
    console.error('一括保存に失敗しました:', error)
    ElMessage.error('一括保存に失敗しました')
  } finally {
    saving.value = false
  }
}

function handleExport() {
  // CSV出力の実装
  const csvContent = generateCSV()
  downloadCSV(csvContent, 'permission_matrix.csv')
}

function generateCSV(): string {
  const headers = ['部署名', ...visibleFeatures.value.map(f => f.name)]
  const rows = [headers.join(',')]

  matrixData.value.forEach(row => {
    const rowData = [
      row.departmentName,
      ...visibleFeatures.value.map(feature =>
        getFeaturePermissions(row, feature.code)
      )
    ]
    rows.push(rowData.join(','))
  })

  return rows.join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// テンプレート管理機能
async function loadTemplates() {
  try {
    loadingTemplates.value = true
    const companyId = 1 // 実際の実装では認証情報から取得
    const response = await permissionAPI.getPermissionTemplates(companyId)
    templates.value = response.data
  } catch (error) {
    console.error('テンプレート一覧の取得に失敗しました:', error)
    ElMessage.error('テンプレート一覧の取得に失敗しました')
  } finally {
    loadingTemplates.value = false
  }
}

function closeTemplateDialog() {
  showTemplateDialog.value = false
}

function closeCreateTemplateDialog() {
  showCreateTemplateDialog.value = false
  newTemplate.name = ''
  newTemplate.description = ''
  newTemplate.category = 'CUSTOM'
  templateSourceDepartment.value = null
  sourcePermissions.value = []
}

async function loadSourcePermissions() {
  if (!templateSourceDepartment.value) {
    sourcePermissions.value = []
    return
  }

  try {
    const response = await permissionAPI.getDepartmentPermissions(templateSourceDepartment.value)
    sourcePermissions.value = response.data.permissions.filter(p =>
      p.permissions.canView || p.permissions.canCreate || p.permissions.canEdit ||
      p.permissions.canDelete || p.permissions.canApprove || p.permissions.canExport
    )
  } catch (error) {
    console.error('部署権限の取得に失敗しました:', error)
    ElMessage.error('部署権限の取得に失敗しました')
  }
}

async function createTemplate() {
  if (!newTemplate.name || sourcePermissions.value.length === 0) {
    ElMessage.warning('テンプレート名と参照部署を選択してください')
    return
  }

  try {
    creatingTemplate.value = true

    const templateData = {
      companyId: 1, // 実際の実装では認証情報から取得
      name: newTemplate.name,
      description: newTemplate.description,
      category: newTemplate.category,
      features: sourcePermissions.value.map(perm => ({
        featureId: perm.featureId,
        permissions: perm.permissions
      }))
    }

    await permissionAPI.createPermissionTemplate(templateData)
    ElMessage.success('テンプレートを作成しました')

    closeCreateTemplateDialog()
    await loadTemplates()
  } catch (error) {
    console.error('テンプレート作成に失敗しました:', error)
    ElMessage.error('テンプレート作成に失敗しました')
  } finally {
    creatingTemplate.value = false
  }
}

async function applyTemplate(template: PermissionTemplate) {
  if (filterForm.departmentIds.length === 0) {
    ElMessage.warning('適用対象の部署を選択してください')
    return
  }

  try {
    await ElMessageBox.confirm(
      `テンプレート「${template.name}」を選択された${filterForm.departmentIds.length}個の部署に適用しますか？`,
      'テンプレート適用確認',
      {
        confirmButtonText: '適用',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    )

    const applyData = {
      departmentIds: filterForm.departmentIds
    }

    await permissionAPI.applyPermissionTemplate(template.id, applyData)
    ElMessage.success(`テンプレート「${template.name}」を適用しました`)

    // マトリクスを再読み込み
    await loadPermissionMatrix()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('テンプレート適用に失敗しました:', error)
      ElMessage.error('テンプレート適用に失敗しました')
    }
  }
}

async function deleteTemplate(template: PermissionTemplate) {
  try {
    await ElMessageBox.confirm(
      `テンプレート「${template.name}」を削除しますか？この操作は取り消せません。`,
      '削除確認',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    )

    await permissionAPI.deletePermissionTemplate(template.id)
    ElMessage.success('テンプレートを削除しました')

    await loadTemplates()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('テンプレート削除に失敗しました:', error)
      ElMessage.error('テンプレート削除に失敗しました')
    }
  }
}

// テンプレートダイアログが開かれたときの処理
async function openTemplateDialog() {
  showTemplateDialog.value = true
  await loadTemplates()
}
</script>

<style scoped>
.permission-matrix {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.page-description {
  color: var(--el-text-color-secondary);
  margin-top: 8px;
  margin-bottom: 0;
}

.filter-section {
  margin-bottom: 24px;
}

.filter-form {
  width: 100%;
}

.matrix-container {
  min-height: 400px;
}

.legend-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--el-bg-color-page);
  border-radius: 4px;
}

.legend-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.matrix-table {
  overflow-x: auto;
}

.feature-header {
  text-align: center;
}

.feature-name {
  font-weight: 600;
  font-size: 12px;
  line-height: 1.2;
}

.feature-code {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.permission-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
}

.permission-display {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 40px;
  text-align: center;
  font-family: monospace;
  font-weight: 600;
}

.permission-display.has-permissions {
  background-color: var(--el-color-success-light-8);
  color: var(--el-color-success);
  border: 1px solid var(--el-color-success-light-5);
}

.permission-display.no-permissions {
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color-light);
}

.permission-display:hover {
  background-color: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}

.no-data {
  padding: 40px;
  text-align: center;
}

.permission-editor h4 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
}

.permission-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.inherit-setting {
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-light);
}

.text-right {
  text-align: right;
}

@media (max-width: 768px) {
  .permission-matrix {
    padding: 16px;
  }

  .page-title {
    font-size: 20px;
  }

  .text-right {
    text-align: left;
    margin-top: 16px;
  }

  .legend-items {
    flex-direction: column;
    gap: 8px;
  }

  .permission-checkboxes {
    grid-template-columns: 1fr;
  }
}

/* テンプレート管理のスタイル */
.template-management {
  min-height: 400px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.template-header h4 {
  margin: 0;
  font-size: 16px;
}

.create-template {
  max-height: 600px;
  overflow-y: auto;
}

.permission-preview {
  margin-top: 20px;
  padding: 16px;
  background-color: var(--el-bg-color-page);
  border-radius: 4px;
}

.permission-preview h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.permission-item {
  padding: 8px 12px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-light);
}

.feature-name {
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 4px;
}

.permission-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .permission-grid {
    grid-template-columns: 1fr;
  }

  .template-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>