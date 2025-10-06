import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// import zhCn from 'element-plus/es/locale/lang/zh-cn' // コメントアウト（必要に応じて使用）

// 最適化されたBIZ UDゴシックフォント読み込み（モバイル最適化版）
import '@/styles/fonts.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)
const pinia = createPinia()

// Register Element Plus Icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus) // localeオプションを一時的に削除

// Service Worker 登録（プロダクションのみ）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[SW] Service Worker registered successfully:', registration.scope)
      })
      .catch(error => {
        console.error('[SW] Service Worker registration failed:', error)
      })
  })
}

// アプリケーション初期化
const initializeApp = async () => {
  try {
    // 1. アプリマウント
    app.mount('#app')

    // 2. 認証初期化
    const authStore = useAuthStore()
    authStore.initializeAuth().catch(error => {
      if (error?.message?.includes('Token expired')) {
        console.info('Token expired, user will need to login again')
      } else {
        console.warn('Authentication deferred due to error:', error)
      }
    })

  } catch (error) {
    console.error('App initialization failed:', error)
    app.mount('#app')
  }
}

// 初期化実行
initializeApp()