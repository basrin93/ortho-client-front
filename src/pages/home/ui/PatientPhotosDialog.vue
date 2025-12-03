<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePatientStore } from '@/entities/patient/model/store'
import type { Patient, Photo } from '@/entities/patient/model/types'

const props = defineProps<{
  modelValue: boolean
  patient: Patient | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const patientStore = usePatientStore()

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const selectedPhotoIndex = ref(0)
const imageLoading = ref(true)
const imageError = ref(false)

// Получаем актуальные данные пациента из store
// Используем props.patient напрямую, чтобы не терять фото при обновлении
const patientWithPhotos = computed(() => {
  if (!props.patient) return null
  
  // Сначала пытаемся получить из store (может быть более свежие данные)
  const storePatient = patientStore.getPatientById(props.patient.id)
  
  // Если в store есть фото, используем их, иначе используем из props
  if (storePatient?.photos && storePatient.photos.length > 0) {
    return storePatient
  }
  
  // Если в props есть фото, используем их
  if (props.patient.photos && props.patient.photos.length > 0) {
    return props.patient
  }
  
  // Иначе возвращаем из store или props
  return storePatient || props.patient
})

const photos = computed(() => {
  const patient = patientWithPhotos.value
  if (!patient) return []
  
  // Фильтруем фото с валидными URL
  return (patient.photos || []).filter(photo => photo.s3Key && photo.s3Key.trim() !== '')
})

function handleImageError(event: Event) {
  imageError.value = true
  imageLoading.value = false
  console.error('Ошибка загрузки изображения:', (event.target as HTMLImageElement).src)
}

function handleImageLoad() {
  imageLoading.value = false
  imageError.value = false
}

const currentPhoto = computed(() => {
  if (photos.value.length === 0) return null
  return photos.value[selectedPhotoIndex.value]
})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.patient) {
    selectedPhotoIndex.value = 0
    imageLoading.value = true
    imageError.value = false
  }
})

watch(() => currentPhoto.value, () => {
  if (currentPhoto.value) {
    imageLoading.value = true
    imageError.value = false
  }
})

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
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="1200" persistent>
    <v-card rounded="xl" class="photos-dialog-card">
      <!-- Заголовок -->
      <div class="dialog-header">
        <div class="dialog-header-content">
          <div>
            <h2 class="dialog-title">
              Фото пациента: {{ patientWithPhotos?.firstName }} {{ patientWithPhotos?.lastName }}
            </h2>
            <p class="dialog-subtitle">
              Всего фото: {{ photos.length }}
            </p>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="close"
            class="close-btn"
          ></v-btn>
        </div>
      </div>

      <v-divider></v-divider>

      <!-- Пустое состояние -->
      <div v-if="photos.length === 0" class="empty-photos">
        <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-image-off</v-icon>
        <h3 class="text-h6 text-grey-darken-1 mb-2">Нет загруженных фото</h3>
        <p class="text-body-1 text-grey">
          Загрузите первое фото через меню карточки пациента
        </p>
      </div>

      <!-- Галерея фото -->
      <div v-else class="photos-content">
        <!-- Основное фото -->
        <div class="main-photo-container">
          <v-btn
            v-if="photos.length > 1"
            icon="mdi-chevron-left"
            size="large"
            variant="elevated"
            class="nav-btn nav-btn-left"
            @click="prevPhoto"
          ></v-btn>

          <div class="main-photo">
            <img 
              v-if="currentPhoto" 
              :src="currentPhoto.s3Key" 
              :alt="`Фото ${selectedPhotoIndex + 1}`"
              @error="handleImageError"
              @load="handleImageLoad"
            />
            <div v-if="imageLoading" class="image-loading">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            </div>
            <div v-if="imageError" class="image-error">
              <v-icon size="64" color="grey-lighten-1" class="mb-2">mdi-image-off</v-icon>
              <p class="text-body-2 text-grey">Не удалось загрузить изображение</p>
            </div>
          </div>

          <v-btn
            v-if="photos.length > 1"
            icon="mdi-chevron-right"
            size="large"
            variant="elevated"
            class="nav-btn nav-btn-right"
            @click="nextPhoto"
          ></v-btn>
        </div>

        <!-- Миниатюры -->
        <div v-if="photos.length > 1" class="thumbnails-container">
          <div
            v-for="(photo, index) in photos"
            :key="photo.id"
            class="thumbnail"
            :class="{ 'thumbnail-active': index === selectedPhotoIndex }"
            @click="selectPhoto(index)"
          >
            <img 
              :src="photo.s3Key" 
              :alt="`Миниатюра ${index + 1}`"
              @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }"
            />
          </div>
        </div>

        <!-- Информация о фото -->
        <div v-if="currentPhoto" class="photo-info">
          <div class="photo-meta">
            <v-icon size="16" class="mr-1">mdi-calendar</v-icon>
            <span class="text-body-2">
              {{ new Date(currentPhoto.createdAt).toLocaleDateString('ru-RU') }}
            </span>
            <v-chip
              v-if="currentPhoto.type"
              size="small"
              variant="tonal"
              color="primary"
              class="ml-3"
            >
              {{ currentPhoto.type }}
            </v-chip>
          </div>
          <div class="photo-counter">
            {{ selectedPhotoIndex + 1 }} / {{ photos.length }}
          </div>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.photos-dialog-card {
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, #212121 0%, #1a1a1a 100%);
  padding: 24px 32px;
  position: relative;
}

.dialog-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-title {
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin: 0 0 4px 0;
  letter-spacing: -0.3px;
}

.dialog-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.close-btn {
  color: white !important;
}

.empty-photos {
  padding: 80px 32px;
  text-align: center;
}

.photos-content {
  padding: 32px;
}

.main-photo-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  min-height: 500px;
  background: #f5f5f5;
  border-radius: 12px;
  overflow: hidden;
}

.main-photo {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.main-photo img {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
  display: block;
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
  z-index: 1;
}

.image-error {
  background: rgba(255, 255, 255, 0.9);
  padding: 24px;
  border-radius: 12px;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  background: rgba(255, 255, 255, 0.9) !important;
}

.nav-btn-left {
  left: 16px;
}

.nav-btn-right {
  right: 16px;
}

.thumbnails-container {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 16px 0;
  margin-bottom: 16px;
  scrollbar-width: thin;
}

.thumbnails-container::-webkit-scrollbar {
  height: 6px;
}

.thumbnails-container::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 3px;
}

.thumbnail {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.3s ease;
  opacity: 0.7;
}

.thumbnail:hover {
  opacity: 1;
  transform: scale(1.05);
}

.thumbnail-active {
  border-color: #212121;
  opacity: 1;
  box-shadow: 0 4px 12px rgba(33, 33, 33, 0.3);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 12px;
}

.photo-meta {
  display: flex;
  align-items: center;
  color: #616161;
}

.photo-counter {
  font-weight: 600;
  color: #212121;
  font-size: 14px;
}

/* Адаптивность */
@media (max-width: 768px) {
  .main-photo-container {
    min-height: 300px;
  }

  .thumbnail {
    width: 80px;
    height: 80px;
  }

  .dialog-header {
    padding: 20px 24px;
  }

  .photos-content {
    padding: 24px 16px;
  }
}
</style>

