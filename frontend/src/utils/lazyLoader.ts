import { defineAsyncComponent, AsyncComponentLoader, Component } from 'vue'
import { ElSkeleton } from 'element-plus'

// 遅延読み込みコンポーネントのオプション
interface LazyLoadOptions {
  loadingComponent?: Component
  errorComponent?: Component
  delay?: number
  timeout?: number
  retryAttempts?: number
}

// 遅延読み込み用のヘルパー関数
export function createLazyComponent(
  loader: AsyncComponentLoader,
  options: LazyLoadOptions = {}
) {
  const {
    loadingComponent,
    errorComponent,
    delay = 200,
    timeout = 30000,
    retryAttempts = 3
  } = options

  return defineAsyncComponent({
    loader: async () => {
      let attempts = 0
      let lastError: Error | null = null

      while (attempts < retryAttempts) {
        try {
          attempts++
          const component = await loader()
          console.log(`Lazy component loaded successfully on attempt ${attempts}`)
          return component
        } catch (error) {
          lastError = error as Error
          console.warn(`Lazy loading attempt ${attempts} failed:`, error)

          if (attempts < retryAttempts) {
            // 指数バックオフで再試行
            await new Promise(resolve =>
              setTimeout(resolve, Math.pow(2, attempts) * 1000)
            )
          }
        }
      }

      throw lastError || new Error('Failed to load component after retries')
    },

    loadingComponent: loadingComponent || {
      render() {
        const h = this.$createElement || (this as any).h
        return h('div', { class: 'lazy-loading', style: 'padding: 20px;' }, [
          h('div', {
            style: 'background: linear-gradient(90deg, #f0f2f5 25%, #e6f7ff 50%, #f0f2f5 75%); height: 40px; margin-bottom: 15px; border-radius: 4px; animation: loading 1.5s infinite;'
          }),
          h('div', {
            style: 'background: linear-gradient(90deg, #f0f2f5 25%, #e6f7ff 50%, #f0f2f5 75%); height: 20px; margin-bottom: 10px; border-radius: 4px; animation: loading 1.5s infinite;'
          }),
          h('div', {
            style: 'background: linear-gradient(90deg, #f0f2f5 25%, #e6f7ff 50%, #f0f2f5 75%); height: 20px; width: 60%; margin-bottom: 15px; border-radius: 4px; animation: loading 1.5s infinite;'
          }),
          h('div', {
            style: 'background: linear-gradient(90deg, #f0f2f5 25%, #e6f7ff 50%, #f0f2f5 75%); height: 200px; border-radius: 4px; animation: loading 1.5s infinite;'
          })
        ])
      }
    },

    errorComponent: errorComponent || {
      render() {
        const h = this.$createElement || (this as any).h
        return h('div', {
          class: 'lazy-error',
          style: 'padding: 20px; text-align: center; border: 2px dashed #ff4d4f; border-radius: 8px; background: #fff2f0;'
        }, [
          h('div', {
            style: 'color: #ff4d4f; font-size: 16px; font-weight: bold; margin-bottom: 8px;'
          }, 'コンポーネント読み込みエラー'),
          h('div', {
            style: 'color: #666; font-size: 14px;'
          }, 'コンポーネントの読み込みに失敗しました。ページを再読み込みしてください。')
        ])
      }
    },

    delay,
    timeout,

    onError: (error, retry, fail, attempts) => {
      console.error(`Lazy component loading failed (attempt ${attempts}):`, error)

      if (attempts <= retryAttempts) {
        console.log(`Retrying lazy component load (attempt ${attempts + 1})...`)
        retry()
      } else {
        console.error('Max retry attempts reached, component loading failed')
        fail()
      }
    }
  })
}

// プリロード機能
const componentCache = new Map<string, Promise<Component>>()

export function preloadComponent(key: string, loader: AsyncComponentLoader) {
  if (!componentCache.has(key)) {
    componentCache.set(key, loader())
  }
  return componentCache.get(key)!
}

// よく使用されるコンポーネントのプリロード
export function preloadCriticalComponents() {
  // 高優先度のコンポーネントを事前に読み込み
  const criticalComponents = [
    { key: 'dashboard', loader: () => import('@custom/views/views/Dashboard.vue') },
    { key: 'users', loader: () => import('@custom/views/views/Users.vue') },
    { key: 'performance', loader: () => import('@custom/views/views/PerformanceDashboard.vue') }
  ]

  return Promise.all(
    criticalComponents.map(({ key, loader }) =>
      preloadComponent(key, loader).catch(error => {
        console.warn(`Failed to preload ${key}:`, error)
        return null
      })
    )
  )
}

// アイドル時にコンポーネントをプリロード
export function preloadOnIdle() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadCriticalComponents()
    }, { timeout: 5000 })
  } else {
    // フォールバック: setTimeout使用
    setTimeout(() => {
      preloadCriticalComponents()
    }, 2000)
  }
}