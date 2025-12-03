import type { TreatmentPlan } from '@/entities/treatment/model/types'
import type { Visit } from '@/entities/visit/model/types'

export interface Photo {
  id: string
  patientId: string
  s3Key: string
  type: string // Может содержать "visit:{visitId}" или "treatment-plan:{planId}" для фото визита/плана
  createdAt: string
  visitId?: string // Опционально, для удобства фильтрации
  treatmentPlanId?: string // Опционально, для удобства фильтрации
}

export interface Presentation {
  id: string
  patientId: string
  fileName: string
  s3Key: string
  fileSize: number
  createdAt: string
  title?: string | null
}

export interface Patient {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  birthDate: string
  createdAt?: string
  plans?: TreatmentPlan[]
  visits?: Visit[]
  photos?: Photo[]
  presentations?: Presentation[]
}

export interface PatientCreatePayload {
  firstName: string
  lastName: string
  phone: string
  birthDate: string
}

export interface PatientUpdatePayload extends PatientCreatePayload {}
