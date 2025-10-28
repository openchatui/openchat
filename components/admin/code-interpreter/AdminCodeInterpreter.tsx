"use client"

import { useEffect, useState, useTransition } from "react"
import { Terminal } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { SaveStatusButton } from "@/components/ui/save-button"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import type { Session } from "next-auth"
import type { ChatData } from "@/lib/modules/chat"
import { updateCodeConfig } from "@/lib/api/code"
import type { CodeConfig as CodeInterpreterConfig } from "@/lib/api/code"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AdminCodeInterpreterProps {
  session: Session | null
  initialChats?: ChatData[]
  initialConfig: CodeInterpreterConfig
}

export function AdminCodeInterpreter({ session, initialConfig }: AdminCodeInterpreterProps) {
  const [enabled, setEnabled] = useState<boolean>(initialConfig.enabled)
  const [provider, setProvider] = useState<'pyodide' | 'jupyter'>(initialConfig.provider)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string>("")

  useEffect(() => {
    setEnabled(initialConfig.enabled)
    setProvider(initialConfig.provider)
  }, [initialConfig])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage("")
    startTransition(async () => {
      try {
        await updateCodeConfig({ enabled, provider })
        setMessage('Saved')
      } catch (err: any) {
        setMessage(err?.message || 'Failed to save')
      }
    })
  }

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Code Interpreter</h2>
          <p className="text-muted-foreground">Enable and select the runtime used for executing code.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Runtime</CardTitle>
            <CardDescription>Choose the interpreter and toggle availability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="ci-enabled">Enable</Label>
                  <p className="text-sm text-muted-foreground">Allow the assistant to execute code via the configured runtime.</p>
                </div>
                <Switch id="ci-enabled" checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="ci-provider">Runtime</Label>
                  <p className="text-sm text-muted-foreground">Select an interpreter backend.</p>
                </div>
                <Select value={provider} onValueChange={v => setProvider(v as 'pyodide' | 'jupyter')}>
                  <SelectTrigger id="ci-provider" className="min-w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pyodide">Pyodide</SelectItem>
                    <SelectItem value="jupyter">Jupyter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <SaveStatusButton label="Save" />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    
  )
}


