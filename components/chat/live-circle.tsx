'use client'

import { useRef, useEffect } from 'react'
import type { MutableRefObject } from 'react'

interface LiveCircleProps {
  stream: MediaStream | null
  audioElRef: MutableRefObject<HTMLAudioElement | null>
  listening: boolean
  speaking: boolean
}

export default function LiveCircle({ stream, audioElRef, listening, speaking }: LiveCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const micAnalyserRef = useRef<AnalyserNode | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const playerAnalyserRef = useRef<AnalyserNode | null>(null)
  const playerSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const emaRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const width = canvas.width / dpr
      const height = canvas.height / dpr
      ctx.clearRect(0, 0, width, height)

      ctx.fillStyle = 'transparent'
      ctx.fillRect(0, 0, width, height)

      const analyser = listening && micAnalyserRef.current
        ? micAnalyserRef.current
        : (playerAnalyserRef.current || null)

      let amplitude = 0
      if (analyser && dataArrayRef.current) {
        analyser.getByteTimeDomainData(dataArrayRef.current)
        let sumSq = 0
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const dev = (dataArrayRef.current[i] - 128) / 128
          sumSq += dev * dev
        }
        const rms = Math.sqrt(sumSq / dataArrayRef.current.length)
        const noiseGate = 0.02
        const gated = Math.max(0, rms - noiseGate) / (1 - noiseGate)
        const gain = 2.5
        const boosted = Math.min(1, Math.pow(gated, 0.7) * gain)
        const alpha = 0.2
        emaRef.current = (1 - alpha) * emaRef.current + alpha * boosted
        amplitude = emaRef.current
      }

      const minRadius = Math.min(width, height) * 0.18
      const maxRadius = Math.min(width, height) * 0.42
      const r = minRadius + (maxRadius - minRadius) * amplitude
      const cx = width / 2
      const cy = height / 2

      ctx.beginPath()
      ctx.fillStyle = '#6D77FF'
      ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2)
      ctx.fill()

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [listening, speaking])

  useEffect(() => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioCtxRef.current = audioCtx
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.85
    // Ensure the underlying buffer type matches lib.dom TS expectations
    dataArrayRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize))
    micAnalyserRef.current = analyser

    if (stream) {
      try {
        const src = audioCtx.createMediaStreamSource(stream)
        micSourceRef.current = src
        src.connect(micAnalyserRef.current)
      } catch {}
    }

    if (audioElRef.current) {
      try {
        const pSrc = audioCtx.createMediaElementSource(audioElRef.current)
        playerSourceRef.current = pSrc
        const pAnalyser = audioCtx.createAnalyser()
        pAnalyser.fftSize = 2048
        pAnalyser.smoothingTimeConstant = 0.85
        playerAnalyserRef.current = pAnalyser
        pSrc.connect(pAnalyser)
        pSrc.connect(audioCtx.destination)
      } catch {}
    }

    return () => {
      try {
        micSourceRef.current?.disconnect()
        micAnalyserRef.current?.disconnect()
        playerSourceRef.current?.disconnect()
        playerAnalyserRef.current?.disconnect()
      } catch {}
      audioCtx.close()
      dataArrayRef.current = null
    }
  }, [stream, audioElRef.current])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.ceil(rect.width * dpr)
      canvas.height = Math.ceil(180 * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="w-full bg-transparent">
      <canvas ref={canvasRef} className="w-full block bg-transparent"/>
    </div>
  )
}


