import { defineStore } from 'pinia'
import { ref } from 'vue'

interface User {
  id: number
  username: string
  name: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUser = (newUser: User) => {
    user.value = newUser
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  // 初期化時にローカルストレージからトークンを復元
  const initializeAuth = () => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      token.value = storedToken
      // トークンが有効かチェックし、ユーザー情報を取得する処理も追加可能
    }
  }

  return {
    token,
    user,
    setToken,
    setUser,
    logout,
    initializeAuth
  }
})