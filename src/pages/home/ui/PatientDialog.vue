<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { usePatientStore } from '@/entities/patient/model/store'
import { useNotify } from '@/shared/ui/notify'
import type { Patient, PatientCreatePayload } from '@/entities/patient/model/types'

const props = defineProps<{
  modelValue: boolean
  patient?: Patient | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
}>()

const patientStore = usePatientStore()

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formData = ref<PatientCreatePayload>({
  firstName: '',
  lastName: '',
  phone: '',
  birthDate: ''
})

const { success, error: showError, warning } = useNotify()

const isEditing = computed(() => !!props.patient)


// Сброс формы
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    if (props.patient) {
      formData.value = {
        firstName: props.patient.firstName,
        lastName: props.patient.lastName,
        phone: props.patient.phone || '',
        birthDate: props.patient.birthDate ? props.patient.birthDate.split('T')[0] : ''
      }
    } else {
      resetForm()
    }
  }
})

function resetForm() {
  formData.value = {
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: ''
  }
}

const isValid = computed(() => {
  return (
    formData.value.firstName.trim() &&
    formData.value.lastName.trim() &&
    formData.value.birthDate &&
    formData.value.phone.trim()
  )
})

async function save() {
  if (!isValid.value) {
    warning('Заполните все обязательные поля')
    return
  }

  try {
    let patientId: string
    
    if (isEditing.value && props.patient) {
      await patientStore.updatePatient(props.patient.id, formData.value)
      success('Пациент успешно обновлен')
      patientId = props.patient.id
    } else {
      const newPatient = await patientStore.createPatient(formData.value)
      success('Пациент успешно добавлен')
      patientId = newPatient.id
    }
    
    dialog.value = false
    resetForm()
    emit('success')
  } catch (e: any) {
    const errorMessage = e?.message || 'Ошибка при сохранении пациента'
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
    <v-card rounded="xl" class="patient-dialog-card">
      <!-- Заголовок с градиентом -->
      <div class="dialog-header">
        <div class="dialog-header-content">
          <div class="header-icon">
            <v-icon size="32" color="white">{{ isEditing ? 'mdi-account-edit' : 'mdi-account-plus' }}</v-icon>
          </div>
          <div>
            <h2 class="dialog-title">{{ isEditing ? 'Редактировать пациента' : 'Новый пациент' }}</h2>
            <p class="dialog-subtitle">{{ isEditing ? 'Обновите информацию о пациенте' : 'Заполните данные нового пациента' }}</p>
          </div>
        </div>
      </div>

      <v-divider></v-divider>

      <v-card-text class="dialog-content">
        <v-form @submit.prevent="save">
          <div class="form-grid">
            <v-text-field
              v-model="formData.firstName"
              label="Имя *"
              prepend-inner-icon="mdi-account-outline"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              class="form-field"
              :rules="[(v) => !!v || 'Имя обязательно']"
              required
              hide-details="auto"
            ></v-text-field>

            <v-text-field
              v-model="formData.lastName"
              label="Фамилия *"
              prepend-inner-icon="mdi-account-outline"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              class="form-field"
              :rules="[(v) => !!v || 'Фамилия обязательна']"
              required
              hide-details="auto"
            ></v-text-field>
          </div>

          <v-text-field
            v-model="formData.phone"
            label="Телефон *"
            prepend-inner-icon="mdi-phone-outline"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            class="form-field mt-4"
            placeholder="+7 (999) 123-45-67"
            :rules="[
              (v) => !!v || 'Телефон обязателен',
              (v) => /^[\d\s\+\-\(\)]+$/.test(v) || 'Неверный формат телефона'
            ]"
            required
            hide-details="auto"
          ></v-text-field>

          <v-text-field
            v-model="formData.birthDate"
            label="Дата рождения *"
            type="date"
            prepend-inner-icon="mdi-calendar-outline"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            class="form-field mt-4"
            :rules="[
              (v) => !!v || 'Дата рождения обязательна',
              (v) => {
                if (!v) return true
                const date = new Date(v)
                const today = new Date()
                return date <= today || 'Дата не может быть в будущем'
              }
            ]"
            required
            hide-details="auto"
          ></v-text-field>

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
          :disabled="!isValid || patientStore.isLoading"
          :loading="patientStore.isLoading"
          @click="save"
          class="save-button"
        >
          <v-icon class="mr-2">mdi-check</v-icon>
          {{ isEditing ? 'Сохранить изменения' : 'Создать пациента' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.patient-dialog-card {
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

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

.save-button:disabled {
  opacity: 0.6;
}


/* Адаптивность */
@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .dialog-header {
    padding: 24px;
  }

  .dialog-content {
    padding: 24px;
  }

  .dialog-actions {
    padding: 20px 24px;
  }

  .header-icon {
    width: 56px;
    height: 56px;
  }

  .dialog-title {
    font-size: 20px;
  }
}

/* Темная тема */
:deep(.v-theme--dark) .dialog-actions {
  background: rgba(255, 255, 255, 0.03);
}
</style>

