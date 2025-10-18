import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@core/api/auth'
import { getMenuPermissions, type MenuPermission } from '@core/api/permissions'
import type {
  User,
  LoginRequest,
  LoginResponse,
  TokenVerificationResponse,
  UserRole
} from '@/types/auth'
import { ElMessage } from 'element-plus'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const loginFailureCount = ref(0)
  const menuPermissions = ref<MenuPermission[]>([])

  // Computed properties
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isManager = computed(() => ['ADMIN', 'MANAGER'].includes(user.value?.role || ''))
  const userCompany = computed(() => user.value?.company)
  const userDepartment = computed(() => user.value?.primaryDepartment)

  // Actions
  const setToken = (newToken: string, newRefreshToken?: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)

    if (newRefreshToken) {
      refreshToken.value = newRefreshToken
      localStorage.setItem('refreshToken', newRefreshToken)
    }
  }

  const setUser = (newUser: User) => {
    user.value = newUser
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const clearAuth = () => {
    token.value = null
    refreshToken.value = null
    user.value = null
    menuPermissions.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      isLoading.value = true
      console.log('Logging in with credentials:', credentials.username)
      const response = await authApi.login(credentials)
      console.log('Login response:', response)

      if (response.success && response.data) {
        console.log('Setting token and user...')
        console.log('Token received:', response.data.accessToken)
        setToken(response.data.accessToken, response.data.refreshToken)
        setUser(response.data.user)
        console.log('Token stored in localStorage:', localStorage.getItem('token'))
        console.log('Refresh token stored in localStorage:', localStorage.getItem('refreshToken'))
        loginFailureCount.value = 0

        // メニュー権限を取得
        try {
          await loadMenuPermissions()
        } catch (error) {
          console.error('Failed to load menu permissions:', error)
          // 権限取得に失敗してもログインは続行
        }

        ElMessage.success('ログインしました')
        return true
      } else {
        loginFailureCount.value++
        ElMessage.error(response.error?.message || 'ログインに失敗しました')
        return false
      }
    } catch (error: any) {
      loginFailureCount.value++
      console.error('Login error:', error)

      if (error.response?.status === 429) {
        ElMessage.error('ログイン試行回数が上限に達しました。15分後に再試行してください。')
      } else {
        ElMessage.error('ログインに失敗しました')
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      if (token.value) {
        await authApi.logout()
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuth()
      ElMessage.success('ログアウトしました')
    }
  }

  const verifyToken = async (): Promise<boolean> => {
    if (!token.value) {
      return false
    }

    try {
      const response = await authApi.verifyToken()

      if (response.success && response.data) {
        setUser(response.data.user)
        // メニュー権限も更新
        await loadMenuPermissions()
        return true
      } else {
        clearAuth()
        return false
      }
    } catch (error) {
      console.error('Token verification error:', error)
      clearAuth()
      return false
    }
  }

  const initializeAuth = async (): Promise<void> => {
    const storedToken = localStorage.getItem('token')
    const storedRefreshToken = localStorage.getItem('refreshToken')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      token.value = storedToken
      refreshToken.value = storedRefreshToken
      try {
        user.value = JSON.parse(storedUser)
        // トークンの有効性を確認
        const isValid = await verifyToken()
        if (!isValid) {
          clearAuth()
        } else {
          // 有効な場合はメニュー権限を読み込み
          await loadMenuPermissions()
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        clearAuth()
      }
    }

    // 複数タブ間での認証状態同期（localStorageイベント）
    window.addEventListener('storage', (event) => {
      // 他のタブでトークンが削除された場合
      if (event.key === 'token' && event.newValue === null) {
        console.log('Token removed in another tab, logging out...')
        clearAuth()
        ElMessage.warning('他のタブでログアウトされました')
        window.location.href = '/login'
      }

      // 他のタブでトークンが更新された場合
      if (event.key === 'token' && event.newValue && event.newValue !== token.value) {
        console.log('Token updated in another tab, syncing...')
        token.value = event.newValue
      }

      // 他のタブでリフレッシュトークンが更新された場合
      if (event.key === 'refreshToken' && event.newValue && event.newValue !== refreshToken.value) {
        console.log('Refresh token updated in another tab, syncing...')
        refreshToken.value = event.newValue
      }

      // 他のタブでユーザー情報が更新された場合
      if (event.key === 'user' && event.newValue) {
        try {
          const newUser = JSON.parse(event.newValue)
          if (JSON.stringify(newUser) !== JSON.stringify(user.value)) {
            console.log('User info updated in another tab, syncing...')
            user.value = newUser
          }
        } catch (error) {
          console.error('Failed to parse user data from storage event:', error)
        }
      }
    })
  }

  const hasPermission = (featureCode: string, action?: string): boolean => {
    if (!user.value) return false

    // 管理者は全機能にアクセス可能
    if (user.value.role === 'ADMIN') return true

    // TODO: 実際の権限チェックロジックを実装
    // 現在は役割ベースの簡易チェック
    switch (user.value.role) {
      case 'MANAGER':
        return ['USER_MGMT', 'DEPT_MGMT', 'REPORT'].includes(featureCode)
      case 'USER':
        return ['REPORT'].includes(featureCode)
      case 'GUEST':
        return false
      default:
        return false
    }
  }

  const getDisplayName = (): string => {
    return user.value?.name || user.value?.username || 'ユーザー'
  }

  const loadMenuPermissions = async (): Promise<void> => {
    if (!token.value) return

    try {
      const response = await getMenuPermissions()
      if (response.success && response.data) {
        menuPermissions.value = response.data.menuItems
      }
    } catch (error) {
      console.error('Failed to load menu permissions:', error)
      menuPermissions.value = []
    }
  }

  const hasMenuAccess = (path: string): boolean => {
    if (!user.value) return false

    // 管理者は全てのメニューにアクセス可能
    if (user.value.role === 'ADMIN') return true

    // メニュー権限をチェック
    const menuItem = menuPermissions.value.find(item => item.path === path)
    return menuItem?.hasAccess || false
  }

  const getAccessibleMenuItems = () => {
    return menuPermissions.value.filter(item => item.hasAccess)
  }

  return {
    // State
    token,
    refreshToken,
    user,
    isLoading,
    loginFailureCount,
    menuPermissions,

    // Computed
    isAuthenticated,
    isAdmin,
    isManager,
    userCompany,
    userDepartment,

    // Actions
    login,
    logout,
    verifyToken,
    initializeAuth,
    setToken,
    setUser,
    clearAuth,
    hasPermission,
    getDisplayName,
    loadMenuPermissions,
    hasMenuAccess,
    getAccessibleMenuItems
  }
})