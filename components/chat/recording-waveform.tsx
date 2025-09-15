'use client'

import { useRef, useEffect, useCallback } from 'react'

export default function RecordingWaveform({ stream, frozen = false }: { stream: MediaStream | null; frozen?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const historyRef = useRef<number[]>([])
  const emaRef = useRef<number>(0)

  const drawFromHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const width = canvas.width / dpr
    const height = canvas.height / dpr
    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(60,62,85,0.6)'
    const radius = height / 2
    ctx.beginPath()
    ctx.moveTo(radius, 0)
    ctx.arc(radius, radius, radius, Math.PI * 1.5, Math.PI * 0.5, true)
    ctx.lineTo(width - radius, height)
    ctx.arc(width - radius, radius, radius, Math.PI * 0.5, Math.PI * 1.5, true)
    ctx.closePath()
    ctx.fill()

    const barWidth = 2
    const desiredGap = 2
    const centerY = height / 2
    const innerLeft = 0
    const innerRight = width
    const availableWidth = Math.max(0, innerRight - innerLeft)
    const maxBarsByWidth = Math.floor((availableWidth + desiredGap) / (barWidth + desiredGap))
    const barCount = Math.max(16, Math.min(180, maxBarsByWidth))
    const dynamicGap = barCount > 1 ? (availableWidth - barCount * barWidth) / (barCount - 1) : 0

    const neutralHeight = 1
    for (let i = 0; i < barCount; i++) {
      const v = historyRef.current[historyRef.current.length - barCount + i] ?? 0
      const barHeight = neutralHeight + v * (height * 0.95 - neutralHeight)
      const x = innerLeft + i * (barWidth + dynamicGap)
      ctx.fillStyle = '#6D77FF'
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight)
    }
  }, [])

  useEffect(() => {
    if (!stream || !canvasRef.current) {
      if (frozen) drawFromHistory()
      return
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8
    const bufferLength = analyser.fftSize
    const dataArray = new Uint8Array(bufferLength)
    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    audioCtxRef.current = audioCtx
    analyserRef.current = analyser
    sourceRef.current = source
    dataArrayRef.current = dataArray

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const width = canvas.width / dpr
      const height = canvas.height / dpr
      ctx.clearRect(0, 0, width, height)

      analyser.getByteTimeDomainData(dataArray)

      ctx.fillStyle = 'rgba(60,62,85,0.6)'
      const radius = height / 2
      ctx.beginPath()
      ctx.moveTo(radius, 0)
      ctx.arc(radius, radius, radius, Math.PI * 1.5, Math.PI * 0.5, true)
      ctx.lineTo(width - radius, height)
      ctx.arc(width - radius, radius, radius, Math.PI * 0.5, Math.PI * 1.5, true)
      ctx.closePath()
      ctx.fill()

      const barWidth = 2
      const desiredGap = 2
      const centerY = height / 2
      const innerLeft = 0
      const innerRight = width
      const availableWidth = Math.max(0, innerRight - innerLeft)
      const maxBarsByWidth = Math.floor((availableWidth + desiredGap) / (barWidth + desiredGap))
      const barCount = Math.max(16, Math.min(180, maxBarsByWidth))
      const dynamicGap = barCount > 1
        ? (availableWidth - barCount * barWidth) / (barCount - 1)
        : 0

      let sumSq = 0
      for (let i = 0; i < dataArray.length; i++) {
        const dev = (dataArray[i] - 128) / 128
        sumSq += dev * dev
      }
      const rms = Math.sqrt(sumSq / dataArray.length)
      const noiseGate = 0.015
      const gated = Math.max(0, rms - noiseGate) / (1 - noiseGate)
      const gain = 2.2
      const boosted = Math.min(1, Math.pow(gated, 0.7) * gain)
      const alpha = 0.22
      emaRef.current = (1 - alpha) * emaRef.current + alpha * boosted
      historyRef.current.push(emaRef.current)
      if (historyRef.current.length > barCount) {
        historyRef.current.splice(0, historyRef.current.length - barCount)
      }

      const neutralHeight = 1
      for (let i = 0; i < barCount; i++) {
        const v = historyRef.current[historyRef.current.length - barCount + i] ?? 0
        const barHeight = neutralHeight + v * (height * 0.95 - neutralHeight)
        const x = innerLeft + i * (barWidth + dynamicGap)
        ctx.fillStyle = '#6D77FF'
        ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight)
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      try {
        source.disconnect()
        analyser.disconnect()
      } catch {}
      audioCtx.close()
      dataArrayRef.current = null
    }
  }, [stream, frozen, drawFromHistory])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.ceil(rect.width * dpr)
      canvas.height = Math.ceil(36 * dpr)
      if (frozen) {
        drawFromHistory()
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)
    return () => ro.disconnect()
  }, [frozen, drawFromHistory])

  return (
    <div className="flex-1 mx-3">
      <canvas ref={canvasRef} className="w-full h-9 block" />
    </div>
  )
}


