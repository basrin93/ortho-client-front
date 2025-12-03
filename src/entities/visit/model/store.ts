import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/shared/api'
import type { Visit, CreateVisitPayload, UpdateVisitPayload } from './types'

export const useVisitStore = defineStore('visit', () => {
  const visits = ref<Visit[]>([])
  const isLoading = ref(false)

  async function fetchVisits() {
    isLoading.value = true
    try {
      const { data } = await api.get<Visit[]>('/visits')
      visits.value = data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function createVisit(payload: CreateVisitPayload) {
    isLoading.value = true
    try {
      const { data } = await api.post<Visit>('/visits', payload)
      await fetchVisits()
      return data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function updateVisit(id: string, payload: UpdateVisitPayload) {
    isLoading.value = true
    try {
      const { data } = await api.patch<Visit>(`/visits/${id}`, payload)
      const index = visits.value.findIndex(v => v.id === id)
      if (index > -1) {
        visits.value[index] = data
      }
      return data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function getVisitsByPatientId(patientId: string) {
    return visits.value.filter(v => v.patientId === patientId)
  }

  return {
    visits,
    isLoading,
    fetchVisits,
    createVisit,
    updateVisit,
    getVisitsByPatientId
  }
})

