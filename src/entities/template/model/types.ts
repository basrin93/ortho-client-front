export interface Template {
  id: string
  userId: string
  text: string
  createdAt: string
}

export interface CreateTemplatePayload {
  text: string
}

