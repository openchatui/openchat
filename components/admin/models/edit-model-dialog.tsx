"use client"

import { useCallback, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { TagsEditor } from "./TagsEditor"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Model, UpdateModelData } from "@/types/models"

interface EditModelDialogProps {
  model: Model
  isUpdating: boolean
  onSave: (modelId: string, data: UpdateModelData) => Promise<void>
  children: React.ReactNode
}

export function EditModelDialog({ model, isUpdating, onSave, children }: EditModelDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(model.name)
  const [imageMode, setImageMode] = useState<'url' | 'upload'>(model.meta?.profile_image_url?.startsWith('data:') ? 'upload' : 'url')
  const [imageUrl, setImageUrl] = useState<string>(model.meta?.profile_image_url || '')
  const [uploadPreview, setUploadPreview] = useState<string>(model.meta?.profile_image_url?.startsWith('data:') ? (model.meta?.profile_image_url as string) : '')
  const [saving, setSaving] = useState(false)
  const [tags, setTags] = useState<string[]>(Array.isArray(model.meta?.tags) ? (model.meta?.tags as string[]) : [])
  const [systemPrompt, setSystemPrompt] = useState<string>((model.params as any)?.systemPrompt || (model.meta as any)?.system_prompt || (model.meta as any)?.details?.system_prompt || "")
  const [paramsText, setParamsText] = useState<string>(() => {
    try {
      return model.params ? JSON.stringify(model.params, null, 2) : ""
    } catch {
      return ""
    }
  })
  type ParamsFormState = {
    temperature: string
    topP: string
    topK: string
    seed: string
    maxRetries: string
    presencePenalty: string
    frequencyPenalty: string
    maxOutputTokens: string
    toolChoice: string
  }

  const [paramsForm, setParamsForm] = useState<ParamsFormState>(() => {
    const p: any = model.params || {}
    const toStr = (v: any) => (v === undefined || v === null ? '' : String(v))
    return {
      temperature: toStr(p.temperature),
      topP: toStr(p.topP ?? p.top_p),
      topK: toStr(p.topK ?? p.top_k),
      seed: toStr(p.seed),
      maxRetries: toStr(p.maxRetries ?? p.max_retries),
      presencePenalty: toStr(p.presencePenalty ?? p.presence_penalty),
      frequencyPenalty: toStr(p.frequencyPenalty ?? p.frequency_penalty),
      maxOutputTokens: toStr(p.maxOutputTokens ?? p.max_output_tokens),
      toolChoice: p.toolChoice !== undefined ? (typeof p.toolChoice === 'string' ? String(p.toolChoice) : JSON.stringify(p.toolChoice)) : ''
    }
  })

  const [editingParam, setEditingParam] = useState<string | null>(null)

  // Capture initial values to avoid unintended meta overwrites
  const initialName = useMemo(() => model.name, [model.name])
  const initialImageUrl = useMemo(() => model.meta?.profile_image_url || "", [model.meta])
  const initialTags = useMemo(() => (Array.isArray(model.meta?.tags) ? (model.meta?.tags as string[]) : []), [model.meta])
  // Note: We now store the system prompt in params only, not meta

  const handleParamRowClick = useCallback((key: keyof ParamsFormState) => {
    setEditingParam(prevEditing => {
      if (prevEditing === key) {
        setParamsForm(prev => ({ ...prev, [key]: '' }))
        return null
      }
      return key
    })
  }, [])

  const stopProp = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation()
  }, [])

  const currentPreview = useMemo(() => {
    if (imageMode === 'upload' && uploadPreview) return uploadPreview
    if (imageMode === 'url' && imageUrl) return imageUrl
    return "/OpenChat.png"
  }, [imageMode, uploadPreview, imageUrl])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        setUploadPreview(result)
        setImageMode('upload')
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleSave = useCallback(async () => {
    try {
      setSaving(true)
      const nextMetaUrl = imageMode === 'upload' ? uploadPreview : imageUrl
      let paramsValue: any = undefined
      // Merge quick params form
      const numericKeys: Array<keyof typeof paramsForm> = [
        'temperature',
        'topP',
        'topK',
        'seed',
        'maxRetries',
        'presencePenalty',
        'frequencyPenalty',
        'maxOutputTokens'
      ]
      const mapKeyName = (k: keyof typeof paramsForm) => {
        switch (k) {
          case 'topP': return 'topP'
          case 'topK': return 'topK'
          case 'maxRetries': return 'maxRetries'
          case 'presencePenalty': return 'presencePenalty'
          case 'frequencyPenalty': return 'frequencyPenalty'
          case 'maxOutputTokens': return 'maxOutputTokens'
          default: return k
        }
      }
      const merged: any = paramsValue ? { ...paramsValue } : {}
      for (const key of numericKeys) {
        const val = paramsForm[key]
        if (val !== '') {
          const num = Number(val)
          if (!Number.isFinite(num)) {
            toast.error(`Parameter "${String(key)}" must be a number`)
            setSaving(false)
            return
          }
          merged[mapKeyName(key)] = num
        }
      }
      // Include system prompt in params as well (for runtime usage)
      if ((systemPrompt || '').trim() !== '') {
        merged.systemPrompt = systemPrompt
      }
      if (paramsForm.toolChoice !== '') {
        const t = paramsForm.toolChoice.trim()
        // Treat 'auto' as default → do not persist
        if (t === 'auto') {
          // skip adding toolChoice so it gets removed from DB
        } else if (t.startsWith('{') || t.startsWith('[')) {
          try {
            merged.toolChoice = JSON.parse(t)
          } catch {
            toast.error('toolChoice must be valid JSON or a string')
            setSaving(false)
            return
          }
        } else {
          merged.toolChoice = t
        }
      }
      // Always send params even if empty, to clear defaults in DB
      paramsValue = merged

      // Build meta update only if fields actually changed
      const metaUpdate: Record<string, any> = {}
      if ((nextMetaUrl || "") !== initialImageUrl) {
        if (nextMetaUrl) metaUpdate.profile_image_url = nextMetaUrl
        // If cleared, omit to avoid wiping other meta by accident
      }
      const tagsChanged = JSON.stringify(tags) !== JSON.stringify(initialTags)
      if (tagsChanged) {
        metaUpdate.tags = tags
      }

      const data: UpdateModelData = {}
      if (name !== initialName) {
        data.name = name
      }
      if (Object.keys(metaUpdate).length > 0) {
        data.meta = metaUpdate
      }
      data.params = paramsValue
      await onSave(model.id, data)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }, [imageMode, imageUrl, uploadPreview, name, onSave, model.id, initialImageUrl, initialTags, initialName, tags, systemPrompt, paramsText, paramsForm])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl max-w-[95vw] h-[75vh] overflow-hidden p-0">
        <div className="flex flex-col h-full min-h-0">
          <DialogHeader className="px-6 pt-6 flex-shrink-0">
            <DialogTitle>Edit Model</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4 overflow-y-auto flex-1 min-h-0">
            <div className="flex items-start gap-6">
              <ImagePickerDialog
                value={currentPreview}
                onChange={(val) => {
                  if (val?.startsWith('data:')) {
                    setUploadPreview(val)
                    setImageMode('upload')
                  } else {
                    setImageUrl(val)
                    setImageMode('url')
                  }
                }}
              >
                <button type="button" className="group relative">
                  <img
                    src={currentPreview}
                    alt="Model avatar"
                    className="h-16 w-16 md:h-22 md:w-22 rounded-full object-cover border shadow transition-transform group-hover:scale-[1.02]"
                  />
                  <span className="sr-only">Change profile image</span>
                </button>
              </ImagePickerDialog>

              <div className="flex-1 min-w-0">
                <Label htmlFor="model-name" className="pb-1">Name</Label>
                <Input
                  id="model-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Model name"
                  className="h-12 text-lg md:text-xl px-4"
                />
                <div className="mt-4 space-y-2">
                  <Label htmlFor="model-tags">Tags</Label>
                  <TagsEditor tags={tags} onChange={setTags} disabled={saving || isUpdating} />
                </div>
                <div className="mt-6">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="model-settings">
                      <AccordionTrigger>Model Settings</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="system-prompt">Default System Prompt</Label>
                            <Textarea
                              id="system-prompt"
                              value={systemPrompt}
                              onChange={(e) => setSystemPrompt(e.target.value)}
                              placeholder="Enter a default system prompt for this model"
                              className="min-h-28"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Model Params</Label>
                            <div className="space-y-3">
                              <div className="rounded-md border p-3 hover:bg-muted/30 cursor-pointer" onClick={() => handleParamRowClick('temperature')}>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="param-temperature">Temperature</Label>
                                  <div className="text-xs text-muted-foreground tabular-nums">{paramsForm.temperature !== '' ? paramsForm.temperature : 'Default'}</div>
                                </div>
                                {editingParam === 'temperature' && (
                                  <div className="mt-2 space-y-2" onMouseDownCapture={stopProp} onClickCapture={stopProp}>
                                    <div className="flex items-center justify-between gap-3">
                                      <Slider min={0} max={2} step={0.01} value={[Number(paramsForm.temperature || 0)]} onValueChange={(vals) => setParamsForm({ ...paramsForm, temperature: String(vals[0]) })} />
                                      <Input id="param-temperature" type="number" step={0.01} value={paramsForm.temperature} onChange={(e) => setParamsForm({ ...paramsForm, temperature: e.target.value })} className="w-28 h-8 text-sm px-2" />
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border p-3 hover:bg-muted/30 cursor-pointer" onClick={() => handleParamRowClick('maxOutputTokens')}>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="param-maxOutputTokens">Max Tokens</Label>
                                  <div className="text-xs text-muted-foreground tabular-nums">{paramsForm.maxOutputTokens !== '' ? paramsForm.maxOutputTokens : 'Default'}</div>
                                </div>
                                {editingParam === 'maxOutputTokens' && (
                                  <div className="mt-2" onMouseDownCapture={stopProp} onClickCapture={stopProp}>
                                    <Slider min={0} max={2000000} step={1} value={[Number(paramsForm.maxOutputTokens || 0)]} onValueChange={(vals) => setParamsForm({ ...paramsForm, maxOutputTokens: String(vals[0]) })} />
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border p-3 hover:bg-muted/30 cursor-pointer" onClick={() => handleParamRowClick('topK')}>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="param-topK">Top K</Label>
                                  <div className="text-xs text-muted-foreground tabular-nums">{paramsForm.topK !== '' ? paramsForm.topK : 'Default'}</div>
                                </div>
                                {editingParam === 'topK' && (
                                  <div className="mt-2" onMouseDownCapture={stopProp} onClickCapture={stopProp}>
                                    <Slider min={0} max={1000} step={1} value={[Number(paramsForm.topK || 0)]} onValueChange={(vals) => setParamsForm({ ...paramsForm, topK: String(vals[0]) })} />
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border p-3 hover:bg-muted/30 cursor-pointer" onClick={() => handleParamRowClick('topP')}>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="param-topP">Top P</Label>
                                  <div className="text-xs text-muted-foreground tabular-nums">{paramsForm.topP !== '' ? paramsForm.topP : 'Default'}</div>
                                </div>
                                {editingParam === 'topP' && (
                                  <div className="mt-2" onMouseDownCapture={stopProp} onClickCapture={stopProp}>
                                    <Slider min={0} max={1} step={0.01} value={[Number(paramsForm.topP || 0)]} onValueChange={(vals) => setParamsForm({ ...paramsForm, topP: String(vals[0]) })} />
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border p-3 hover:bg-muted/30 cursor-pointer" onClick={() => handleParamRowClick('frequencyPenalty')}>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="param-frequencyPenalty">Frequency Penalty</Label>
                                  <div className="text-xs text-muted-foreground tabular-nums">{paramsForm.frequencyPenalty !== '' ? paramsForm.frequencyPenalty : 'Default'}</div>
                                </div>
                                {editingParam === 'frequencyPenalty' && (
                                  <div className="mt-2" onMouseDownCapture={stopProp} onClickCapture={stopProp}>
                                    <Slider min={-2} max={2} step={0.01} value={[Number(paramsForm.frequencyPenalty || 0)]} onValueChange={(vals) => setParamsForm({ ...paramsForm, frequencyPenalty: String(vals[0]) })} />
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border p-3 hover:bg-muted/30 cursor-pointer" onClick={() => handleParamRowClick('presencePenalty')}>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="param-presencePenalty">Presence Penalty</Label>
                                  <div className="text-xs text-muted-foreground tabular-nums">{paramsForm.presencePenalty !== '' ? paramsForm.presencePenalty : 'Default'}</div>
                                </div>
                                {editingParam === 'presencePenalty' && (
                                  <div className="mt-2" onMouseDownCapture={stopProp} onClickCapture={stopProp}>
                                    <Slider min={-2} max={2} step={0.01} value={[Number(paramsForm.presencePenalty || 0)]} onValueChange={(vals) => setParamsForm({ ...paramsForm, presencePenalty: String(vals[0]) })} />
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border p-3 hover:bg-muted/30 cursor-pointer" onClick={() => handleParamRowClick('maxRetries')}>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="param-maxRetries">Max Retries</Label>
                                  <div className="text-xs text-muted-foreground tabular-nums">{paramsForm.maxRetries !== '' ? paramsForm.maxRetries : 'Default'}</div>
                                </div>
                                {editingParam === 'maxRetries' && (
                                  <div className="mt-2" onMouseDownCapture={stopProp} onClickCapture={stopProp}>
                                    <Slider min={0} max={10} step={1} value={[Number(paramsForm.maxRetries || 0)]} onValueChange={(vals) => setParamsForm({ ...paramsForm, maxRetries: String(vals[0]) })} />
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border p-3 hover:bg-muted/30 cursor-pointer" onClick={() => handleParamRowClick('seed')}>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="param-seed">Seed</Label>
                                  <div className="text-xs text-muted-foreground tabular-nums">{paramsForm.seed !== '' ? paramsForm.seed : 'Default'}</div>
                                </div>
                                {editingParam === 'seed' && (
                                  <div className="mt-2" onMouseDownCapture={stopProp} onClickCapture={stopProp}>
                                    <Input id="param-seed" type={"number"} step="1" value={paramsForm.seed} onChange={(e) => setParamsForm({ ...paramsForm, seed: e.target.value })} className="w-40" />
                                  </div>
                                )}
                              </div>

                              <div className="rounded-md border p-3 hover:bg-muted/30 cursor-pointer" onClick={() => handleParamRowClick('toolChoice')}>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="param-toolChoice">Tool Choice</Label>
                                  <div className="text-xs text-muted-foreground">{paramsForm.toolChoice !== '' ? paramsForm.toolChoice : 'Default'}</div>
                                </div>
                                {editingParam === 'toolChoice' && (
                                  <div className="mt-2" onMouseDownCapture={stopProp} onClickCapture={stopProp}>
                                    <Select value={paramsForm.toolChoice || undefined as any} onValueChange={(v) => setParamsForm({ ...paramsForm, toolChoice: v })}>
                                      <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Select option" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="auto">auto</SelectItem>
                                        <SelectItem value="none">none</SelectItem>
                                        <SelectItem value="required">required</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 flex-shrink-0">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving || isUpdating}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || isUpdating || name.trim().length === 0}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ImagePickerDialog({ value, onChange, children }: { value: string; onChange: (val: string) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'url' | 'upload'>(value?.startsWith('data:') ? 'upload' : 'url')
  const [url, setUrl] = useState<string>(value?.startsWith('data:') ? '' : (value || ''))
  const [dataUrl, setDataUrl] = useState<string>(value?.startsWith('data:') ? value : '')

  const preview = useMemo(() => {
    if (mode === 'upload' && dataUrl) return dataUrl
    if (mode === 'url' && url) return url
    return "/OpenChat.png"
  }, [mode, dataUrl, url])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        setDataUrl(result)
        setMode('upload')
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleSave = useCallback(() => {
    const next = mode === 'upload' ? dataUrl : url
    onChange(next)
    setOpen(false)
  }, [mode, dataUrl, url, onChange])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Change Profile Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <img src={preview} alt="Preview" className="h-28 w-28 rounded-full object-cover border shadow" />
          </div>
          <div className="space-y-2">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'url' | 'upload')}>
              <TabsList>
                <TabsTrigger value="url">From URL</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="space-y-2">
                <Input
                  placeholder="https://example.com/image.png"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </TabsContent>
              <TabsContent value="upload" className="space-y-2">
                <Input type="file" accept="image/*" onChange={handleFileChange} />
                <p className="text-xs text-muted-foreground">We’ll store the image as an embedded data URL.</p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={mode === 'upload' && !dataUrl}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


