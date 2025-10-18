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
          <div v-if="hasMenuAccess('/dashboard')" class="nav-item primary" @click="navigateAndClose('/dashboard')">
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

          <!-- システム監視 -->
          <div v-if="hasAnyMonitoringAccess" class="nav-group">
            <div class="nav-group-title">
              <el-icon><Monitor /></el-icon>
              <span>システム監視</span>
            </div>
            <div v-if="hasMenuAccess('/log-monitoring')" class="nav-sub-item" @click="navigateAndClose('/log-monitoring')">
              <span>ログ監視</span>
            </div>
            <div v-if="hasMenuAccess('/system-health')" class="nav-sub-item" @click="navigateAndClose('/system-health')">
              <span>ヘルスチェック</span>
            </div>
            <div v-if="hasMenuAccess('/performance-dashboard')" class="nav-sub-item" @click="navigateAndClose('/performance-dashboard')">
              <span>パフォーマンス</span>
            </div>
            <div v-if="hasMenuAccess('/alert-rules')" class="nav-sub-item" @click="navigateAndClose('/alert-rules')">
              <span>アラートルール</span>
            </div>
          </div>

          <!-- レポート・通知 -->
          <div v-if="hasAnyReportAccess" class="nav-group">
            <div class="nav-group-title">
              <el-icon><Document /></el-icon>
              <span>レポート・通知</span>
            </div>
            <div v-if="hasMenuAccess('/reports')" class="nav-sub-item" @click="navigateAndClose('/reports')">
              <span>レポート管理</span>
            </div>
            <div v-if="hasMenuAccess('/notification-settings')" class="nav-sub-item" @click="navigateAndClose('/notification-settings')">
              <span>通知設定</span>
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
        <el-menu-item v-if="hasMenuAccess('/dashboard')" index="/dashboard" class="menu-item-highlight">
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

        <!-- システム監視 -->
        <el-sub-menu v-if="hasAnyMonitoringAccess" index="monitoring">
          <template #title>
            <el-icon><Monitor /></el-icon>
            <span>システム監視</span>
          </template>
          <el-menu-item v-if="hasMenuAccess('/log-monitoring')" index="/log-monitoring">
            <span>ログ監視</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/system-health')" index="/system-health">
            <span>ヘルスチェック</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/performance-dashboard')" index="/performance-dashboard">
            <span>パフォーマンス</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/alert-rules')" index="/alert-rules">
            <span>アラートルール</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- レポート・通知 -->
        <el-sub-menu v-if="hasAnyReportAccess" index="reports">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>レポート・通知</span>
          </template>
          <el-menu-item v-if="hasMenuAccess('/reports')" index="/reports">
            <span>レポート管理</span>
          </el-menu-item>
          <el-menu-item v-if="hasMenuAccess('/notification-settings')" index="/notification-settings">
            <span>通知設定</span>
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
import { DataAnalysis, User, Document, ArrowDown, Monitor, Warning, Message, Lock, CircleCheck, Operation, Expand, Fold, UserFilled, Odometer } from '@element-plus/icons-vue'
import { useAuthStore } from '@custom/stores/auth'
import { useMobileOptimizer } from '@/utils/mobileOptimizer'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => route.meta.title || '')
const username = computed(() => authStore.getDisplayName())

// モバイル最適化対応
const { batchDOMUpdates, deferTask } = useMobileOptimizer()
const isMobile = ref(false)
const sidebarVisible = ref(false)
let resizeTimeout: number

// ウィンドウサイズの監視（パフォーマンス最適化版）
const checkMobile = () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }

  resizeTimeout = window.setTimeout(() => {
    const wasMobile = isMobile.value
    isMobile.value = window.innerWidth < 768

    // モバイル←→PC切り替え時のみ処理
    if (wasMobile !== isMobile.value) {
      batchDOMUpdates([
        () => {
          if (!isMobile.value) {
            sidebarVisible.value = false
          }
        }
      ])
    }
  }, 100) // デバウンス100ms
}

const toggleSidebar = () => {
  // アニメーション処理を最適化
  batchDOMUpdates([
    () => {
      sidebarVisible.value = !sidebarVisible.value
    }
  ])
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

  // パフォーマンス最適化：パッシブリスナー使用
  window.addEventListener('resize', checkMobile, { passive: true })

  // 初期化を遅延実行でパフォーマンス向上
  deferTask(() => {
    // 低優先度の初期化処理をここに
    console.log('Layout initialized with mobile optimization')
  })
})

onUnmounted(() => {
  // クリーンアップ
  window.removeEventListener('resize', checkMobile)
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
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

const hasAnyMonitoringAccess = computed(() => {
  return hasMenuAccess('/log-monitoring') ||
         hasMenuAccess('/system-health') ||
         hasMenuAccess('/performance-dashboard') ||
         hasMenuAccess('/alert-rules')
})

const hasAnyReportAccess = computed(() => {
  return hasMenuAccess('/reports') ||
         hasMenuAccess('/notification-settings')
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
  transition: all 0.3s;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background-color: #263445;
  border-left-color: #409eff;
}

.nav-item.primary {
  background-color: #1f2d3d;
  border-left-color: #67c23a;
}

.nav-item.primary:hover {
  background-color: #263445;
  border-left-color: #85ce61;
}

.nav-item .el-icon {
  margin-right: 10px;
  font-size: 18px;
}

.nav-group {
  margin-bottom: 5px;
  border-radius: 4px;
  overflow: hidden;
}

.nav-group-title {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  color: #fff;
  font-weight: 600;
  background-color: #263445;
  border-left: 4px solid #409eff;
  font-size: 14px;
  letter-spacing: 0.5px;
}

.nav-group-title .el-icon {
  margin-right: 12px;
  font-size: 20px;
}

.nav-sub-item {
  display: flex;
  align-items: center;
  padding: 10px 20px 10px 45px;
  color: #bfcbd9;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 13px;
  position: relative;
}

.nav-sub-item::before {
  content: '•';
  position: absolute;
  left: 30px;
  color: #67c23a;
  font-size: 16px;
}

.nav-sub-item:hover {
  background-color: #263445;
  color: #fff;
  padding-left: 50px;
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

/* デスクトップメニュー用スタイル強化 */
:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item) {
  transition: all 0.3s;
  border-left: 3px solid transparent;
}

:deep(.el-menu-item:hover) {
  border-left-color: #409eff;
}

:deep(.el-menu-item.is-active) {
  background-color: #1f2d3d !important;
  border-left-color: #67c23a;
}

:deep(.el-menu-item.menu-item-highlight) {
  background-color: #1f2d3d;
  border-left-color: #67c23a;
}

:deep(.el-sub-menu__title) {
  transition: all 0.3s;
  border-left: 4px solid transparent;
}

:deep(.el-sub-menu__title:hover) {
  background-color: #263445 !important;
  border-left-color: #409eff;
}

:deep(.el-sub-menu.is-opened > .el-sub-menu__title) {
  background-color: #263445 !important;
  border-left-color: #409eff;
}

@media (max-width: 767px) {
  .layout-container {
    flex-direction: column;
  }
}
</style>