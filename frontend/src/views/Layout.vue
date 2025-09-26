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
        @select="handleMenuSelect"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>ダッシュボード</span>
        </el-menu-item>
        <el-sub-menu index="management">
          <template #title>
            <el-icon><User /></el-icon>
            <span>組織管理</span>
          </template>
          <el-menu-item index="/users">
            <span>ユーザー管理</span>
          </el-menu-item>
          <el-menu-item index="/companies">
            <span>会社管理</span>
          </el-menu-item>
          <el-menu-item index="/departments">
            <span>部署管理</span>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="permission">
          <template #title>
            <el-icon><Lock /></el-icon>
            <span>権限管理</span>
          </template>
          <el-menu-item index="/feature-management">
            <span>機能管理</span>
          </el-menu-item>
          <el-menu-item index="/permission-matrix">
            <span>権限マトリクス</span>
          </el-menu-item>
          <el-menu-item index="/permission-template">
            <span>権限テンプレート</span>
          </el-menu-item>
        </el-sub-menu>
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
        <el-menu-item index="/alert-rules">
          <el-icon><Warning /></el-icon>
          <span>アラートルール管理</span>
        </el-menu-item>
        <el-menu-item index="/notification-settings">
          <el-icon><Message /></el-icon>
          <span>通知設定</span>
        </el-menu-item>
        <el-menu-item index="/reports">
          <el-icon><Document /></el-icon>
          <span>レポート管理</span>
        </el-menu-item>
        <el-menu-item index="/system-health">
          <el-icon><CircleCheck /></el-icon>
          <span>システム監視</span>
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
import { DataAnalysis, User, Document, ArrowDown, Monitor, Warning, Message, Lock, CircleCheck } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => route.meta.title || '')
const username = computed(() => authStore.getDisplayName())
const userAvatar = computed(() => '')

// ユーザー情報表示用の計算プロパティ
const userInfo = computed(() => {
  const user = authStore.user
  if (!user) return ''

  let info = user.name
  if (user.company) {
    info += ` (${user.company.name}`
    if (user.primaryDepartment) {
      info += ` / ${user.primaryDepartment.name}`
    }
    info += ')'
  }
  return info
})

const handleCommand = async (command: string) => {
  switch (command) {
    case 'logout':
      await authStore.logout()
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

const handleMenuSelect = (index: string) => {
  console.log('Menu selected:', index)
  // デバッグ用: ルーター遷移を手動で実行
  if (index === '/feature-management' || index === '/permission-matrix') {
    console.log('Navigating to:', index)
    router.push(index)
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

/* スマホ対応 */
@media (max-width: 768px) {
  .layout-aside {
    width: 100% !important;
    position: fixed;
    top: 0;
    left: -100%;
    height: 100vh;
    z-index: 1000;
    transition: left 0.3s ease;
  }

  .layout-aside.mobile-open {
    left: 0;
  }

  .layout-header {
    padding: 0 15px;
  }

  .logo h2 {
    font-size: 16px;
  }

  .user-dropdown {
    gap: 4px;
  }

  .username {
    display: none;
  }
}

.username {
  color: #606266;
}

.layout-main {
  background-color: #f5f7fa;
  padding: 20px;
}
</style>