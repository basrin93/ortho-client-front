import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/shared/api'
import type { TreatmentPlan, CreateTreatmentPlanPayload } from './types'

export const useTreatmentStore = defineStore('treatment', () => {
  const plans = ref<TreatmentPlan[]>([])
  const isLoading = ref(false)

  async function fetchPlans() {
    isLoading.value = true
    try {
      const { data } = await api.get<TreatmentPlan[]>('/treatment-plans')
      plans.value = data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function createPlan(payload: CreateTreatmentPlanPayload) {
    isLoading.value = true
    try {
      const { data } = await api.post<TreatmentPlan>('/treatment-plans', payload)
      await fetchPlans()
      return data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function updatePlan(id: string, payload: Partial<CreateTreatmentPlanPayload>) {
    isLoading.value = true
    try {
      const { data } = await api.patch<TreatmentPlan>(`/treatment-plans/${id}`, payload)
      await fetchPlans()
      return data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function getPlansByPatientId(patientId: string) {
    return plans.value.filter(p => p.patientId === patientId)
  }

  function getActivePlans() {
    return plans.value.filter(p => p.isActive)
  }

  return {
    plans,
    isLoading,
    fetchPlans,
    createPlan,
    updatePlan,
    getPlansByPatientId,
    getActivePlans
  }
})

