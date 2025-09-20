import { defineStore } from 'pinia'
import { ref } from 'vue'

interface User {
  id: number
  username: string
  name: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<User | null>(null)

  const setToken = (newToken: string) => {
    token.value = newToken
  }

  const setUser = (newUser: User) => {
    user.value = newUser
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return {
    token,
    user,
    setToken,
    setUser,
    logout
  }
})