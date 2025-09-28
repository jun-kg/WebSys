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

// Register all Element Plus Icons
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

// Initialize authentication on app startup
const authStore = useAuthStore()
authStore.initializeAuth().then(() => {
  app.mount('#app')
}).catch(error => {
  console.error('Authentication initialization failed:', error)
  app.mount('#app')
})