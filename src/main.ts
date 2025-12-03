import { createApp } from 'vue'
import { createPinia } from 'pinia' // 👈 1. Pinia
import App from './App.vue'
import router from '@/app/router' // 👈 2. Наш Роутер

// --- Vuetify ---
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css' // Иконки
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const app = createApp(App)

// Инициализация Pinia
app.use(createPinia())

// Инициализация Vuetify
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#212121', // Dark color
          error: '#E91E63',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#f5f7fa',
          surface: '#ffffff',
        },
      },
    },
  },
})
app.use(vuetify)

// Инициализация Router
app.use(router)

app.mount('#app')