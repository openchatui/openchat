"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AnimatedLoader } from "@/components/ui/loader"
import { MESSAGES } from "@/constants/audio"
import { toast } from "sonner"
import { useAudio } from "@/hooks/audio/useAudio"
import { OpenAISttConnectionForm } from "@/components/admin/audio/OpenAISttConnectionForm"
import { DeepgramSttConnectionForm } from "@/components/admin/audio/DeepgramSttConnectionForm"
import { ElevenLabsTtsConnectionForm } from "@/components/admin/audio/ElevenLabsTtsConnectionForm"

interface AdminAudioProps {
    session: Session | null
    initialChats?: any[]
    initialOpenAI?: { baseUrl: string; apiKey: string }
    initialElevenLabs?: { apiKey: string; voiceId: string; modelId: string }
    initialDeepgram?: { apiKey: string }
}

export function AdminAudio({ session, initialChats = [], initialOpenAI, initialElevenLabs, initialDeepgram }: AdminAudioProps) {
  const {
    isLoading,
    ttsEnabled,
    sttEnabled,
    ttsProvider,
    sttProvider,
    whisperWebModel,
    toggleTtsEnabled,
    toggleSttEnabled,
    setTtsProvider,
    setSttProvider,
    setWhisperWebModel,
  } = useAudio()

  // TTS provider now persisted via useAudio

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">{MESSAGES.TITLE}</h2>
          <p className="text-muted-foreground">{MESSAGES.DESCRIPTION}</p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AnimatedLoader className="h-10 w-10" message={MESSAGES.LOADING} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{MESSAGES.TTS_TITLE}</CardTitle>
                <CardDescription>{MESSAGES.TTS_DESCRIPTION}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="tts-enabled">{MESSAGES.TTS_ENABLE_LABEL}</Label>
                    <p className="text-sm text-muted-foreground">{MESSAGES.TTS_ENABLE_HINT}</p>
                  </div>
                  <Switch id="tts-enabled" checked={ttsEnabled} onCheckedChange={(checked) => {
                    toggleTtsEnabled(Boolean(checked))
                    const action = checked ? 'Enabled' : 'Disabled'
                    toast.success(`${action} TTS`)
                  }} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="tts-provider">TTS Provider</Label>
                    <p className="text-sm text-muted-foreground">Select a TTS provider and configure its credentials.</p>
                  </div>
                  <Select value={ttsProvider} onValueChange={v => setTtsProvider(v as any)}>
                    <SelectTrigger id="tts-provider" className="min-w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {ttsProvider === 'openai' && (
                  <div className="space-y-4">
                    <Separator />
                    <OpenAISttConnectionForm initialBaseUrl={initialOpenAI?.baseUrl || ''} initialApiKey={initialOpenAI?.apiKey || ''} />
                  </div>
                )}
                {ttsProvider === 'elevenlabs' && (
                  <div className="space-y-4">
                    <Separator />
                    <ElevenLabsTtsConnectionForm
                      initialApiKey={initialElevenLabs?.apiKey || ''}
                      initialVoiceId={initialElevenLabs?.voiceId || ''}
                      initialModelId={initialElevenLabs?.modelId || ''}
                    />
                  </div>
                )}
                
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{MESSAGES.STT_TITLE}</CardTitle>
                <CardDescription>{MESSAGES.STT_DESCRIPTION}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="stt-enabled">{MESSAGES.STT_ENABLE_LABEL}</Label>
                    <p className="text-sm text-muted-foreground">{MESSAGES.STT_ENABLE_HINT}</p>
                  </div>
                  <Switch id="stt-enabled" checked={sttEnabled} onCheckedChange={(checked) => {
                    toggleSttEnabled(Boolean(checked))
                    const action = checked ? 'Enabled' : 'Disabled'
                    toast.success(`${action} STT`)
                  }} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="stt-provider">{MESSAGES.STT_PROVIDER_LABEL}</Label>
                    <p className="text-sm text-muted-foreground">{MESSAGES.STT_PROVIDER_HINT}</p>
                  </div>
                  <Select value={sttProvider} onValueChange={v => setSttProvider(v as any)}>
                    <SelectTrigger id="stt-provider" className="min-w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whisper-web">{MESSAGES.STT_PROVIDER_WHISPER_WEB}</SelectItem>
                      <SelectItem value="openai">{MESSAGES.STT_PROVIDER_OPENAI}</SelectItem>
                      <SelectItem value="webapi">{MESSAGES.STT_PROVIDER_WEB_API}</SelectItem>
                      <SelectItem value="deepgram">{MESSAGES.STT_PROVIDER_DEEPGRAM}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {sttProvider === 'whisper-web' && (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 pr-4">
                        <Label htmlFor="whisper-model">{MESSAGES.STT_WHISPER_MODEL_LABEL}</Label>
                        <p className="text-sm text-muted-foreground">
                          Use a Transformers.js-compatible ASR model (e.g., <code>Xenova/whisper-tiny.en</code>); browse:{' '}
                          <a
                            href="https://huggingface.co/models?pipeline_tag=automatic-speech-recognition&library=transformers.js&sort=trending"
                            className="underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Hugging Face (transformers.js, ASR)
                          </a>.
                        </p>
                      </div>
                      <div className="min-w-56">
                        <Input
                          id="whisper-model"
                          placeholder="e.g. Xenova/whisper-small.en"
                          value={whisperWebModel}
                          onChange={e => setWhisperWebModel(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {sttProvider === 'openai' && (
                  <div className="space-y-4">
                    <Separator />
                    <OpenAISttConnectionForm initialBaseUrl={initialOpenAI?.baseUrl || ''} initialApiKey={initialOpenAI?.apiKey || ''} />
                  </div>
                )}
                {sttProvider === 'deepgram' && (
                  <div className="space-y-4">
                    <Separator />
                    <DeepgramSttConnectionForm initialApiKey={initialDeepgram?.apiKey || ''} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    
  )
}


