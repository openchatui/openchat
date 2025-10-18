export interface Model {
  id: string
  userId: string
  providerId?: string
  provider?: string | null
  baseModelId: string | null
  name: string
  meta: ModelMeta
  params: any
  createdAt: number
  updatedAt: number
  isActive: boolean
  accessControl?: any
}

export interface ModelMeta {
  profile_image_url?: string | null
  description?: string | null
  tags?: string[] | null
  tools?: any | null
  ownedBy: string
  details?: any | null
  hidden?: boolean | null
  system_prompt?: string | null
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
