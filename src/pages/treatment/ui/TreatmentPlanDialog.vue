<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useTreatmentStore } from '@/entities/treatment/model/store'
import { usePatientStore } from '@/entities/patient/model/store'
import { useNotify } from '@/shared/ui/notify'
import type { CreateTreatmentPlanPayload } from '@/entities/treatment/model/types'

const props = defineProps<{
  modelValue: boolean
  patientId?: string | null
  plan?: any | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
}>()

const treatmentStore = useTreatmentStore()
const patientStore = usePatientStore()
const { success, error: showError, warning } = useNotify()


const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formData = ref<CreateTreatmentPlanPayload>({
  patientId: '',
  diagnosis: '',
  apparatusType: '',
  startDate: new Date().toISOString().slice(0, 10),
  isActive: true
})

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    if (patientStore.patients.length === 0) {
      patientStore.fetchPatients()
    }
    // Если редактируем существующий план
    if (props.plan) {
      formData.value = {
        patientId: props.plan.patientId,
        diagnosis: props.plan.diagnosis,
        apparatusType: props.plan.apparatusType,
        startDate: props.plan.startDate.slice(0, 10),
        isActive: props.plan.isActive
      }
    } else {
      resetForm()
      // Если передан patientId, устанавливаем его
      if (props.patientId) {
        formData.value.patientId = props.patientId
      }
    }
  }
})

function resetForm() {
  formData.value = {
    patientId: '',
    diagnosis: '',
    apparatusType: '',
    startDate: new Date().toISOString().slice(0, 10),
    isActive: true
  }
}

const isEditing = computed(() => !!props.plan)

const isValid = computed(() => {
  return formData.value.patientId && formData.value.diagnosis.trim() && formData.value.apparatusType.trim()
})

async function save() {
  if (!isValid.value) {
    warning('Заполните все обязательные поля')
    return
  }

  try {
    let planId: string
    
    if (isEditing.value && props.plan) {
      await treatmentStore.updatePlan(props.plan.id, {
        diagnosis: formData.value.diagnosis,
        apparatusType: formData.value.apparatusType,
        startDate: formData.value.startDate,
        isActive: formData.value.isActive
      })
      planId = props.plan.id
      success('План лечения успешно обновлен')
    } else {
      const newPlan = await treatmentStore.createPlan(formData.value)
      planId = newPlan.id
      success('План лечения успешно создан')
    }
    
    dialog.value = false
    resetForm()
    emit('success')
  } catch (e: any) {
    const errorMessage = e?.message || (isEditing.value ? 'Ошибка при обновлении плана лечения' : 'Ошибка при создании плана лечения')
    showError(errorMessage)
  }
}

function close() {
  dialog.value = false
  resetForm()
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="700" persistent scrollable>
    <v-card rounded="xl" class="treatment-dialog-card">
      <!-- Заголовок с градиентом -->
      <div class="dialog-header">
        <div class="dialog-header-content">
          <div class="header-icon">
            <v-icon size="32" color="white">mdi-tooth</v-icon>
          </div>
          <div>
            <h2 class="dialog-title">{{ props.plan ? 'Редактировать план лечения' : 'Создать план лечения' }}</h2>
            <p class="dialog-subtitle">{{ props.plan ? 'Измените информацию о плане лечения' : 'Заполните информацию о плане лечения пациента' }}</p>
          </div>
        </div>
      </div>

      <v-divider></v-divider>

      <v-card-text class="dialog-content">
        <v-form @submit.prevent="save">
          <v-select
            v-model="formData.patientId"
            :items="patientStore.patients"
            item-title="firstName"
            item-value="id"
            label="Пациент *"
            prepend-inner-icon="mdi-account-outline"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            class="form-field"
            :rules="[(v) => !!v || 'Выберите пациента']"
            :disabled="isEditing || !!props.patientId"
            required
            hide-details="auto"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props">
                <template v-slot:title>
                  {{ item.raw.firstName }} {{ item.raw.lastName }}
                </template>
              </v-list-item>
            </template>
            <template v-slot:selection="{ item }">
              {{ item.raw.firstName }} {{ item.raw.lastName }}
            </template>
          </v-select>

          <v-textarea
            v-model="formData.diagnosis"
            label="Диагноз *"
            prepend-inner-icon="mdi-clipboard-text-outline"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            class="form-field mt-4 diagnosis-textarea"
            placeholder="Например: Дистальный прикус"
            :rules="[(v) => !!v || 'Укажите диагноз']"
            required
            hide-details="auto"
            rows="4"
            no-resize
          ></v-textarea>

          <v-text-field
            v-model="formData.apparatusType"
            label="Тип аппарата *"
            prepend-inner-icon="mdi-toolbox-outline"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            class="form-field mt-4"
            placeholder="Например: Herbst, брекеты"
            :rules="[(v) => !!v || 'Укажите тип аппарата']"
            required
            hide-details="auto"
          ></v-text-field>

          <v-text-field
            v-model="formData.startDate"
            label="Дата начала лечения"
            type="date"
            prepend-inner-icon="mdi-calendar-start"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            class="form-field mt-4"
            hide-details="auto"
          ></v-text-field>

          <v-switch
            v-model="formData.isActive"
            label="План активен"
            color="success"
            class="mt-4"
            hide-details
          ></v-switch>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="dialog-actions">
        <v-btn 
          variant="text" 
          rounded="lg" 
          size="large"
          @click="close"
          class="cancel-button"
        >
          Отмена
        </v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          size="large"
          :disabled="!isValid || treatmentStore.isLoading"
          :loading="treatmentStore.isLoading"
          @click="save"
          class="save-button"
        >
          <v-icon class="mr-2 save-icon">mdi-check</v-icon>
          <span class="save-text">{{ isEditing ? 'Сохранить изменения' : 'Создать план' }}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.treatment-dialog-card {
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, #212121 0%, #1a1a1a 100%);
  padding: 32px;
  position: relative;
  overflow: hidden;
}

.dialog-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
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

.dialog-header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 1;
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

.dialog-content {
  padding: 32px;
}

.form-field :deep(.v-field) {
  transition: all 0.3s ease;
}

.form-field :deep(.v-field--focused) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 33, 33, 0.2);
}

.diagnosis-textarea {
  height: 120px;
}

.diagnosis-textarea :deep(.v-field__input) {
  height: 120px !important;
  overflow-y: auto;
}

.diagnosis-textarea :deep(textarea) {
  height: 120px !important;
  resize: none;
  overflow-y: auto;
}

.dialog-actions {
  padding: 24px 32px;
  background: #fafafa;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.cancel-button {
  flex: 1;
  min-width: 0;
}

.save-button {
  flex: 1;
  min-width: 0;
}

.save-button {
  background: linear-gradient(135deg, #212121 0%, #1a1a1a 100%) !important;
  box-shadow: 0 4px 12px rgba(33, 33, 33, 0.3);
  transition: all 0.3s ease;
  color: white !important;
  font-weight: 700 !important;
}

.save-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(33, 33, 33, 0.4) !important;
}

.photo-upload-area {
  padding: 24px;
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s ease;
}

.photo-upload-area:hover {
  border-color: #212121;
  background: rgba(33, 33, 33, 0.02);
}

.photo-preview-container {
  margin-top: 8px;
  width: 100%;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  width: 100%;
  margin-bottom: 16px;
}

.photo-preview-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #e0e0e0;
  transition: all 0.3s ease;
}

.photo-preview-item:hover {
  border-color: #212121;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 33, 33, 0.2);
}

.photo-preview-item img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  background: #f5f5f5;
}

.remove-photo-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.5) !important;
  color: white !important;
}

.remove-photo-btn:hover {
  background: rgba(244, 67, 54, 0.8) !important;
}

/* Адаптивность */
@media (max-width: 600px) {
  .dialog-header {
    padding: 24px;
  }

  .dialog-content {
    padding: 24px;
  }

  .dialog-actions {
    padding: 16px;
    flex-direction: column;
    gap: 8px;
  }

  .cancel-button,
  .save-button {
    width: 100%;
    flex: none;
  }

  .save-text {
    display: inline;
  }

  .save-icon {
    margin-right: 8px !important;
  }

  .header-icon {
    width: 56px;
    height: 56px;
  }

  .dialog-title {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .save-text {
    font-size: 14px;
  }

  .save-icon {
    margin-right: 4px !important;
  }
}

/* Темная тема */
:deep(.v-theme--dark) .dialog-actions {
  background: rgba(255, 255, 255, 0.03);
}
</style>

