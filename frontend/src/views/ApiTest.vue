<template>
  <div class="api-test-page">
    <el-card>
      <template #header>
        <h2>API接続テスト</h2>
      </template>

      <el-divider content-position="left">1. 認証テスト</el-divider>
      <el-form :inline="true">
        <el-form-item label="ユーザー名">
          <el-input v-model="loginForm.username" placeholder="admin" />
        </el-form-item>
        <el-form-item label="パスワード">
          <el-input v-model="loginForm.password" type="password" placeholder="admin123" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="testLogin" :loading="loginLoading">ログインテスト</el-button>
        </el-form-item>
      </el-form>

      <div v-if="authResult" class="test-result">
        <h4>認証結果:</h4>
        <pre>{{ JSON.stringify(authResult, null, 2) }}</pre>
      </div>

      <el-divider content-position="left">2. ユーザー一覧取得テスト</el-divider>
      <el-button type="success" @click="testGetUsers" :loading="usersLoading" :disabled="!token">
        ユーザー一覧取得
      </el-button>

      <div v-if="usersResult" class="test-result">
        <h4>ユーザー一覧:</h4>
        <el-table :data="usersResult" style="width: 100%">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="username" label="ユーザー名" width="150" />
          <el-table-column prop="name" label="氏名" width="150" />
          <el-table-column prop="email" label="メール" width="200" />
          <el-table-column prop="department" label="部署" width="120" />
          <el-table-column prop="role" label="権限" width="100" />
          <el-table-column prop="isActive" label="状態" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.isActive ? 'success' : 'danger'">
                {{ scope.row.isActive ? '有効' : '無効' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-divider content-position="left">3. 新規ユーザー作成テスト</el-divider>
      <el-form :inline="true">
        <el-form-item label="ユーザー名">
          <el-input v-model="newUser.username" placeholder="test_user" />
        </el-form-item>
        <el-form-item label="氏名">
          <el-input v-model="newUser.name" placeholder="テストユーザー" />
        </el-form-item>
        <el-form-item label="メール">
          <el-input v-model="newUser.email" placeholder="test@example.com" />
        </el-form-item>
        <el-form-item label="パスワード">
          <el-input v-model="newUser.password" type="password" placeholder="test123" />
        </el-form-item>
        <el-form-item>
          <el-button type="warning" @click="testCreateUser" :loading="createLoading" :disabled="!token">
            ユーザー作成
          </el-button>
        </el-form-item>
      </el-form>

      <div v-if="createResult" class="test-result">
        <h4>作成結果:</h4>
        <pre>{{ JSON.stringify(createResult, null, 2) }}</pre>
      </div>

      <el-divider content-position="left">接続情報</el-divider>
      <p><strong>API Base URL:</strong> {{ apiBaseUrl }}</p>
      <p><strong>トークン:</strong> {{ token ? 'あり' : 'なし' }}</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/index'
import { getUsers, createUser, type User } from '@/api/users'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ローディング状態
const loginLoading = ref(false)
const usersLoading = ref(false)
const createLoading = ref(false)

// フォームデータ
const loginForm = reactive({
  username: 'admin',
  password: 'admin123'
})

const newUser = reactive({
  username: 'test_user',
  name: 'テストユーザー',
  email: 'test@example.com',
  password: 'test123'
})

// 結果データ
const authResult = ref<any>(null)
const usersResult = ref<User[]>([])
const createResult = ref<any>(null)
const token = ref<string>('')

// 認証テスト
const testLogin = async () => {
  loginLoading.value = true
  try {
    const response = await api.post('/api/auth/login', {
      username: loginForm.username,
      password: loginForm.password
    })

    authResult.value = response.data
    token.value = response.data.token

    // トークンをlocalStorageに保存
    localStorage.setItem('token', response.data.token)

    ElMessage.success('ログイン成功')
  } catch (error: any) {
    ElMessage.error(`ログイン失敗: ${error.response?.data?.message || error.message}`)
    authResult.value = { error: error.response?.data || error.message }
  } finally {
    loginLoading.value = false
  }
}

// ユーザー一覧取得テスト
const testGetUsers = async () => {
  usersLoading.value = true
  try {
    const users = await getUsers()
    usersResult.value = users
    ElMessage.success(`${users.length}件のユーザーを取得しました`)
  } catch (error: any) {
    ElMessage.error(`ユーザー取得失敗: ${error.response?.data?.message || error.message}`)
  } finally {
    usersLoading.value = false
  }
}

// ユーザー作成テスト
const testCreateUser = async () => {
  createLoading.value = true
  try {
    const result = await createUser({
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      department: '開発部',
      role: 'USER'
    })

    createResult.value = result
    ElMessage.success('ユーザー作成成功')

    // 作成後にユーザー一覧を更新
    if (usersResult.value.length > 0) {
      await testGetUsers()
    }
  } catch (error: any) {
    ElMessage.error(`ユーザー作成失敗: ${error.response?.data?.message || error.message}`)
    createResult.value = { error: error.response?.data || error.message }
  } finally {
    createLoading.value = false
  }
}
</script>

<style scoped>
.api-test-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.test-result {
  margin: 20px 0;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
  border-left: 4px solid #409eff;
}

.test-result pre {
  background: #2d3748;
  color: #e2e8f0;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  margin: 10px 0 0 0;
}
</style>