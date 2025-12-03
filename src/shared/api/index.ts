// src/shared/api/index.ts
import axios, { type AxiosError } from 'axios'
import router from '@/app/router'

// Твой адрес сервера
const API_URL = 'https://basrin93-ortho-project-979d.twc1.net'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 секунд таймаут
})

// Автоматически добавляем токен к каждому запросу
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Обработка ответов и ошибок
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    // Обработка ошибок
    if (error.response) {
      const status = error.response.status
      const data = error.response.data as any

      // 401 - неавторизован, перенаправляем на логин
      if (status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
        return Promise.reject(error)
      }

      // 403 - нет доступа
      if (status === 403) {
        return Promise.reject(new Error('У вас нет доступа к этому ресурсу'))
      }

      // 404 - не найдено
      if (status === 404) {
        return Promise.reject(new Error('Ресурс не найден'))
      }

      // 500+ - ошибка сервера
      if (status >= 500) {
        return Promise.reject(new Error('Ошибка сервера. Попробуйте позже'))
      }

      // Остальные ошибки - возвращаем сообщение от сервера
      const message = data?.message || data?.error || 'Произошла ошибка'
      return Promise.reject(new Error(message))
    }

    // Ошибка сети или таймаут
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Превышено время ожидания. Проверьте соединение'))
    }

    if (!error.response) {
      return Promise.reject(new Error('Проблема с сетевым соединением'))
    }

    return Promise.reject(error)
  }
)
