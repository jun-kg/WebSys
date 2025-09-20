<template>
  <el-container class="layout-container">
    <el-aside width="200px" class="layout-aside">
      <div class="logo">
        <h2>社内システム</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>ダッシュボード</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>ユーザー管理</span>
        </el-menu-item>
        <el-menu-item index="/code-preview-demo">
          <el-icon><Document /></el-icon>
          <span>CodePreview デモ</span>
        </el-menu-item>
        <!-- <el-menu-item index="/api-test">
          <el-icon><Document /></el-icon>
          <span>API接続テスト</span>
        </el-menu-item> -->
        <el-menu-item index="/log-monitoring">
          <el-icon><Monitor /></el-icon>
          <span>ログ監視システム</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">ホーム</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-avatar :size="32" :src="userAvatar" />
              <span class="username">{{ username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">プロフィール</el-dropdown-item>
                <el-dropdown-item command="settings">設定</el-dropdown-item>
                <el-dropdown-item divided command="logout">ログアウト</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DataAnalysis, User, Document, ArrowDown, Monitor } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => route.meta.title || '')
const username = computed(() => 'Admin User')
const userAvatar = computed(() => '')

const handleCommand = (command: string) => {
  switch (command) {
    case 'logout':
      localStorage.removeItem('token')
      ElMessage.success('ログアウトしました')
      router.push('/login')
      break
    case 'profile':
      ElMessage.info('プロフィール機能は準備中です')
      break
    case 'settings':
      ElMessage.info('設定機能は準備中です')
      break
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-aside {
  background-color: #304156;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b3647;
  color: #fff;
}

.logo h2 {
  font-size: 18px;
  font-weight: 600;
}

.layout-header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  flex: 1;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 8px;
}

.username {
  color: #606266;
}

.layout-main {
  background-color: #f5f7fa;
  padding: 20px;
}
</style>