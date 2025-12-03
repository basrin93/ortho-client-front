<script setup lang="ts">
import { useUserStore } from '@/entities/user/model/store'
import DefaultLayout from '@/app/layouts/DefaultLayout.vue'
import NotificationContainer from '@/shared/ui/NotificationContainer.vue'

const userStore = useUserStore()
</script>

<template>
  <v-app>
    <DefaultLayout v-if="userStore.isAuthenticated" />
    <router-view v-else />
    
    <!-- Глобальные уведомления -->
    <NotificationContainer />
  </v-app>
</template>

<style>
* {
  font-family: 'Montserrat', sans-serif !important;
}

body {
  font-family: 'Montserrat', sans-serif !important;
}

/* Глобальные стили для кнопок */
.v-btn {
  font-family: 'Montserrat', sans-serif !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0.5px !important;
}

/* Основные кнопки (primary, error, success и т.д.) - белый текст */
.v-btn--elevated:not(.v-btn--variant-text),
.v-btn--variant-elevated:not(.v-btn--variant-text),
.v-btn--variant-flat:not(.v-btn--variant-text) {
  color: white !important;
  font-weight: 700 !important;
}

/* Кнопки с цветом */
.v-btn--variant-elevated.v-btn--density-default,
.v-btn--variant-flat.v-btn--density-default {
  color: white !important;
  font-weight: 700 !important;
}

/* Для кнопок с variant="text" - оставляем исходный цвет */
.v-btn--variant-text {
  color: inherit !important;
  font-weight: 500 !important;
}

/* Для disabled кнопок */
.v-btn--disabled {
  color: rgba(255, 255, 255, 0.38) !important;
}

/* Кнопки с градиентом и специальные классы */
.submit-button,
.save-button,
.logout-button {
  color: white !important;
  font-weight: 700 !important;
}

/* Кнопки primary через Vuetify */
.v-btn[color="primary"]:not(.v-btn--variant-text),
.v-btn.bg-primary,
.v-btn--elevated.bg-primary {
  color: white !important;
  font-weight: 700 !important;
}
</style>