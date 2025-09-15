'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export type ActionsProps = ComponentProps<'div'>;

export const Actions = ({ className, children, ...props }: ActionsProps) => (
  <div className={cn('flex items-center gap-1', className)} {...props}>
    {children}
  </div>
);

export type ActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const Action = ({
  tooltip,
  children,
  label,
  className,
  variant = 'ghost',
  size = 'sm',
  ...props
}: ActionProps) => {
  const button = (
    <Button
      className={cn(
        'size-9 p-1.5 text-muted-foreground hover:text-foreground',
        className
      )}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

export function SpeakAction({ text }: { text: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  function stopPlayback() {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
      }
    } catch {}
    audioRef.current = null
    urlRef.current = null
    setIsPlaying(false)
  }

  async function speakOrStop() {
    if (isPlaying) {
      stopPlayback()
      return
    }
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
      urlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        stopPlayback()
      }
      setIsPlaying(true)
      audio.play().catch(() => stopPlayback())
    } catch {
      stopPlayback()
    }
  }

  return (
    <Button
      className={cn('size-9 p-1.5 text-muted-foreground hover:text-foreground')}
      size="sm"
      type="button"
      variant="ghost"
      onClick={speakOrStop}
      aria-label={isPlaying ? 'Stop' : 'Speak'}
      title={isPlaying ? 'Stop' : 'Speak'}
    >
      {isPlaying ? (
        <VolumeX className="size-5" />
      ) : (
        <Volume2 className="size-5" />
      )}
      <span className="sr-only">{isPlaying ? 'Stop' : 'Speak'}</span>
    </Button>
  )
}
