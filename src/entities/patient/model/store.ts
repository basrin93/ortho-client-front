/* eslint-disable */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/shared/api'
import type { Patient, PatientCreatePayload, PatientUpdatePayload, Photo, Presentation } from './types'

export const usePatientStore = defineStore('patient', () => {
  const patients = ref<Patient[]>([])
  const isLoading = ref(false)
  const selectedPatient = ref<Patient | null>(null)

  // Получить пациента по ID
  const getPatientById = computed(() => {
    return (id: string) => patients.value.find(p => p.id === id)
  })

  async function fetchPatients() {
    isLoading.value = true
    try {
      const { data } = await api.get<Patient[]>('/patients')
      patients.value = data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPatientById(id: string) {
    isLoading.value = true
    try {
      const { data } = await api.get<Patient>(`/patients/${id}`)
      selectedPatient.value = data
      
      // Обновляем в списке, но сохраняем фото если они уже есть
      const index = patients.value.findIndex(p => p.id === id)
      if (index > -1) {
        const existingPatient = patients.value[index]
        // Если в новых данных нет фото, но они были раньше, сохраняем их
        if (!data.photos && existingPatient.photos) {
          data.photos = existingPatient.photos
        }
        patients.value[index] = data
      }
      
      return data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function createPatient(payload: PatientCreatePayload) {
    isLoading.value = true
    try {
      const { data } = await api.post<Patient>('/patients', payload)
      await fetchPatients()
      return data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function updatePatient(id: string, payload: PatientUpdatePayload) {
    isLoading.value = true
    try {
      const { data } = await api.patch<Patient>(`/patients/${id}`, payload)
      
      // Обновляем пациента в списке
      const index = patients.value.findIndex(p => p.id === id)
      if (index > -1) {
        // Сохраняем существующие данные, которые не приходят в ответе
        const existingPatient = patients.value[index]
        patients.value[index] = {
          ...data,
          photos: existingPatient.photos,
          plans: existingPatient.plans,
          visits: existingPatient.visits,
          presentations: existingPatient.presentations
        }
      }
      
      // Обновляем selectedPatient, если он был выбран
      if (selectedPatient.value?.id === id) {
        selectedPatient.value = {
          ...data,
          photos: selectedPatient.value.photos,
          plans: selectedPatient.value.plans,
          visits: selectedPatient.value.visits,
          presentations: selectedPatient.value.presentations
        }
      }
      
      return data
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function deleteById(id: string) {
    isLoading.value = true
    try {
      await api.delete(`/patients/${id}`)
      patients.value = patients.value.filter(p => p.id !== id)
      
      if (selectedPatient.value?.id === id) {
        selectedPatient.value = null
      }
    } catch (e) {
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function setSelectedPatient(patient: Patient | null) {
    selectedPatient.value = patient
  }

  async function uploadPhoto(patientId: string, file: File, visitId?: string, treatmentPlanId?: string): Promise<Photo> {
    const formData = new FormData()
    formData.append('file', file)
    if (visitId) {
      formData.append('visitId', visitId)
    }
    if (treatmentPlanId) {
      formData.append('treatmentPlanId', treatmentPlanId)
    }
    
    const { data } = await api.post<Photo>(`/patients/${patientId}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    // Обновляем пациента в списке
    const patient = patients.value.find(p => p.id === patientId)
    if (patient) {
      if (!patient.photos) {
        patient.photos = []
      }
      patient.photos.push(data)
    }
    
    return data
  }
  
  function getPhotosByVisitId(patientId: string, visitId: string): Photo[] {
    const patient = patients.value.find(p => p.id === patientId)
    if (!patient || !patient.photos) return []
    
    // Фильтруем фото по visitId в типе (формат: "visit:{visitId}")
    return patient.photos.filter(photo => {
      return photo.type === `visit:${visitId}` || 
             photo.type?.startsWith(`visit:${visitId}:`) ||
             photo.visitId === visitId
    })
  }

  function getPhotosByPlanId(patientId: string, planId: string): Photo[] {
    const patient = patients.value.find(p => p.id === patientId)
    if (!patient || !patient.photos) return []
    
    // Фильтруем фото по planId (проверяем и treatmentPlanId, и type для обратной совместимости)
    return patient.photos.filter(photo => {
      // Проверяем treatmentPlanId напрямую
      if (photo.treatmentPlanId === planId) {
        return true
      }
      // Проверяем type для обратной совместимости
      return photo.type === `treatment-plan:${planId}` ||
             photo.type?.startsWith(`treatment-plan:${planId}:`)
    })
  }

  async function deletePhoto(photoId: string) {
    try {
      await api.delete(`/patients/photos/${photoId}`)
      
      // Удаляем фото из всех пациентов в списке
      patients.value.forEach(patient => {
        if (patient.photos) {
          const index = patient.photos.findIndex(p => p.id === photoId)
          if (index > -1) {
            patient.photos.splice(index, 1)
          }
        }
      })
    } catch (e) {
      throw e
    }
  }

  async function uploadPresentation(patientId: string, file: File, title?: string): Promise<Presentation> {
    const formData = new FormData()
    formData.append('file', file)
    if (title) {
      formData.append('title', title)
    }
    
    const { data } = await api.post<Presentation>(`/patients/${patientId}/presentations`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    // Обновляем пациента в списке
    const patient = patients.value.find(p => p.id === patientId)
    if (patient) {
      if (!patient.presentations) {
        patient.presentations = []
      }
      patient.presentations.push(data)
    }
    
    return data
  }

  async function fetchPresentations(patientId: string): Promise<Presentation[]> {
    try {
      const { data } = await api.get<Presentation[]>(`/patients/${patientId}/presentations`)
      
      // Обновляем презентации пациента в списке
      const patient = patients.value.find(p => p.id === patientId)
      if (patient) {
        patient.presentations = data
      }
      
      return data
    } catch (e) {
      throw e
    }
  }

  async function deletePresentation(presentationId: string) {
    try {
      await api.delete(`/patients/presentations/${presentationId}`)
      
      // Удаляем презентацию из всех пациентов в списке
      patients.value.forEach(patient => {
        if (patient.presentations) {
          const index = patient.presentations.findIndex(p => p.id === presentationId)
          if (index > -1) {
            patient.presentations.splice(index, 1)
          }
        }
      })
    } catch (e) {
      throw e
    }
  }

  return {
    patients,
    isLoading,
    selectedPatient,
    getPatientById,
    fetchPatients,
    fetchPatientById,
    createPatient,
    updatePatient,
    deleteById,
    setSelectedPatient,
    uploadPhoto,
    deletePhoto,
    getPhotosByVisitId,
    getPhotosByPlanId,
    uploadPresentation,
    fetchPresentations,
    deletePresentation
  }
})