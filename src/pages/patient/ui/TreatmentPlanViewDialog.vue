<script setup lang="ts">
import { computed } from 'vue'
import type { TreatmentPlan } from '@/entities/treatment/model/types'
import type { Patient } from '@/entities/patient/model/types'

const props = defineProps<{
  modelValue: boolean
  plan: TreatmentPlan | null
  patient: Patient | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function close() {
  dialog.value = false
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="800" persistent scrollable>
    <v-card rounded="xl" class="plan-view-dialog-card">
      <!-- Заголовок -->
      <div class="dialog-header">
        <div class="dialog-header-content">
          <div class="header-icon">
            <v-icon size="32" color="white">mdi-tooth</v-icon>
          </div>
          <div>
            <h2 class="dialog-title">План лечения</h2>
            <p class="dialog-subtitle" v-if="patient">
              {{ patient.firstName }} {{ patient.lastName }}
            </p>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" class="close-btn"></v-btn>
      </div>

      <v-divider></v-divider>

      <v-card-text class="dialog-content" v-if="plan">
        <!-- Статус плана -->
        <div class="plan-status-section mb-6">
          <v-chip
            size="large"
            :color="plan.isActive ? 'success' : 'grey'"
            variant="tonal"
            :prepend-icon="plan.isActive ? 'mdi-check-circle' : 'mdi-pause-circle'"
            class="status-chip"
          >
            {{ plan.isActive ? 'План активен' : 'План неактивен' }}
          </v-chip>
        </div>

        <!-- Информация о плане -->
        <div class="plan-info-grid">
          <!-- Диагноз -->
          <div class="info-section">
            <div class="info-label">
              <v-icon size="20" class="mr-2" color="primary">mdi-clipboard-text-outline</v-icon>
              <span class="label-text">Диагноз</span>
            </div>
            <div class="info-value diagnosis-value">
              {{ plan.diagnosis }}
            </div>
          </div>

          <!-- Тип аппарата -->
          <div class="info-section">
            <div class="info-label">
              <v-icon size="20" class="mr-2" color="primary">mdi-toolbox-outline</v-icon>
              <span class="label-text">Тип аппарата</span>
            </div>
            <div class="info-value">
              {{ plan.apparatusType }}
            </div>
          </div>

          <!-- Дата начала лечения -->
          <div class="info-section">
            <div class="info-label">
              <v-icon size="20" class="mr-2" color="primary">mdi-calendar-start</v-icon>
              <span class="label-text">Дата начала лечения</span>
            </div>
            <div class="info-value">
              {{ formatDate(plan.startDate) }}
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-text v-else class="dialog-content text-center py-12">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-information-outline</v-icon>
        <div class="text-h6 text-grey-darken-1">План лечения не найден</div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="dialog-actions">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          rounded="lg"
          size="large"
          @click="close"
        >
          Закрыть
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.plan-view-dialog-card {
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, #212121 0%, #1a1a1a 100%);
  padding: 32px;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.header-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.dialog-title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0 0 4px 0;
  letter-spacing: -0.5px;
}

.dialog-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.close-btn {
  color: white !important;
}

.dialog-content {
  padding: 32px;
}

.plan-status-section {
  display: flex;
  justify-content: center;
}

.status-chip {
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
}

.plan-info-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-section {
  background: #f9f9f9;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.info-section:hover {
  background: #f5f5f5;
  transform: translateX(4px);
}

.info-label {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  color: #424242;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-text {
  font-size: 13px;
  color: #757575;
  font-weight: 500;
}

.info-value {
  font-size: 16px;
  color: #1a1a1a;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.diagnosis-value {
  font-size: 17px;
  line-height: 1.8;
  padding: 8px 0;
  min-height: 60px;
}

.dialog-actions {
  padding: 24px 32px;
  background: #fafafa;
}

/* Адаптивность */
@media (max-width: 600px) {
  .dialog-content {
    padding: 24px;
  }

  .dialog-header {
    padding: 24px;
  }

  .info-section {
    padding: 16px;
  }
}
</style>

