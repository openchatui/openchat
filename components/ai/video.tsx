"use client"

import { useEffect, useState } from 'react'
import { Loader } from '@/components/ui/loader'

interface VideoJobProps {
  jobId: string
}

export function VideoJob({ jobId }: VideoJobProps) {
  const [status, setStatus] = useState<string>('queued')
  const [progress, setProgress] = useState<number>(0)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let timer: any
    let cancelled = false

    const tick = async () => {
      try {
        const res = await fetch(`/api/v1/videos/sora2/${encodeURIComponent(jobId)}/status`, { cache: 'no-store' })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `HTTP ${res.status}`)
        }
        const data = await res.json()
        if (cancelled) return
        setStatus(String(data.status || 'queued'))
        setProgress(Number.isFinite(data.progress) ? Number(data.progress) : 0)
        if (typeof data.url === 'string' && data.url) {
          setUrl(data.url)
          return
        }
        // Upstream moderation or provider errors (surface and stop polling)
        const jobError = (data?.job && typeof data.job === 'object') ? (data.job as any).error : null
        if (jobError && (jobError.message || jobError.code)) {
          const code = jobError.code ? String(jobError.code) : 'error'
          const msg = jobError.message ? String(jobError.message) : 'Video job failed'
          setError(`${msg}${code ? ` (${code})` : ''}`)
          return
        }
        // If job completed but no URL yet, trigger finalize download
        if ((String(data.status || '').toLowerCase() === 'completed' || (Number.isFinite(data.progress) && Number(data.progress) >= 100)) && !data.url) {
          try {
            const fin = await fetch(`/api/v1/videos/sora2/${encodeURIComponent(jobId)}`, { method: 'POST' })
            if (fin.ok) {
              const j = await fin.json()
              if (typeof j.url === 'string' && j.url) {
                setUrl(j.url)
                return
              }
            } else {
              const t = await fin.text().catch(() => '')
              setError(t || 'Finalize failed')
              return
            }
          } catch (e: any) {
            setError(e?.message || 'Finalize failed')
            return
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Status error')
          return
        }
      }
      timer = setTimeout(tick, 2500)
    }

    tick()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [jobId])

  if (error) {
    return (
      <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
    )
  }

  if (!url) {
    const pct = Math.min(100, Math.max(0, Math.round(progress)))
    return (
      <div className="mb-3 w-full max-w-[1024px] rounded-lg overflow-hidden border bg-muted/30">
        {/* 16:9 aspect-ratio placeholder */}
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader className="h-7 w-7" />
            <div className="text-sm text-muted-foreground">Generating video… ({status}{progress ? ` · ${pct}%` : ''})</div>
          </div>
          {/* Progress bar anchored at bottom */}
          <div className="absolute left-0 right-0 bottom-0 p-3">
            <div className="w-full h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-3 rounded-lg overflow-hidden border max-w-[1024px]">
      <video src={url} controls className="w-full h-auto" />
    </div>
  )
}


