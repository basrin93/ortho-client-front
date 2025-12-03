<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/shared/api'
import { useUserStore } from '@/entities/user/model/store'

// Подключаем хранилище и роутер
const userStore = useUserStore()
const router = useRouter()

// Состояние
const authTab = ref('login')
const email = ref('')
const password = ref('')
const loading = ref(false)
const showPassword = ref(false)
const confirmPassword = ref('')
const showConfirmPassword = ref(false)

// Очистка полей при смене вкладки
watch(authTab, () => {
  password.value = ''
  confirmPassword.value = ''
  showPassword.value = false
  showConfirmPassword.value = false
})

// Уведомления
const snackbar = ref({ show: false, text: '', color: 'success' })
const notify = (text: string, color: string = 'success') => {
  snackbar.value = { show: true, text, color }
}

// Вычисляемые свойства для валидации
const isFormValid = computed(() => {
  if (authTab.value === 'login') {
    return email.value && password.value && password.value.length >= 6
  } else {
    return (
      email.value &&
      password.value &&
      password.value.length >= 6 &&
      confirmPassword.value === password.value
    )
  }
})

// --- Действия ---

const login = async () => {
  if (!isFormValid.value) {
    notify('Заполните все поля корректно. Пароль должен содержать минимум 6 символов.', 'warning')
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/login', { email: email.value, password: password.value })
    userStore.setToken(res.data.access_token)
    
    // Очищаем форму
    email.value = ''
    password.value = ''
    loading.value = false
    
    // Мгновенно перенаправляем на главную страницу (без await для мгновенного перехода)
    router.push('/')
    
    // Показываем уведомление после перенаправления
    notify('Добро пожаловать!', 'success')
  } catch (e: any) {
    const errorMessage = e?.message || e?.response?.data?.message || 'Ошибка входа. Проверьте данные.'
    notify(errorMessage, 'error')
    loading.value = false
  }
}

const register = async () => {
  if (!isFormValid.value) {
    if (password.value !== confirmPassword.value) {
      notify('Пароли не совпадают', 'error')
    } else {
      notify('Заполните все поля корректно. Пароль должен содержать минимум 6 символов.', 'warning')
    }
    return
  }

  loading.value = true
  try {
    await api.post('/auth/register', { email: email.value, password: password.value })
    notify('Регистрация успешна! Теперь войдите.', 'success')
    setTimeout(() => {
      authTab.value = 'login'
      password.value = ''
      confirmPassword.value = ''
    }, 1500)
  } catch (e: any) {
    const errorMessage = e?.response?.data?.message || 'Ошибка регистрации.'
    notify(errorMessage, 'error')
  } finally {
    loading.value = false
  }
}

const handleSubmit = () => {
  if (authTab.value === 'login') {
    login()
  } else {
    register()
  }
}
</script>

<template>
  <div class="auth-container">
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top" timeout="4000" elevation="8">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn icon="mdi-close" variant="text" size="small" @click="snackbar.show = false"></v-btn>
      </template>
    </v-snackbar>

    <!-- Декоративные элементы фона -->
    <div class="bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
    </div>

    <v-card class="auth-card" elevation="24" rounded="xl">
      <!-- Заголовок с градиентом -->
      <div class="auth-header">
        <div class="logo-wrapper">
          <svg class="logo-svg" viewBox="0 0 340 110" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <!-- Градиент для розовой линии - более яркий -->
              <linearGradient id="pinkGradientLogin" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#FF9FB5;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#FF6B9D;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#E91E63;stop-opacity:1" />
              </linearGradient>
              <!-- Градиент для голубой линии - более яркий -->
              <linearGradient id="cyanGradientLogin" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#80DEEA;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#4DD0E1;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#00ACC1;stop-opacity:1" />
              </linearGradient>
              <!-- Градиент для текста - более контрастный -->
              <linearGradient id="textGradientLogin" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#BA68C8;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#9C27B0;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#7B1FA2;stop-opacity:1" />
              </linearGradient>
              <!-- Улучшенная тень для текста -->
              <filter id="textShadowLogin" x="-50%" y="-50%" width="200%" height="200%">
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
              <filter id="textStrokeLogin">
                <feMorphology operator="dilate" radius="0.5"/>
              </filter>
            </defs>
            <!-- Розовая изогнутая линия сверху - более четкая -->
            <path
              d="M 15 28 C 60 12, 100 8, 170 18 C 240 28, 280 32, 325 28"
              stroke="url(#pinkGradientLogin)"
              stroke-width="5"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <!-- Голубая изогнутая линия снизу - более четкая -->
            <path
              d="M 15 82 C 60 98, 100 102, 170 92 C 240 82, 280 78, 325 82"
              stroke="url(#cyanGradientLogin)"
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
              font-size="21"
              font-weight="800"
              fill="url(#textGradientLogin)"
              text-anchor="middle"
              dominant-baseline="middle"
              letter-spacing="2.2"
              filter="url(#textShadowLogin)"
              style="text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased;"
            >
              DR. BASTANOVA E.N
            </text>
          </svg>
        </div>
      </div>

      <!-- Переключатель вкладок -->
      <div class="auth-tabs">
        <button
          :class="['tab-button', { active: authTab === 'login' }]"
          @click="authTab = 'login'"
        >
          <v-icon size="20" class="mr-2">mdi-login</v-icon>
          <span>Вход</span>
        </button>
        <button
          :class="['tab-button', { active: authTab === 'register' }]"
          @click="authTab = 'register'"
        >
          <v-icon size="20" class="mr-2">mdi-account-plus</v-icon>
          <span>Регистрация</span>
        </button>
      </div>

      <!-- Форма -->
      <v-card-text class="auth-form">
        <v-form @submit.prevent="handleSubmit">
          <transition name="fade" mode="out-in">
            <div :key="authTab">
              <!-- Email поле -->
              <div class="form-field-wrapper">
                <v-text-field
                  v-model="email"
                  label="Email"
                  type="email"
                  prepend-inner-icon="mdi-email-outline"
                  variant="outlined"
                  density="comfortable"
                  rounded="lg"
                  hide-details="auto"
                  :rules="[
                    (v) => !!v || 'Email обязателен',
                    (v) => /.+@.+\..+/.test(v) || 'Некорректный email',
                  ]"
                  class="custom-field"
                ></v-text-field>
              </div>

              <!-- Поле пароля -->
              <div class="form-field-wrapper">
                <v-text-field
                  v-model="password"
                  label="Пароль"
                  :type="showPassword ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="outlined"
                  density="comfortable"
                  rounded="lg"
                  hide-details="auto"
                  :rules="[
                    (v) => !!v || 'Пароль обязателен',
                    (v) => (v && v.length >= 6) || 'Минимум 6 символов',
                  ]"
                  @click:append-inner="showPassword = !showPassword"
                  class="custom-field"
                ></v-text-field>
              </div>

              <!-- Подтверждение пароля для регистрации -->
              <transition name="slide-fade">
                <div v-if="authTab === 'register'" class="form-field-wrapper">
                  <v-text-field
                    v-model="confirmPassword"
                    label="Подтвердите пароль"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    prepend-inner-icon="mdi-lock-check-outline"
                    :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details="auto"
                    :rules="[
                      (v) => !!v || 'Подтвердите пароль',
                      (v) => v === password || 'Пароли не совпадают',
                    ]"
                    @click:append-inner="showConfirmPassword = !showConfirmPassword"
                    class="custom-field"
                  ></v-text-field>
                </div>
              </transition>
            </div>
          </transition>

          <!-- Кнопка отправки -->
          <v-btn
            block
            size="x-large"
            color="primary"
            class="submit-button mt-8"
            :loading="loading"
            :disabled="!isFormValid"
            @click="handleSubmit"
            rounded="lg"
            elevation="4"
          >
            <v-icon size="24" class="mr-2">{{ authTab === 'login' ? 'mdi-login-variant' : 'mdi-account-plus' }}</v-icon>
            <span>{{ authTab === 'login' ? 'Войти в систему' : 'Создать аккаунт' }}</span>
          </v-btn>

          <!-- Дополнительная информация -->
          <div class="auth-footer mt-6">
            <p class="text-caption text-medium-emphasis text-center">
              {{
                authTab === 'login'
                  ? 'Забыли пароль? Обратитесь к администратору'
                  : 'Регистрируясь, вы соглашаетесь с условиями использования'
              }}
            </p>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #212121 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  padding: 20px;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Декоративные элементы фона */
.bg-decoration {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  animation: float 20s infinite ease-in-out;
}

.bg-circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
  animation-delay: 0s;
}

.bg-circle-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
  animation-delay: 5s;
}

.bg-circle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 10%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

/* Карточка */
.auth-card {
  width: 100%;
  max-width: 480px;
  position: relative;
  z-index: 1;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
}

/* Заголовок */
.auth-header {
  background: linear-gradient(135deg, #212121 0%, #1a1a1a 100%);
  padding: 48px 32px 32px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.auth-header::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.logo-wrapper {
  position: relative;
  z-index: 1;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.logo-svg {
  width: 100%;
  max-width: 350px;
  height: auto;
  max-height: 130px;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
  transition: all 0.3s ease;
}

.logo-wrapper:hover .logo-svg {
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.25));
  transform: scale(1.03);
}

.auth-title {
  position: relative;
  z-index: 1;
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.auth-subtitle {
  position: relative;
  z-index: 1;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-weight: 400;
}

/* Вкладки */
.auth-tabs {
  display: flex;
  background: #f5f5f5;
  padding: 8px;
  margin: 0;
  border-radius: 0;
  gap: 8px;
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: none;
  background: transparent;
  color: #757575;
  font-size: 15px;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.tab-button:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #424242;
}

.tab-button.active {
  background: linear-gradient(135deg, #212121 0%, #1a1a1a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(33, 33, 33, 0.3);
  transform: translateY(-2px);
}

.tab-button span {
  font-weight: 600;
}

/* Форма */
.auth-form {
  padding: 40px 32px 32px;
}

.form-field-wrapper {
  margin-bottom: 20px;
}

.custom-field :deep(.v-field) {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.custom-field :deep(.v-field--focused) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 33, 33, 0.2);
}

.custom-field :deep(.v-field__input) {
  padding: 12px 16px;
  font-size: 15px;
}

.custom-field :deep(.v-label) {
  font-size: 14px;
  font-weight: 500;
}

/* Кнопка */
.submit-button {
  height: 56px !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px;
  text-transform: none;
  color: white !important;
  background: linear-gradient(135deg, #212121 0%, #1a1a1a 100%) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(33, 33, 33, 0.4) !important;
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Футер */
.auth-footer {
  opacity: 0.7;
}

/* Анимации */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Адаптивность */
@media (max-width: 600px) {
  .auth-card {
    max-width: 100%;
    margin: 0;
  }

  .auth-header {
    padding: 36px 24px 24px;
  }

  .auth-title {
    font-size: 28px;
  }

  .auth-form {
    padding: 32px 24px 24px;
  }

  .submit-button {
    height: 52px !important;
  }
}

/* Темная тема */
:deep(.v-theme--dark) .auth-card {
  background: rgba(30, 30, 30, 0.95);
}

:deep(.v-theme--dark) .auth-tabs {
  background: rgba(255, 255, 255, 0.05);
}

:deep(.v-theme--dark) .tab-button {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.v-theme--dark) .tab-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}
</style>