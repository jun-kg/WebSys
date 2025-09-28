import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { getMenuPermissions, type MenuPermission } from '@/api/permissions'
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
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUser = (newUser: User) => {
    user.value = newUser
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const clearAuth = () => {
    token.value = null
    user.value = null
    menuPermissions.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      isLoading.value = true
      const response = await authApi.login(credentials)

      if (response.success && response.data) {
        setToken(response.data.token)
        setUser(response.data.user)
        loginFailureCount.value = 0

        // メニュー権限を取得
        await loadMenuPermissions()

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
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      token.value = storedToken
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