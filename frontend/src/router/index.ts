import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: 'ダッシュボード' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: { title: 'ユーザー管理' }
      },
      {
        path: 'companies',
        name: 'Companies',
        component: () => import('@/views/Companies.vue'),
        meta: { title: '会社管理' }
      },
      {
        path: 'departments',
        name: 'Departments',
        component: () => import('@/views/Departments.vue'),
        meta: { title: '部署管理' }
      },
      {
        path: 'feature-management',
        name: 'FeatureManagement',
        component: () => import('@/views/FeatureManagement.vue'),
        meta: { title: '機能管理' }
      },
      {
        path: 'permission-matrix',
        name: 'PermissionMatrix',
        component: () => import('@/views/PermissionMatrix.vue'),
        meta: { title: '権限マトリクス' }
      },
      {
        path: 'permission-template',
        name: 'PermissionTemplate',
        component: () => import('@/views/PermissionTemplate.vue'),
        meta: { title: '権限テンプレート' }
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
        component: () => import('@/views/LogMonitoring.vue'),
        meta: { title: 'ログ監視システム' }
      },
      {
        path: 'alert-rules',
        name: 'AlertRules',
        component: () => import('@/views/AlertRules.vue'),
        meta: { title: 'アラートルール管理' }
      },
      {
        path: 'notification-settings',
        name: 'NotificationSettings',
        component: () => import('@/views/NotificationSettings.vue'),
        meta: { title: '通知設定' }
      },
      {
        path: 'permission-inheritance',
        name: 'PermissionInheritance',
        component: () => import('@/views/PermissionInheritance.vue'),
        meta: { title: '権限継承管理' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/Reports.vue'),
        meta: { title: 'レポート管理' }
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
    next()
  }
})

export default router