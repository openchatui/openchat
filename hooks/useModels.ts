import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { modelsApi } from '@/lib/models'
import type {
  Model,
  ModelsState,
  ModelsGroupedByOwner,
  UpdateModelData,
  ModelMeta
} from '@/types/models'

export function useModels() {
  const [modelsState, setModelsState] = useState<ModelsState>({
    models: [],
    isLoading: true,
    updatingIds: new Set()
  })

  const loadModels = useCallback(async () => {
    try {
      setModelsState(prev => ({ ...prev, isLoading: true }))
      const models = await modelsApi.getAll()
      setModelsState(prev => ({ ...prev, models }))
    } catch (error) {
      console.error('Error loading models:', error)
      toast.error('Failed to load models')
    } finally {
      setModelsState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  const updateModel = useCallback(async (modelId: string, data: UpdateModelData) => {
    try {
      setModelsState(prev => ({
        ...prev,
        updatingIds: new Set(prev.updatingIds).add(modelId)
      }))

      await modelsApi.update(modelId, data)

      // Update local state
      setModelsState(prev => ({
        ...prev,
        models: prev.models.map(model =>
          model.id === modelId ? { ...model, ...data } as Model : model
        )
      }))

      toast.success('Model updated successfully')
    } catch (error) {
      console.error('Error updating model:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update model')
    } finally {
      setModelsState(prev => ({
        ...prev,
        updatingIds: (() => {
          const newSet = new Set(prev.updatingIds)
          newSet.delete(modelId)
          return newSet
        })()
      }))
    }
  }, [])

  const toggleModelActive = useCallback(async (modelId: string, isActive: boolean) => {
    await updateModel(modelId, { isActive })
  }, [updateModel])

  const updateModelsVisibility = useCallback(async (modelUpdates: { id: string; hidden: boolean }[]) => {
    try {
      // Add all model IDs to updating set
      setModelsState(prev => ({
        ...prev,
        updatingIds: new Set([...prev.updatingIds, ...modelUpdates.map(update => update.id)])
      }))

      // Update each model individually (or you could implement a batch API endpoint)
      const updatePromises = modelUpdates.map(({ id, hidden }) => {
        const updateData: any = { meta: { hidden } }
        // When hiding a model, also set it to inactive
        if (hidden) {
          updateData.isActive = false
        }
        return modelsApi.update(id, updateData)
      })

      await Promise.all(updatePromises)

      // Update local state for all models
      setModelsState(prev => ({
        ...prev,
        models: prev.models.map(model => {
          const update = modelUpdates.find(u => u.id === model.id)
          if (update) {
            return {
              ...model,
              meta: {
                ...model.meta,
                hidden: update.hidden
              },
              // When hiding a model, also set it to inactive
              isActive: update.hidden ? false : model.isActive
            } as Model
          }
          return model
        })
      }))

      toast.success(`Updated visibility for ${modelUpdates.length} model${modelUpdates.length === 1 ? '' : 's'}`)
    } catch (error) {
      console.error('Error updating model visibility:', error)
      toast.error('Failed to update model visibility')
    } finally {
      // Remove all model IDs from updating set
      setModelsState(prev => ({
        ...prev,
        updatingIds: (() => {
          const newSet = new Set(prev.updatingIds)
          modelUpdates.forEach(update => newSet.delete(update.id))
          return newSet
        })()
      }))
    }
  }, [])

  const groupModelsByOwner = useCallback((models: Model[]): ModelsGroupedByOwner => {
    return models.reduce((groups, model) => {
      const owner = model.meta?.ownedBy || 'unknown'
      if (!groups[owner]) {
        groups[owner] = []
      }
      groups[owner].push(model)
      return groups
    }, {} as ModelsGroupedByOwner)
  }, [])

  // Load models on mount
  useEffect(() => {
    loadModels()
  }, [loadModels])

  return {
    // State
    models: modelsState.models,
    isLoading: modelsState.isLoading,
    updatingIds: modelsState.updatingIds,

    // Computed
    groupedModels: groupModelsByOwner(modelsState.models),

    // Actions
    loadModels,
    updateModel,
    toggleModelActive,
    updateModelsVisibility
  }
}
