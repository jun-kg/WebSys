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
import { useAuthStore } from '@custom/stores/auth'
import { mobileOptimizer } from '@/utils/mobileOptimizer'
import { performanceMonitor, usePerformanceMonitor } from '@/utils/performanceMonitor'
import { preloadOnIdle } from '@/utils/lazyLoader'

const app = createApp(App)
const pinia = createPinia()

// Register Element Plus Icons (最適化版: 遅延登録)
const registerIcons = () => {
  requestIdleCallback(() => {
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      app.component(key, component)
    }
  }, { timeout: 2000 })
}

// パフォーマンス監視とルーター変更監視
const { recordRouteChange } = usePerformanceMonitor()
let isInitialLoad = true
let routeStartTime = 0

// ルーター変更開始時刻記録
router.beforeEach((to, from, next) => {
  // 初回ロード（認証初期化中）は除外
  if (isInitialLoad) {
    isInitialLoad = false
    next()
    return
  }

  // ルート変更開始時刻を記録
  routeStartTime = performance.now()
  next()
})

// ルーター変更完了時のパフォーマンス記録（1回のみ登録）
router.afterEach((to) => {
  // 初回ロード後のみ記録
  if (!isInitialLoad && routeStartTime > 0) {
    recordRouteChange(to.name as string || to.path, routeStartTime)
    routeStartTime = 0
  }
})

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

// 最適化された初期化プロセス
const initializeApp = async () => {
  try {
    // 1. 必須コンポーネント先行マウント
    app.mount('#app')

    // 2. 認証初期化を非同期で実行（ノンブロッキング）
    const authStore = useAuthStore()

    // 認証初期化を背景で実行し、UIをブロックしない
    authStore.initializeAuth().catch(error => {
      // トークン期限切れは正常な動作のため、デバッグレベルで記録
      if (error?.message?.includes('Token expired')) {
        console.info('Token expired, user will need to login again')
      } else {
        console.warn('Authentication deferred due to error:', error)
      }
    })

    // フレーム待機で滑らかなレンダリング
    await new Promise(resolve => requestAnimationFrame(resolve))

    // 3. 遅延処理開始
    registerIcons()
    preloadOnIdle() // 重要なコンポーネントをアイドル時にプリロード

    // 4. 開発環境パフォーマンスダッシュボード
    if (import.meta.env.DEV) {
      setTimeout(() => {
        const metrics = performanceMonitor.getMetrics()
        const evaluation = performanceMonitor.evaluatePerformance()
        console.log('🚀 Performance Dashboard (Optimized):', {
          metrics,
          score: evaluation.score,
          issues: evaluation.issues,
          loadTime: `${performance.now().toFixed(0)}ms`
        })
      }, 1000) // 3秒→1秒に短縮
    }

    // 認証は非同期で処理されるため、エラー処理は上記で完了

  } catch (error) {
    console.error('App initialization failed:', error)
    app.mount('#app')
  }
}

// 高速初期化実行
initializeApp()