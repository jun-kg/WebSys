import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// よく使われるコンポーネントを事前読み込み（パフォーマンス改善）
import Dashboard from '@/views/Dashboard.vue'
import Users from '@/views/Users.vue'
import Companies from '@/views/Companies.vue'
import Departments from '@/views/Departments.vue'
import LogMonitoring from '@/views/LogMonitoring.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: 'ダッシュボード', requiresPermission: 'DASHBOARD' }
      },
      {
        path: 'users',
        name: 'Users',
        component: Users,
        meta: { title: 'ユーザー管理', requiresPermission: 'USER_MANAGEMENT' }
      },
      {
        path: 'companies',
        name: 'Companies',
        component: Companies,
        meta: { title: '会社管理', requiresPermission: 'USER_MANAGEMENT' }
      },
      {
        path: 'departments',
        name: 'Departments',
        component: Departments,
        meta: { title: '部署管理', requiresPermission: 'USER_MANAGEMENT' }
      },
      {
        path: 'feature-management',
        name: 'FeatureManagement',
        component: () => import('@/views/FeatureManagement.vue'),
        meta: { title: '機能管理', requiresPermission: 'FEATURE_MANAGEMENT' }
      },
      {
        path: 'permission-matrix',
        name: 'PermissionMatrix',
        component: () => import('@/views/PermissionMatrix.vue'),
        meta: { title: '権限マトリクス', requiresPermission: 'PERMISSION_MANAGEMENT' }
      },
      {
        path: 'permission-template',
        name: 'PermissionTemplate',
        component: () => import('@/views/PermissionTemplate.vue'),
        meta: { title: '権限テンプレート', requiresPermission: 'PERMISSION_MANAGEMENT' }
      },
      {
        path: 'code-preview-demo',
        name: 'CodePreviewDemo',
        component: () => import('@/views/CodePreviewDemo.vue'),
        meta: { title: 'CodePreview デモ' }
      },
      // {
      //   path: 'api-test',
      //   name: 'ApiTest',
      //   component: () => import('@/views/ApiTest.vue'),
      //   meta: { title: 'API接続テスト' }
      // },
      {
        path: 'log-monitoring',
        name: 'LogMonitoring',
        component: LogMonitoring,
        meta: { title: 'ログ監視システム', requiresPermission: 'LOG_MONITORING' }
      },
      {
        path: 'alert-rules',
        name: 'AlertRules',
        component: () => import('@/views/AlertRules.vue'),
        meta: { title: 'アラートルール管理', requiresPermission: 'LOG_MONITORING' }
      },
      {
        path: 'notification-settings',
        name: 'NotificationSettings',
        component: () => import('@/views/NotificationSettings.vue'),
        meta: { title: '通知設定', requiresPermission: 'LOG_MONITORING' }
      },
      {
        path: 'permission-inheritance',
        name: 'PermissionInheritance',
        component: () => import('@/views/PermissionInheritance.vue'),
        meta: { title: '権限継承管理', requiresPermission: 'PERMISSION_MANAGEMENT' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/Reports.vue'),
        meta: { title: 'レポート管理', requiresPermission: 'REPORT' }
      },
      {
        path: 'system-health',
        name: 'SystemHealth',
        component: () => import('@/views/SystemHealth.vue'),
        meta: { title: 'システム監視', requiresPermission: 'LOG_MONITORING' }
      },
      // ワークフロー・承認システム
      {
        path: 'workflow-dashboard',
        name: 'WorkflowDashboard',
        component: () => import('@/views/WorkflowDashboard.vue'),
        meta: { title: 'ワークフロー統計', requiresPermission: 'PERMISSION_MANAGEMENT' }
      },
      {
        path: 'workflow-types',
        name: 'WorkflowTypes',
        component: () => import('@/views/WorkflowTypes.vue'),
        meta: { title: 'ワークフロータイプ管理', requiresPermission: 'PERMISSION_MANAGEMENT' }
      },
      {
        path: 'workflow-requests',
        name: 'WorkflowRequests',
        component: () => import('@/views/WorkflowRequests.vue'),
        meta: { title: 'ワークフロー申請管理', requiresPermission: 'PERMISSION_MANAGEMENT' }
      },
      {
        path: 'approval-process',
        name: 'ApprovalProcess',
        component: () => import('@/views/ApprovalProcess.vue'),
        meta: { title: '承認処理', requiresPermission: 'PERMISSION_MANAGEMENT' }
      },
      {
        path: 'approval-routes',
        name: 'ApprovalRoutes',
        component: () => import('@/views/ApprovalRoutes.vue'),
        meta: { title: '承認ルート管理', requiresPermission: 'PERMISSION_MANAGEMENT' }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: 'ログイン' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // ログインページへのアクセス
  if (to.path === '/login') {
    if (authStore.isAuthenticated) {
      next('/dashboard')
    } else {
      next()
    }
    return
  }

  // 認証が必要なページへのアクセス
  if (!authStore.isAuthenticated) {
    // トークンがあるかチェック
    const token = localStorage.getItem('token')
    if (token) {
      // トークンがある場合は検証を試行
      try {
        await authStore.initializeAuth()
        if (authStore.isAuthenticated) {
          next()
        } else {
          next('/login')
        }
      } catch (error) {
        console.error('Authentication initialization failed:', error)
        next('/login')
      }
    } else {
      next('/login')
    }
  } else {
    // 認証済みの場合、権限チェック
    if (to.meta.requiresPermission) {
      const hasAccess = authStore.hasMenuAccess(to.path)
      if (!hasAccess) {
        // アクセス権限がない場合は403エラーページまたはダッシュボードにリダイレクト
        console.warn(`Access denied to ${to.path}: insufficient permissions`)
        next('/dashboard')
        return
      }
    }
    next()
  }
})

export default router