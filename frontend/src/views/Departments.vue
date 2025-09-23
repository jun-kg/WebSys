<template>
  <div class="departments-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>部署管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新規追加
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="会社">
          <el-select
            v-model="searchForm.companyId"
            placeholder="会社を選択"
            clearable
            style="width: 200px"
            @change="handleCompanyChange"
          >
            <el-option
              v-for="company in companies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="検索">
          <el-input
            v-model="searchForm.search"
            placeholder="部署名、コード、会社名で検索..."
            clearable
            style="width: 300px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            検索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            リセット
          </el-button>
        </el-form-item>
      </el-form>

      <el-table
        :data="tableData"
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="code" label="部署コード" width="120" />
        <el-table-column prop="name" label="部署名" width="200" />
        <el-table-column label="会社" width="200">
          <template #default="scope">
            <span>{{ scope.row.company?.name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="ユーザー数" width="100">
          <template #default="scope">
            <el-tag type="info">{{ scope.row._count?.primaryUsers || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状態" width="100">
          <template #default="scope">
            <el-switch
              v-model="scope.row.isActive"
              active-text="有効"
              inactive-text="無効"
              @change="handleStatusChange(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="scope">
            <el-button size="small" @click="handleEdit(scope.row)">
              <el-icon><Edit /></el-icon>
              編集
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">
              <el-icon><Delete /></el-icon>
              削除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        style="margin-top: 20px"
      />
    </el-card>

    <!-- Department Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form :model="departmentForm" :rules="departmentRules" ref="departmentFormRef" label-width="100px">
        <el-form-item label="会社" prop="companyId">
          <el-select v-model="departmentForm.companyId" placeholder="会社を選択" style="width: 100%">
            <el-option
              v-for="company in companies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部署コード" prop="code">
          <el-input v-model="departmentForm.code" placeholder="例: DEV_TEAM" />
        </el-form-item>
        <el-form-item label="部署名" prop="name">
          <el-input v-model="departmentForm.name" />
        </el-form-item>
        <el-form-item label="有効状態" v-if="departmentForm.id">
          <el-switch
            v-model="departmentForm.isActive"
            active-text="有効"
            inactive-text="無効"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">キャンセル</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Search, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import { departmentsApi, type Department } from '@/api/departments'
import { companiesApi, type Company } from '@/api/companies'

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = computed(() => departmentForm.id ? '部署編集' : '新規部署')
const departmentFormRef = ref<FormInstance>()

const searchForm = reactive({
  search: '',
  companyId: undefined as number | undefined
})

const departmentForm = reactive({
  id: 0,
  code: '',
  name: '',
  companyId: undefined as number | undefined,
  isActive: true
})

const departmentRules = reactive<FormRules>({
  companyId: [
    { required: true, message: '会社を選択してください', trigger: 'change' }
  ],
  code: [
    { required: true, message: '部署コードを入力してください', trigger: 'blur' },
    { min: 2, max: 20, message: '部署コードは2-20文字で入力してください', trigger: 'blur' },
    { pattern: /^[A-Z0-9_]+$/, message: '部署コードは大文字英数字とアンダースコアのみ使用できます', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '部署名を入力してください', trigger: 'blur' },
    { max: 100, message: '部署名は100文字以内で入力してください', trigger: 'blur' }
  ]
})

const tableData = ref<Department[]>([])
const companies = ref<Company[]>([])

// 会社一覧の取得
const fetchCompanies = async () => {
  try {
    const response = await companiesApi.getCompanies({ pageSize: 1000 })
    if (response.success && response.data) {
      companies.value = response.data.companies.filter(c => c.isActive)
    }
  } catch (error) {
    console.error('Failed to fetch companies:', error)
  }
}

// 部署一覧の取得
const fetchDepartments = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchForm.search || undefined,
      companyId: searchForm.companyId
    }
    const response = await departmentsApi.getDepartments(params)

    if (response.success && response.data) {
      tableData.value = response.data.departments
      total.value = response.data.pagination.total
    } else {
      ElMessage.error('部署一覧の取得に失敗しました')
    }
  } catch (error) {
    console.error('Failed to fetch departments:', error)
    ElMessage.error('部署一覧の取得に失敗しました')
  } finally {
    loading.value = false
  }
}

const handleCompanyChange = () => {
  currentPage.value = 1
  fetchDepartments()
}

const handleSearch = () => {
  currentPage.value = 1
  fetchDepartments()
}

const handleReset = () => {
  searchForm.search = ''
  searchForm.companyId = undefined
  currentPage.value = 1
  fetchDepartments()
}

const handleAdd = () => {
  Object.assign(departmentForm, {
    id: 0,
    code: '',
    name: '',
    companyId: undefined,
    isActive: true
  })
  dialogVisible.value = true
}

const handleEdit = (row: Department) => {
  Object.assign(departmentForm, {
    id: row.id,
    code: row.code,
    name: row.name,
    companyId: row.companyId,
    isActive: row.isActive
  })
  dialogVisible.value = true
}

const handleDelete = (row: Department) => {
  ElMessageBox.confirm(
    `部署「${row.name}」を無効化してもよろしいですか？`,
    '確認',
    {
      confirmButtonText: '無効化',
      cancelButtonText: 'キャンセル',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const response = await departmentsApi.deleteDepartment(row.id)
      if (response.success) {
        ElMessage.success('部署を無効化しました')
        await fetchDepartments()
      } else {
        ElMessage.error('部署の無効化に失敗しました')
      }
    } catch (error) {
      console.error('Delete department error:', error)
      ElMessage.error('部署の無効化に失敗しました')
    }
  }).catch(() => {
    // キャンセル時はメッセージ不要
  })
}

const handleSave = async () => {
  if (!departmentFormRef.value) return

  await departmentFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const departmentData = {
          code: departmentForm.code,
          name: departmentForm.name,
          companyId: departmentForm.companyId!
        }

        if (departmentForm.id) {
          // 更新
          const response = await departmentsApi.updateDepartment(departmentForm.id, {
            ...departmentData,
            isActive: departmentForm.isActive
          })
          if (response.success) {
            ElMessage.success('部署情報を更新しました')
          } else {
            ElMessage.error(response.error?.message || '部署更新に失敗しました')
            return
          }
        } else {
          // 新規作成
          const response = await departmentsApi.createDepartment(departmentData)
          if (response.success) {
            ElMessage.success('部署を作成しました')
          } else {
            ElMessage.error(response.error?.message || '部署作成に失敗しました')
            return
          }
        }

        dialogVisible.value = false
        await fetchDepartments()
      } catch (error: any) {
        console.error('Save department error:', error)
        ElMessage.error(error.response?.data?.error?.message || 'エラーが発生しました')
      }
    }
  })
}

const handleStatusChange = async (row: Department) => {
  try {
    const response = await departmentsApi.updateDepartment(row.id, { isActive: row.isActive })
    if (response.success) {
      ElMessage.success('部署状態を更新しました')
    } else {
      // エラー時は元の状態に戻す
      row.isActive = !row.isActive
      ElMessage.error('部署状態の更新に失敗しました')
    }
  } catch (error) {
    // エラー時は元の状態に戻す
    row.isActive = !row.isActive
    console.error('Status change error:', error)
    ElMessage.error('部署状態の更新に失敗しました')
  }
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchDepartments()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchDepartments()
}

// 初期化
onMounted(async () => {
  await Promise.all([
    fetchCompanies(),
    fetchDepartments()
  ])
})
</script>

<style scoped>
.departments-page {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}
</style>