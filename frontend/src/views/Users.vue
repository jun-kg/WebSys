<template>
  <div class="users-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>ユーザー管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新規追加
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="検索">
          <el-input
            v-model="searchForm.search"
            placeholder="ユーザー名、メール、氏名、社員番号で検索..."
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
        <el-table-column prop="username" label="ユーザー名" width="150" />
        <el-table-column prop="name" label="氏名" width="150" />
        <el-table-column prop="email" label="メール" width="200" />
        <el-table-column label="会社" width="150">
          <template #default="scope">
            <span>{{ scope.row.company?.name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="部署" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.primaryDepartment">{{ scope.row.primaryDepartment.name }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="employeeCode" label="社員番号" width="120">
          <template #default="scope">
            <span>{{ scope.row.employeeCode || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="role" label="権限" width="120">
          <template #default="scope">
            <el-tag :type="getRoleType(scope.row.role)">
              {{ getRoleLabel(scope.row.role) }}
            </el-tag>
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

    <!-- User Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="100px">
        <el-form-item label="ユーザー名" prop="username">
          <el-input v-model="userForm.username" />
        </el-form-item>
        <el-form-item label="氏名" prop="name">
          <el-input v-model="userForm.name" />
        </el-form-item>
        <el-form-item label="メール" prop="email">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="会社">
          <el-select v-model="userForm.companyId" placeholder="会社を選択" clearable style="width: 100%">
            <el-option
              v-for="company in formData.companies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部署">
          <el-select v-model="userForm.primaryDepartmentId" placeholder="部署を選択" clearable style="width: 100%">
            <el-option
              v-for="department in formData.departments.filter(d => !userForm.companyId || d.companyId === userForm.companyId)"
              :key="department.id"
              :label="department.name"
              :value="department.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="社員番号">
          <el-input v-model="userForm.employeeCode" placeholder="例: EMP001" />
        </el-form-item>
        <el-form-item label="入社日">
          <el-date-picker
            v-model="userForm.joinDate"
            type="date"
            placeholder="入社日を選択"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="権限" prop="role">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="管理者" value="ADMIN" />
            <el-option label="マネージャー" value="MANAGER" />
            <el-option label="一般ユーザー" value="USER" />
            <el-option label="ゲスト" value="GUEST" />
          </el-select>
        </el-form-item>
        <el-form-item label="有効状態" v-if="userForm.id">
          <el-switch
            v-model="userForm.isActive"
            active-text="有効"
            inactive-text="無効"
          />
        </el-form-item>
        <el-form-item label="パスワード" prop="password" v-if="!userForm.id">
          <el-input v-model="userForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="新しいパスワード" v-if="userForm.id">
          <el-input v-model="userForm.password" type="password" show-password placeholder="変更する場合のみ入力" />
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
import { usersApi, type User } from '@/api/users'
import type { CompanyDepartmentData } from '@/types/user'
// import { CommonButton, CommonCard, CommonTable, CommonTag, CommonTableColumn, CommonForm, CommonFormItem, CommonInput, CommonSelect, CommonOption, CommonSwitch } from '@company/shared-components'

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = computed(() => userForm.id ? 'ユーザー編集' : '新規ユーザー')
const userFormRef = ref<FormInstance>()

const searchForm = reactive({
  search: ''
})

const userForm = reactive({
  id: 0,
  username: '',
  name: '',
  email: '',
  password: '',
  companyId: undefined as number | undefined,
  primaryDepartmentId: undefined as number | undefined,
  employeeCode: '',
  joinDate: '',
  role: 'USER' as 'ADMIN' | 'MANAGER' | 'USER' | 'GUEST',
  isActive: true
})

const userRules = reactive<FormRules>({
  username: [
    { required: true, message: 'ユーザー名を入力してください', trigger: 'blur' },
    { min: 3, max: 50, message: 'ユーザー名は3-50文字で入力してください', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: 'ユーザー名は英数字とアンダースコアのみ使用できます', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '氏名を入力してください', trigger: 'blur' },
    { max: 100, message: '氏名は100文字以内で入力してください', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'メールアドレスを入力してください', trigger: 'blur' },
    { type: 'email', message: '正しいメールアドレスを入力してください', trigger: 'blur' }
  ],
  password: [
    {
      required: computed(() => userForm.id === 0),
      message: 'パスワードを入力してください',
      trigger: 'blur'
    },
    { min: 6, max: 128, message: 'パスワードは6-128文字で入力してください', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '権限を選択してください', trigger: 'change' }
  ]
})

const tableData = ref<User[]>([])
const formData = ref<CompanyDepartmentData['data']>({
  companies: [],
  departments: []
})

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = {
    ADMIN: '管理者',
    MANAGER: 'マネージャー',
    USER: '一般',
    GUEST: 'ゲスト'
  }
  return map[role] || role
}

const getRoleType = (role: string) => {
  const map: Record<string, string> = {
    ADMIN: 'danger',
    MANAGER: 'warning',
    USER: '',
    GUEST: 'info'
  }
  return map[role] || ''
}

// フォーム用データの取得
const fetchFormData = async () => {
  try {
    const response = await usersApi.getFormData()
    if (response.success && response.data) {
      formData.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch form data:', error)
  }
}

// ユーザー一覧の取得
const fetchUsers = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchForm.search || undefined
    }
    const response = await usersApi.getUsers(params)

    if (response.success && response.data) {
      tableData.value = response.data.users
      total.value = response.data.pagination.total
    } else {
      ElMessage.error('ユーザー一覧の取得に失敗しました')
    }
  } catch (error) {
    console.error('Failed to fetch users:', error)
    ElMessage.error('ユーザー一覧の取得に失敗しました')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchUsers()
}

const handleReset = () => {
  searchForm.search = ''
  currentPage.value = 1
  fetchUsers()
}

const handleAdd = () => {
  Object.assign(userForm, {
    id: 0,
    username: '',
    name: '',
    email: '',
    password: '',
    companyId: undefined,
    primaryDepartmentId: undefined,
    employeeCode: '',
    joinDate: '',
    role: 'USER' as const,
    isActive: true
  })
  dialogVisible.value = true
}

const handleEdit = (row: User) => {
  Object.assign(userForm, {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    password: '', // パスワードは編集時は空にする
    companyId: row.companyId,
    primaryDepartmentId: row.primaryDepartmentId,
    employeeCode: row.employeeCode || '',
    joinDate: row.joinDate ? row.joinDate.split('T')[0] : '',
    role: row.role,
    isActive: row.isActive
  })
  dialogVisible.value = true
}

const handleDelete = (row: User) => {
  ElMessageBox.confirm(
    `ユーザー「${row.name}」を無効化してもよろしいですか？`,
    '確認',
    {
      confirmButtonText: '無効化',
      cancelButtonText: 'キャンセル',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const response = await usersApi.deleteUser(row.id)
      if (response.success) {
        ElMessage.success('ユーザーを無効化しました')
        await fetchUsers()
      } else {
        ElMessage.error('ユーザーの無効化に失敗しました')
      }
    } catch (error) {
      console.error('Delete user error:', error)
      ElMessage.error('ユーザーの無効化に失敗しました')
    }
  }).catch(() => {
    // キャンセル時はメッセージ不要
  })
}

const handleSave = async () => {
  if (!userFormRef.value) return

  await userFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const userData = {
          username: userForm.username,
          name: userForm.name,
          email: userForm.email,
          companyId: userForm.companyId || undefined,
          primaryDepartmentId: userForm.primaryDepartmentId || undefined,
          employeeCode: userForm.employeeCode || undefined,
          joinDate: userForm.joinDate || undefined,
          role: userForm.role,
          ...(userForm.password && { password: userForm.password })
        }

        if (userForm.id) {
          // 更新
          const response = await usersApi.updateUser(userForm.id, {
            ...userData,
            isActive: userForm.isActive
          })
          if (response.success) {
            ElMessage.success('ユーザー情報を更新しました')
          } else {
            ElMessage.error(response.error?.message || 'ユーザー更新に失敗しました')
            return
          }
        } else {
          // 新規作成
          if (!userForm.password) {
            ElMessage.error('パスワードを入力してください')
            return
          }
          const response = await usersApi.createUser({
            ...userData,
            password: userForm.password
          })
          if (response.success) {
            ElMessage.success('ユーザーを作成しました')
          } else {
            ElMessage.error(response.error?.message || 'ユーザー作成に失敗しました')
            return
          }
        }

        dialogVisible.value = false
        await fetchUsers()
      } catch (error: any) {
        console.error('Save user error:', error)
        ElMessage.error(error.response?.data?.error?.message || 'エラーが発生しました')
      }
    }
  })
}

const handleStatusChange = async (row: User) => {
  try {
    const response = await usersApi.updateUser(row.id, { isActive: row.isActive })
    if (response.success) {
      ElMessage.success('ユーザー状態を更新しました')
    } else {
      // エラー時は元の状態に戻す
      row.isActive = !row.isActive
      ElMessage.error('ユーザー状態の更新に失敗しました')
    }
  } catch (error) {
    // エラー時は元の状態に戻す
    row.isActive = !row.isActive
    console.error('Status change error:', error)
    ElMessage.error('ユーザー状態の更新に失敗しました')
  }
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchUsers()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchUsers()
}

// 初期化
onMounted(async () => {
  await Promise.all([
    fetchFormData(),
    fetchUsers()
  ])
})
</script>

<style scoped>
.users-page {
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