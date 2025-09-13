"use client"

import { useCallback, useEffect, useState } from "react"

interface UseAdminUIArgs {
  modelIds: string[]
}

interface TasksConfigResponse {
  tasks?: {
    TASK_MODEL?: string | null
    TITLE_PROMPT?: string | null
    TAGS_PROMPT?: string | null
  }
}

export function useAdminUI({ modelIds }: UseAdminUIArgs) {
  const [availableModelIds] = useState<string[]>(modelIds)
  const [selectedTaskModelId, setSelectedTaskModelId] = useState<string>("")
  const [titlePrompt, setTitlePrompt] = useState<string>("")
  const [tagsPrompt, setTagsPrompt] = useState<string>("")
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Load config on mount
  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        setIsLoadingConfig(true)
        const res = await fetch("/api/v1/tasks/config", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load config")
        const cfg: TasksConfigResponse = await res.json()
        const taskModel = (cfg.tasks?.TASK_MODEL as string) || ""
        const title = (cfg.tasks?.TITLE_PROMPT as string) || ""
        const tags = (cfg.tasks?.TAGS_PROMPT as string) || ""
        if (isMounted) {
          setSelectedTaskModelId(taskModel)
          setTitlePrompt(title)
          setTagsPrompt(tags)
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message || "Failed to load config")
      } finally {
        if (isMounted) setIsLoadingConfig(false)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [])

  const updateTaskModel = useCallback(async (modelId: string) => {
    setSelectedTaskModelId(modelId)
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/tasks/config/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: { TASK_MODEL: modelId } })
      })
      if (!res.ok) throw new Error("Failed to save config")
    } catch (e: any) {
      setError(e?.message || "Failed to save config")
    } finally {
      setIsSaving(false)
    }
  }, [])

  const persistTitlePrompt = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/tasks/config/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: { TITLE_PROMPT: titlePrompt } })
      })
      if (!res.ok) throw new Error("Failed to save title prompt")
    } catch (e: any) {
      setError(e?.message || "Failed to save title prompt")
    } finally {
      setIsSaving(false)
    }
  }, [titlePrompt])

  const persistTagsPrompt = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/tasks/config/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: { TAGS_PROMPT: tagsPrompt } })
      })
      if (!res.ok) throw new Error("Failed to save tags prompt")
    } catch (e: any) {
      setError(e?.message || "Failed to save tags prompt")
    } finally {
      setIsSaving(false)
    }
  }, [tagsPrompt])

  return {
    availableModelIds,
    selectedTaskModelId,
    titlePrompt,
    tagsPrompt,
    isLoadingConfig,
    isSaving,
    error,
    updateTaskModel,
    setTitlePrompt,
    setTagsPrompt,
    persistTitlePrompt,
    persistTagsPrompt,
  }
}


