<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVisitStore } from '@/entities/visit/model/store'
import { usePatientStore } from '@/entities/patient/model/store'
import { useNotify } from '@/shared/ui/notify'
import VisitDialog from './VisitDialog.vue'
import type { Patient } from '@/entities/patient/model/types'

const route = useRoute()
const router = useRouter()
const visitStore = useVisitStore()
const patientStore = usePatientStore()
const { success, error: showError } = useNotify()

const showDialog = ref(false)
const selectedPatientId = ref<string | null>(null)

onMounted(async () => {
  // Загружаем пациентов
  await patientStore.fetchPatients()
  
  // Проверяем query параметр patientId
  const patientIdFromQuery = route.query.patientId as string
  if (patientIdFromQuery) {
    selectedPatientId.value = patientIdFromQuery
  }
  
  // Загружаем визиты
  await visitStore.fetchVisits()
})

// Список пациентов для фильтра
const patients = computed(() => patientStore.patients)

// Выбранный пациент
const selectedPatient = computed(() => {
  if (!selectedPatientId.value) return null
  return patientStore.getPatientById(selectedPatientId.value) || null
})

// Фильтрованные и отсортированные визиты
const sortedVisits = computed(() => {
  let visits = visitStore.visits
  
  // Фильтруем по пациенту, если выбран
  if (selectedPatientId.value) {
    visits = visits.filter(v => v.patientId === selectedPatientId.value)
  }
  
  // Сортировка по дате (новые сначала)
  return [...visits].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
})

function onPatientChange(patientId: string | null) {
  selectedPatientId.value = patientId
  // Обновляем URL без перезагрузки страницы
  if (patientId) {
    router.replace({ query: { patientId } })
  } else {
    router.replace({ query: {} })
  }
}

// Форматирование даты
function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function onVisitCreated() {
  visitStore.fetchVisits()
}
</script>

<template>
  <div class="visits-page">
    <!-- Заголовок -->
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1 class="page-title">Визиты</h1>
          <p class="page-subtitle">
            <span v-if="selectedPatient">
              Визиты пациента: <strong>{{ selectedPatient.firstName }} {{ selectedPatient.lastName }}</strong>
              <span class="ml-2">• Всего: <strong>{{ sortedVisits.length }}</strong></span>
            </span>
            <span v-else>
              Всего визитов: <strong>{{ sortedVisits.length }}</strong>
              <span class="text-caption text-grey ml-2">(выберите пациента для фильтрации)</span>
            </span>
          </p>
        </div>
        <v-btn
          color="primary"
          size="large"
          rounded="lg"
          prepend-icon="mdi-plus"
          elevation="2"
          :disabled="!selectedPatientId"
          @click="showDialog = true"
        >
          Записать визит
        </v-btn>
      </div>
      
      <!-- Фильтр по пациенту -->
      <div class="patient-filter mt-4">
        <v-select
          v-model="selectedPatientId"
          :items="patients"
          item-title="firstName"
          item-value="id"
          label="Выберите пациента"
          placeholder="Все пациенты"
          prepend-inner-icon="mdi-account-search"
          variant="outlined"
          clearable
          hide-details
          rounded="lg"
          class="patient-select"
          @update:model-value="onPatientChange"
        >
          <template v-slot:item="{ props, item }">
            <v-list-item
              v-bind="props"
              :title="`${item.raw.firstName} ${item.raw.lastName}`"
              :subtitle="item.raw.phone || 'Без телефона'"
            ></v-list-item>
          </template>
          <template v-slot:selection="{ item }">
            {{ item.raw.firstName }} {{ item.raw.lastName }}
          </template>
        </v-select>
      </div>
    </div>

    <!-- Загрузка -->
    <div v-if="visitStore.isLoading" class="loading-container">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4 text-grey">Загрузка визитов...</p>
    </div>

    <!-- Пустое состояние -->
    <div v-else-if="sortedVisits.length === 0" class="empty-state">
      <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-calendar-check-outline</v-icon>
      <h3 class="text-h6 text-grey-darken-1 mb-2">
        {{ selectedPatientId ? 'Нет визитов у этого пациента' : 'Нет визитов' }}
      </h3>
      <p class="text-body-1 text-grey mb-6">
        {{ selectedPatientId 
          ? 'Начните с записи первого визита для этого пациента' 
          : 'Выберите пациента, чтобы увидеть его визиты, или запишите новый визит' }}
      </p>
      <v-btn
        v-if="selectedPatientId"
        color="primary"
        size="large"
        rounded="lg"
        prepend-icon="mdi-plus"
        @click="showDialog = true"
      >
        Записать визит
      </v-btn>
    </div>

    <!-- Список визитов -->
    <div v-else class="visits-list">
      <v-card
        v-for="visit in sortedVisits"
        :key="visit.id"
        class="visit-card"
        elevation="2"
        rounded="xl"
      >
        <v-card-text class="pa-6">
          <div class="d-flex align-start justify-space-between mb-4">
            <div class="visit-header">
              <div class="visit-date">{{ formatDate(visit.date) }}</div>
              <div class="visit-time">{{ formatDateTime(visit.date).split(', ')[1] }}</div>
            </div>
            <v-chip
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-calendar-check"
            >
              Визит
            </v-chip>
          </div>


          <div class="visit-notes">
            <v-icon size="20" class="mr-2" color="grey">mdi-note-text</v-icon>
            <span class="text-body-1">{{ visit.notes }}</span>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Диалог создания визита -->
    <VisitDialog v-model="showDialog" :patient-id="selectedPatientId" @success="onVisitCreated" />
  </div>
</template>

<style scoped>
.visits-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  padding: 40px;
  position: relative;
}

.visits-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(135deg, rgba(33, 33, 33, 0.05) 0%, rgba(26, 26, 26, 0.03) 100%);
  z-index: 0;
}

.page-header {
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  letter-spacing: -0.8px;
  background: linear-gradient(135deg, #1a1a1a 0%, #424242 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 15px;
  color: #757575;
  margin: 0;
  font-weight: 500;
}

.loading-container,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.visits-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  z-index: 1;
  max-width: 900px;
}

.visit-card {
  background: white;
  transition: all 0.3s ease;
  border-left: 4px solid #212121;
}

.visit-card:hover {
  transform: translateX(4px);
  box-shadow: 0 8px 24px rgba(33, 33, 33, 0.15) !important;
}

.visit-header {
  flex: 1;
}

.visit-date {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.visit-time {
  font-size: 14px;
  color: #757575;
}

.patient-info {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(33, 33, 33, 0.05);
  border-radius: 12px;
}

.visit-notes {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-top: 16px;
  max-height: 200px;
  overflow-y: auto;
  word-wrap: break-word;
  word-break: break-word;
  overflow-x: hidden;
  line-height: 1.6;
}

.visit-notes span {
  flex: 1;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.visit-notes .v-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.visit-notes::-webkit-scrollbar {
  width: 6px;
}

.visit-notes::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

.visit-notes::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.visit-notes::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.patient-filter {
  max-width: 400px;
}

.patient-select :deep(.v-field) {
  background: white;
}

/* Адаптивность */
@media (max-width: 960px) {
  .visits-page {
    padding: 32px 24px;
  }

  .header-content {
    flex-direction: column;
  }
  
  .patient-filter {
    max-width: 100%;
  }

  .visit-notes {
    max-height: 150px;
    padding: 12px;
    font-size: 14px;
  }

  .visit-card {
    margin-bottom: 16px;
  }
}

@media (max-width: 600px) {
  .visit-notes {
    max-height: 120px;
    padding: 10px;
  }

  .visit-date {
    font-size: 16px;
  }

  .visit-time {
    font-size: 12px;
  }
}

/* Темная тема */
:deep(.v-theme--dark) .visits-page {
  background: linear-gradient(135deg, #121212 0%, #1e1e1e 100%);
}

:deep(.v-theme--dark) .visit-card {
  background: rgba(255, 255, 255, 0.05);
}

:deep(.v-theme--dark) .patient-info {
  background: rgba(33, 33, 33, 0.1);
}

:deep(.v-theme--dark) .visit-notes {
  background: rgba(255, 255, 255, 0.05);
}
</style>

