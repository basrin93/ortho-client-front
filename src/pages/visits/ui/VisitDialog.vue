<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useVisitStore } from '@/entities/visit/model/store'
import { usePatientStore } from '@/entities/patient/model/store'
import { useNotify } from '@/shared/ui/notify'
import type { CreateVisitPayload, UpdateVisitPayload } from '@/entities/visit/model/types'

const props = defineProps<{
  modelValue: boolean
  patientId?: string | null
  visit?: any | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
}>()

const visitStore = useVisitStore()
const patientStore = usePatientStore()
const { success, error: showError, warning } = useNotify()

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formData = ref<CreateVisitPayload>({
  patientId: '',
  notes: '',
  date: new Date().toISOString().slice(0, 16)
})

const isEditing = computed(() => !!props.visit)

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    // Загружаем пациентов если их нет
    if (patientStore.patients.length === 0) {
      patientStore.fetchPatients()
    }
    // Если редактируем визит, заполняем форму
    if (props.visit) {
      formData.value.patientId = props.visit.patientId
      formData.value.date = new Date(props.visit.date).toISOString().slice(0, 16)
      formData.value.notes = props.visit.notes
    } else {
      // Если не редактируем, сбрасываем форму
      resetForm()
      // Если передан patientId, устанавливаем его после сброса
      if (props.patientId) {
        formData.value.patientId = props.patientId
      }
    }
  }
})

// Отслеживаем изменения patientId из props
watch(() => props.patientId, (newPatientId) => {
  if (newPatientId && !props.visit && dialog.value) {
    formData.value.patientId = newPatientId
  }
}, { immediate: true })

function resetForm() {
  formData.value = {
    patientId: '',
    notes: '',
    date: new Date().toISOString().slice(0, 16)
  }
}

const isValid = computed(() => {
  return formData.value.patientId && formData.value.notes.trim()
})

async function save() {
  if (!isValid.value) {
    warning('Заполните все обязательные поля')
    return
  }

  try {
    if (isEditing.value && props.visit) {
      await visitStore.updateVisit(props.visit.id, {
        date: formData.value.date,
        notes: formData.value.notes
      })
      success('Визит успешно обновлен')
    } else {
      await visitStore.createVisit(formData.value)
      success('Визит успешно записан')
    }
    dialog.value = false
    resetForm()
    emit('success')
  } catch (e: any) {
    const errorMessage = e?.message || (isEditing.value ? 'Ошибка при обновлении визита' : 'Ошибка при создании визита')
    showError(errorMessage)
  }
}

function close() {
  dialog.value = false
  resetForm()
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="600" persistent scrollable>
    <v-card rounded="xl" class="visit-dialog-card">
      <!-- Заголовок с градиентом -->
      <div class="dialog-header">
        <div class="dialog-header-content">
          <div class="header-icon">
            <v-icon size="32" color="white">mdi-calendar-plus</v-icon>
          </div>
          <div>
            <h2 class="dialog-title">{{ isEditing ? 'Редактировать визит' : 'Записать визит' }}</h2>
            <p class="dialog-subtitle">{{ isEditing ? 'Измените информацию о приеме' : 'Зафиксируйте информацию о приеме пациента' }}</p>
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

          <v-text-field
            v-model="formData.date"
            label="Дата и время *"
            type="datetime-local"
            prepend-inner-icon="mdi-calendar-clock"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            class="form-field mt-4"
            :rules="[(v) => !!v || 'Укажите дату и время']"
            required
            hide-details="auto"
          ></v-text-field>

          <v-textarea
            v-model="formData.notes"
            label="Заметки о приеме *"
            prepend-inner-icon="mdi-note-text"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            rows="4"
            class="form-field mt-4"
            placeholder="Опишите, что было сделано на приеме..."
            :rules="[(v) => !!v || 'Заполните заметки']"
            required
            hide-details="auto"
          ></v-textarea>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="dialog-actions">
        <v-spacer></v-spacer>
        <v-btn 
          variant="text" 
          rounded="lg" 
          size="large"
          @click="close"
        >
          Отмена
        </v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          size="large"
          :disabled="!isValid || visitStore.isLoading"
          :loading="visitStore.isLoading"
          @click="save"
          class="save-button"
        >
          <v-icon class="mr-2">mdi-check</v-icon>
          {{ isEditing ? 'Сохранить изменения' : 'Записать визит' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.visit-dialog-card {
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

.dialog-actions {
  padding: 24px 32px;
  background: #fafafa;
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

/* Темная тема */
:deep(.v-theme--dark) .dialog-actions {
  background: rgba(255, 255, 255, 0.03);
}
</style>

