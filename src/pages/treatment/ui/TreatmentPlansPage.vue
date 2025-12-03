<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTreatmentStore } from '@/entities/treatment/model/store'
import { usePatientStore } from '@/entities/patient/model/store'
import { useNotify } from '@/shared/ui/notify'
import TreatmentPlanDialog from './TreatmentPlanDialog.vue'
import TreatmentPlanViewDialog from '@/pages/patient/ui/TreatmentPlanViewDialog.vue'
import type { Patient } from '@/entities/patient/model/types'
import type { TreatmentPlan } from '@/entities/treatment/model/types'

const route = useRoute()
const router = useRouter()
const treatmentStore = useTreatmentStore()
const patientStore = usePatientStore()
const { success, error: showError } = useNotify()

const showDialog = ref(false)
const selectedPatientId = ref<string | null>(null)
const showPlanViewDialog = ref(false)
const selectedPlanForView = ref<TreatmentPlan | null>(null)

onMounted(async () => {
  // Загружаем пациентов
  await patientStore.fetchPatients()
  
  // Проверяем query параметр patientId
  const patientIdFromQuery = route.query.patientId as string
  if (patientIdFromQuery) {
    selectedPatientId.value = patientIdFromQuery
  }
  
  // Загружаем планы
  await treatmentStore.fetchPlans()
})

// Список пациентов для фильтра
const patients = computed(() => patientStore.patients)

// Выбранный пациент
const selectedPatient = computed(() => {
  if (!selectedPatientId.value) return null
  return patientStore.getPatientById(selectedPatientId.value) || null
})

// Фильтрованные и отсортированные планы
const sortedPlans = computed(() => {
  let plans = treatmentStore.plans
  
  // Фильтруем по пациенту, если выбран
  if (selectedPatientId.value) {
    plans = plans.filter(p => p.patientId === selectedPatientId.value)
  }
  
  // Сортировка (активные сначала)
  return [...plans].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1
    }
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
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
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function onPlanCreated() {
  treatmentStore.fetchPlans()
}

function viewPlan(plan: TreatmentPlan) {
  selectedPlanForView.value = plan
  showPlanViewDialog.value = true
}
</script>

<template>
  <div class="treatment-page">
    <!-- Заголовок -->
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1 class="page-title">Планы лечения</h1>
          <p class="page-subtitle">
            <span v-if="selectedPatient">
              Планы пациента: <strong>{{ selectedPatient.firstName }} {{ selectedPatient.lastName }}</strong>
              <span class="ml-2">• Всего: <strong>{{ sortedPlans.length }}</strong></span>
              <span v-if="sortedPlans.filter(p => p.isActive).length > 0" class="ml-2">
                • Активных: <strong>{{ sortedPlans.filter(p => p.isActive).length }}</strong>
              </span>
            </span>
            <span v-else>
              Всего планов: <strong>{{ sortedPlans.length }}</strong>
              <span v-if="sortedPlans.filter(p => p.isActive).length > 0" class="ml-2">
                • Активных: <strong>{{ sortedPlans.filter(p => p.isActive).length }}</strong>
              </span>
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
          Создать план
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
    <div v-if="treatmentStore.isLoading" class="loading-container">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4 text-grey">Загрузка планов лечения...</p>
    </div>

    <!-- Пустое состояние -->
    <div v-else-if="sortedPlans.length === 0" class="empty-state">
      <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-tooth-outline</v-icon>
      <h3 class="text-h6 text-grey-darken-1 mb-2">
        {{ selectedPatientId ? 'Нет планов лечения у этого пациента' : 'Нет планов лечения' }}
      </h3>
      <p class="text-body-1 text-grey mb-6">
        {{ selectedPatientId 
          ? 'Начните с создания первого плана лечения для этого пациента' 
          : 'Выберите пациента, чтобы увидеть его планы, или создайте новый план' }}
      </p>
      <v-btn
        v-if="selectedPatientId"
        color="primary"
        size="large"
        rounded="lg"
        prepend-icon="mdi-plus"
        @click="showDialog = true"
      >
        Создать план
      </v-btn>
    </div>

    <!-- Список планов -->
    <div v-else class="plans-list">
      <v-card
        v-for="plan in sortedPlans"
        :key="plan.id"
        class="plan-card"
        elevation="2"
        rounded="xl"
        :class="{ 'plan-card-active': plan.isActive }"
      >
        <v-card-text class="pa-6">
          <div class="d-flex align-start justify-space-between mb-4">
            <div class="plan-header">
              <div class="plan-diagnosis">{{ plan.diagnosis }}</div>
              <div class="plan-apparatus">{{ plan.apparatusType }}</div>
            </div>
            <v-chip
              size="small"
              :color="plan.isActive ? 'success' : 'grey'"
              variant="tonal"
              :prepend-icon="plan.isActive ? 'mdi-check-circle' : 'mdi-pause-circle'"
            >
              {{ plan.isActive ? 'Активен' : 'Неактивен' }}
            </v-chip>
          </div>

          <div class="plan-date mb-4">
            <v-icon size="20" class="mr-2" color="grey">mdi-calendar-start</v-icon>
            <span class="text-body-2">Начало лечения: {{ formatDate(plan.startDate) }}</span>
          </div>

          <div class="d-flex justify-end">
            <v-btn
              color="primary"
              variant="text"
              prepend-icon="mdi-eye"
              size="small"
              @click="viewPlan(plan)"
            >
              Полный просмотр
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Диалог создания плана -->
    <TreatmentPlanDialog v-model="showDialog" :patient-id="selectedPatientId" @success="onPlanCreated" />
    
    <!-- Диалог просмотра плана -->
    <TreatmentPlanViewDialog
      v-model="showPlanViewDialog"
      :plan="selectedPlanForView"
      :patient="selectedPlanForView ? patientStore.getPatientById(selectedPlanForView.patientId) : null"
    />
  </div>
</template>

<style scoped>
.treatment-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  padding: 40px;
  position: relative;
}

.treatment-page::before {
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

.plans-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
  position: relative;
  z-index: 1;
}

.plan-card {
  background: white;
  transition: all 0.3s ease;
  border-left: 4px solid #9e9e9e;
}

.plan-card-active {
  border-left-color: #4caf50;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(33, 33, 33, 0.15) !important;
}

.plan-header {
  flex: 1;
}

.plan-diagnosis {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.plan-apparatus {
  font-size: 14px;
  color: #757575;
  font-weight: 500;
}

.patient-info {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(33, 33, 33, 0.05);
  border-radius: 12px;
}

.plan-date {
  display: flex;
  align-items: center;
  margin-top: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 12px;
}

.patient-filter {
  max-width: 400px;
}

.patient-select :deep(.v-field) {
  background: white;
}

/* Адаптивность */
@media (max-width: 960px) {
  .treatment-page {
    padding: 32px 24px;
  }

  .plans-list {
    grid-template-columns: 1fr;
  }
  
  .patient-filter {
    max-width: 100%;
  }
}

/* Темная тема */
:deep(.v-theme--dark) .treatment-page {
  background: linear-gradient(135deg, #121212 0%, #1e1e1e 100%);
}

:deep(.v-theme--dark) .plan-card {
  background: rgba(255, 255, 255, 0.05);
}

:deep(.v-theme--dark) .patient-info {
  background: rgba(33, 33, 33, 0.1);
}

:deep(.v-theme--dark) .plan-date {
  background: rgba(255, 255, 255, 0.05);
}
</style>

