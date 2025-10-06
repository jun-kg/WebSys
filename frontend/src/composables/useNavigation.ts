/**
 * ナビゲーション関連のComposable
 * パンくずリスト生成、ページタイトル取得、親画面ナビゲーション
 */

import { computed } from 'vue'
import { useRoute, useRouter, RouteLocationNormalizedLoaded } from 'vue-router'

export interface Breadcrumb {
  label: string
  to?: string | { path: string }
}

/**
 * ルートメタ情報の型定義
 */
export interface RouteMeta {
  title?: string
  group?: string
  parent?: string
  breadcrumbs?: Breadcrumb[] | ((route: RouteLocationNormalizedLoaded) => Breadcrumb[])
  requiresAuth?: boolean
  roles?: string[]
}

/**
 * ナビゲーション機能を提供するComposable
 */
export function useNavigation() {
  const route = useRoute()
  const router = useRouter()

  /**
   * 現在のルートからパンくずリストを生成
   */
  const breadcrumbs = computed<Breadcrumb[]>(() => {
    const meta = route.meta as RouteMeta

    // 動的パンくずリスト（関数形式）
    if (typeof meta.breadcrumbs === 'function') {
      return meta.breadcrumbs(route)
    }

    // 静的パンくずリスト（配列形式）
    if (Array.isArray(meta.breadcrumbs)) {
      return meta.breadcrumbs
    }

    // デフォルト: ホーム + 現在のページ
    return [
      { label: 'ホーム', to: '/dashboard' },
      { label: meta.title || route.path }
    ]
  })

  /**
   * ページタイトル
   */
  const pageTitle = computed(() => {
    const meta = route.meta as RouteMeta
    return meta.title || ''
  })

  /**
   * 機能グループ名
   */
  const pageGroup = computed(() => {
    const meta = route.meta as RouteMeta
    return meta.group || ''
  })

  /**
   * 親画面のパス
   */
  const parentPath = computed(() => {
    const meta = route.meta as RouteMeta
    return meta.parent || null
  })

  /**
   * 親画面に戻る
   */
  const backToParent = () => {
    const meta = route.meta as RouteMeta

    if (meta.parent) {
      router.push(meta.parent)
    } else {
      router.back()
    }
  }

  /**
   * 指定されたパスに遷移
   */
  const navigateTo = (path: string | { path: string }) => {
    router.push(path)
  }

  /**
   * ブラウザ履歴を戻る
   */
  const goBack = () => {
    router.back()
  }

  /**
   * ブラウザ履歴を進む
   */
  const goForward = () => {
    router.forward()
  }

  return {
    breadcrumbs,
    pageTitle,
    pageGroup,
    parentPath,
    backToParent,
    navigateTo,
    goBack,
    goForward
  }
}
