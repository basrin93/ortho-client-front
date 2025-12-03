/* eslint-disable */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { jwtDecode } from 'jwt-decode'
import type { User } from './types'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref(localStorage.getItem('token') || '')

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
    decodeToken()
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  function decodeToken() {
    if (!token.value) return
    try {
      const decoded: any = jwtDecode(token.value)
      user.value = {
        userId: decoded.sub,
        email: decoded.email
      }
    } catch (e) {
      logout()
    }
  }

  const isAuthenticated = computed(() => !!token.value)

  decodeToken()

  return { 
    user, 
    token, 
    isAuthenticated, 
    setToken, 
    logout 
  }
})
