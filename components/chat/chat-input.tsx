"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useVoiceInput } from "@/hooks/audio/useVoiceInput";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Loader } from "@/components/ui/loader";
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
} from "lucide-react";

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
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const ttsUrlsRef = useRef<Set<string>>(new Set())
  const ttsQueueRef = useRef<HTMLAudioElement[]>([])
  const ttsPlayingRef = useRef(false)
  const ttsAbortedRef = useRef(false)
  const pendingTextRef = useRef<string>("")
  const firstSegmentSentRef = useRef(false)
  const drainResolverRef = useRef<(() => void) | null>(null)

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

                <RecordingWaveform stream={stream} frozen={!isRecording} />

                {isRecording ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatTime(recordingSeconds)}
                    </span>
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
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatTime(recordingSeconds)}
                    </span>
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
            ) : (
              <>
                <div className="flex items-center px-2 bg-transparent">
                  <Textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onInput={resizeTextarea}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled && !isStreaming}
                    id="input"
                    name="input"
                    rows={1}
                    className={cn(
                      "min-h-12 max-h-72 resize-none overflow-y-auto",
                      "border-0 bg-accent dark:bg-accent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                    ,
                    // Increase font size ~2pt (~2.67px)
                    "text-[16px] md:text-[16px]")}
                  />
                </div>

                <div className="mt-1 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      aria-label="Open actions"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
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
                                files: [] as any[],
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
                                files: [] as any[],
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
                                files: [] as any[],
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
                              files: [] as any[],
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
                    {isStreaming ? (
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
                    ) : isTranscribing ? (
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
                    ) : (
                      <Button
                        type="submit"
                        size="icon"
                        onClick={handlePrimaryClick}
                        className={cn(
                          "rounded-full h-9 w-9 bg-white text-black hover:bg-white/90 dark:bg-white dark:text-black"
                        )}
                        aria-label="Send message"
                        disabled={disabled || isTranscribing || isModelLoading}
                      >
                        {!value.trim() && sttAllowed ? (
                          <AudioWaveform className="h-5 w-5" />
                        ) : (
                          <ArrowUp className="h-5 w-5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
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
          variant={active ? 'default' : 'outline'}
          size="sm"
          onClick={onClick}
          className={cn(
            "rounded-full h-7 px-3 gap-0",
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

export default ChatInput;

