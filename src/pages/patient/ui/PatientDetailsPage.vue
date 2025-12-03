<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePatientStore } from '@/entities/patient/model/store'
import { useVisitStore } from '@/entities/visit/model/store'
import { useTreatmentStore } from '@/entities/treatment/model/store'
import { useNotify } from '@/shared/ui/notify'
import PatientDialog from '@/pages/home/ui/PatientDialog.vue'
import PatientPhotosDialog from '@/pages/home/ui/PatientPhotosDialog.vue'
import VisitDialog from '@/pages/visits/ui/VisitDialog.vue'
import TreatmentPlanDialog from '@/pages/treatment/ui/TreatmentPlanDialog.vue'
import VisitPhotosDialog from './VisitPhotosDialog.vue'
import VisitTemplatesPanel from './VisitTemplatesPanel.vue'
import PlanPhotosDialog from './PlanPhotosDialog.vue'
import CBCTDialog from './CBCTDialog.vue'
import PresentationDialog from './PresentationDialog.vue'
import TreatmentPlanViewDialog from './TreatmentPlanViewDialog.vue'
import type { Patient } from '@/entities/patient/model/types'

const route = useRoute()
const router = useRouter()
const patientStore = usePatientStore()
const visitStore = useVisitStore()
const treatmentStore = useTreatmentStore()
const { success, error: showError, warning } = useNotify()

const patientId = computed(() => route.params.id as string)
const patient = computed(() => patientStore.getPatientById(patientId.value))

const showEditDialog = ref(false)
const showPhotosDialog = ref(false)
const showVisitDialog = ref(false)
const showPlanDialog = ref(false)
const showVisitPhotosDialog = ref(false)
const selectedVisitForPhotos = ref<any | null>(null)
const editingVisitId = ref<string | null>(null)
const editingVisitData = ref<{ date: string; notes: string } | null>(null)
const showPlanPhotosDialog = ref(false)
const showCBCTDialog = ref(false)
const showPresentationDialog = ref(false)
const showPlanViewDialog = ref(false)

const activeTab = ref('visits') // 'visits'

onMounted(async () => {
  if (!patient.value) {
    await patientStore.fetchPatients()
  }
  await visitStore.fetchVisits()
  await treatmentStore.fetchPlans()
})

// Визиты пациента
const patientVisits = computed(() => {
  if (!patientId.value) return []
  const visits = visitStore.getVisitsByPatientId(patientId.value)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  // Добавляем информацию о количестве фото для каждого визита
  if (patient.value) {
    return visits.map(visit => ({
      ...visit,
      photoCount: patientStore.getPhotosByVisitId(patient.value!.id, visit.id).length
    }))
  }
  return visits
})

// План лечения пациента (один план)
const patientPlan = computed(() => {
  if (!patientId.value) return null
  const plans = treatmentStore.getPlansByPatientId(patientId.value)
  return plans.length > 0 ? plans[0] : null
})

// Форматирование даты
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

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

function onPatientUpdated() {
  patientStore.fetchPatients()
}

function onVisitCreated() {
  visitStore.fetchVisits()
}

function startEditVisit(visit: any) {
  editingVisitId.value = visit.id
  editingVisitData.value = {
    date: new Date(visit.date).toISOString().slice(0, 16),
    notes: visit.notes
  }
}

function cancelEditVisit() {
  editingVisitId.value = null
  editingVisitData.value = null
}

async function saveEditVisit(visit: any) {
  if (!editingVisitData.value || !editingVisitData.value.notes.trim()) {
    warning('Заметки не могут быть пустыми')
    return
  }
  
  try {
    await visitStore.updateVisit(visit.id, {
      date: editingVisitData.value.date,
      notes: editingVisitData.value.notes
    })
    success('Визит успешно обновлен')
    editingVisitId.value = null
    editingVisitData.value = null
    await visitStore.fetchVisits()
  } catch (e: any) {
    showError(e?.message || 'Ошибка при обновлении визита')
  }
}

async function onPlanCreated() {
  await treatmentStore.fetchPlans()
  // Обновляем данные пациента, чтобы обновить план в списке
  if (patient.value) {
    await patientStore.fetchPatientById(patient.value.id)
  }
}

function openPlanDialog() {
  showPlanDialog.value = true
}

function openVisitPhotos(visit: any) {
  selectedVisitForPhotos.value = visit
  showVisitPhotosDialog.value = true
}

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="patient-details-page">
    <!-- Заголовок -->
    <div class="page-header">
      <div class="header-content">
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          size="large"
          @click="goBack"
          class="back-btn"
        ></v-btn>
        <div class="header-info">
          <h1 class="page-title" v-if="patient">
            {{ patient.firstName }} {{ patient.lastName }}
          </h1>
          <p class="page-subtitle" v-if="patient">
            {{ formatDate(patient.birthDate) }} ({{ getAge(patient.birthDate) }} лет)
            <span v-if="patient.phone"> • {{ patient.phone }}</span>
          </p>
        </div>
        <div class="header-actions">
          <v-btn
            v-if="patientPlan"
            color="primary"
            variant="outlined"
            prepend-icon="mdi-eye"
            @click="showPlanViewDialog = true"
          >
            Просмотр плана
          </v-btn>
          <v-btn
            v-if="patientPlan"
            color="primary"
            variant="outlined"
            prepend-icon="mdi-image-multiple"
            @click="showPlanPhotosDialog = true"
          >
            Фото до
          </v-btn>
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-radiology-box"
            @click="showCBCTDialog = true"
            v-if="patient"
          >
            КЛКТ
          </v-btn>
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-file-pdf-box"
            @click="showPresentationDialog = true"
            v-if="patient"
          >
            Презентации
          </v-btn>
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-tooth"
            @click="showPlanDialog = true"
            v-if="patient"
          >
            План лечения
          </v-btn>
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-pencil"
            @click="showEditDialog = true"
            v-if="patient"
          >
            Редактировать
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Табы -->
    <v-tabs v-model="activeTab" bg-color="transparent" class="tabs-container">
      <v-tab value="visits">
        <v-icon class="mr-2">mdi-calendar-check</v-icon>
        Визиты
        <v-chip
          v-if="patientVisits.length > 0"
          size="small"
          class="ml-2"
          color="primary"
          variant="tonal"
        >
          {{ patientVisits.length }}
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- Контент табов -->
    <div class="content-container">
      <!-- Визиты -->
      <div v-if="activeTab === 'visits'" class="tab-content">
        <div class="content-header">
          <h2 class="content-title">Визиты пациента</h2>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="showVisitDialog = true"
            :disabled="!patient"
          >
            Записать визит
          </v-btn>
        </div>

        <div v-if="patientVisits.length === 0" class="empty-state">
          <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-calendar-check-outline</v-icon>
          <h3 class="text-h6 text-grey-darken-1 mb-2">Нет визитов</h3>
          <p class="text-body-1 text-grey mb-6">
            Начните с записи первого визита
          </p>
        </div>

        <div v-else class="visits-list">
          <div
            v-for="visit in patientVisits"
            :key="visit.id"
            class="visit-card-wrapper"
            :class="{ 'editing': editingVisitId === visit.id }"
          >
            <v-card
              class="visit-card"
              elevation="2"
              rounded="xl"
              :class="{ 'editing': editingVisitId === visit.id }"
            >
            <v-card-text class="pa-6">
              <!-- Режим редактирования -->
              <div v-if="editingVisitId === visit.id" class="visit-edit-mode">
                <div class="d-flex align-start justify-space-between mb-4">
                  <div class="visit-header">
                    <v-text-field
                      v-model="editingVisitData!.date"
                      type="datetime-local"
                      label="Дата и время"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="visit-edit-date"
                      @click.stop
                    ></v-text-field>
                  </div>
                  <div class="d-flex align-center gap-2">
                    <v-chip
                      size="small"
                      color="primary"
                      variant="tonal"
                      prepend-icon="mdi-calendar-check"
                    >
                      Визит
                    </v-chip>
                    <v-btn
                      size="small"
                      variant="text"
                      color="primary"
                      @click.stop="openVisitPhotos(visit)"
                      title="Просмотреть фото"
                      class="visit-photos-btn"
                    >
                      <v-icon size="20">mdi-image-multiple</v-icon>
                      <span v-if="visit.photoCount > 0" class="ml-1 text-caption font-weight-bold">{{ visit.photoCount }}</span>
                    </v-btn>
                  </div>
                </div>
                <v-textarea
                  v-model="editingVisitData!.notes"
                  label="Заметки о приеме"
                  variant="outlined"
                  density="comfortable"
                  rows="8"
                  class="visit-edit-notes"
                  @click.stop
                ></v-textarea>
                <div class="visit-edit-actions mt-3">
                  <v-btn
                    variant="text"
                    size="small"
                    @click.stop="cancelEditVisit"
                  >
                    Отмена
                  </v-btn>
                  <v-btn
                    color="primary"
                    size="small"
                    @click.stop="saveEditVisit(visit)"
                  >
                    Сохранить
                  </v-btn>
                </div>
              </div>
              
              <!-- Обычный режим просмотра -->
              <div v-else>
                <div class="d-flex align-start justify-space-between mb-4">
                  <div class="visit-header" @click="startEditVisit(visit)" style="cursor: pointer">
                    <div class="visit-date">{{ formatDate(visit.date) }}</div>
                    <div class="visit-time">{{ formatDateTime(visit.date).split(', ')[1] }}</div>
                  </div>
                  <div class="d-flex align-center gap-2">
                    <v-chip
                      size="small"
                      color="primary"
                      variant="tonal"
                      prepend-icon="mdi-calendar-check"
                    >
                      Визит
                    </v-chip>
                    <v-btn
                      size="small"
                      variant="text"
                      color="primary"
                      @click.stop="openVisitPhotos(visit)"
                      title="Просмотреть фото"
                      class="visit-photos-btn"
                    >
                      <v-icon size="20">mdi-image-multiple</v-icon>
                      <span v-if="visit.photoCount > 0" class="ml-1 text-caption font-weight-bold">{{ visit.photoCount }}</span>
                    </v-btn>
                  </div>
                </div>
                <div class="visit-notes" @click="startEditVisit(visit)" style="cursor: pointer">
                  <v-icon size="20" class="mr-2" color="grey">mdi-note-text</v-icon>
                  <span class="text-body-1">{{ visit.notes }}</span>
                </div>
              </div>
            </v-card-text>
          </v-card>
          
          <!-- Панель шаблонов справа при редактировании -->
          <VisitTemplatesPanel
            v-if="editingVisitId === visit.id"
            v-model="editingVisitData!.notes"
            class="templates-panel-wrapper"
          />
        </div>
      </div>
      </div>

    </div>

    <!-- Диалоги -->
    <PatientDialog
      v-if="patient"
      v-model="showEditDialog"
      :patient="patient"
      @success="onPatientUpdated"
    />
    <VisitDialog
      v-model="showVisitDialog"
      :patient-id="patientId"
      @success="onVisitCreated"
    />
    <TreatmentPlanDialog
      v-model="showPlanDialog"
      :patient-id="patientId"
      :plan="patientPlan"
      @success="onPlanCreated"
    />
    <VisitPhotosDialog
      v-model="showVisitPhotosDialog"
      :patient="patient"
      :visit="selectedVisitForPhotos"
    />
    <PlanPhotosDialog
      v-model="showPlanPhotosDialog"
      :patient="patient"
      :plan="patientPlan"
    />
    <CBCTDialog
      v-model="showCBCTDialog"
      :patient="patient"
    />
    <PresentationDialog
      v-model="showPresentationDialog"
      :patient="patient"
    />
    <TreatmentPlanViewDialog
      v-model="showPlanViewDialog"
      :plan="patientPlan"
      :patient="patient"
    />
  </div>
</template>

<style scoped>
.patient-details-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  padding: 40px;
}

.page-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.back-btn {
  margin-right: 8px;
}

.header-info {
  flex: 1;
  min-width: 200px;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  letter-spacing: -0.8px;
}

.page-subtitle {
  font-size: 15px;
  color: #757575;
  margin: 0;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.tabs-container {
  margin-bottom: 32px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.08);
}

.content-container {
  position: relative;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.content-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.visits-list,
.plans-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.visit-card,
.plan-card {
  background: white;
  transition: all 0.3s ease;
}

.visit-card-wrapper {
  margin-bottom: 16px;
}

.visit-card-wrapper.editing {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.visit-card {
  border-left: 4px solid #212121;
  flex: 1;
}

.templates-panel-wrapper {
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 120px);
  flex-shrink: 0;
}

.templates-panel-wrapper {
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 120px);
}

.visit-card:hover {
  transform: translateX(4px);
  box-shadow: 0 8px 24px rgba(33, 33, 33, 0.15) !important;
}

.plan-card {
  border-left: 4px solid #9e9e9e;
}

.plan-card-active {
  border-left-color: #4caf50;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(33, 33, 33, 0.15) !important;
}

.visit-header,
.plan-header {
  flex: 1;
}

.visit-date,
.plan-diagnosis {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.visit-time,
.plan-apparatus {
  font-size: 14px;
  color: #757575;
}

.visit-notes {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-top: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.visit-notes:hover {
  background: #eeeeee;
  transform: translateX(2px);
}

.visit-header {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.visit-header:hover {
  opacity: 0.7;
}

.visit-edit-mode {
  width: 100%;
}

.visit-edit-date {
  max-width: 250px;
}

.visit-edit-notes {
  width: 100%;
}

.visit-edit-notes :deep(.v-field__input) {
  height: 200px;
  overflow-y: auto;
}

.visit-edit-notes :deep(textarea) {
  height: 200px;
  resize: none;
}

.visit-edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

.plan-date {
  display: flex;
  align-items: center;
  margin-top: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 12px;
}

.visit-photos-btn {
  position: relative;
}

.visit-photos-btn .photo-count-chip {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  font-size: 10px;
  padding: 0 4px;
}

/* Адаптивность */
@media (max-width: 960px) {
  .patient-details-page {
    padding: 24px 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .content-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

