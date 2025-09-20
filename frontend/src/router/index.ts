import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

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

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router