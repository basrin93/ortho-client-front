<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePatientStore } from '@/entities/patient/model/store'
import { useNotify } from '@/shared/ui/notify'
import type { Patient, Presentation } from '@/entities/patient/model/types'

const props = defineProps<{
  modelValue: boolean
  patient: Patient | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const patientStore = usePatientStore()
const { success, error: showError, warning } = useNotify()

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const presentations = ref<Presentation[]>([])
const isLoading = ref(false)
const isUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const title = ref('')
const viewingPresentation = ref<Presentation | null>(null)
const showViewer = ref(false)

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.patient) {
    // Сбрасываем состояние перед загрузкой
    presentations.value = []
    viewingPresentation.value = null
    showViewer.value = false
    // Загружаем презентации
    await loadPresentations()
  } else {
    viewingPresentation.value = null
    showViewer.value = false
    presentations.value = []
  }
})

async function loadPresentations() {
  if (!props.patient) return
  
  isLoading.value = true
  try {
    const data = await patientStore.fetchPresentations(props.patient.id)
    presentations.value = data
  } catch (e: any) {
    showError(e?.message || 'Ошибка загрузки презентаций')
  } finally {
    isLoading.value = false
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    // Проверяем, что это PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      warning('Пожалуйста, выберите PDF файл')
      target.value = ''
      return
    }
    selectedFile.value = file
    // Устанавливаем название по умолчанию из имени файла
    if (!title.value) {
      title.value = file.name.replace('.pdf', '').replace('.PDF', '')
    }
  }
}

async function uploadFile() {
  if (!props.patient || !selectedFile.value) {
    warning('Выберите файл для загрузки')
    return
  }

  isUploading.value = true
  try {
    await patientStore.uploadPresentation(
      props.patient.id,
      selectedFile.value,
      title.value.trim() || undefined
    )

    success('Презентация успешно загружена')
    selectedFile.value = null
    title.value = ''
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    await loadPresentations()
  } catch (e: any) {
    showError(e?.message || 'Ошибка при загрузке презентации')
  } finally {
    isUploading.value = false
  }
}

async function deletePresentation(presentationId: string) {
  if (!confirm('Вы уверены, что хотите удалить эту презентацию?')) {
    return
  }

  try {
    await patientStore.deletePresentation(presentationId)
    success('Презентация успешно удалена')
    await loadPresentations()
    // Если удаляем просматриваемую презентацию, закрываем просмотр
    if (viewingPresentation.value?.id === presentationId) {
      viewingPresentation.value = null
      showViewer.value = false
    }
  } catch (e: any) {
    showError(e?.message || 'Ошибка при удалении презентации')
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function viewPresentation(presentation: Presentation) {
  viewingPresentation.value = presentation
  showViewer.value = true
}

function openInNewTab(url: string) {
  if (!url) {
    showError('URL файла не найден')
    return
  }
  
  try {
    // Используем более надежный способ открытия ссылки
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (e: any) {
    // Если не сработало, пробуем window.open
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
    if (!newWindow) {
      warning('Браузер заблокировал открытие новой вкладки. Разрешите всплывающие окна для этого сайта.')
    }
  }
}

function closeViewer() {
  viewingPresentation.value = null
  showViewer.value = false
}

function close() {
  dialog.value = false
  selectedFile.value = null
  title.value = ''
  viewingPresentation.value = null
  showViewer.value = false
}
</script>

<template>
  <v-dialog 
    v-model="dialog" 
    max-width="1200" 
    persistent 
    scrollable
    content-class="presentation-dialog-content"
  >
    <v-card rounded="xl" class="presentation-dialog-card">
      <!-- Заголовок -->
      <div class="dialog-header">
        <div class="dialog-header-content">
          <div class="header-icon">
            <v-icon size="32" color="white">mdi-file-pdf-box</v-icon>
          </div>
          <div>
            <h2 class="dialog-title">Презентации</h2>
            <p class="dialog-subtitle" v-if="patient">
              {{ patient.firstName }} {{ patient.lastName }}
            </p>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" class="close-btn"></v-btn>
      </div>

      <v-divider></v-divider>

      <!-- Просмотр PDF -->
      <div v-if="showViewer && viewingPresentation" class="pdf-viewer-section">
        <div class="viewer-header">
          <div class="d-flex align-center">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="closeViewer"
              class="mr-3"
            ></v-btn>
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ viewingPresentation.title || viewingPresentation.fileName }}
              </div>
              <div class="text-caption text-grey">
                {{ formatDate(viewingPresentation.createdAt) }}
              </div>
            </div>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-open-in-new"
            @click="openInNewTab(viewingPresentation.s3Key)"
          >
            Открыть в новой вкладке
          </v-btn>
        </div>
        <v-divider></v-divider>
        <div class="pdf-container">
          <iframe
            :src="viewingPresentation.s3Key"
            class="pdf-iframe"
            frameborder="0"
          ></iframe>
        </div>
      </div>

      <!-- Основной контент (список и загрузка) -->
      <div v-else>
        <v-card-text class="dialog-content">
          <!-- Загрузка новой презентации -->
          <div class="upload-section mb-6">
            <div class="text-subtitle-1 mb-3 font-weight-bold">Загрузить презентацию (PDF)</div>
            
            <input
              ref="fileInput"
              type="file"
              accept=".pdf,application/pdf"
              style="display: none"
              @change="handleFileSelect"
            />

            <div v-if="!selectedFile" class="upload-area" @click="fileInput?.click()">
              <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-file-upload</v-icon>
              <div class="text-body-2 text-grey mb-2">Нажмите, чтобы выбрать PDF файл</div>
              <div class="text-caption text-grey">Поддерживаются файлы формата PDF</div>
            </div>

            <div v-else class="selected-file-section">
              <v-card variant="outlined" class="pa-4 mb-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon class="mr-3" color="error" size="32">mdi-file-pdf-box</v-icon>
                    <div>
                      <div class="text-subtitle-2 font-weight-bold">{{ selectedFile.name }}</div>
                      <div class="text-caption text-grey">{{ formatFileSize(selectedFile.size) }}</div>
                    </div>
                  </div>
                  <v-btn
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    @click="selectedFile = null; title = ''"
                  ></v-btn>
                </div>
              </v-card>

              <v-text-field
                v-model="title"
                label="Название презентации (необязательно)"
                variant="outlined"
                class="mb-3"
                prepend-inner-icon="mdi-text"
              ></v-text-field>

              <v-btn
                color="primary"
                rounded="lg"
                prepend-icon="mdi-upload"
                :loading="isUploading"
                :disabled="!selectedFile"
                @click="uploadFile"
                size="large"
                block
              >
                Загрузить презентацию
              </v-btn>
            </div>
          </div>

          <v-divider class="mb-6"></v-divider>

          <!-- Список загруженных презентаций -->
          <div class="presentations-section">
            <div class="text-subtitle-1 mb-3 font-weight-bold">
              Загруженные презентации ({{ presentations.length }})
            </div>

            <div v-if="isLoading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            </div>

            <div v-else-if="presentations.length === 0" class="empty-state text-center py-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-3">mdi-file-pdf-box-outline</v-icon>
              <div class="text-h6 text-grey-darken-1 mb-2">Нет загруженных презентаций</div>
              <div class="text-body-2 text-grey">Загрузите первую презентацию, используя форму выше</div>
            </div>

            <div v-else class="presentations-list">
              <v-card
                v-for="presentation in presentations"
                :key="presentation.id"
                variant="outlined"
                class="presentation-card mb-3"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center flex-grow-1">
                      <v-icon class="mr-4" color="error" size="40">mdi-file-pdf-box</v-icon>
                      <div class="flex-grow-1">
                        <div class="text-subtitle-2 font-weight-bold mb-1">
                          {{ presentation.title || presentation.fileName }}
                        </div>
                        <div class="text-caption text-grey mb-1">
                          {{ formatFileSize(presentation.fileSize) }} • {{ formatDate(presentation.createdAt) }}
                        </div>
                        <div v-if="presentation.title" class="text-body-2 text-grey-darken-1">
                          {{ presentation.fileName }}
                        </div>
                      </div>
                    </div>
                    <div class="d-flex align-center gap-2">
                      <v-btn
                        color="primary"
                        variant="text"
                        prepend-icon="mdi-eye"
                        @click="viewPresentation(presentation)"
                        size="small"
                      >
                        Просмотр
                      </v-btn>
                      <v-btn
                        color="primary"
                        variant="text"
                        prepend-icon="mdi-open-in-new"
                        @click="openInNewTab(presentation.s3Key)"
                        size="small"
                      >
                        Открыть
                      </v-btn>
                      <v-btn
                        icon="mdi-delete"
                        color="error"
                        variant="text"
                        @click="deletePresentation(presentation.id)"
                        size="small"
                      ></v-btn>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </div>
        </v-card-text>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.presentation-dialog-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

:deep(.presentation-dialog-content) {
  overflow: hidden !important;
}

.dialog-header {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
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
  min-height: 400px;
  max-height: 70vh;
  overflow-y: auto;
}

.pdf-viewer-section {
  display: flex;
  flex-direction: column;
  height: 80vh;
}

.viewer-header {
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f5f5f5;
}

.pdf-container {
  flex: 1;
  overflow: hidden;
  background: #525252;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.upload-section {
  padding: 24px;
  background: #f9f9f9;
  border-radius: 12px;
}

.upload-area {
  padding: 48px 24px;
  border: 2px dashed #f44336;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: #d32f2f;
  background: rgba(244, 67, 54, 0.05);
}

.selected-file-section {
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.presentation-card {
  transition: all 0.3s ease;
}

.presentation-card:hover {
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.15);
}

.empty-state {
  padding: 48px 24px;
}

/* Адаптивность */
@media (max-width: 600px) {
  .dialog-content {
    padding: 24px;
  }

  .dialog-header {
    padding: 24px;
  }

  .viewer-header {
    padding: 16px;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .pdf-viewer-section {
    height: 70vh;
  }
}
</style>

