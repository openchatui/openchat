"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import * as pdfjs from "pdfjs-dist"
import { Loader } from "@/components/ui/loader"
import { Button } from "@/components/ui/button"

interface PdfAsImagesProps {
  fileUrl: string
  maxPages?: number
}

export default function PdfAsImages({ fileUrl, maxPages = 100 }: PdfAsImagesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [pageUrls, setPageUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState("1")

  const workerUrl = useMemo(() => {
    const version: string = (pdfjs as any)?.version || "3.11.174"
    return `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`
  }, [])

  useEffect(() => {
    try {
      ;(pdfjs as any).GlobalWorkerOptions.workerSrc = workerUrl
    } catch {}
  }, [workerUrl])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setLoading(true)
        setError(null)
        const doc = await (pdfjs as any).getDocument(fileUrl).promise
        const num = Math.min(doc.numPages || 0, maxPages)
        const urls: string[] = []
        const containerWidth = containerRef.current?.clientWidth || 1024
        for (let i = 1; i <= num; i++) {
          const page = await doc.getPage(i)
          const viewport = page.getViewport({ scale: 1 })
          const scale = Math.min(containerWidth / viewport.width, 2)
          const vp = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          canvas.width = Math.ceil(vp.width)
          canvas.height = Math.ceil(vp.height)
          await page.render({ canvasContext: ctx, viewport: vp }).promise
          urls.push(canvas.toDataURL('image/png'))
        }
        if (!cancelled) setPageUrls(urls)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to render PDF')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [fileUrl, maxPages])

  // Update input when current page changes
  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  // Track which page is in view
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const wrappers = Array.from(root.querySelectorAll('[data-pdf-page]')) as HTMLElement[]
    if (wrappers.length === 0) return
    const io = new IntersectionObserver((entries) => {
      let best: { idx: number; ratio: number } | null = null
      for (const e of entries) {
        const idxStr = (e.target as HTMLElement).getAttribute('data-pdf-page') || '0'
        const idx = parseInt(idxStr, 10)
        const ratio = e.intersectionRatio
        if (!best || ratio > best.ratio) best = { idx, ratio }
      }
      if (best && best.idx >= 1) setCurrentPage(best.idx)
    }, { root, threshold: [0.25, 0.5, 0.75] })
    wrappers.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [pageUrls.length])

  function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)) }
  function zoomIn() { setScale((s) => clamp(s * 1.1, 0.3, 4)) }
  function zoomOut() { setScale((s) => clamp(s * 0.9, 0.3, 4)) }

  function scrollToPage(n: number) {
    const root = containerRef.current
    if (!root) return
    const el = root.querySelector(`[data-pdf-page="${n}"]`) as HTMLElement | null
    if (!el) return
    const top = el.offsetTop - 24
    root.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto"
      onWheel={(e) => {
        const el = containerRef.current
        if (!el) return
        el.scrollBy({ top: e.deltaY, left: 0, behavior: 'auto' })
      }}
    >
      {loading ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader className="h-6 w-6" message="Loading PDF" />
        </div>
      ) : error ? (
        <div className="w-full h-full flex items-center justify-center text-sm text-red-500">{error}</div>
      ) : (
        <div className="relative mx-auto max-w-5xl px-6 sm:px-10 lg:px-24 py-6">
          <div className="flex flex-col items-center gap-6">
            {pageUrls.map((src, idx) => (
              <div key={idx} data-pdf-page={idx + 1} className="w-full flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Page ${idx + 1}`}
                  className="max-w-full h-auto shadow-sm rounded-md bg-white"
                  style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
                />
              </div>
            ))}
          </div>
          {/* Control pill */}
          <div className="sticky bottom-4 w-full mt-6">
            <div className="mx-auto w-fit rounded-full border bg-background/90 backdrop-blur px-3 py-1.5 shadow flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
                −
              </Button>
              <div className="flex items-center gap-1 text-sm">
                <input
                  className="w-6 text-center bg-transparent outline-none"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const n = parseInt(pageInput, 10)
                      if (!isNaN(n) && n >= 1 && n <= pageUrls.length) scrollToPage(n)
                    }
                  }}
                  onBlur={() => {
                    const n = parseInt(pageInput, 10)
                    if (!isNaN(n) && n >= 1 && n <= pageUrls.length) scrollToPage(n)
                    else setPageInput(String(currentPage))
                  }}
                />
                <span className="text-muted-foregrounds">/ {pageUrls.length}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
                +
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


