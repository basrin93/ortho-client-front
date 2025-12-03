<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useVisitStore } from '@/entities/visit/model/store'
import { usePatientStore } from '@/entities/patient/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { useNotify } from '@/shared/ui/notify'
import type { CreateVisitPayload, UpdateVisitPayload } from '@/entities/visit/model/types'
import type { Template } from '@/entities/template/model/types'

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
const templateStore = useTemplateStore()
const { success, error: showError, warning } = useNotify()

// Шаблоны фраз
const showTemplates = ref(false)
const showCreateTemplateDialog = ref(false)
const newTemplateText = ref('')
const searchTemplateQuery = ref('')

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
    // Загружаем шаблоны
    if (templateStore.templates.length === 0) {
      templateStore.fetchTemplates()
    }
    // Автоматически показываем шаблоны, если они есть
    if (templateStore.templates.length > 0) {
      showTemplates.value = true
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
  showTemplates.value = false
  searchTemplateQuery.value = ''
}

// Функции для работы с шаблонами
const filteredTemplates = computed(() => {
  if (!searchTemplateQuery.value.trim()) {
    return templateStore.templates
  }
  const query = searchTemplateQuery.value.toLowerCase()
  return templateStore.templates.filter(t => 
    t.text.toLowerCase().includes(query)
  )
})

function insertTemplate(template: Template) {
  const currentText = formData.value.notes || ''
  const separator = currentText.trim() ? '\n' : ''
  formData.value.notes = currentText + separator + template.text
  success('Шаблон добавлен')
}

async function createTemplate() {
  if (!newTemplateText.value.trim()) {
    return
  }

  try {
    await templateStore.createTemplate({ text: newTemplateText.value.trim() })
    success('Шаблон успешно создан')
    newTemplateText.value = ''
    showCreateTemplateDialog.value = false
    if (!showTemplates.value) {
      showTemplates.value = true
    }
  } catch (e: any) {
    showError(e?.message || 'Ошибка при создании шаблона')
  }
}

async function createTemplateFromSelection() {
  const textarea = document.querySelector('#visit-notes-textarea') as HTMLTextAreaElement
  if (!textarea) {
    warning('Выделите текст в поле заметок')
    return
  }
  
  const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
  if (!selectedText.trim()) {
    warning('Выделите текст для создания шаблона')
    return
  }
  
  newTemplateText.value = selectedText.trim()
  showCreateTemplateDialog.value = true
}

async function deleteTemplate(template: Template, event: Event) {
  event.stopPropagation()
  
  try {
    await templateStore.deleteTemplate(template.id)
    success('Шаблон удален')
  } catch (e: any) {
    showError(e?.message || 'Ошибка при удалении шаблона')
  }
}

function cancelCreateTemplate() {
  newTemplateText.value = ''
  showCreateTemplateDialog.value = false
}

function truncateText(text: string, maxLength: number = 50) {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
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

          <div class="notes-section">
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
              id="visit-notes-textarea"
            ></v-textarea>

            <!-- Панель шаблонов фраз -->
            <div class="templates-section mt-3">
              <div class="templates-header" @click="showTemplates = !showTemplates">
                <div class="templates-header-left">
                  <v-icon 
                    :class="{ 'expanded': showTemplates }"
                    class="expand-icon"
                    size="18"
                    color="primary"
                  >
                    mdi-chevron-down
                  </v-icon>
                  <v-icon size="18" color="primary" class="mr-1">mdi-lightning-bolt</v-icon>
                  <span class="templates-title">Шаблоны фраз</span>
                  <v-chip
                    v-if="templateStore.templates.length > 0"
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    class="ml-2"
                  >
                    {{ templateStore.templates.length }}
                  </v-chip>
                </div>
                <div class="templates-header-actions" @click.stop>
                  <v-tooltip text="Создать из выделенного текста" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-content-copy"
                        size="x-small"
                        variant="text"
                        color="primary"
                        @click="createTemplateFromSelection"
                      ></v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Создать новый шаблон" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-plus"
                        size="x-small"
                        variant="text"
                        color="primary"
                        @click="showCreateTemplateDialog = true"
                      ></v-btn>
                    </template>
                  </v-tooltip>
                </div>
              </div>

              <v-expand-transition>
                <div v-show="showTemplates" class="templates-content">
                  <!-- Поиск -->
                  <div v-if="templateStore.templates.length > 2" class="search-wrapper">
                    <v-text-field
                      v-model="searchTemplateQuery"
                      placeholder="Поиск шаблонов..."
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined"
                      density="compact"
                      rounded="lg"
                      hide-details
                      clearable
                      class="search-field"
                    ></v-text-field>
                  </div>

                  <!-- Состояние загрузки -->
                  <div v-if="templateStore.isLoading" class="templates-loading">
                    <v-progress-circular indeterminate color="primary" size="20"></v-progress-circular>
                  </div>
                  
                  <!-- Пустое состояние -->
                  <div v-else-if="filteredTemplates.length === 0" class="templates-empty">
                    <v-icon size="32" color="grey-lighten-1" class="mb-1">mdi-format-text-variant</v-icon>
                    <p class="empty-text">
                      {{ searchTemplateQuery ? 'Шаблоны не найдены' : 'Нет шаблонов' }}
                    </p>
                  </div>

                  <!-- Список шаблонов -->
                  <div v-else class="templates-list">
                    <div
                      v-for="template in filteredTemplates"
                      :key="template.id"
                      class="template-item"
                      @click="insertTemplate(template)"
                    >
                      <v-icon size="16" color="primary" class="template-icon">mdi-text</v-icon>
                      <span class="template-text">{{ truncateText(template.text) }}</span>
                      <v-btn
                        icon="mdi-close"
                        size="x-small"
                        variant="text"
                        color="error"
                        @click.stop="deleteTemplate(template, $event)"
                        class="template-delete"
                        title="Удалить"
                      ></v-btn>
                    </div>
                  </div>
                </div>
              </v-expand-transition>
            </div>
          </div>
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

    <!-- Диалог создания шаблона -->
    <v-dialog v-model="showCreateTemplateDialog" max-width="500" persistent>
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" color="primary">mdi-plus-circle</v-icon>
          Создать шаблон
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          <v-textarea
            v-model="newTemplateText"
            label="Текст шаблона"
            variant="outlined"
            rows="4"
            placeholder="Введите текст шаблона..."
            autofocus
            rounded="lg"
          ></v-textarea>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelCreateTemplate" rounded="lg">Отмена</v-btn>
          <v-btn
            color="primary"
            :disabled="!newTemplateText.trim()"
            @click="createTemplate"
            rounded="lg"
          >
            Создать
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

/* Стили для панели шаблонов */
.notes-section {
  width: 100%;
}

.templates-section {
  width: 100%;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.templates-section:hover {
  border-color: #bdbdbd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.templates-header {
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
}

.templates-header:hover {
  background: #fafafa;
}

.templates-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.expand-icon {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.expand-icon.expanded {
  transform: rotate(0deg);
}

.expand-icon:not(.expanded) {
  transform: rotate(-90deg);
}

.templates-title {
  font-size: 13px;
  font-weight: 600;
  color: #212121;
  margin-left: 2px;
}

.templates-header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.templates-content {
  padding: 12px;
  background: white;
  overflow-x: hidden;
}

.search-wrapper {
  margin-bottom: 10px;
}

.search-field :deep(.v-field) {
  background: #fafafa;
  font-size: 13px;
}

.search-field :deep(.v-field--focused) {
  background: white;
}

.templates-loading,
.templates-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  text-align: center;
}

.empty-text {
  font-size: 12px;
  color: #9e9e9e;
  margin-top: 8px;
}

.templates-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2px;
}

.templates-list::-webkit-scrollbar {
  width: 4px;
}

.templates-list::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 2px;
}

.templates-list::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 2px;
}

.templates-list::-webkit-scrollbar-thumb:hover {
  background: #9e9e9e;
}

.template-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.template-item:hover {
  border-color: #212121;
  background: linear-gradient(135deg, #f0f9fa 0%, #e8f5f6 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(33, 33, 33, 0.12);
}

.template-icon {
  flex-shrink: 0;
}

.template-text {
  font-size: 12px;
  color: #424242;
  font-weight: 500;
  flex: 1;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-delete {
  position: absolute;
  top: -4px;
  right: -4px;
  opacity: 0;
  transition: all 0.2s ease;
  background: white !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.template-item:hover .template-delete {
  opacity: 1;
  transform: scale(1.1);
}

/* Темная тема для шаблонов */
:deep(.v-theme--dark) .templates-section {
  background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
  border-color: #3a3a3a;
}

:deep(.v-theme--dark) .templates-header {
  background: #2a2a2a;
  border-bottom-color: #3a3a3a;
}

:deep(.v-theme--dark) .templates-header:hover {
  background: #333333;
}

:deep(.v-theme--dark) .templates-content {
  background: #2a2a2a;
}

:deep(.v-theme--dark) .template-item {
  background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
  border-color: #3a3a3a;
}

:deep(.v-theme--dark) .template-item:hover {
  background: linear-gradient(135deg, #2d3a3a 0%, #1e2a2a 100%);
  border-color: #4a4a4a;
}
</style>

