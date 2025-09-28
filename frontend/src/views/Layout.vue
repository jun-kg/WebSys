<template>
  <div class="layout-container">
    <!-- モバイル用ヘッダー -->
    <div v-if="isMobile" class="mobile-header">
      <el-icon class="hamburger" @click="toggleSidebar">
        <Expand v-if="!sidebarVisible" />
        <Fold v-else />
      </el-icon>
      <h3 class="mobile-title">社内システム</h3>
      <div class="mobile-user">
        <el-dropdown trigger="click">
          <el-icon class="user-icon"><UserFilled /></el-icon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleCommand('profile')">プロフィール</el-dropdown-item>
              <el-dropdown-item @click="handleCommand('settings')">設定</el-dropdown-item>
              <el-dropdown-item divided @click="handleCommand('logout')">ログアウト</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- モバイル用サイドバー -->
    <div
      v-if="isMobile"
      class="mobile-sidebar"
      :class="{ 'sidebar-visible': sidebarVisible }"
    >
      <div class="sidebar-content">
        <div class="mobile-logo">
          <h2>社内システム</h2>
        </div>
        <nav class="mobile-nav">
          <!-- ダッシュボード -->
          <div v-if="hasMenuAccess('/dashboard')" class="nav-item" @click="navigateAndClose('/dashboard')">
            <el-icon><DataAnalysis /></el-icon>
            <span>ダッシュボード</span>
          </div>

          <!-- 組織管理 -->
          <div v-if="hasAnyManagementAccess" class="nav-group">
            <div class="nav-group-title">
              <el-icon><User /></el-icon>
              <span>組織管理</span>
            </div>
            <div v-if="hasMenuAccess('/users')" class="nav-sub-item" @click="navigateAndClose('/users')">
              <span>ユーザー管理</span>
            </div>
            <div v-if="hasMenuAccess('/companies')" class="nav-sub-item" @click="navigateAndClose('/companies')">
              <span>会社管理</span>
            </div>
            <div v-if="hasMenuAccess('/departments')" class="nav-sub-item" @click="navigateAndClose('/departments')">
              <span>部署管理</span>
            </div>
          </div>

          <!-- 権限管理 -->
          <div v-if="hasAnyPermissionAccess" class="nav-group">
            <div class="nav-group-title">
              <el-icon><Lock /></el-icon>
              <span>権限管理</span>
            </div>
            <div v-if="hasMenuAccess('/feature-management')" class="nav-sub-item" @click="navigateAndClose('/feature-management')">
              <span>機能管理</span>
            </div>
            <div v-if="hasMenuAccess('/permission-matrix')" class="nav-sub-item" @click="navigateAndClose('/permission-matrix')">
              <span>権限マトリクス</span>
            </div>
            <div v-if="hasMenuAccess('/permission-template')" class="nav-sub-item" @click="navigateAndClose('/permission-template')">
              <span>権限テンプレート</span>
            </div>
          </div>

          <!-- その他のメニュー項目 -->
          <div class="nav-item" @click="navigateAndClose('/code-preview-demo')">
            <el-icon><Document /></el-icon>
            <span>CodePreview デモ</span>
          </div>

          <div v-if="hasMenuAccess('/log-monitoring')" class="nav-item" @click="navigateAndClose('/log-monitoring')">
            <el-icon><Monitor /></el-icon>
            <span>ログ監視システム</span>
          </div>

          <div v-if="hasMenuAccess('/alert-rules')" class="nav-item" @click="navigateAndClose('/alert-rules')">
            <el-icon><Warning /></el-icon>
            <span>アラートルール管理</span>
          </div>

          <div v-if="hasMenuAccess('/notification-settings')" class="nav-item" @click="navigateAndClose('/notification-settings')">
            <el-icon><Message /></el-icon>
            <span>通知設定</span>
          </div>

          <div v-if="hasMenuAccess('/reports')" class="nav-item" @click="navigateAndClose('/reports')">
            <el-icon><Document /></el-icon>
            <span>レポート管理</span>
          </div>

          <div v-if="hasMenuAccess('/system-health')" class="nav-item" @click="navigateAndClose('/system-health')">
            <el-icon><CircleCheck /></el-icon>
            <span>システム監視</span>
          </div>

          <!-- ワークフロー・承認 -->
          <div v-if="hasAnyWorkflowAccess" class="nav-group">
            <div class="nav-group-title">
              <el-icon><Operation /></el-icon>
              <span>ワークフロー・承認</span>
            </div>
            <div v-if="hasMenuAccess('/workflow-dashboard')" class="nav-sub-item" @click="navigateAndClose('/workflow-dashboard')">
              <span>ワークフロー統計</span>
            </div>
            <div v-if="hasMenuAccess('/workflow-types')" class="nav-sub-item" @click="navigateAndClose('/workflow-types')">
              <span>ワークフロータイプ管理</span>
            </div>
            <div v-if="hasMenuAccess('/workflow-requests')" class="nav-sub-item" @click="navigateAndClose('/workflow-requests')">
              <span>ワークフロー申請管理</span>
            </div>
            <div v-if="hasMenuAccess('/approval-process')" class="nav-sub-item" @click="navigateAndClose('/approval-process')">
              <span>承認処理</span>
            </div>
            <div v-if="hasMenuAccess('/approval-routes')" class="nav-sub-item" @click="navigateAndClose('/approval-routes')">
              <span>承認ルート管理</span>
            </div>
          </div>
        </nav>
      </div>
    </div>

    <!-- モバイル用オーバーレイ -->
    <div
      v-if="isMobile && sidebarVisible"
      class="sidebar-overlay"
      @click="toggleSidebar"
    ></div>

    <!-- デスクトップ用サイドバー -->
    <el-aside v-if="!isMobile" width="200px" class="layout-aside">
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
        <!-- ダッシュボード -->
        <el-menu-item v-if="hasMenuAccess('/dashboard')" index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>ダッシュボード</span>
        </el-menu-item>

        <!-- 組織管理 -->
        <el-sub-menu v-if="hasAnyManagementAccess" index="management">
          <template #title>
            <el-icon><User /></el-icon>
            <span>組織管理</span>
          </template>
          <el-menu-item v-if="hasMenuAccess('/users')" index="/users">
            <span>ユーザー管理</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/companies')" index="/companies">
            <span>会社管理</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/departments')" index="/departments">
            <span>部署管理</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 権限管理 -->
        <el-sub-menu v-if="hasAnyPermissionAccess" index="permission">
          <template #title>
            <el-icon><Lock /></el-icon>
            <span>権限管理</span>
          </template>
          <el-menu-item v-if="hasMenuAccess('/feature-management')" index="/feature-management">
            <span>機能管理</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/permission-matrix')" index="/permission-matrix">
            <span>権限マトリクス</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/permission-template')" index="/permission-template">
            <span>権限テンプレート</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- デモ -->
        <el-menu-item index="/code-preview-demo">
          <el-icon><Document /></el-icon>
          <span>CodePreview デモ</span>
        </el-menu-item>

        <!-- ログ監視システム -->
        <el-menu-item v-if="hasMenuAccess('/log-monitoring')" index="/log-monitoring">
          <el-icon><Monitor /></el-icon>
          <span>ログ監視システム</span>
        </el-menu-item>

        <!-- アラートルール管理 -->
        <el-menu-item v-if="hasMenuAccess('/alert-rules')" index="/alert-rules">
          <el-icon><Warning /></el-icon>
          <span>アラートルール管理</span>
        </el-menu-item>

        <!-- 通知設定 -->
        <el-menu-item v-if="hasMenuAccess('/notification-settings')" index="/notification-settings">
          <el-icon><Message /></el-icon>
          <span>通知設定</span>
        </el-menu-item>

        <!-- レポート管理 -->
        <el-menu-item v-if="hasMenuAccess('/reports')" index="/reports">
          <el-icon><Document /></el-icon>
          <span>レポート管理</span>
        </el-menu-item>

        <!-- システム監視 -->
        <el-menu-item v-if="hasMenuAccess('/system-health')" index="/system-health">
          <el-icon><CircleCheck /></el-icon>
          <span>システム監視</span>
        </el-menu-item>

        <!-- ワークフロー・承認 -->
        <el-sub-menu v-if="hasAnyWorkflowAccess" index="workflow">
          <template #title>
            <el-icon><Operation /></el-icon>
            <span>ワークフロー・承認</span>
          </template>
          <el-menu-item v-if="hasMenuAccess('/workflow-dashboard')" index="/workflow-dashboard">
            <span>ワークフロー統計</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/workflow-types')" index="/workflow-types">
            <span>ワークフロータイプ管理</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/workflow-requests')" index="/workflow-requests">
            <span>ワークフロー申請管理</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/approval-process')" index="/approval-process">
            <span>承認処理</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/approval-routes')" index="/approval-routes">
            <span>承認ルート管理</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- メインコンテナ -->
    <el-container>
      <el-header v-if="!isMobile" class="layout-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">ホーム</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              {{ username }} <el-icon class="el-icon--right"><ArrowDown /></el-icon>
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

      <el-main class="layout-main" :class="{ 'mobile-main': isMobile }">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DataAnalysis, User, Document, ArrowDown, Monitor, Warning, Message, Lock, CircleCheck, Operation, Expand, Fold, UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => route.meta.title || '')
const username = computed(() => authStore.getDisplayName())

// モバイル対応
const isMobile = ref(false)
const sidebarVisible = ref(false)

// ウィンドウサイズの監視
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    sidebarVisible.value = false
  }
}

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

// ナビゲーションと閉じる
const navigateAndClose = async (path: string) => {
  // 認証状態とアクセス権限をチェック
  const hasAccess = hasMenuAccess(path)

  if (!hasAccess) {
    ElMessage.warning('このページにアクセスする権限がありません')
    sidebarVisible.value = false
    return
  }

  try {
    // パスが /で始まらない場合は追加（子ルート対応）
    const fullPath = path.startsWith('/') ? path : `/${path}`

    // Vueルーターのナビゲーション実行
    await router.push(fullPath)

    sidebarVisible.value = false
  } catch (error) {
    console.error('Navigation error:', error)
    ElMessage.error('ページの遷移中にエラーが発生しました')
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// メニューアクセス権限チェック
const hasMenuAccess = (path: string) => {
  return authStore.hasMenuAccess(path)
}

// サブメニューの表示判定
const hasAnyManagementAccess = computed(() => {
  return hasMenuAccess('/users') ||
         hasMenuAccess('/companies') ||
         hasMenuAccess('/departments')
})

const hasAnyPermissionAccess = computed(() => {
  return hasMenuAccess('/feature-management') ||
         hasMenuAccess('/permission-matrix') ||
         hasMenuAccess('/permission-template')
})

const hasAnyWorkflowAccess = computed(() => {
  return hasMenuAccess('/workflow-dashboard') ||
         hasMenuAccess('/workflow-types') ||
         hasMenuAccess('/workflow-requests') ||
         hasMenuAccess('/approval-process') ||
         hasMenuAccess('/approval-routes')
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
  if (index === '/feature-management' || index === '/permission-matrix') {
    console.log('Navigating to:', index)
    router.push(index)
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
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
  margin: 0;
}

.layout-header {
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,.1);
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-dropdown {
  cursor: pointer;
  padding: 0 12px;
  display: flex;
  align-items: center;
  color: #606266;
}

.layout-main {
  background-color: #f0f2f5;
  padding: 20px;
}

/* モバイル用スタイル */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  background-color: #304156;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  z-index: 2000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.hamburger {
  font-size: 24px;
  color: #fff;
  cursor: pointer;
}

.mobile-title {
  color: #fff;
  font-size: 18px;
  margin: 0;
  flex: 1;
  text-align: center;
}

.mobile-user {
  display: flex;
  align-items: center;
}

.user-icon {
  font-size: 24px;
  color: #fff;
  cursor: pointer;
}

.mobile-sidebar {
  position: fixed;
  top: 50px;
  left: 0;
  bottom: 0;
  width: 250px;
  background-color: #304156;
  z-index: 1999;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  overflow-y: auto;
}

.mobile-sidebar.sidebar-visible {
  transform: translateX(0);
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mobile-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b3647;
  color: #fff;
}

.mobile-logo h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.mobile-nav {
  flex: 1;
  padding: 10px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #bfcbd9;
  cursor: pointer;
  transition: background-color 0.3s;
}

.nav-item:hover {
  background-color: #263445;
}

.nav-item .el-icon {
  margin-right: 10px;
  font-size: 18px;
}

.nav-group {
  margin-bottom: 10px;
}

.nav-group-title {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #bfcbd9;
  font-weight: 600;
  background-color: #263445;
}

.nav-group-title .el-icon {
  margin-right: 10px;
  font-size: 18px;
}

.nav-sub-item {
  display: flex;
  align-items: center;
  padding: 10px 40px;
  color: #bfcbd9;
  cursor: pointer;
  transition: background-color 0.3s;
}

.nav-sub-item:hover {
  background-color: #263445;
}

.sidebar-overlay {
  position: fixed;
  top: 50px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 1998;
}

/* モバイル時のメインコンテンツ調整 */
.mobile-main {
  padding-top: 60px !important;
  padding-left: 10px !important;
  padding-right: 10px !important;
}

@media (max-width: 767px) {
  .layout-container {
    flex-direction: column;
  }
}
</style>