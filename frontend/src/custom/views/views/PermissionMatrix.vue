<template>
  <div class="permission-matrix">
    <!-- ページヘッダー -->
    <PermissionMatrixHeader
      :saving="saving"
      @save-all="handleSaveAll"
    />

    <!-- フィルター・検索 -->
    <PermissionRolePanel
      :departments="departments"
      :categories="categories"
      :initial-filter="filterForm"
      :loading="loading"
      @filter-change="onFilterChange"
      @refresh="loadPermissionMatrix"
      @export="showExportDialog = true"
      @open-template-dialog="showTemplateDialog = true"
    />

    <!-- 権限マトリクス表示 -->
    <PermissionMatrixGrid
      :loading="loading"
      :matrix-data="matrixData"
      :visible-features="visibleFeatures"
      :legend="legend"
      @edit-permission="openPermissionDialog"
    />

    <!-- 権限監査履歴 -->
    <PermissionAuditPanel
      v-if="showAuditPanel"
      :audit-logs="auditLogs"
      :departments="departments"
      :loading="loadingAudit"
      :total="auditTotal"
      :current-page="auditPage"
      :page-size="auditPageSize"
      @refresh="loadAuditLogs"
      @date-range-change="onAuditDateRangeChange"
      @department-change="onAuditDepartmentChange"
      @page-change="onAuditPageChange"
      @page-size-change="onAuditPageSizeChange"
    />

    <!-- 権限編集ダイアログ -->
    <PermissionUserPanel
      :visible="showPermissionDialog"
      :department-id="selectedDepartmentId"
      :department-name="selectedDepartmentName"
      :feature="selectedFeature"
      :permissions="editingPermissions"
      :saving="savingPermission"
      @close="closePermissionDialog"
      @closed="closePermissionDialog"
      @save="savePermission"
    />

    <!-- 権限テンプレート管理ダイアログ -->
    <PermissionTemplatePanel
      :visible="showTemplateDialog"
      :templates="templates"
      :loading="loadingTemplates"
      :can-apply-template="filterForm.departmentIds.length > 0"
      @close="closeTemplateDialog"
      @closed="closeTemplateDialog"
      @create-template="showCreateTemplateDialog = true"
      @apply-template="applyTemplate"
      @delete-template="deleteTemplate"
    />

    <!-- テンプレート作成ダイアログ -->
    <PermissionInheritancePanel
      :visible="showCreateTemplateDialog"
      :departments="departments"
      :source-permissions="sourcePermissions"
      :creating="creatingTemplate"
      @close="closeCreateTemplateDialog"
      @closed="closeCreateTemplateDialog"
      @create="createTemplate"
      @source-department-change="loadSourcePermissions"
    />

    <!-- エクスポートダイアログ -->
    <PermissionExportDialog
      :visible="showExportDialog"
      :current-filter="filterForm"
      :exporting="exportingData"
      @close="showExportDialog = false"
      @closed="showExportDialog = false"
      @export="handleExport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// マイクロコンポーネントのインポート
import PermissionMatrixHeader from '@core/components/permissions/PermissionMatrixHeader.vue'
import PermissionRolePanel from '@core/components/permissions/PermissionRolePanel.vue'
import PermissionMatrixGrid from '@core/components/permissions/PermissionMatrixGrid.vue'
import PermissionUserPanel from '@core/components/permissions/PermissionUserPanel.vue'
import PermissionTemplatePanel from '@core/components/permissions/PermissionTemplatePanel.vue'
import PermissionInheritancePanel from '@core/components/permissions/PermissionInheritancePanel.vue'
import PermissionAuditPanel from '@core/components/permissions/PermissionAuditPanel.vue'
import PermissionExportDialog from '@core/components/permissions/PermissionExportDialog.vue'

// API・型のインポート
import { permissionAPI, type PermissionTemplate } from '@core/api/permissions'
import { departmentAPI } from '@custom/api/departments'
import { featureAPI } from '@custom/api/features'
import type {
  PermissionMatrixData,
  Feature,
  Department,
  Category,
  Legend,
  PermissionFilter,
  PermissionSet,
  FeaturePermission
} from '@/types/permissions'

// リアクティブデータ
const loading = ref(false)
const saving = ref(false)
const savingPermission = ref(false)
const loadingTemplates = ref(false)
const creatingTemplate = ref(false)
const loadingAudit = ref(false)
const exportingData = ref(false)

// ダイアログ表示状態
const showPermissionDialog = ref(false)
const showTemplateDialog = ref(false)
const showCreateTemplateDialog = ref(false)
const showExportDialog = ref(false)
const showAuditPanel = ref(true)

// データ
const departments = ref<Department[]>([])
const categories = ref<Category[]>([])
const features = ref<Feature[]>([])
const matrixData = ref<PermissionMatrixData[]>([])
const legend = ref<Legend>({})
const templates = ref<PermissionTemplate[]>([])
const sourcePermissions = ref<FeaturePermission[]>([])
const auditLogs = ref([])

// フィルター
const filterForm = reactive<PermissionFilter>({
  departmentIds: [],
  category: ''
})

// 権限編集
const selectedDepartmentId = ref<number | null>(null)
const selectedDepartmentName = ref('')
const selectedFeature = ref<Feature | null>(null)
const editingPermissions = ref<PermissionSet & { inheritFromParent: boolean }>({
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canExport: false,
  inheritFromParent: true
})

// 監査ログ
const auditTotal = ref(0)
const auditPage = ref(1)
const auditPageSize = ref(20)

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
  } catch (error) {
    console.error('権限マトリクスの取得に失敗しました:', error)
    ElMessage.error('権限マトリクスの取得に失敗しました')
  } finally {
    loading.value = false
  }
}

function flattenDepartments(tree: Department[], result: Department[] = []): Department[] {
  tree.forEach(dept => {
    result.push(dept)
    if (dept.children && dept.children.length > 0) {
      flattenDepartments(dept.children, result)
    }
  })
  return result
}

// イベントハンドラー
function onFilterChange(filter: PermissionFilter) {
  Object.assign(filterForm, filter)
}

async function openPermissionDialog(departmentId: number, feature: Feature) {
  try {
    selectedDepartmentId.value = departmentId
    selectedFeature.value = feature

    const dept = departments.value.find(d => d.id === departmentId)
    selectedDepartmentName.value = dept?.name || ''

    const response = await permissionAPI.getDepartmentPermissions(departmentId)
    const permissions = response.data.permissions.find(p => p.featureCode === feature.code)

    if (permissions) {
      const perms = typeof permissions.permissions === 'string' ?
        parsePermissionString(permissions.permissions) : permissions.permissions

      editingPermissions.value = {
        ...perms,
        inheritFromParent: permissions.inheritFromParent || false
      }
    } else {
      editingPermissions.value = {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canExport: false,
        inheritFromParent: true
      }
    }

    showPermissionDialog.value = true
  } catch (error) {
    console.error('権限情報の取得に失敗しました:', error)
    ElMessage.error('権限情報の取得に失敗しました')
  }
}

function parsePermissionString(permStr: string): PermissionSet {
  return {
    canView: permStr.includes('V'),
    canCreate: permStr.includes('C'),
    canEdit: permStr.includes('E'),
    canDelete: permStr.includes('D'),
    canApprove: permStr.includes('A'),
    canExport: permStr.includes('X')
  }
}

function closePermissionDialog() {
  showPermissionDialog.value = false
  selectedDepartmentId.value = null
  selectedFeature.value = null
  selectedDepartmentName.value = ''
}

async function savePermission(data: { departmentId: number; featureId: number; permissions: PermissionSet & { inheritFromParent: boolean } }) {
  try {
    savingPermission.value = true

    const updateData = {
      permissions: [{
        featureId: data.featureId,
        ...data.permissions
      }]
    }

    await permissionAPI.updateDepartmentPermissions(data.departmentId, updateData)
    ElMessage.success('権限を更新しました')
    closePermissionDialog()
    await loadPermissionMatrix()
  } catch (error) {
    console.error('権限の更新に失敗しました:', error)
    ElMessage.error('権限の更新に失敗しました')
  } finally {
    savingPermission.value = false
  }
}

async function handleSaveAll() {
  ElMessage.info('一括保存機能は準備中です')
}

// テンプレート管理
async function loadTemplates() {
  try {
    loadingTemplates.value = true
    const companyId = 1
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
  sourcePermissions.value = []
}

async function loadSourcePermissions(departmentId: number) {
  if (!departmentId) {
    sourcePermissions.value = []
    return
  }

  try {
    const response = await permissionAPI.getDepartmentPermissions(departmentId)
    sourcePermissions.value = response.data.permissions.filter(p => {
      const perms = typeof p.permissions === 'string' ?
        parsePermissionString(p.permissions) : p.permissions
      return perms.canView || perms.canCreate || perms.canEdit ||
             perms.canDelete || perms.canApprove || perms.canExport
    })
  } catch (error) {
    console.error('部署権限の取得に失敗しました:', error)
    ElMessage.error('部署権限の取得に失敗しました')
  }
}

async function createTemplate(data: any) {
  try {
    creatingTemplate.value = true

    const templateData = {
      companyId: 1,
      name: data.name,
      description: data.description,
      category: data.category,
      features: data.permissions.map((perm: FeaturePermission) => ({
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
      { type: 'warning' }
    )

    const applyData = { departmentIds: filterForm.departmentIds }
    await permissionAPI.applyPermissionTemplate(template.id, applyData)
    ElMessage.success(`テンプレート「${template.name}」を適用しました`)
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
      `テンプレート「${template.name}」を削除しますか？`,
      '削除確認',
      { type: 'warning' }
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

// 監査ログ関連
async function loadAuditLogs() {
  // 監査ログの実装は省略（別途実装）
  console.log('監査ログ読み込み')
}

function onAuditDateRangeChange(dateRange: string[] | null) {
  // 実装
}

function onAuditDepartmentChange(departmentId: number | null) {
  // 実装
}

function onAuditPageChange(page: number) {
  auditPage.value = page
  loadAuditLogs()
}

function onAuditPageSizeChange(size: number) {
  auditPageSize.value = size
  loadAuditLogs()
}

// エクスポート関連
async function handleExport(options: any) {
  try {
    exportingData.value = true

    // CSV出力の実装
    const csvContent = generateCSV()
    downloadFile(csvContent, 'permission_matrix.csv', 'text/csv')

    ElMessage.success('エクスポートが完了しました')
    showExportDialog.value = false
  } catch (error) {
    console.error('エクスポートに失敗しました:', error)
    ElMessage.error('エクスポートに失敗しました')
  } finally {
    exportingData.value = false
  }
}

function generateCSV(): string {
  const headers = ['部署名', ...visibleFeatures.value.map(f => f.name)]
  const rows = [headers.join(',')]

  matrixData.value.forEach(row => {
    const rowData = [
      row.departmentName,
      ...visibleFeatures.value.map(feature => {
        const featureData = row.features.find(f => f.featureCode === feature.code)
        return featureData?.permissions || '-'
      })
    ]
    rows.push(rowData.join(','))
  })

  return rows.join('\n')
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` })
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

// テンプレートダイアログが開かれたときの処理
watch(showTemplateDialog, async (visible) => {
  if (visible) {
    await loadTemplates()
  }
})
</script>

<style scoped>
.permission-matrix {
  padding: 24px;
}

@media (max-width: 768px) {
  .permission-matrix {
    padding: 16px;
  }
}
</style>