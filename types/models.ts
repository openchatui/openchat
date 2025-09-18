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
  hidden?: boolean
  system_prompt?: string
}

export interface UpdateModelData {
  name?: string
  isActive?: boolean
  meta?: Partial<ModelMeta>
  params?: any
}

export interface ModelsState {
  models: Model[]
  isLoading: boolean
  updatingIds: Set<string>
}

export interface ModelsGroupedByOwner {
  [owner: string]: Model[]
}
