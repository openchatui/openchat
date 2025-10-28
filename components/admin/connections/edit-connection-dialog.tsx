"use client"

import React from "react"
import { Loader2, Trash2, Save, Eye, EyeOff, Download, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MESSAGES, PLACEHOLDERS } from "@/constants/connections"
import type { Connection, EditForm, ConnectionType } from "@/types/connections.types"

interface EditConnectionDialogProps {
  editingConnection: (Connection & { type: ConnectionType }) | null
  editForm: EditForm
  isUpdating: boolean
  showEditApiKey: boolean
  onClose: () => void
  onUpdateForm: (field: keyof EditForm, value: string) => void
  onToggleApiKeyVisibility: () => void
  onUpdateConnection: () => void
  onDeleteConnection: () => void
}

export function EditConnectionDialog({
  editingConnection,
  editForm,
  isUpdating,
  showEditApiKey,
  onClose,
  onUpdateForm,
  onToggleApiKeyVisibility,
  onUpdateConnection,
  onDeleteConnection
}: EditConnectionDialogProps) {
  if (!editingConnection) return null

  const isOpenAI = editingConnection.type === 'openai-api'
  const title = `Edit ${isOpenAI ? 'OpenAI' : 'Ollama'} Connection`

  // Ollama-only local state for downloads/deletes
  const [modelInput, setModelInput] = React.useState<string>("")
  const [downloading, setDownloading] = React.useState<boolean>(false)
  const [downloadStatus, setDownloadStatus] = React.useState<string>("")
  const [downloadPct, setDownloadPct] = React.useState<number>(0)
  const [models, setModels] = React.useState<string[]>([])
  const [selectedModel, setSelectedModel] = React.useState<string>("")
  const [deletingModel, setDeletingModel] = React.useState<boolean>(false)

  const fetchLocalModels = React.useCallback(async () => {
    const baseUrl = editForm.baseUrl?.trim()
    if (!baseUrl || isOpenAI) return
    try {
      const res = await fetch(`/api/v1/ollama/models?baseUrl=${encodeURIComponent(baseUrl)}`, { method: 'GET', cache: 'no-store' })
      const data = await res.json().catch(() => null)
      const list = Array.isArray(data?.models) ? data.models : []
      const names: string[] = list
        .map((m: any) => m?.name || m?.model || '')
        .filter((n: string) => typeof n === 'string' && n.trim() !== '')
      setModels(names)
      if (names.length > 0 && !selectedModel) setSelectedModel(names[0])
    } catch {
      // ignore
    }
  }, [editForm.baseUrl, isOpenAI, selectedModel])

  React.useEffect(() => {
    // Refresh list when dialog opens or baseUrl changes (only for Ollama)
    if (!isOpenAI && editForm.baseUrl?.trim()) {
      void fetchLocalModels()
    }
  }, [isOpenAI, editForm.baseUrl, fetchLocalModels])

  const handleDownload = React.useCallback(async () => {
    if (isOpenAI) return
    const baseUrl = editForm.baseUrl?.trim()
    const model = modelInput.trim()
    if (!baseUrl || !model) return
    setDownloading(true)
    setDownloadStatus('Starting...')
    setDownloadPct(0)
    try {
      const res = await fetch('/api/v1/ollama/pull', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, baseUrl, stream: true })
      })
      if (!res.body) {
        const text = await res.text().catch(() => '')
        setDownloadStatus(text || 'Failed to start download')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const json = JSON.parse(trimmed)
            const status: string | undefined = json?.status
            const completed: number | undefined = json?.completed
            const total: number | undefined = json?.total
            let msg = status || 'Downloading'
            if (typeof completed === 'number' && typeof total === 'number' && total > 0) {
              const pct = Math.floor((completed / total) * 100)
              msg = `${msg} - ${pct}% (${completed}/${total})`
              setDownloadPct(Math.min(100, Math.max(0, pct)))
            }
            if (json?.error) {
              let errText = String(json.error)
              // Try to extract nested {"error":"..."}
              const nestedMatch = errText.match(/\{[\s\S]*\}$/)
              if (nestedMatch) {
                try {
                  const nested = JSON.parse(nestedMatch[0])
                  if (nested?.error && typeof nested.error === 'string') {
                    errText = nested.error
                  }
                } catch {}
              } else {
                const regex = /\"error\"\s*:\s*\"([\s\S]*?)\"/
                const m = errText.match(regex)
                if (m && m[1]) errText = m[1]
              }
              msg = `Error: ${errText}`
            }
            if (json?.status === 'success') {
              msg = 'Download complete'
              setDownloadPct(100)
            }
            setDownloadStatus(msg)
          } catch {
            // ignore
          }
        }
      }
      // Flush any remaining buffered JSON (non-stream single JSON response)
      const tail = buffer.trim()
      if (tail) {
        try {
          const json = JSON.parse(tail)
          if (json?.error) {
            let errText = String(json.error)
            const nestedMatch = errText.match(/\{[\s\S]*\}$/)
            if (nestedMatch) {
              try {
                const nested = JSON.parse(nestedMatch[0])
                if (nested?.error && typeof nested.error === 'string') {
                  errText = nested.error
                }
              } catch {}
            } else {
              const regex = /\"error\"\s*:\s*\"([\s\S]*?)\"/
              const m = errText.match(regex)
              if (m && m[1]) errText = m[1]
            }
            setDownloadStatus(`Error: ${errText}`)
          } else if (json?.status) {
            setDownloadStatus(String(json.status))
            if (String(json.status).toLowerCase() === 'success') setDownloadPct(100)
          }
        } catch {}
      }
    } catch (e: any) {
      setDownloadStatus(e?.message || 'Download failed')
    } finally {
      setDownloading(false)
      void fetchLocalModels()
    }
  }, [isOpenAI, editForm.baseUrl, modelInput, fetchLocalModels])

  const handleDelete = React.useCallback(async () => {
    if (isOpenAI) return
    const baseUrl = editForm.baseUrl?.trim()
    const model = selectedModel.trim()
    if (!baseUrl || !model) return
    setDeletingModel(true)
    try {
      const res = await fetch('/api/v1/ollama/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, baseUrl })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('Model deletion failed', data)
      }
    } finally {
      setDeletingModel(false)
      void fetchLocalModels()
    }
  }, [isOpenAI, editForm.baseUrl, selectedModel, fetchLocalModels])

  return (
    <Dialog open={!!editingConnection} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{MESSAGES.BASE_URL_LABEL}</label>
            <Input
              value={editForm.baseUrl}
              onChange={(e) => onUpdateForm('baseUrl', e.target.value)}
              placeholder={isOpenAI ? PLACEHOLDERS.OPENAI_BASE_URL : PLACEHOLDERS.OLLAMA_BASE_URL}
              onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
            />
          </div>

          {!isOpenAI && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Model to download</label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. llama3:latest"
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={downloading || !editForm.baseUrl.trim() || !modelInput.trim()}
                    className="flex items-center gap-2"
                    title="Download model"
                  >
                    {downloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {/* Progress bar */}
                {downloading && (
                  <div className="mt-2">
                    <div className="w-full h-2 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, Math.round(downloadPct)))}%` }} />
                    </div>
                  </div>
                )}
                {downloadStatus && (
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const pct = Math.min(100, Math.max(0, Math.round(downloadPct)))
                      const hasPct = /%/.test(downloadStatus)
                      if (!downloading || pct === 0 || hasPct) return downloadStatus
                      return `${downloadStatus} · ${pct}%`
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Delete downloaded model</label>
                <div className="flex items-center gap-2">
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    onFocus={() => editForm.baseUrl.trim() && fetchLocalModels()}
                  >
                    {models.length === 0 && (
                      <option value="">No models found</option>
                    )}
                    {models.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deletingModel || !editForm.baseUrl.trim() || !selectedModel.trim()}
                    className="flex items-center gap-2"
                    title="Delete model"
                  >
                    {deletingModel ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {isOpenAI && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{MESSAGES.API_KEY_LABEL}</label>
              <div className="relative">
                <Input
                  type={showEditApiKey ? "text" : "password"}
                  value={editForm.apiKey}
                  onChange={(e) => onUpdateForm('apiKey', e.target.value)}
                  placeholder={PLACEHOLDERS.API_KEY}
                  className="pr-10"
                  onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={onToggleApiKeyVisibility}
                >
                  {showEditApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="destructive"
              onClick={onDeleteConnection}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {MESSAGES.DELETE}
            </Button>

            <Button
              onClick={onUpdateConnection}
              disabled={isUpdating || !editForm.baseUrl.trim() ||
                (isOpenAI && !editForm.apiKey.trim())}
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isUpdating ? MESSAGES.SAVING : MESSAGES.SAVE}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
