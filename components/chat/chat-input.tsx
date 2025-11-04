"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { RefObject, MutableRefObject } from "react";
import dynamic from "next/dynamic";
import { useVoiceInput } from "@/hooks/audio/useVoiceInput";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Loader } from "@/components/ui/loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChats } from "@/hooks/useChats";
import {
  Plus,
  Mic,
  X,
  Check,
  Globe,
  Image as ImageIcon,
  Terminal,
  AudioWaveform,
  ArrowUp,
  Video,
  FileUp,
  HardDrive,
  Camera,
  MessageSquare,
} from "lucide-react";
import { RiHardDrive3Line } from "react-icons/ri";

const RecordingWaveform = dynamic(() => import("./recording-waveform"), { ssr: false })
const LiveCircle = dynamic(() => import("./live-circle"), { ssr: false })

interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  isStreaming?: boolean;
  onStop?: () => void;
  onSubmit?: (
    value: string,
    options: {
      webSearch: boolean;
      image: boolean;
      video?: boolean;
      codeInterpreter: boolean;
    },
    overrideModel?: any,
    isAutoSend?: boolean,
    streamHandlers?: {
      onStart?: () => void
      onDelta?: (delta: string, fullText: string) => void
      onFinish?: (finalText: string) => void
    }
  ) => Promise<string | null> | void;
  sessionStorageKey?: string;
  webSearchAvailable?: boolean;
  imageAvailable?: boolean;
  codeInterpreterAvailable?: boolean;
  sttAllowed?: boolean;
  ttsAllowed?: boolean;
}

type BoolSetter = (updater: (prev: boolean) => boolean) => void

export function ChatInput({
  placeholder = "Send a Message",
  disabled,
  className,
  isStreaming = false,
  onStop,
  onSubmit,
  sessionStorageKey,
  webSearchAvailable: _webSearchAvailable = true,
  imageAvailable: _imageAvailable = true,
  codeInterpreterAvailable: _codeInterpreterAvailable = true,
  sttAllowed = true,
  ttsAllowed = true,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [image, setImage] = useState(false);
  const [codeInterpreter, setCodeInterpreter] = useState(false);
  const [video, setVideo] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const isLiveRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const ttsUrlsRef = useRef<Set<string>>(new Set())
  const ttsQueueRef = useRef<HTMLAudioElement[]>([])
  const ttsPlayingRef = useRef(false)
  const ttsAbortedRef = useRef(false)
  const pendingTextRef = useRef<string>("")
  const firstSegmentSentRef = useRef(false)
  const drainResolverRef = useRef<(() => void) | null>(null)
  const [showChatRefDialog, setShowChatRefDialog] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const {
    isRecording,
    isTranscribing,
    isModelLoading,
    recordingSeconds,
    stream,
    startRecording,
    cancelRecording,
    finishRecording,
  } = useVoiceInput({
    onTranscription: async (text) => {
      if (isLiveRef.current) {
        await handleLiveTranscription(text)
      } else {
        setValue((prev) => (prev ? `${prev} ${text}` : text))
      }
    },
  });

  useEffect(() => {
    isLiveRef.current = isLive
  }, [isLive])

  // Load initial state from sessionStorage if provided
  useEffect(() => {
    try {
      if (!sessionStorageKey) return
      const raw = sessionStorage.getItem(sessionStorageKey)
      const defaults = {
        prompt: "",
        files: [] as any[],
        selectedToolIds: [] as string[],
        selectedFilterIds: [] as string[],
        imageGenerationEnabled: false,
        webSearchEnabled: false,
        codeInterpreterEnabled: false,
        videoGenerationEnabled: false,
      }
      const data = raw ? { ...defaults, ...JSON.parse(raw) } : defaults
      if (typeof data.prompt === 'string') setValue(data.prompt)
      if (typeof data.webSearchEnabled === 'boolean') setWebSearch(data.webSearchEnabled)
      if (typeof data.imageGenerationEnabled === 'boolean') setImage(data.imageGenerationEnabled)
      if (typeof (data as any).videoGenerationEnabled === 'boolean') setVideo(Boolean((data as any).videoGenerationEnabled))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStorageKey])

  // webSearchAvailable is provided by the server page to avoid client-side secrets exposure

  // Persist prompt to sessionStorage
  useEffect(() => {
    try {
      if (!sessionStorageKey) return
      const raw = sessionStorage.getItem(sessionStorageKey)
      const defaults = {
        prompt: "",
        files: [] as any[],
        selectedToolIds: [] as string[],
        selectedFilterIds: [] as string[],
        imageGenerationEnabled: false,
        webSearchEnabled: false,
        codeInterpreterEnabled: false,
      }
      const data = raw ? { ...defaults, ...JSON.parse(raw) } : defaults
      data.prompt = value
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(data))
    } catch {}
  }, [value, sessionStorageKey])

  // Auto-resize the textarea as content grows (with a sensible max height)
  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 256; // 16rem cap
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  };

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed, { webSearch, image, video, codeInterpreter });
    setValue("");
    requestAnimationFrame(resizeTextarea);
    textareaRef.current?.focus();
  };

  const cleanupTts = useCallback(() => {
    try {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause()
        ttsAudioRef.current.src = ""
      }
      // Stop and clear any queued audios
      for (const a of ttsQueueRef.current) {
        try { a.pause(); (a as any).src = "" } catch {}
      }
      ttsQueueRef.current = []
      // Revoke all blob URLs
      for (const url of ttsUrlsRef.current) {
        try { URL.revokeObjectURL(url) } catch {}
      }
      ttsUrlsRef.current.clear()
    } catch {}
    ttsAudioRef.current = null
    ttsPlayingRef.current = false
    pendingTextRef.current = ""
    firstSegmentSentRef.current = false
    // resolve any pending drain waiters
    try { drainResolverRef.current?.() } catch {}
    drainResolverRef.current = null
  }, [])

  const playNextFromQueue = useCallback(() => {
    if (ttsPlayingRef.current) return
    const next = ttsQueueRef.current.shift()
    if (!next) {
      // queue drained
      const resolve = drainResolverRef.current
      drainResolverRef.current = null
      try { resolve?.() } catch {}
      return
    }
    ttsPlayingRef.current = true
    ttsAudioRef.current = next
    next.onended = () => {
      ttsPlayingRef.current = false
      playNextFromQueue()
    }
    next.play().catch(() => {
      ttsPlayingRef.current = false
      playNextFromQueue()
    })
  }, [])

  const enqueueTtsSegment = useCallback(async (text: string) => {
    if (!text || ttsAbortedRef.current) return
    try {
      const res = await fetch('/api/v1/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      if (!res.ok) return
      const data = await res.json()
      const base64: string | undefined = data?.base64
      const mime: string = typeof data?.mimeType === 'string' ? data.mimeType : 'audio/mpeg'
      if (!base64) return
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mime })
      const url = URL.createObjectURL(blob)
      ttsUrlsRef.current.add(url)
      const audio = new Audio(url)
      ttsQueueRef.current.push(audio)
      // start playback immediately if idle
      playNextFromQueue()
    } catch {}
  }, [playNextFromQueue])

  const waitForQueueToDrain = useCallback(async () => {
    if (ttsPlayingRef.current || ttsQueueRef.current.length > 0) {
      await new Promise<void>((resolve) => {
        drainResolverRef.current = resolve
      })
    }
  }, [])

  const handleLiveTranscription = useCallback(async (text: string) => {
    // Begin a new TTS streaming session for assistant response
    ttsAbortedRef.current = false
    cleanupTts()
    const shouldFlush = (buffer: string, isFinal: boolean): string | null => {
      const minFirst = 20
      const minNext = 60
      const endsWithPunct = /[\.!?\n]$/.test(buffer)
      const threshold = firstSegmentSentRef.current ? minNext : minFirst
      if (buffer.length >= threshold || endsWithPunct || isFinal) {
        // Try to cut at last sentence end or space to keep segments natural
        const sentenceIdx = Math.max(
          buffer.lastIndexOf('.'),
          buffer.lastIndexOf('!'),
          buffer.lastIndexOf('?'),
          buffer.lastIndexOf('\n')
        )
        let cut = sentenceIdx >= 10 ? sentenceIdx + 1 : -1
        if (cut === -1 && buffer.length > threshold) {
          const spaceIdx = buffer.lastIndexOf(' ')
          cut = spaceIdx >= 10 ? spaceIdx : buffer.length
        }
        if (cut === -1 && (endsWithPunct || isFinal)) cut = buffer.length
        if (cut > 0) {
          return buffer.slice(0, cut).trim()
        }
      }
      return null
    }

    const streamHandlers = {
      onStart: () => {
        // reset state for new assistant turn
        pendingTextRef.current = ""
        firstSegmentSentRef.current = false
      },
      onDelta: (delta: string, fullText: string) => {
        // Use delta if provided; fallback to diff from fullText
        const addition = delta || fullText.slice(pendingTextRef.current.length)
        if (addition) pendingTextRef.current += addition
        const segment = shouldFlush(pendingTextRef.current, false)
        if (segment) {
          enqueueTtsSegment(segment)
          pendingTextRef.current = pendingTextRef.current.slice(segment.length).trimStart()
          firstSegmentSentRef.current = true
        }
      },
      onFinish: async (finalText: string) => {
        // Flush remaining buffer
        if (pendingTextRef.current) {
          await enqueueTtsSegment(pendingTextRef.current)
          pendingTextRef.current = ""
        }
        // wait until all queued audio finished
        await waitForQueueToDrain()
        if (isLiveRef.current) {
          startRecording()
        }
      }
    }

    try {
      onSubmit?.(text, { webSearch, image, codeInterpreter }, undefined, false, streamHandlers)
    } catch {}
  }, [onSubmit, webSearch, image, codeInterpreter, cleanupTts, enqueueTtsSegment, waitForQueueToDrain, startRecording])

  const startLive = useCallback(() => {
    if (disabled || !sttAllowed) return
    setIsLive(true)
    cleanupTts()
    startRecording()
  }, [disabled, startRecording, cleanupTts, sttAllowed])

  const stopLive = useCallback(() => {
    setIsLive(false)
    ttsAbortedRef.current = true
    cleanupTts()
    try { cancelRecording() } catch {}
  }, [cancelRecording, cleanupTts])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        handleSubmit(e as any);
      }
    }
  };

  const handlePrimaryClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // If there's no text, use this button to toggle live voice
    if (!value.trim()) {
      e.preventDefault()
      if (!isLive && sttAllowed) startLive()
    }
  }, [value, isLive, startLive, sttAllowed])

  // File helpers and actions for dropdown
  const persistFilesMeta = useCallback((files: File[]) => {
    try {
      if (!sessionStorageKey) return
      const raw = sessionStorage.getItem(sessionStorageKey)
      const defaults = {
        prompt: "",
        files: [] as { name: string; size: number; type: string }[],
        selectedToolIds: [] as string[],
        selectedFilterIds: [] as string[],
        imageGenerationEnabled: false,
        webSearchEnabled: false,
        codeInterpreterEnabled: false,
      }
      const data = raw ? { ...defaults, ...JSON.parse(raw) } : defaults
      const metas = files.map((f) => ({ name: f.name, size: f.size, type: f.type }))
      const existing = Array.isArray((data as any).files) ? (data as any).files : []
      ;(data as any).files = [...existing, ...metas]
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(data))
    } catch {}
  }, [sessionStorageKey])

  const triggerUploadFiles = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const triggerCameraCapture = useCallback(() => {
    cameraInputRef.current?.click()
  }, [])

  const handleFilesSelected = useCallback((filesList: FileList | null) => {
    const files = filesList ? Array.from(filesList) : []
    if (files.length === 0) return
    setSelectedFiles((prev) => [...prev, ...files])
    persistFilesMeta(files)
  }, [persistFilesMeta])

  const handleReferenceChats = useCallback(() => {
    setShowChatRefDialog(true)
  }, [])

  const handleDriveFiles = useCallback(() => {
    try { window.open('/drive', '_blank', 'noopener,noreferrer') } catch {}
  }, [])

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn(isLive ? "bg-transparent" : "bg-background", "mx-4 ")}>
      <form
        onSubmit={handleSubmit}
        className={cn("max-w-6xl px-0 pb-0 md:pb-4 mx-auto inset-x-0", isLive ? "pt-3" : "pt-0", className)}
      >
        {isLive && sttAllowed ? (
          <div className="p-0 mt-5">
            <button
              type="button"
              className="w-full cursor-pointer select-none px-2 py-2"
              aria-label="Exit live voice"
              onClick={stopLive}
              title="Click to exit live voice"
            >
              <LiveCircle stream={stream} audioElRef={ttsAudioRef} listening={isRecording} speaking={Boolean(ttsAudioRef.current)} />
            </button>
          </div>
        ) : (
          <div className="rounded-3xl bg-accent p-2 shadow-md">
            {(isRecording || isTranscribing || isModelLoading) ? (
              <VoiceRecorderBar
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                isModelLoading={isModelLoading}
                recordingSeconds={recordingSeconds}
                cancelRecording={cancelRecording}
                finishRecording={finishRecording}
                stream={stream}
              />
            ) : (
              <>
                <div className="flex items-center px-2 bg-transparent">
                  <AutoResizeTextarea
                    textareaRef={textareaRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onInput={() => resizeTextarea()}
                    placeholder={placeholder}
                    disabled={Boolean(disabled && !isStreaming)}
                  />
                </div>

                <div className="mt-1 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <AttachmentsMenu
                      onUploadFiles={triggerUploadFiles}
                      onReferenceChats={handleReferenceChats}
                      onDriveFiles={handleDriveFiles}
                      onCaptureCamera={triggerCameraCapture}
                    />
                    <ChatInputPills
                      webSearch={webSearch}
                      image={image}
                      video={video}
                      codeInterpreter={codeInterpreter}
                      sessionStorageKey={sessionStorageKey}
                      setWebSearch={setWebSearch}
                      setImage={setImage}
                      setVideo={setVideo}
                      setCodeInterpreter={setCodeInterpreter}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {sttAllowed && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        aria-label="Start voice input"
                        onClick={startRecording}
                        disabled={disabled}
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                    )}
                    <PrimaryActionButton
                      isStreaming={isStreaming}
                      isTranscribing={isTranscribing}
                      isModelLoading={isModelLoading}
                      onStop={onStop}
                      onSubmitClick={handlePrimaryClick}
                      disabled={Boolean(disabled)}
                      showMic={!value.trim() && sttAllowed}
                    />
                  </div>
                </div>
                <HiddenFileInputs
                  fileInputRef={fileInputRef}
                  cameraInputRef={cameraInputRef}
                  onFilesSelected={handleFilesSelected}
                />
              </>
            )}
          </div>
        )}
      </form>
      <ChatReferenceDialog
        open={showChatRefDialog}
        onOpenChange={setShowChatRefDialog}
        onInsert={(chat) => {
          const title = chat.title || 'Chat'
          const id = chat.id
          setValue((prev) => (prev ? `${prev}\n[${title}](/c/${id})` : `[${title}](/c/${id})`))
        }}
      />
    </div>
  );
}

function ChatReferenceDialog({ open, onOpenChange, onInsert }: { open: boolean; onOpenChange: (next: boolean) => void; onInsert: (chat: { id: string; title?: string | null }) => void }) {
  const { chats, isLoading } = useChats()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reference a chat</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : chats.length === 0 ? (
            <div className="text-sm text-muted-foreground">No chats available</div>
          ) : (
            chats.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-2 py-2 rounded hover:bg-accent"
                onClick={() => { onInsert({ id: c.id, title: (c as any).title }); onOpenChange(false) }}
              >
                <div className="text-sm font-medium truncate">{(c as any).title || 'Untitled'}</div>
                <div className="text-xs text-muted-foreground">/c/{c.id}</div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function VoiceRecorderBar({
  isRecording,
  isTranscribing,
  isModelLoading,
  recordingSeconds,
  cancelRecording,
  finishRecording,
  stream,
}: {
  isRecording: boolean
  isTranscribing: boolean
  isModelLoading: boolean
  recordingSeconds: number
  cancelRecording: () => void
  finishRecording: () => void
  stream: MediaStream | null
}) {
  return (
    <div className="flex items-center justify-between px-2 py-2">
      {isRecording ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9"
          aria-label="Cancel recording"
          onClick={cancelRecording}
        >
          <X className="h-5 w-5" />
        </Button>
      ) : (
        <div className="h-9 w-9" aria-hidden="true" />
      )}

      <RecordingWaveform stream={stream as any} frozen={!isRecording} />

      {isRecording ? (
        <div className="flex items-center gap-3">
          <span className="text-sm tabular-nums text-muted-foreground">{formatTimeLocal(recordingSeconds)}</span>
          <Button
            type="button"
            size="icon"
            className={cn(
              "rounded-full h-9 w-9 bg-white text-black hover:bg-white/90 dark:bg-white dark:text-black"
            )}
            aria-label="Finish recording"
            onClick={finishRecording}
          >
            <Check className="h-5 w-5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 pr-1">
          <span className="text-sm tabular-nums text-muted-foreground">{formatTimeLocal(recordingSeconds)}</span>
          <div
            className={cn(
              "rounded-full h-9 w-9 bg-white text-black dark:bg-white dark:text-black",
              "flex items-center justify-center"
            )}
            aria-label={isModelLoading ? 'Loading model' : 'Transcribing'}
            title={isModelLoading ? 'Loading model' : 'Transcribing'}
          >
            <Loader className="h-4 w-4" />
          </div>
        </div>
      )}
    </div>
  )
}

function formatTimeLocal(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AutoResizeTextarea({
  textareaRef,
  value,
  onChange,
  onKeyDown,
  onInput,
  placeholder,
  disabled,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onInput?: (e: React.FormEvent<HTMLTextAreaElement>) => void
  placeholder: string
  disabled: boolean
}) {
  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onInput={onInput}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      id="input"
      name="input"
      rows={1}
      className={cn(
        "min-h-12 max-h-72 resize-none overflow-y-auto",
        "border-0 bg-accent dark:bg-accent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1",
        "text-[16px] md:text-[16px]"
      )}
    />
  )
}

function PrimaryActionButton({
  isStreaming,
  isTranscribing,
  isModelLoading,
  onStop,
  onSubmitClick,
  disabled,
  showMic,
}: {
  isStreaming: boolean
  isTranscribing: boolean
  isModelLoading: boolean
  onStop?: () => void
  onSubmitClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled: boolean
  showMic: boolean
}) {
  if (isStreaming) {
    return (
      <Button
        type="button"
        size="icon"
        onClick={onStop}
        className={cn(
          "rounded-full h-9 w-9 bg-white text-black hover:bg-white/90 dark:bg-white dark:text-black"
        )}
        aria-label="Stop generation"
      >
        <div className="h-3 w-3 bg-current rounded-[2px]" />
      </Button>
    )
  }
  if (isTranscribing) {
    return (
      <div
        className={cn(
          "rounded-full h-9 w-9 bg-white text-black dark:bg-white dark:text-black",
          "flex items-center justify-center"
        )}
        aria-label="Transcribing"
        title="Transcribing"
      >
        <Loader className="h-4 w-4" />
      </div>
    )
  }
  return (
    <Button
      type="submit"
      size="icon"
      onClick={onSubmitClick}
      className={cn(
        "rounded-full h-9 w-9 bg-white text-black hover:bg-white/90 dark:bg-white dark:text-black"
      )}
      aria-label="Send message"
      disabled={disabled || isTranscribing || isModelLoading}
    >
      {showMic ? (
        <AudioWaveform className="h-5 w-5" />
      ) : (
        <ArrowUp className="h-5 w-5" />
      )}
    </Button>
  )
}

function Pill({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={'outlineAlt'}
          size="sm"
          onClick={onClick}
          className={cn(
            "rounded-full h-7 px-3 gap-0 transition-colors",
            active ? "!bg-foreground !text-black dark:!text-black !border-foreground" : "bg-input/10 dark:bg-input/30",
            disabled ? 'pointer-events-none opacity-50' : ''
          )}
          aria-pressed={active}
          aria-label={label || "Toggle"}
          disabled={disabled}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      {!!label && (
        <TooltipContent side="top" sideOffset={6}>
          {label}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

function AttachmentsMenu({
  onUploadFiles,
  onReferenceChats,
  onDriveFiles,
  onCaptureCamera,
}: {
  onUploadFiles: () => void
  onReferenceChats: () => void
  onDriveFiles: () => void
  onCaptureCamera: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Open actions"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-accent dark:bg-accent text-foreground border">
        <DropdownMenuItem asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start border-0 ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none hover:bg-white/40 dark:hover:bg-white/10 data-[highlighted]:bg-white/40 dark:data-[highlighted]:bg-white/10 transition-colors"
            onClick={onUploadFiles}
          >
            <FileUp className="mr-2 h-4 w-4" />
            <span>Upload files</span>
          </Button>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start border-0 ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none hover:bg-white/40 dark:hover:bg-white/10 data-[highlighted]:bg-white/40 dark:data-[highlighted]:bg-white/10 transition-colors"
            onClick={onReferenceChats}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Reference chats</span>
          </Button>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start border-0 ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none hover:bg-white/40 dark:hover:bg-white/10 data-[highlighted]:bg-white/40 dark:data-[highlighted]:bg-white/10 transition-colors"
            onClick={onDriveFiles}
          >
            <RiHardDrive3Line className="mr-2 h-4 w-4" />
            <span>Drive files</span>
          </Button>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start border-0 ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none hover:bg-white/40 dark:hover:bg-white/10 data-[highlighted]:bg-white/40 dark:data-[highlighted]:bg-white/10 transition-colors"
            onClick={onCaptureCamera}
          >
            <Camera className="mr-2 h-4 w-4" />
            <span>Capture from camera</span>
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ChatInputPills({
  webSearch,
  image,
  video,
  codeInterpreter,
  sessionStorageKey,
  setWebSearch,
  setImage,
  setVideo,
  setCodeInterpreter,
}: {
  webSearch: boolean
  image: boolean
  video: boolean
  codeInterpreter: boolean
  sessionStorageKey?: string
  setWebSearch: BoolSetter
  setImage: BoolSetter
  setVideo: BoolSetter
  setCodeInterpreter: (updater: (prev: boolean) => boolean) => void
}) {
  return (
    <>
      <Pill
        active={webSearch}
        onClick={() => {
          setWebSearch((prev) => {
            const next = !prev
            try {
              if (sessionStorageKey) {
                const raw = sessionStorage.getItem(sessionStorageKey)
                const defaults = {
                  prompt: "",
                  files: [] as { name: string; size: number; type: string }[],
                  selectedToolIds: [] as string[],
                  selectedFilterIds: [] as string[],
                  imageGenerationEnabled: false,
                  webSearchEnabled: false,
                  codeInterpreterEnabled: false,
                }
                const data = raw ? { ...defaults, ...JSON.parse(raw) } : defaults
                data.webSearchEnabled = next
                sessionStorage.setItem(sessionStorageKey, JSON.stringify(data))
              }
            } catch {}
            return next
          })
        }}
        icon={<Globe className="h-3.5 w-3.5" />}
        label="Web search"
      />
      <Pill
        active={image}
        onClick={() => {
          setImage((prev) => {
            const next = !prev
            try {
              if (sessionStorageKey) {
                const raw = sessionStorage.getItem(sessionStorageKey)
                const defaults = {
                  prompt: "",
                  files: [] as { name: string; size: number; type: string }[],
                  selectedToolIds: [] as string[],
                  selectedFilterIds: [] as string[],
                  imageGenerationEnabled: false,
                  webSearchEnabled: false,
                  codeInterpreterEnabled: false,
                }
                const data = raw ? { ...defaults, ...JSON.parse(raw) } : defaults
                data.imageGenerationEnabled = next
                sessionStorage.setItem(sessionStorageKey, JSON.stringify(data))
              }
            } catch {}
            return next
          })
        }}
        icon={<ImageIcon className="h-3.5 w-3.5" />}
        label="Image input"
      />
      <Pill
        active={video}
        onClick={() => {
          setVideo((prev) => {
            const next = !prev
            try {
              if (sessionStorageKey) {
                const raw = sessionStorage.getItem(sessionStorageKey)
                const defaults = {
                  prompt: "",
                  files: [] as { name: string; size: number; type: string }[],
                  selectedToolIds: [] as string[],
                  selectedFilterIds: [] as string[],
                  imageGenerationEnabled: false,
                  webSearchEnabled: false,
                  codeInterpreterEnabled: false,
                  videoGenerationEnabled: false,
                }
                const data = raw ? { ...defaults, ...JSON.parse(raw) } : defaults
                ;(data as any).videoGenerationEnabled = next
                sessionStorage.setItem(sessionStorageKey, JSON.stringify(data))
              }
            } catch {}
            return next
          })
        }}
        icon={<Video className="h-3.5 w-3.5" />}
        label="Video tool"
      />
      <Pill
        active={codeInterpreter}
        onClick={() => {
          setCodeInterpreter((v) => !v)
          try {
            if (sessionStorageKey) {
              const raw = sessionStorage.getItem(sessionStorageKey)
              const defaults = {
                prompt: "",
                files: [] as { name: string; size: number; type: string }[],
                selectedToolIds: [] as string[],
                selectedFilterIds: [] as string[],
                imageGenerationEnabled: false,
                webSearchEnabled: false,
                codeInterpreterEnabled: false,
              }
              const data = raw ? { ...defaults, ...JSON.parse(raw) } : defaults
              data.codeInterpreterEnabled = !codeInterpreter
              sessionStorage.setItem(sessionStorageKey, JSON.stringify(data))
            }
          } catch {}
        }}
        icon={<Terminal className="h-3.5 w-3.5" />}
        label="Code interpreter"
      />
    </>
  )
}

function HiddenFileInputs({
  fileInputRef,
  cameraInputRef,
  onFilesSelected,
}: {
  fileInputRef: MutableRefObject<HTMLInputElement | null> | RefObject<HTMLInputElement>
  cameraInputRef: MutableRefObject<HTMLInputElement | null> | RefObject<HTMLInputElement>
  onFilesSelected: (files: FileList | null) => void
}) {
  return (
    <>
      {/* Hidden inputs for file selection and camera capture */}
      <input
        ref={fileInputRef as any}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => {
          onFilesSelected(e.target.files)
          e.currentTarget.value = ''
        }}
      />
      <input
        ref={cameraInputRef as any}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        capture
        onChange={(e) => {
          onFilesSelected(e.target.files)
          e.currentTarget.value = ''
        }}
      />
    </>
  )
}

export default ChatInput;
