<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePatientStore } from '@/entities/patient/model/store'
import { useTreatmentStore } from '@/entities/treatment/model/store'
import { useNotify } from '@/shared/ui/notify'
import PatientDialog from './PatientDialog.vue'
import PatientPhotosDialog from './PatientPhotosDialog.vue'
import type { Patient } from '@/entities/patient/model/types'

const router = useRouter()
const patientStore = usePatientStore()
const treatmentStore = useTreatmentStore()
const { success, error: showError } = useNotify()

const searchQuery = ref('')
const showDialog = ref(false)
const selectedPatient = ref<Patient | null>(null)
const showDeleteDialog = ref(false)
const patientToDelete = ref<Patient | null>(null)
const menuOpen = ref<Record<string, boolean>>({})
const isUploadingPhoto = ref<Record<string, boolean>>({})
const showPhotosDialog = ref(false)
const selectedPatientForPhotos = ref<Patient | null>(null)

onMounted(async () => {
  await patientStore.fetchPatients()
  await treatmentStore.fetchPlans()
})

// Получить план лечения для пациента
function getPatientPlan(patientId: string) {
  const plans = treatmentStore.getPlansByPatientId(patientId)
  return plans.length > 0 ? plans[0] : null
}

// Фильтрация пациентов по поисковому запросу
const filteredPatients = computed(() => {
  if (!searchQuery.value.trim()) {
    return patientStore.patients
  }
  
  const query = searchQuery.value.toLowerCase()
  return patientStore.patients.filter((patient) => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
    const phone = patient.phone?.toLowerCase() || ''
    return fullName.includes(query) || phone.includes(query)
  })
})

// Вычисление возраста
function getAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Форматирование даты
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Открытие диалога добавления
function openAddDialog() {
  selectedPatient.value = null
  showDialog.value = true
}

// Открытие диалога редактирования
function openEditDialog(patient: Patient, event: Event) {
  event.stopPropagation()
  event.preventDefault()
  menuOpen.value[patient.id] = false
  selectedPatient.value = patient
  showDialog.value = true
}

// Удаление пациента
function confirmDelete(patient: Patient, event?: Event) {
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }
  patientToDelete.value = patient
  showDeleteDialog.value = true
}

async function deletePatient() {
  if (patientToDelete.value) {
    try {
      await patientStore.deleteById(patientToDelete.value.id)
      success('Пациент успешно удален')
      showDeleteDialog.value = false
      patientToDelete.value = null
      // Обновляем список пациентов
      await patientStore.fetchPatients()
    } catch (e: any) {
      const errorMessage = e?.message || 'Ошибка при удалении пациента'
      showError(errorMessage)
    }
  }
}

// Обновление списка после создания/редактирования
function onPatientCreated() {
  patientStore.fetchPatients()
}

// Просмотр фото пациента
function openPhotosDialog(patient: Patient, event: Event) {
  event.stopPropagation()
  event.preventDefault()
  menuOpen.value[patient.id] = false
  selectedPatientForPhotos.value = patient
  showPhotosDialog.value = true
}

// Навигация к деталям пациента
function navigateToPatientDetails(patientId: string) {
  router.push({ name: 'patient-details', params: { id: patientId } })
}

// Загрузка фото
function handlePhotoUploadClick(patient: Patient, event: Event) {
  event.stopPropagation()
  event.preventDefault()
  menuOpen.value[patient.id] = false
  
  // Создаем скрытый input для выбора файла
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.style.display = 'none'
  
  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files[0]) {
      const file = target.files[0]
      isUploadingPhoto.value[patient.id] = true
      
      try {
        await patientStore.uploadPhoto(patient.id, file)
        success('Фото успешно загружено')
        await patientStore.fetchPatients()
      } catch (error: any) {
        const errorMessage = error?.message || 'Ошибка при загрузке фото'
        showError(errorMessage)
      } finally {
        isUploadingPhoto.value[patient.id] = false
      }
    }
  }
  
  input.click()
}
</script>

<template>
  <div class="patients-page">
    <!-- Заголовок и поиск -->
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1 class="page-title">Пациенты</h1>
          <p class="page-subtitle">
            Всего: <strong>{{ patientStore.patients.length }}</strong>
            <span v-if="searchQuery"> • Найдено: <strong>{{ filteredPatients.length }}</strong></span>
          </p>
        </div>
        <v-btn
          color="primary"
          size="large"
          rounded="lg"
          prepend-icon="mdi-plus"
          elevation="2"
          @click="openAddDialog"
        >
          Добавить пациента
        </v-btn>
      </div>

      <!-- Поиск -->
      <v-text-field
        v-model="searchQuery"
        placeholder="Поиск по имени, фамилии или телефону..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        rounded="lg"
        clearable
        hide-details
        class="search-field"
      ></v-text-field>
    </div>

    <!-- Список пациентов -->
    <div v-if="patientStore.isLoading" class="loading-container">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4 text-grey">Загрузка пациентов...</p>
    </div>

    <div v-else-if="filteredPatients.length === 0" class="empty-state">
      <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-account-group-outline</v-icon>
      <h3 class="text-h6 text-grey-darken-1 mb-2">
        {{ searchQuery ? 'Пациенты не найдены' : 'Нет пациентов' }}
      </h3>
      <p class="text-body-1 text-grey mb-6">
        {{ searchQuery ? 'Попробуйте изменить критерии поиска' : 'Начните с добавления первого пациента' }}
      </p>
      <v-btn
        v-if="!searchQuery"
        color="primary"
        size="large"
        rounded="lg"
        prepend-icon="mdi-plus"
        @click="openAddDialog"
      >
        Добавить пациента
      </v-btn>
    </div>

    <div v-else class="patients-grid">
      <v-card
        v-for="patient in filteredPatients"
        :key="patient.id"
        class="patient-card"
        elevation="2"
        rounded="xl"
      >
        <v-card-text class="pa-4 patient-card-content" @click="navigateToPatientDetails(patient.id)">
          <div class="d-flex align-start justify-space-between mb-3">
            <div class="patient-avatar">
              <v-avatar size="48" color="primary" variant="tonal">
                <span class="text-body-1 font-weight-bold">{{ patient.firstName[0] }}{{ patient.lastName[0] }}</span>
              </v-avatar>
            </div>
            <v-menu 
              location="bottom end" 
              :close-on-content-click="true"
              v-model="menuOpen[patient.id]"
            >
              <template v-slot:activator="{ props }">
                <v-btn
                  icon="mdi-dots-vertical"
                  variant="text"
                  size="small"
                  v-bind="props"
                  @click.stop
                ></v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  prepend-icon="mdi-pencil"
                  title="Редактировать"
                  @click="openEditDialog(patient, $event)"
                ></v-list-item>
                <v-divider class="my-1"></v-divider>
                <v-list-item
                  prepend-icon="mdi-delete"
                  title="Удалить"
                  @click="confirmDelete(patient, $event)"
                ></v-list-item>
              </v-list>
            </v-menu>
          </div>

          <h3 class="patient-name text-body-1 font-weight-bold mb-2">
            {{ patient.firstName }} {{ patient.lastName }}
          </h3>
          
          <div class="patient-info">
            <div v-if="patient.birthDate" class="info-item">
              <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
              <span class="text-body-2">{{ formatDate(patient.birthDate) }}</span>
              <span class="text-caption text-grey ml-1">({{ getAge(patient.birthDate) }} лет)</span>
            </div>
            
            <div v-if="patient.phone" class="info-item">
              <v-icon size="14" class="mr-1">mdi-phone</v-icon>
              <span class="text-body-2">{{ patient.phone }}</span>
            </div>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-3" @click.stop>
          <div class="d-flex align-center gap-2">
            <v-chip 
              v-if="getPatientPlan(patient.id)"
              size="x-small" 
              :color="getPatientPlan(patient.id)?.isActive ? 'success' : 'grey'" 
              variant="tonal" 
              :prepend-icon="getPatientPlan(patient.id)?.isActive ? 'mdi-check-circle' : 'mdi-pause-circle'"
            >
              {{ getPatientPlan(patient.id)?.isActive ? 'Активен' : 'Неактивен' }}
            </v-chip>
            <v-chip 
              v-else
              size="x-small" 
              color="grey" 
              variant="tonal" 
              prepend-icon="mdi-minus-circle"
            >
              Нет плана
            </v-chip>
            <v-chip 
              v-if="patient.photos && patient.photos.length > 0"
              size="x-small" 
              color="primary" 
              variant="tonal" 
              prepend-icon="mdi-image"
            >
              {{ patient.photos.length }} фото
            </v-chip>
          </div>
        </v-card-actions>
      </v-card>
    </div>

    <!-- Диалог добавления пациента -->
    <PatientDialog v-model="showDialog" :patient="selectedPatient" @success="onPatientCreated" />

    <!-- Диалог просмотра фото -->
    <PatientPhotosDialog v-model="showPhotosDialog" :patient="selectedPatientForPhotos" />

    <!-- Диалог подтверждения удаления -->
    <v-dialog v-model="showDeleteDialog" max-width="400" persistent>
      <v-card rounded="xl">
        <v-card-title class="pa-6 pb-4">
          <div class="d-flex align-center">
            <v-icon size="32" color="error" class="mr-3">mdi-alert-circle</v-icon>
            <span class="text-h6">Подтвердите удаление</span>
          </div>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-6">
          <p class="text-body-1">
            Вы действительно хотите удалить пациента
            <strong v-if="patientToDelete">
              {{ patientToDelete.firstName }} {{ patientToDelete.lastName }}
            </strong>?
          </p>
          <p class="text-caption text-error mt-2">Это действие нельзя отменить.</p>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" rounded="lg" @click="showDeleteDialog = false">
            Отмена
          </v-btn>
          <v-btn
            color="error"
            rounded="lg"
            :loading="patientStore.isLoading"
            @click="deletePatient"
          >
            Удалить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.patients-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  padding: 40px;
  position: relative;
}

.patients-page::before {
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
  margin-bottom: 24px;
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

.search-field {
  max-width: 500px;
  position: relative;
  z-index: 1;
}

.search-field :deep(.v-field) {
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.search-field :deep(.v-field--focused) {
  box-shadow: 0 6px 24px rgba(33, 33, 33, 0.2);
  transform: translateY(-2px);
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

.patients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 28px;
  position: relative;
  z-index: 1;
}

.patient-card {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
  position: relative;
}

.patient-card-content {
  cursor: pointer;
}

.patient-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #212121 0%, #1a1a1a 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.patient-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(33, 33, 33, 0.15) !important;
  border-color: rgba(33, 33, 33, 0.2);
}

.patient-card:hover::before {
  transform: scaleX(1);
}

.patient-avatar {
  flex-shrink: 0;
  position: relative;
}

.patient-avatar :deep(.v-avatar) {
  box-shadow: 0 4px 12px rgba(33, 33, 33, 0.2);
  transition: all 0.3s ease;
}

.patient-card:hover .patient-avatar :deep(.v-avatar) {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(33, 33, 33, 0.3);
}

.patient-name {
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  font-size: 16px;
  letter-spacing: -0.3px;
}

.patient-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #616161;
  gap: 6px;
}

.info-item :deep(.v-icon) {
  opacity: 0.7;
}

/* Адаптивность */
@media (max-width: 960px) {
  .patients-page {
    padding: 32px 24px;
  }

  .patients-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .page-title {
    font-size: 32px;
  }

  .header-content {
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  .patients-page {
    padding: 24px 16px;
  }

  .patients-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .page-title {
    font-size: 28px;
  }
}

/* Темная тема */
:deep(.v-theme--dark) .patients-page {
  background: linear-gradient(135deg, #121212 0%, #1e1e1e 100%);
}

:deep(.v-theme--dark) .patients-page::before {
  background: linear-gradient(135deg, rgba(33, 33, 33, 0.08) 0%, rgba(26, 26, 26, 0.05) 100%);
}

:deep(.v-theme--dark) .page-title {
  background: linear-gradient(135deg, #ffffff 0%, #b0bec5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:deep(.v-theme--dark) .patient-card {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

:deep(.v-theme--dark) .patient-card:hover {
  border-color: rgba(33, 33, 33, 0.3);
  box-shadow: 0 12px 32px rgba(33, 33, 33, 0.2) !important;
}

:deep(.v-theme--dark) .patient-name {
  color: #ffffff;
}

:deep(.v-theme--dark) .info-item {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.v-theme--dark) .search-field :deep(.v-field) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

:deep(.v-theme--dark) .search-field :deep(.v-field--focused) {
  border-color: rgba(33, 33, 33, 0.5);
}
</style>
