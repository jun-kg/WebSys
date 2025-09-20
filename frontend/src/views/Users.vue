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
        <el-form-item label="ユーザー名">
          <el-input v-model="searchForm.username" placeholder="検索..." clearable />
        </el-form-item>
        <el-form-item label="部署">
          <el-select v-model="searchForm.department" placeholder="選択" clearable>
            <el-option label="営業部" value="sales" />
            <el-option label="開発部" value="development" />
            <el-option label="人事部" value="hr" />
            <el-option label="経理部" value="accounting" />
          </el-select>
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
        <el-table-column prop="department" label="部署" width="120">
          <template #default="scope">
            <el-tag>{{ getDepartmentLabel(scope.row.department) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="role" label="権限" width="120">
          <template #default="scope">
            <el-tag :type="getRoleType(scope.row.role)">
              {{ getRoleLabel(scope.row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状態" width="100">
          <template #default="scope">
            <el-switch
              v-model="scope.row.status"
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
        <el-form-item label="部署" prop="department">
          <el-select v-model="userForm.department" style="width: 100%">
            <el-option label="営業部" value="sales" />
            <el-option label="開発部" value="development" />
            <el-option label="人事部" value="hr" />
            <el-option label="経理部" value="accounting" />
          </el-select>
        </el-form-item>
        <el-form-item label="権限" prop="role">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="管理者" value="admin" />
            <el-option label="一般ユーザー" value="user" />
            <el-option label="ゲスト" value="guest" />
          </el-select>
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
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Search, Refresh, Edit, Delete } from '@element-plus/icons-vue'
// import { CommonButton, CommonCard, CommonTable, CommonTag, CommonTableColumn, CommonForm, CommonFormItem, CommonInput, CommonSelect, CommonOption, CommonSwitch } from '@company/shared-components'

interface User {
  id: number
  username: string
  name: string
  email: string
  department: string
  role: string
  status: boolean
}

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(40)
const dialogVisible = ref(false)
const dialogTitle = computed(() => userForm.id ? 'ユーザー編集' : '新規ユーザー')
const userFormRef = ref<FormInstance>()

const searchForm = reactive({
  username: '',
  department: ''
})

const userForm = reactive({
  id: 0,
  username: '',
  name: '',
  email: '',
  department: '',
  role: 'user'
})

const userRules = reactive<FormRules>({
  username: [
    { required: true, message: 'ユーザー名を入力してください', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '氏名を入力してください', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'メールアドレスを入力してください', trigger: 'blur' },
    { type: 'email', message: '正しいメールアドレスを入力してください', trigger: 'blur' }
  ],
  department: [
    { required: true, message: '部署を選択してください', trigger: 'change' }
  ],
  role: [
    { required: true, message: '権限を選択してください', trigger: 'change' }
  ]
})

const tableData = ref<User[]>([
  {
    id: 1,
    username: 'tanaka',
    name: '田中太郎',
    email: 'tanaka@example.com',
    department: 'development',
    role: 'admin',
    status: true
  },
  {
    id: 2,
    username: 'yamada',
    name: '山田花子',
    email: 'yamada@example.com',
    department: 'sales',
    role: 'user',
    status: true
  },
  {
    id: 3,
    username: 'suzuki',
    name: '鈴木一郎',
    email: 'suzuki@example.com',
    department: 'hr',
    role: 'user',
    status: true
  },
  {
    id: 4,
    username: 'sato',
    name: '佐藤美咲',
    email: 'sato@example.com',
    department: 'accounting',
    role: 'user',
    status: false
  }
])

const getDepartmentLabel = (dept: string) => {
  const map: Record<string, string> = {
    sales: '営業部',
    development: '開発部',
    hr: '人事部',
    accounting: '経理部'
  }
  return map[dept] || dept
}

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = {
    admin: '管理者',
    user: '一般',
    guest: 'ゲスト'
  }
  return map[role] || role
}

const getRoleType = (role: string) => {
  const map: Record<string, string> = {
    admin: 'danger',
    user: '',
    guest: 'info'
  }
  return map[role] || ''
}

const handleSearch = () => {
  loading.value = true
  setTimeout(() => {
    ElMessage.success('検索完了')
    loading.value = false
  }, 500)
}

const handleReset = () => {
  searchForm.username = ''
  searchForm.department = ''
}

const handleAdd = () => {
  Object.assign(userForm, {
    id: 0,
    username: '',
    name: '',
    email: '',
    department: '',
    role: 'user'
  })
  dialogVisible.value = true
}

const handleEdit = (row: User) => {
  Object.assign(userForm, row)
  dialogVisible.value = true
}

const handleDelete = (row: User) => {
  ElMessageBox.confirm(
    `ユーザー「${row.name}」を削除してもよろしいですか？`,
    '確認',
    {
      confirmButtonText: '削除',
      cancelButtonText: 'キャンセル',
      type: 'warning'
    }
  ).then(() => {
    ElMessage.success('削除しました')
  }).catch(() => {
    ElMessage.info('キャンセルしました')
  })
}

const handleSave = async () => {
  if (!userFormRef.value) return

  await userFormRef.value.validate((valid) => {
    if (valid) {
      ElMessage.success(userForm.id ? '更新しました' : '追加しました')
      dialogVisible.value = false
    }
  })
}

const handleStatusChange = (row: User) => {
  ElMessage.success(`${row.name}の状態を${row.status ? '有効' : '無効'}に変更しました`)
}

const handleSizeChange = (val: number) => {
  console.log(`${val} items per page`)
}

const handleCurrentChange = (val: number) => {
  console.log(`current page: ${val}`)
}
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