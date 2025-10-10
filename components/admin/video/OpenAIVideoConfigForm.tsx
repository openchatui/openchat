"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { updateVideoConfigAction } from "@/actions/video"

interface Props {
  initialModel?: string
  initialSize?: string
  initialSeconds?: number
}

const OPENAI_VIDEO_MODELS = [
  { id: 'sora-2-pro', label: 'Sora 2 Pro' },
]

export function OpenAIVideoConfigForm({ initialModel = 'sora-2-pro', initialSize = '1280x720', initialSeconds = 4 }: Props) {
  const [model, setModel] = useState<string>(initialModel)
  const [size, setSize] = useState<string>(initialSize)
  const [seconds, setSeconds] = useState<number>(initialSeconds)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const onSave = async () => {
    try {
      setIsSaving(true)
      await updateVideoConfigAction({ provider: 'openai', openai: { model, size, seconds } })
      toast.success("OpenAI video settings saved")
    } catch (e: any) {
      toast.error(e?.message || "Failed to save video settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="openai-video-model">Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger id="openai-video-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPENAI_VIDEO_MODELS.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="openai-video-size">Size</Label>
          <Input id="openai-video-size" value={size} onChange={e => setSize(e.target.value)} placeholder="1280x720" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="openai-video-seconds">Seconds</Label>
          <Input id="openai-video-seconds" type="number" min={1} max={60} value={seconds} onChange={e => setSeconds(Math.max(1, Math.min(600, Number(e.target.value || 1))))} />
        </div>
      </div>
      <Separator />
      <div className="flex justify-end">
        <Button disabled={isSaving} onClick={() => void onSave()}>Save</Button>
      </div>
    </div>
  )
}


