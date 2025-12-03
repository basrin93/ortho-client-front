import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/shared/api'
import type { Template, CreateTemplatePayload } from './types'

export const useTemplateStore = defineStore('template', () => {
  const templates = ref<Template[]>([])
  const isLoading = ref(false)

  async function fetchTemplates() {
    isLoading.value = true
    try {
      const { data } = await api.get<Template[]>('/templates')
      templates.value = data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function createTemplate(payload: CreateTemplatePayload) {
    isLoading.value = true
    try {
      const { data } = await api.post<Template>('/templates', payload)
      templates.value.unshift(data) // Добавляем в начало списка
      return data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function deleteTemplate(id: string) {
    isLoading.value = true
    try {
      await api.delete(`/templates/${id}`)
      templates.value = templates.value.filter(t => t.id !== id)
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    templates,
    isLoading,
    fetchTemplates,
    createTemplate,
    deleteTemplate
  }
})

