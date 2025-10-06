import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 全てのコンポーネントを遅延読み込みに変更（初期バンドルサイズ最適化）

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
        component: () => import('@/views/EnhancedDashboard.vue'),
        meta: {
          title: '管理ダッシュボード',
          requiresPermission: 'DASHBOARD',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: '管理ダッシュボード' }
          ]
        }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: {
          title: 'ユーザー管理',
          group: '組織管理',
          requiresPermission: 'USER_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: '組織管理' },
            { label: 'ユーザー管理' }
          ]
        }
      },
      {
        path: 'companies',
        name: 'Companies',
        component: () => import('@/views/Companies.vue'),
        meta: {
          title: '会社管理',
          group: '組織管理',
          requiresPermission: 'USER_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: '組織管理' },
            { label: '会社管理' }
          ]
        }
      },
      {
        path: 'departments',
        name: 'Departments',
        component: () => import('@/views/Departments.vue'),
        meta: {
          title: '部署管理',
          group: '組織管理',
          requiresPermission: 'USER_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: '組織管理' },
            { label: '部署管理' }
          ]
        }
      },
      {
        path: 'feature-management',
        name: 'FeatureManagement',
        component: () => import('@/views/FeatureManagement.vue'),
        meta: {
          title: '機能管理',
          group: '権限管理',
          requiresPermission: 'FEATURE_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: '権限管理' },
            { label: '機能管理' }
          ]
        }
      },
      {
        path: 'permission-matrix',
        name: 'PermissionMatrix',
        component: () => import('@/views/PermissionMatrix.vue'),
        meta: {
          title: '権限マトリクス',
          group: '権限管理',
          requiresPermission: 'PERMISSION_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: '権限管理' },
            { label: '権限マトリクス' }
          ]
        }
      },
      {
        path: 'permission-template',
        name: 'PermissionTemplate',
        component: () => import('@/views/PermissionTemplate.vue'),
        meta: {
          title: '権限テンプレート',
          group: '権限管理',
          requiresPermission: 'PERMISSION_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: '権限管理' },
            { label: '権限テンプレート' }
          ]
        }
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
        component: () => import('@/views/LogMonitoring.vue'),
        meta: {
          title: 'ログ監視システム',
          group: 'ログ・監視',
          requiresPermission: 'LOG_MONITORING',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: 'ログ・監視' },
            { label: 'ログ監視システム' }
          ]
        }
      },
      {
        path: 'alert-rules',
        name: 'AlertRules',
        component: () => import('@/views/AlertRules.vue'),
        meta: {
          title: 'アラートルール管理',
          group: 'ログ・監視',
          requiresPermission: 'LOG_MONITORING',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: 'ログ・監視' },
            { label: 'アラートルール管理' }
          ]
        }
      },
      {
        path: 'notification-settings',
        name: 'NotificationSettings',
        component: () => import('@/views/NotificationSettings.vue'),
        meta: {
          title: '通知設定',
          group: 'ログ・監視',
          requiresPermission: 'LOG_MONITORING',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: 'ログ・監視' },
            { label: '通知設定' }
          ]
        }
      },
      {
        path: 'permission-inheritance',
        name: 'PermissionInheritance',
        component: () => import('@/views/PermissionInheritance.vue'),
        meta: {
          title: '権限継承管理',
          group: '権限管理',
          requiresPermission: 'PERMISSION_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: '権限管理' },
            { label: '権限継承管理' }
          ]
        }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/Reports.vue'),
        meta: {
          title: 'レポート管理',
          group: 'レポート',
          requiresPermission: 'REPORT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: 'レポート' },
            { label: 'レポート管理' }
          ]
        }
      },
      {
        path: 'system-health',
        name: 'SystemHealth',
        component: () => import('@/views/SystemHealth.vue'),
        meta: {
          title: 'システム監視',
          group: 'ログ・監視',
          requiresPermission: 'LOG_MONITORING',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: 'ログ・監視' },
            { label: 'システム監視' }
          ]
        }
      },
      // ワークフロー・承認システム
      {
        path: 'workflow-dashboard',
        name: 'WorkflowDashboard',
        component: () => import('@/views/WorkflowDashboard.vue'),
        meta: {
          title: 'ワークフロー統計',
          group: 'ワークフロー・承認',
          requiresPermission: 'PERMISSION_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: 'ワークフロー・承認' },
            { label: 'ワークフロー統計' }
          ]
        }
      },
      {
        path: 'workflow-types',
        name: 'WorkflowTypes',
        component: () => import('@/views/WorkflowTypes.vue'),
        meta: {
          title: 'ワークフロータイプ管理',
          group: 'ワークフロー・承認',
          requiresPermission: 'PERMISSION_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: 'ワークフロー・承認' },
            { label: 'ワークフロータイプ管理' }
          ]
        }
      },
      {
        path: 'workflow-requests',
        name: 'WorkflowRequests',
        component: () => import('@/views/WorkflowRequests.vue'),
        meta: {
          title: 'ワークフロー申請管理',
          group: 'ワークフロー・承認',
          requiresPermission: 'PERMISSION_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: 'ワークフロー・承認' },
            { label: 'ワークフロー申請管理' }
          ]
        }
      },
      {
        path: 'approval-process',
        name: 'ApprovalProcess',
        component: () => import('@/views/ApprovalProcess.vue'),
        meta: {
          title: '承認処理',
          group: 'ワークフロー・承認',
          requiresPermission: 'PERMISSION_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: 'ワークフロー・承認' },
            { label: '承認処理' }
          ]
        }
      },
      {
        path: 'approval-routes',
        name: 'ApprovalRoutes',
        component: () => import('@/views/ApprovalRoutes.vue'),
        meta: {
          title: '承認ルート管理',
          group: 'ワークフロー・承認',
          requiresPermission: 'PERMISSION_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: 'ワークフロー・承認' },
            { label: '承認ルート管理' }
          ]
        }
      },
      {
        path: 'bulk-operations',
        name: 'BulkUserOperations',
        component: () => import('@/views/BulkUserOperations.vue'),
        meta: {
          title: '一括ユーザー操作',
          group: '組織管理',
          requiresPermission: 'USER_MANAGEMENT',
          breadcrumbs: [
            { label: 'ホーム', to: '/dashboard' },
            { label: '組織管理' },
            { label: '一括ユーザー操作' }
          ]
        }
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