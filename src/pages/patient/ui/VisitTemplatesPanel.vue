<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useTemplateStore } from '@/entities/template/model/store'
import { useNotify } from '@/shared/ui/notify'
import type { Template } from '@/entities/template/model/types'

const props = defineProps<{
  modelValue: string // Текущий текст заметок
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'insert-text': [text: string]
}>()

const templateStore = useTemplateStore()
const { success, showError } = useNotify()

const showCreateDialog = ref(false)
const newTemplateText = ref('')
const isExpanded = ref(false)

onMounted(async () => {
  await templateStore.fetchTemplates()
  // Автоматически раскрываем, если есть шаблоны
  if (templateStore.templates.length > 0) {
    isExpanded.value = true
  }
})

watch(() => templateStore.templates.length, (newLength) => {
  // Автоматически раскрываем при добавлении первого шаблона
  if (newLength > 0 && !isExpanded.value) {
    isExpanded.value = true
  }
})

function insertTemplate(template: Template) {
  const currentText = props.modelValue || ''
  const separator = currentText.trim() ? '\n' : ''
  const newText = currentText + separator + template.text
  emit('update:modelValue', newText)
  emit('insert-text', template.text)
}

async function createTemplate() {
  if (!newTemplateText.value.trim()) {
    return
  }

  try {
    await templateStore.createTemplate({ text: newTemplateText.value.trim() })
    success('Шаблон успешно создан')
    newTemplateText.value = ''
    showCreateDialog.value = false
  } catch (e: any) {
    showError(e?.message || 'Ошибка при создании шаблона')
  }
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

function cancelCreate() {
  newTemplateText.value = ''
  showCreateDialog.value = false
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="templates-panel">
    <div class="templates-header" @click="toggleExpanded">
      <div class="templates-title-wrapper">
        <v-icon 
          class="expand-icon" 
          :class="{ 'expanded': isExpanded }"
          color="primary"
        >
          mdi-chevron-down
        </v-icon>
        <h3 class="templates-title">
          <v-icon class="mr-2" color="primary">mdi-format-text</v-icon>
          Шаблоны фраз
          <v-chip
            v-if="templateStore.templates.length > 0"
            size="x-small"
            color="primary"
            variant="tonal"
            class="ml-2"
          >
            {{ templateStore.templates.length }}
          </v-chip>
        </h3>
      </div>
      <div class="templates-header-actions" @click.stop>
        <v-btn
          icon="mdi-plus"
          size="small"
          variant="text"
          color="primary"
          @click="showCreateDialog = true"
          title="Создать шаблон"
        ></v-btn>
      </div>
    </div>

    <v-expand-transition>
      <div v-show="isExpanded" class="templates-list">
        <div v-if="templateStore.isLoading" class="loading-state">
          <v-progress-circular indeterminate color="primary" size="24"></v-progress-circular>
        </div>
        
        <div v-else-if="templateStore.templates.length === 0" class="empty-state">
          <v-icon size="32" color="grey-lighten-1" class="mb-2">mdi-format-text</v-icon>
          <p class="text-caption text-grey">Нет шаблонов</p>
          <p class="text-caption text-grey">Создайте первый шаблон</p>
        </div>

        <div
          v-else
          v-for="template in templateStore.templates"
          :key="template.id"
          class="template-item"
          @click="insertTemplate(template)"
        >
          <div class="template-text">{{ template.text }}</div>
          <v-btn
            icon="mdi-delete-outline"
            size="x-small"
            variant="text"
            color="error"
            @click.stop="deleteTemplate(template, $event)"
            title="Удалить шаблон"
            class="template-delete-btn"
          ></v-btn>
        </div>
      </div>
    </v-expand-transition>

    <!-- Диалог создания шаблона -->
    <v-dialog v-model="showCreateDialog" max-width="500" persistent>
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-plus-circle</v-icon>
          Создать шаблон
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          <v-textarea
            v-model="newTemplateText"
            label="Текст шаблона"
            variant="outlined"
            rows="3"
            placeholder="Введите текст шаблона..."
            autofocus
          ></v-textarea>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelCreate">Отмена</v-btn>
          <v-btn
            color="primary"
            :disabled="!newTemplateText.trim()"
            @click="createTemplate"
          >
            Создать
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.templates-panel {
  width: 320px;
  height: 100%;
  background: #fafafa;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
}

.templates-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
  border-radius: 12px 12px 0 0;
}

.templates-header:hover {
  background: #f5f5f5;
}

.templates-title-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
}

.expand-icon {
  margin-right: 8px;
  transition: transform 0.3s ease;
}

.expand-icon.expanded {
  transform: rotate(0deg);
}

.expand-icon:not(.expanded) {
  transform: rotate(-90deg);
}

.templates-header-actions {
  display: flex;
  align-items: center;
}

.templates-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  display: flex;
  align-items: center;
}

.templates-list {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  max-height: 400px;
}

.templates-list::-webkit-scrollbar {
  width: 8px;
}

.templates-list::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 4px;
}

.templates-list::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.templates-list::-webkit-scrollbar-thumb:hover {
  background: #9e9e9e;
}

/* Для Firefox */
.templates-list {
  scrollbar-width: thin;
  scrollbar-color: #bdbdbd #f5f5f5;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
}

.template-item {
  position: relative;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-item:hover {
  border-color: #212121;
  background: #f0f9fa;
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(33, 33, 33, 0.15);
}

.template-text {
  font-size: 14px;
  color: #424242;
  line-height: 1.4;
  padding-right: 24px;
}

.template-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.template-item:hover .template-delete-btn {
  opacity: 1;
}
</style>

