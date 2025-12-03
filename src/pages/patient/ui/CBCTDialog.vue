<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePatientStore } from '@/entities/patient/model/store'
import { useNotify } from '@/shared/ui/notify'
import { api } from '@/shared/api'
import type { Patient } from '@/entities/patient/model/types'

export interface CBCTFile {
  id: string
  patientId: string
  fileName: string
  s3Key: string
  fileSize: number
  createdAt: string
  notes?: string | null
}

const props = defineProps<{
  modelValue: boolean
  patient: Patient | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const patientStore = usePatientStore()
const { success, error: showError } = useNotify()

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const cbctFiles = ref<CBCTFile[]>([])
const isLoading = ref(false)
const isUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const notes = ref('')

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.patient) {
    await loadCBCTFiles()
  }
})

async function loadCBCTFiles() {
  if (!props.patient) return
  
  isLoading.value = true
  try {
    const { data } = await api.get<CBCTFile[]>(`/patients/${props.patient.id}/cbct`)
    cbctFiles.value = data
  } catch (e: any) {
    showError(e?.message || 'Ошибка загрузки КЛКТ файлов')
  } finally {
    isLoading.value = false
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

async function uploadFile() {
  if (!props.patient || !selectedFile.value) {
    showError('Выберите файл для загрузки')
    return
  }

  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    if (notes.value.trim()) {
      formData.append('notes', notes.value.trim())
    }

    await api.post(`/patients/${props.patient.id}/cbct`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    success('КЛКТ файл успешно загружен')
    selectedFile.value = null
    notes.value = ''
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    await loadCBCTFiles()
  } catch (e: any) {
    showError(e?.message || 'Ошибка при загрузке КЛКТ файла')
  } finally {
    isUploading.value = false
  }
}

async function deleteFile(fileId: string) {
  if (!confirm('Вы уверены, что хотите удалить этот КЛКТ файл?')) {
    return
  }

  try {
    await api.delete(`/patients/cbct/${fileId}`)
    success('КЛКТ файл успешно удален')
    await loadCBCTFiles()
  } catch (e: any) {
    showError(e?.message || 'Ошибка при удалении КЛКТ файла')
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

function downloadFile(file: CBCTFile) {
  window.open(file.s3Key, '_blank')
}

function close() {
  dialog.value = false
  selectedFile.value = null
  notes.value = ''
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="800" persistent scrollable>
    <v-card rounded="xl">
      <!-- Заголовок -->
      <div class="dialog-header">
        <div class="dialog-header-content">
          <div class="header-icon">
            <v-icon size="32" color="white">mdi-radiology-box</v-icon>
          </div>
          <div>
            <h2 class="dialog-title">КЛКТ файлы</h2>
            <p class="dialog-subtitle" v-if="patient">
              {{ patient.firstName }} {{ patient.lastName }}
            </p>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" class="close-btn"></v-btn>
      </div>

      <v-divider></v-divider>

      <v-card-text class="dialog-content">
        <!-- Загрузка нового файла -->
        <div class="upload-section mb-6">
          <div class="text-subtitle-1 mb-3 font-weight-bold">Загрузить КЛКТ файл</div>
          
          <input
            ref="fileInput"
            type="file"
            accept=".dcm,.DICOM,.dicom,application/dicom"
            style="display: none"
            @change="handleFileSelect"
          />

          <div v-if="!selectedFile" class="upload-area" @click="fileInput?.click()">
            <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-file-upload</v-icon>
            <div class="text-body-2 text-grey mb-2">Нажмите, чтобы выбрать КЛКТ файл</div>
            <div class="text-caption text-grey">Поддерживаются файлы формата DICOM (.dcm)</div>
          </div>

          <div v-else class="selected-file-section">
            <v-card variant="outlined" class="pa-4 mb-3">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                  <v-icon class="mr-3" color="primary" size="32">mdi-file-document</v-icon>
                  <div>
                    <div class="text-subtitle-2 font-weight-bold">{{ selectedFile.name }}</div>
                    <div class="text-caption text-grey">{{ formatFileSize(selectedFile.size) }}</div>
                  </div>
                </div>
                <v-btn
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  @click="selectedFile = null"
                ></v-btn>
              </div>
            </v-card>

            <v-textarea
              v-model="notes"
              label="Заметки (необязательно)"
              variant="outlined"
              rows="2"
              class="mb-3"
            ></v-textarea>

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
              Загрузить файл
            </v-btn>
          </div>
        </div>

        <v-divider class="mb-6"></v-divider>

        <!-- Список загруженных файлов -->
        <div class="files-section">
          <div class="text-subtitle-1 mb-3 font-weight-bold">
            Загруженные файлы ({{ cbctFiles.length }})
          </div>

          <div v-if="isLoading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
          </div>

          <div v-else-if="cbctFiles.length === 0" class="empty-state text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-3">mdi-folder-open</v-icon>
            <div class="text-h6 text-grey-darken-1 mb-2">Нет загруженных КЛКТ файлов</div>
            <div class="text-body-2 text-grey">Загрузите первый файл, используя форму выше</div>
          </div>

          <div v-else class="files-list">
            <v-card
              v-for="file in cbctFiles"
              :key="file.id"
              variant="outlined"
              class="file-card mb-3"
            >
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center flex-grow-1">
                    <v-icon class="mr-4" color="primary" size="40">mdi-radiology-box</v-icon>
                    <div class="flex-grow-1">
                      <div class="text-subtitle-2 font-weight-bold mb-1">{{ file.fileName }}</div>
                      <div class="text-caption text-grey mb-1">
                        {{ formatFileSize(file.fileSize) }} • {{ formatDate(file.createdAt) }}
                      </div>
                      <div v-if="file.notes" class="text-body-2 text-grey-darken-1">
                        {{ file.notes }}
                      </div>
                    </div>
                  </div>
                  <div class="d-flex align-center gap-2">
                    <v-btn
                      color="primary"
                      variant="text"
                      prepend-icon="mdi-download"
                      @click="downloadFile(file)"
                      size="small"
                    >
                      Скачать
                    </v-btn>
                    <v-btn
                      icon="mdi-delete"
                      color="error"
                      variant="text"
                      @click="deleteFile(file.id)"
                      size="small"
                    ></v-btn>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
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

.upload-section {
  padding: 24px;
  background: #f9f9f9;
  border-radius: 12px;
}

.upload-area {
  padding: 48px 24px;
  border: 2px dashed #212121;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: #1a1a1a;
  background: rgba(33, 33, 33, 0.05);
}

.selected-file-section {
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.file-card {
  transition: all 0.3s ease;
}

.file-card:hover {
  box-shadow: 0 4px 12px rgba(33, 33, 33, 0.15);
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
}
</style>

