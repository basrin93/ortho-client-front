export interface Visit {
  id: string
  patientId: string
  date: string
  notes: string
  patient?: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface CreateVisitPayload {
  patientId: string
  date?: string
  notes: string
}

export interface UpdateVisitPayload {
  date?: string
  notes: string
}

