"use client"

import { useState } from "react"
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai/code-block"
import { Button } from "@/components/ui/button"
import { Loader2, Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface CodeExecutorProps {
  code: string
  language?: string
  context?: Record<string, unknown>
  packages?: string[]
  warmup?: boolean
  className?: string
}

export function CodeExecutor({
  code,
  language = 'python',
  context,
  packages,
  warmup,
  className,
}: CodeExecutorProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState<string>("")
  const [errorText, setErrorText] = useState<string>("")
  const [stats, setStats] = useState<{ ms?: number } | null>(null)

  const run = async () => {
    try {
      setIsRunning(true)
      setErrorText("")
      setStats(null)
      const res = await fetch('/api/v1/code/pyodide/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: code, context, packages, warmup })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        const msg = json?.message || `Execution failed (${res.status})`
        setErrorText(String(msg))
        setOutput("")
        return
      }
      const details = json?.result?.details || {}
      const out = 'output' in details ? details.output : json?.result
      setOutput(formatOutput(out))
      setStats({ ms: typeof details.executionMs === 'number' ? details.executionMs : undefined })
    } catch (e: any) {
      setErrorText(String(e?.message || e))
      setOutput("")
    } finally {
      setIsRunning(false)
    }
  }

  function formatOutput(out: unknown): string {
    if (out == null) return String(out)
    if (typeof out === 'string') return out
    try {
      return JSON.stringify(out, null, 2)
    } catch {
      return String(out)
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <CodeBlock code={code} language={language} className="mb-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-2"
          onClick={run}
          disabled={isRunning}
        >
          {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <CodeBlockCopyButton aria-label="Copy" />
      </CodeBlock>
      <div className="rounded-md border bg-muted/40">
        <div className="px-3 py-2 border-b text-xs text-muted-foreground flex items-center justify-between">
          <span>Terminal</span>
          {stats?.ms ? <span>{stats.ms} ms</span> : null}
        </div>
        <pre className="px-3 py-2 text-sm overflow-auto whitespace-pre-wrap leading-relaxed">
{errorText ? (
`Error: ${errorText}`
) : (
output || 'No output'
)}
        </pre>
      </div>
    </div>
  )
}


