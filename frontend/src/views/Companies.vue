<template>
  <div class="companies-page">
    <PageHeader title="会社管理" icon="Office">
      <template #actions>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新規追加
        </el-button>
      </template>
    </PageHeader>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>会社一覧</span>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="検索">
          <el-input
            v-model="searchForm.search"
            placeholder="会社名、コード、住所で検索..."
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
        <el-table-column prop="code" label="会社コード" width="120" />
        <el-table-column prop="name" label="会社名" width="200" />
        <el-table-column prop="address" label="住所" width="250">
          <template #default="scope">
            <span>{{ scope.row.address || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="電話番号" width="150">
          <template #default="scope">
            <span>{{ scope.row.phone || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="メール" width="200">
          <template #default="scope">
            <span>{{ scope.row.email || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="ユーザー数" width="100">
          <template #default="scope">
            <el-tag type="info">{{ scope.row._count?.users || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="部署数" width="100">
          <template #default="scope">
            <el-tag type="warning">{{ scope.row._count?.departments || 0 }}</el-tag>
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

    <!-- Company Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
    >
      <el-form :model="companyForm" :rules="companyRules" ref="companyFormRef" label-width="100px">
        <el-form-item label="会社コード" prop="code">
          <el-input v-model="companyForm.code" placeholder="例: ACME_001" />
        </el-form-item>
        <el-form-item label="会社名" prop="name">
          <el-input v-model="companyForm.name" />
        </el-form-item>
        <el-form-item label="住所">
          <el-input v-model="companyForm.address" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="電話番号">
          <el-input v-model="companyForm.phone" placeholder="例: 03-1234-5678" />
        </el-form-item>
        <el-form-item label="メール">
          <el-input v-model="companyForm.email" placeholder="例: info@company.com" />
        </el-form-item>
        <el-form-item label="有効状態" v-if="companyForm.id">
          <el-switch
            v-model="companyForm.isActive"
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
import { companiesApi, type Company } from '@/api/companies'
import PageHeader from '@/components/navigation/PageHeader.vue'

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = computed(() => companyForm.id ? '会社編集' : '新規会社')
const companyFormRef = ref<FormInstance>()

const searchForm = reactive({
  search: ''
})

const companyForm = reactive({
  id: 0,
  code: '',
  name: '',
  address: '',
  phone: '',
  email: '',
  isActive: true
})

const companyRules = reactive<FormRules>({
  code: [
    { required: true, message: '会社コードを入力してください', trigger: 'blur' },
    { min: 2, max: 20, message: '会社コードは2-20文字で入力してください', trigger: 'blur' },
    { pattern: /^[A-Z0-9_]+$/, message: '会社コードは大文字英数字とアンダースコアのみ使用できます', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '会社名を入力してください', trigger: 'blur' },
    { max: 100, message: '会社名は100文字以内で入力してください', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '正しいメールアドレスを入力してください', trigger: 'blur' }
  ]
})

const tableData = ref<Company[]>([])

// 会社一覧の取得
const fetchCompanies = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchForm.search || undefined
    }
    const response = await companiesApi.getCompanies(params)

    if (response.success && response.data) {
      tableData.value = response.data.companies
      total.value = response.data.pagination.total
    } else {
      ElMessage.error('会社一覧の取得に失敗しました')
    }
  } catch (error) {
    console.error('Failed to fetch companies:', error)
    ElMessage.error('会社一覧の取得に失敗しました')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchCompanies()
}

const handleReset = () => {
  searchForm.search = ''
  currentPage.value = 1
  fetchCompanies()
}

const handleAdd = () => {
  Object.assign(companyForm, {
    id: 0,
    code: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    isActive: true
  })
  dialogVisible.value = true
}

const handleEdit = (row: Company) => {
  Object.assign(companyForm, {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address || '',
    phone: row.phone || '',
    email: row.email || '',
    isActive: row.isActive
  })
  dialogVisible.value = true
}

const handleDelete = (row: Company) => {
  ElMessageBox.confirm(
    `会社「${row.name}」を無効化してもよろしいですか？`,
    '確認',
    {
      confirmButtonText: '無効化',
      cancelButtonText: 'キャンセル',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const response = await companiesApi.deleteCompany(row.id)
      if (response.success) {
        ElMessage.success('会社を無効化しました')
        await fetchCompanies()
      } else {
        ElMessage.error('会社の無効化に失敗しました')
      }
    } catch (error) {
      console.error('Delete company error:', error)
      ElMessage.error('会社の無効化に失敗しました')
    }
  }).catch(() => {
    // キャンセル時はメッセージ不要
  })
}

const handleSave = async () => {
  if (!companyFormRef.value) return

  await companyFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const companyData = {
          code: companyForm.code,
          name: companyForm.name,
          address: companyForm.address || undefined,
          phone: companyForm.phone || undefined,
          email: companyForm.email || undefined
        }

        if (companyForm.id) {
          // 更新
          const response = await companiesApi.updateCompany(companyForm.id, {
            ...companyData,
            isActive: companyForm.isActive
          })
          if (response.success) {
            ElMessage.success('会社情報を更新しました')
          } else {
            ElMessage.error(response.error?.message || '会社更新に失敗しました')
            return
          }
        } else {
          // 新規作成
          const response = await companiesApi.createCompany(companyData)
          if (response.success) {
            ElMessage.success('会社を作成しました')
          } else {
            ElMessage.error(response.error?.message || '会社作成に失敗しました')
            return
          }
        }

        dialogVisible.value = false
        await fetchCompanies()
      } catch (error: any) {
        console.error('Save company error:', error)
        ElMessage.error(error.response?.data?.error?.message || 'エラーが発生しました')
      }
    }
  })
}

const handleStatusChange = async (row: Company) => {
  try {
    const response = await companiesApi.updateCompany(row.id, { isActive: row.isActive })
    if (response.success) {
      ElMessage.success('会社状態を更新しました')
    } else {
      // エラー時は元の状態に戻す
      row.isActive = !row.isActive
      ElMessage.error('会社状態の更新に失敗しました')
    }
  } catch (error) {
    // エラー時は元の状態に戻す
    row.isActive = !row.isActive
    console.error('Status change error:', error)
    ElMessage.error('会社状態の更新に失敗しました')
  }
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchCompanies()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchCompanies()
}

// 初期化
onMounted(async () => {
  await fetchCompanies()
})
</script>

<style scoped>
.companies-page {
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