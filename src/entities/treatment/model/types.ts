export interface TreatmentPlan {
  id: string
  patientId: string
  diagnosis: string
  apparatusType: string
  startDate: string
  isActive: boolean
  patient?: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface CreateTreatmentPlanPayload {
  patientId: string
  diagnosis: string
  apparatusType: string
  startDate?: string
  isActive?: boolean
}

