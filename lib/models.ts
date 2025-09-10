// Types
export interface Model {
  id: string
  userId: string
  baseModelId: string | null
  name: string
  meta: ModelMeta
  params: any
  createdAt: number
  updatedAt: number
  isActive: boolean
}

export interface ModelMeta {
  profile_image_url?: string
  description?: string
  tags?: string[]
  tools?: any
  ownedBy: string
  details?: any
}

export interface UpdateModelData {
  isActive?: boolean
  meta?: Partial<ModelMeta>
}

// API utility functions
export const modelsApi = {
  // Get all models for current user
  async getAll(): Promise<Model[]> {
    const response = await fetch('/api/v1/models')
    if (!response.ok) {
      throw new Error('Failed to fetch models')
    }
    const data = await response.json()
    return data.models || []
  },

  // Get single model
  async getById(id: string): Promise<Model> {
    const encodedId = encodeURIComponent(id)
    const response = await fetch(`/api/v1/models/${encodedId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch model')
    }
    return response.json()
  },

  // Update model
  async update(id: string, data: UpdateModelData): Promise<Model> {
    const encodedId = encodeURIComponent(id)
    const response = await fetch(`/api/v1/models/${encodedId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update model')
    }

    return response.json()
  },
}
