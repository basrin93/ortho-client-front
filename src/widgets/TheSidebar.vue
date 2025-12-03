<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/entities/user/model/store'
import { useDisplay } from 'vuetify'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { mobile } = useDisplay()

const drawer = ref(true)
const isMobile = computed(() => mobile.value)

// На мобильных устройствах меню закрыто по умолчанию
onMounted(() => {
  if (isMobile.value) {
    drawer.value = false
  }
})

// Экспортируем функцию для переключения меню
const toggleDrawer = () => {
  drawer.value = !drawer.value
}

// Закрываем меню при навигации на мобильных
const navigateTo = (routePath: string) => {
  router.push(routePath)
  if (isMobile.value) {
    drawer.value = false
  }
}

// Закрываем меню при клике вне его на мобильных
const closeDrawer = () => {
  if (isMobile.value) {
    drawer.value = false
  }
}

// Определяем, должен ли drawer быть permanent (только на десктопе)
const isPermanent = computed(() => !isMobile.value)

// Экспортируем drawer для использования в родительском компоненте
defineExpose({
  toggleDrawer,
  drawer
})

// Навигационные пункты меню
const navItems = [
  { 
    title: 'Пациенты', 
    icon: 'mdi-account-group', 
    route: '/',
  },
]

// Проверка активного пункта меню
const isActive = (itemRoute: string) => {
  return route.path === itemRoute || route.path.startsWith(itemRoute + '/')
}


// Выход из системы
async function handleLogout() {
  userStore.logout()
  await router.push('/login')
}
</script>

<template>
  <!-- Overlay для мобильных устройств -->
  <div 
    v-if="isMobile && drawer" 
    class="sidebar-overlay"
    @click="closeDrawer"
  ></div>
  
  <v-navigation-drawer
    v-model="drawer"
    elevation="0"
    :permanent="isPermanent"
    :temporary="isMobile"
    width="280"
    class="sidebar"
    location="left"
  >
    <!-- Логотип и название -->
    <div class="sidebar-logo">
      <svg class="logo-svg" viewBox="0 0 340 110" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Градиент для розовой линии - более яркий -->
          <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#FF9FB5;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#FF6B9D;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#E91E63;stop-opacity:1" />
          </linearGradient>
          <!-- Градиент для голубой линии - более яркий -->
          <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#80DEEA;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#4DD0E1;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#00ACC1;stop-opacity:1" />
          </linearGradient>
          <!-- Градиент для текста - более контрастный -->
          <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#BA68C8;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#9C27B0;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7B1FA2;stop-opacity:1" />
          </linearGradient>
          <!-- Улучшенная тень для текста -->
          <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <!-- Обводка для текста -->
          <filter id="textStroke">
            <feMorphology operator="dilate" radius="0.5"/>
          </filter>
        </defs>
        <!-- Розовая изогнутая линия сверху - более четкая -->
        <path
          d="M 15 28 C 60 12, 100 8, 170 18 C 240 28, 280 32, 325 28"
          stroke="url(#pinkGradient)"
          stroke-width="5"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Голубая изогнутая линия снизу - более четкая -->
        <path
          d="M 15 82 C 60 98, 100 102, 170 92 C 240 82, 280 78, 325 82"
          stroke="url(#cyanGradient)"
          stroke-width="5"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Текст с градиентом, тенью и улучшенной типографикой -->
        <text
          x="170"
          y="58"
          font-family="'Montserrat', 'Segoe UI', 'Arial', sans-serif"
          font-size="19"
          font-weight="800"
          fill="url(#textGradient)"
          text-anchor="middle"
          dominant-baseline="middle"
          letter-spacing="2.2"
          filter="url(#textShadow)"
          style="text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased;"
        >
          DR. BASTANOVA E.N
        </text>
      </svg>
    </div>

    <!-- Профиль пользователя -->
    <div class="sidebar-header">
      <v-avatar size="64" class="user-avatar">
        <span class="text-h5 font-weight-bold">
          {{ userStore.user?.email?.[0]?.toUpperCase() || 'U' }}
        </span>
      </v-avatar>
      <div class="user-info">
        <div class="user-email">{{ userStore.user?.email || 'Загрузка...' }}</div>
        <div class="user-role">Врач-ортодонт</div>
      </div>
    </div>

    <v-divider class="sidebar-divider"></v-divider>

    <!-- Навигация -->
    <v-list density="comfortable" nav class="sidebar-nav">
      <v-list-item
        v-for="item in navItems"
        :key="item.route"
        :prepend-icon="item.icon"
        :title="item.title"
        :active="isActive(item.route)"
        :value="item.route"
        rounded="xl"
        class="nav-item"
        @click="() => navigateTo(item.route)"
      >
        <template v-slot:prepend>
          <v-icon 
            :icon="item.icon" 
            :color="isActive(item.route) ? 'white' : undefined"
            size="24"
          ></v-icon>
        </template>
        <template v-slot:title>
          <span class="nav-item-title">{{ item.title }}</span>
        </template>
      </v-list-item>
    </v-list>

    <v-spacer></v-spacer>

    <!-- Нижняя часть -->
    <div class="sidebar-footer">
      <!-- Кнопка выхода -->
      <v-btn
        block
        color="grey"
        variant="text"
        size="large"
        rounded="xl"
        prepend-icon="mdi-logout"
        class="logout-button"
        @click="handleLogout"
      >
        Выйти
      </v-btn>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.sidebar {
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%) !important;
  border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.04);
  display: flex !important;
  flex-direction: column !important;
  height: 100vh;
  overflow-y: auto;
}

/* Логотип */
.sidebar-logo {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #212121 0%, #1a1a1a 100%);
  margin: 0;
}

.logo-svg {
  width: 100%;
  max-width: 280px;
  height: auto;
  max-height: 85px;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15));
  transition: all 0.3s ease;
}

.sidebar-logo:hover .logo-svg {
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.2));
  transform: scale(1.02);
}

/* Профиль */
.sidebar-header {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, rgba(33, 33, 33, 0.05) 0%, rgba(26, 26, 26, 0.02) 100%);
}

.user-avatar {
  background: linear-gradient(135deg, #212121 0%, #1a1a1a 100%) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(33, 33, 33, 0.3);
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-email {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  word-break: break-word;
  margin-bottom: 4px;
  line-height: 1.3;
}

.user-role {
  font-size: 12px;
  color: #757575;
}

.sidebar-divider {
  margin: 8px 16px;
  opacity: 0.1;
}

/* Навигация */
.sidebar-nav {
  padding: 12px 16px;
  flex: 1;
  overflow-y: auto;
}

.nav-item {
  margin-bottom: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px !important;
  min-height: 48px;
}

.nav-item :deep(.v-list-item__overlay) {
  opacity: 0;
}

.nav-item:hover {
  background: rgba(33, 33, 33, 0.08) !important;
  transform: translateX(4px);
}

.nav-item.v-list-item--active {
  background: linear-gradient(135deg, #212121 0%, #1a1a1a 100%) !important;
  color: white !important;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(33, 33, 33, 0.3);
  transform: translateX(4px);
}

.nav-item-title {
  font-weight: 500;
  font-size: 14px;
}

.nav-item.v-list-item--active .nav-item-title {
  font-weight: 600;
}

/* Футер */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}

/* На мобильных делаем кнопку выхода sticky */
@media (max-width: 960px) {
  .sidebar-footer {
    position: sticky;
    bottom: 0;
    background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
    z-index: 10;
  }
}

.logout-button {
  color: #757575 !important;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  font-weight: 500 !important;
}

.logout-button:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05) !important;
}

/* Overlay для мобильных */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Адаптивность */
@media (max-width: 960px) {
  .sidebar {
    position: fixed !important;
    z-index: 1000;
    height: 100vh;
  }
}
</style>
