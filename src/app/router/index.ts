// src/app/router/index.ts
/* eslint-disable */
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/entities/user/model/store'
import LoginPage from '@/pages/login/ui/LoginPage.vue'
import HomePage from '@/pages/home/ui/HomePage.vue'
import PatientDetailsPage from '@/pages/patient/ui/PatientDetailsPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), 
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'home',
      component: HomePage,
      meta: { requiresAuth: true }
    },
    {
      path: '/patients/:id',
      name: 'patient-details',
      component: PatientDetailsPage,
      meta: { requiresAuth: true }
    },
  ]
})

// Навигационный Гвард (КПП): проверяет доступ при переходе
router.beforeEach((to) => {
  // Нам нужно Pinia, но Pinia инициализируется только после создания Роутера.
  // Поэтому мы вызываем store прямо внутри beforeEach (это нормально для Pinia!)
  const userStore = useUserStore() 
  
  // Если страница требует входа, а пользователь НЕ авторизован
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    // Перенаправляем на страницу входа
    return { name: 'login' } 
  }

  // Если пользователь пытается зайти на страницу входа, будучи авторизованным
  if (to.name === 'login' && userStore.isAuthenticated) {
    // Перенаправляем на главную
    return { name: 'home' } 
  }
})

export default router