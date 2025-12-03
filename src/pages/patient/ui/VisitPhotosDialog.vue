<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePatientStore } from '@/entities/patient/model/store'
import { useNotify } from '@/shared/ui/notify'
import type { Photo, Patient } from '@/entities/patient/model/types'
import type { Visit } from '@/entities/visit/model/types'

const props = defineProps<{
  modelValue: boolean
  patient: Patient | null
  visit: Visit | null
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

const selectedPhotoIndex = ref(0)
const imageLoading = ref(true)
const imageError = ref(false)
const selectedFiles = ref<File[]>([])
const photoPreviews = ref<string[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isUploadingPhoto = ref(false)
const isDeletingPhoto = ref(false)

// Зум и панорамирование
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const lastPanPoint = ref({ x: 0, y: 0 })
const imageContainerRef = ref<HTMLDivElement | null>(null)

// Получаем фото визита
const photos = computed(() => {
  if (!props.patient || !props.visit) return []
  return patientStore.getPhotosByVisitId(props.patient.id, props.visit.id)
})

const currentPhoto = computed(() => {
  if (photos.value.length === 0) return null
  return photos.value[selectedPhotoIndex.value]
})

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.patient && props.visit) {
    selectedPhotoIndex.value = 0
    imageError.value = false
    imageLoading.value = false // По умолчанию не показываем загрузку
    
    // Обновляем данные пациента, чтобы получить актуальные фото
    try {
      await patientStore.fetchPatientById(props.patient.id)
      // После обновления, если фото есть, показываем загрузку только на время проверки
      if (photos.value.length > 0 && currentPhoto.value) {
        imageLoading.value = true
        // Проверяем, загружено ли изображение (может быть в кэше)
        checkImageLoaded(currentPhoto.value.s3Key)
      }
    } catch (e) {
      console.error('Ошибка загрузки данных пациента:', e)
      imageLoading.value = false
    }
  } else {
    // При закрытии сбрасываем состояние
    imageLoading.value = false
    imageError.value = false
  }
})

watch(() => currentPhoto.value, (newPhoto) => {
  if (newPhoto) {
    imageLoading.value = true
    imageError.value = false
    // Сбрасываем зум при смене фото
    resetZoom()
    // Проверяем, не загружено ли изображение уже (кэш)
    checkImageLoaded(newPhoto.s3Key)
  } else {
    imageLoading.value = false
  }
})

function handleImageError(event: Event) {
  imageError.value = true
  imageLoading.value = false
  console.error('Ошибка загрузки изображения:', (event.target as HTMLImageElement).src)
}

function handleImageLoad() {
  // Сбрасываем загрузку когда изображение загрузилось
  imageLoading.value = false
  imageError.value = false
}

// Проверяем, загружено ли изображение (для кэшированных изображений)
function checkImageLoaded(src: string) {
  const img = new Image()
  let loaded = false
  
  img.onload = () => {
    if (!loaded) {
      loaded = true
      imageLoading.value = false
      imageError.value = false
    }
  }
  img.onerror = () => {
    if (!loaded) {
      loaded = true
      imageError.value = true
      imageLoading.value = false
    }
  }
  
  // Устанавливаем таймаут на случай, если изображение уже в кэше и события не сработают
  setTimeout(() => {
    if (!loaded && imageLoading.value) {
      // Если изображение в кэше, события могут не сработать, но изображение загружено
      // Проверяем через complete
      if (img.complete) {
        loaded = true
        imageLoading.value = false
        imageError.value = false
      }
    }
  }, 100)
  
  img.src = src
}

function nextPhoto() {
  if (selectedPhotoIndex.value < photos.value.length - 1) {
    selectedPhotoIndex.value++
  } else {
    selectedPhotoIndex.value = 0
  }
}

function prevPhoto() {
  if (selectedPhotoIndex.value > 0) {
    selectedPhotoIndex.value--
  } else {
    selectedPhotoIndex.value = photos.value.length - 1
  }
}

function selectPhoto(index: number) {
  selectedPhotoIndex.value = index
}

function close() {
  dialog.value = false
  selectedFiles.value = []
  photoPreviews.value = []
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const files = Array.from(target.files)
    selectedFiles.value = [...selectedFiles.value, ...files]

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        photoPreviews.value.push(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    })
  }
}

function removePhotoPreview(index: number) {
  selectedFiles.value.splice(index, 1)
  photoPreviews.value.splice(index, 1)
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function uploadPhotos() {
  if (!props.patient || !props.visit || selectedFiles.value.length === 0) {
    return
  }

  isUploadingPhoto.value = true
  try {
    let successCount = 0
    for (const file of selectedFiles.value) {
      try {
        await patientStore.uploadPhoto(props.patient!.id, file, props.visit!.id)
        successCount++
      } catch (photoError: any) {
        console.error('Ошибка загрузки файла:', photoError)
      }
    }

    if (successCount > 0) {
      success(`Загружено ${successCount} ${successCount === 1 ? 'фото' : 'фото'}`)
    }

    selectedFiles.value = []
    photoPreviews.value = []
    if (fileInput.value) {
      fileInput.value.value = ''
    }

    // Обновляем данные пациента
    await patientStore.fetchPatientById(props.patient.id)
    
    // Сбрасываем индекс, если удалили текущее фото
    if (selectedPhotoIndex.value >= photos.value.length && photos.value.length > 0) {
      selectedPhotoIndex.value = photos.value.length - 1
    } else if (photos.value.length === 0) {
      selectedPhotoIndex.value = 0
    }
  } catch (e: any) {
    const errorMessage = e?.message || 'Ошибка при загрузке фото'
    showError(errorMessage)
  } finally {
    isUploadingPhoto.value = false
  }
}

async function deleteCurrentPhoto() {
  if (!currentPhoto.value || !props.patient) {
    return
  }

  if (!confirm('Вы уверены, что хотите удалить это фото?')) {
    return
  }

  await deletePhotoByIndex(selectedPhotoIndex.value)
}

async function deletePhotoByIndex(index: number) {
  const photo = photos.value[index]
  if (!photo || !props.patient) {
    return
  }

  if (!confirm('Вы уверены, что хотите удалить это фото?')) {
    return
  }

  isDeletingPhoto.value = true
  try {
    await patientStore.deletePhoto(photo.id)
    success('Фото успешно удалено')

    // Обновляем данные пациента
    await patientStore.fetchPatientById(props.patient.id)

    // Корректируем индекс после удаления
    if (photos.value.length === 0) {
      selectedPhotoIndex.value = 0
    } else if (selectedPhotoIndex.value >= photos.value.length) {
      selectedPhotoIndex.value = photos.value.length - 1
    } else if (selectedPhotoIndex.value > index) {
      selectedPhotoIndex.value--
    }
  } catch (e: any) {
    const errorMessage = e?.message || 'Ошибка при удалении фото'
    showError(errorMessage)
  } finally {
    isDeletingPhoto.value = false
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

// Функции зума
function resetZoom() {
  scale.value = 1
  panX.value = 0
  panY.value = 0
}

function zoomIn() {
  scale.value = Math.min(scale.value * 1.2, 5)
}

function zoomOut() {
  scale.value = Math.max(scale.value / 1.2, 0.5)
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  scale.value = Math.max(0.5, Math.min(5, scale.value * delta))
}

function startPan(e: MouseEvent) {
  if (e.button !== 0) return // Только левая кнопка мыши
  isPanning.value = true
  lastPanPoint.value = { x: e.clientX, y: e.clientY }
  e.preventDefault()
}

function pan(e: MouseEvent) {
  if (!isPanning.value) return
  panX.value += e.clientX - lastPanPoint.value.x
  panY.value += e.clientY - lastPanPoint.value.y
  lastPanPoint.value = { x: e.clientX, y: e.clientY }
}

function stopPan() {
  isPanning.value = false
}

// Обработка клавиатуры для переключения фото
function handleKeyDown(e: KeyboardEvent) {
  if (!dialog.value || !currentPhoto.value) return
  
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prevPhoto()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    nextPhoto()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <v-dialog v-model="dialog" max-width="1200" fullscreen>
    <v-card class="photos-dialog-card">
      <v-card-title class="dialog-header-title">
        <div class="dialog-header-left">
          <v-icon class="mr-2" color="primary">mdi-image-multiple</v-icon>
          <span class="dialog-title-text">Фото визита от {{ visit ? formatDate(visit.date) : '' }}</span>
          <v-chip v-if="photos.length > 0" size="small" class="ml-3" color="primary" variant="tonal">
            {{ photos.length }}
          </v-chip>
        </div>
        <div class="dialog-header-right">
          <v-btn
            color="primary"
            prepend-icon="mdi-camera"
            @click="fileInput?.click()"
            :disabled="!patient || !visit"
            class="add-photo-btn"
            size="small"
          >
            <span class="add-photo-text">Добавить</span>
          </v-btn>
          <v-btn 
            icon="mdi-close" 
            variant="text" 
            @click="close"
            class="close-dialog-btn"
            size="small"
          ></v-btn>
        </div>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-0" style="height: calc(100vh - 120px); overflow: hidden;">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          style="display: none"
          @change="handleFileSelect"
        />

        <!-- Новые фото для загрузки -->
        <div v-if="photoPreviews.length > 0" class="new-photos-section pa-4">
          <div class="text-subtitle-2 mb-3 font-weight-bold">Новые фото для загрузки</div>
          <div class="photo-grid mb-3">
            <div v-for="(preview, index) in photoPreviews" :key="index" class="photo-preview-item">
              <img :src="preview" alt="Превью фото" />
              <v-btn
                icon="mdi-close"
                size="x-small"
                variant="text"
                class="remove-photo-btn"
                @click="removePhotoPreview(index)"
              ></v-btn>
            </div>
          </div>
          <v-btn
            color="primary"
            rounded="lg"
            prepend-icon="mdi-upload"
            :loading="isUploadingPhoto"
            :disabled="selectedFiles.length === 0"
            @click="uploadPhotos"
            size="large"
            block
          >
            Загрузить {{ selectedFiles.length }} фото
          </v-btn>
        </div>

        <div v-if="photos.length === 0 && photoPreviews.length === 0" class="empty-photos-state">
          <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-image-off</v-icon>
          <h3 class="text-h6 text-grey-darken-1 mb-2">Нет фото</h3>
          <p class="text-body-1 text-grey mb-4">Фото для этого визита еще не добавлены</p>
          <v-btn
            color="primary"
            prepend-icon="mdi-camera"
            @click="fileInput?.click()"
            :disabled="!patient || !visit"
            size="large"
          >
            Добавить фото
          </v-btn>
        </div>

        <div v-else class="photos-container">
          <!-- Основное фото -->
          <div 
            class="main-photo-container"
            ref="imageContainerRef"
            @wheel="handleWheel"
            @mousedown="startPan"
            @mousemove="pan"
            @mouseup="stopPan"
            @mouseleave="stopPan"
          >
            <div class="main-photo-wrapper">
              <img 
                v-if="currentPhoto" 
                :src="currentPhoto.s3Key" 
                :alt="`Фото ${selectedPhotoIndex + 1}`"
                @error="handleImageError"
                @load="handleImageLoad"
                class="main-photo"
                :style="{
                  transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  cursor: scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
                }"
              />
              <div v-if="imageLoading" class="image-loading">
                <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
              </div>
              <div v-if="imageError" class="image-error">
                <v-icon size="64" color="grey-lighten-1" class="mb-2">mdi-image-off</v-icon>
                <p class="text-body-2 text-grey">Не удалось загрузить изображение</p>
              </div>
            </div>

            <!-- Кнопки управления зумом -->
            <div v-if="currentPhoto" class="zoom-controls">
              <v-btn
                icon="mdi-magnify-plus"
                size="small"
                class="zoom-btn"
                @click="zoomIn"
                variant="text"
                title="Увеличить"
              ></v-btn>
              <v-btn
                icon="mdi-magnify-minus"
                size="small"
                class="zoom-btn"
                @click="zoomOut"
                variant="text"
                title="Уменьшить"
              ></v-btn>
              <v-btn
                icon="mdi-fit-to-screen"
                size="small"
                class="zoom-btn"
                @click="resetZoom"
                variant="text"
                title="Сбросить масштаб"
                :disabled="scale === 1"
              ></v-btn>
            </div>

            <!-- Кнопка удаления -->
            <v-btn
              v-if="currentPhoto"
              icon="mdi-delete"
              size="large"
              class="delete-btn"
              @click="deleteCurrentPhoto"
              :loading="isDeletingPhoto"
              variant="text"
              color="error"
            ></v-btn>

            <!-- Навигационные кнопки -->
            <v-btn
              v-if="photos.length > 1"
              icon="mdi-chevron-left"
              size="large"
              class="nav-btn nav-btn-left"
              @click="prevPhoto"
              variant="text"
            ></v-btn>
            <v-btn
              v-if="photos.length > 1"
              icon="mdi-chevron-right"
              size="large"
              class="nav-btn nav-btn-right"
              @click="nextPhoto"
              variant="text"
            ></v-btn>
          </div>

          <!-- Миниатюры -->
          <div v-if="photos.length > 0" class="thumbnails-container">
            <div
              v-for="(photo, index) in photos"
              :key="photo.id"
              class="thumbnail"
              :class="{ active: index === selectedPhotoIndex }"
              @click="selectPhoto(index)"
            >
              <img :src="photo.s3Key" :alt="`Миниатюра ${index + 1}`" />
              <v-btn
                icon="mdi-close"
                size="x-small"
                variant="text"
                class="thumbnail-delete-btn"
                @click.stop="deletePhotoByIndex(index)"
                :loading="isDeletingPhoto && selectedPhotoIndex === index"
              ></v-btn>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.photos-dialog-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.empty-photos-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.photos-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.main-photo-container {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
  user-select: none;
}

.main-photo-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-photo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.1s ease-out;
  user-select: none;
  pointer-events: none;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}

/* При увеличении используем более качественное масштабирование */
.main-photo-container[style*="scale"] .main-photo {
  image-rendering: auto;
  image-rendering: -webkit-optimize-contrast;
}

.zoom-controls {
  position: absolute;
  top: 16px;
  right: 80px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px;
  border-radius: 8px;
  z-index: 3;
}

.zoom-btn {
  color: white !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.image-loading,
.image-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5) !important;
  color: white !important;
  z-index: 2;
}

.nav-btn:hover {
  background: rgba(0, 0, 0, 0.7) !important;
}

.nav-btn-left {
  left: 16px;
}

.nav-btn-right {
  right: 16px;
}

.delete-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(244, 67, 54, 0.8) !important;
  color: white !important;
  z-index: 2;
}

.delete-btn:hover {
  background: rgba(244, 67, 54, 1) !important;
}

.new-photos-section {
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
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

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  width: 100%;
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

.thumbnail {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s ease;
  opacity: 0.6;
}

.thumbnail:hover {
  opacity: 1;
  transform: scale(1.05);
}

.thumbnail.active {
  border-color: #212121;
  opacity: 1;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(244, 67, 54, 0.9) !important;
  color: white !important;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.thumbnail:hover .thumbnail-delete-btn {
  opacity: 1;
}

.thumbnails-container {
  display: flex;
  gap: 8px;
  padding: 16px;
  overflow-x: auto;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
}

/* Кастомный скроллбар для миниатюр */
.thumbnails-container::-webkit-scrollbar {
  height: 8px;
}

.thumbnails-container::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 4px;
}

.thumbnails-container::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 4px;
}

.thumbnails-container::-webkit-scrollbar-thumb:hover {
  background: #9e9e9e;
}

/* Заголовок диалога */
.dialog-header-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  flex-wrap: wrap;
  gap: 12px;
  position: relative;
  z-index: 10;
  background: white;
}

.dialog-header-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.dialog-title-text {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dialog-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.add-photo-btn {
  flex-shrink: 0;
}

.add-photo-text {
  display: inline;
}

.close-dialog-btn {
  flex-shrink: 0;
  min-width: 40px !important;
  width: 40px !important;
  height: 40px !important;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .dialog-header-title {
    padding: 12px;
    gap: 8px;
  }

  .dialog-header-left {
    flex: 1 1 100%;
    order: 1;
    margin-bottom: 8px;
  }

  .dialog-header-right {
    flex: 1 1 100%;
    order: 2;
    justify-content: space-between;
    width: 100%;
  }

  .add-photo-btn {
    flex: 1;
    max-width: calc(100% - 48px);
  }

  .add-photo-text {
    display: inline;
  }

  .close-dialog-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 11;
    background: rgba(255, 255, 255, 0.9) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .dialog-title-text {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .add-photo-text {
    display: none;
  }

  .add-photo-btn {
    min-width: 40px !important;
    width: 40px !important;
    padding: 0 !important;
  }

  .add-photo-btn :deep(.v-btn__prepend) {
    margin: 0 !important;
  }
}
</style>
