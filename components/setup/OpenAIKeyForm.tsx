"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { ActionState } from "@/app/setup/actions"
import { saveOpenAIKeyAction } from "@/app/setup/actions"

const initialState: ActionState = { status: 'idle' }

export function OpenAIKeyForm() {
  const [state, formAction] = useActionState(saveOpenAIKeyAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-2 text-left">
        <label className="text-sm font-medium">OpenAI Base URL</label>
        <Input name="baseUrl" placeholder="https://api.openai.com/v1" defaultValue="https://api.openai.com/v1" />
      </div>
      <div className="grid gap-2 text-left">
        <label className="text-sm font-medium">OpenAI API Key</label>
        <Input name="apiKey" placeholder="sk-..." type="password" required />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Button variant="outline" type="submit">
          Save OpenAI Key
        </Button>
        <Link href="/login" prefetch={false}>
          <Button variant="ghost" type="button">
            Skip
          </Button>
        </Link>
      </div>

      {state.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
          {state.message}
        </div>
      )}
      {state.status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
          {state.message || 'Saved.'}
        </div>
      )}
    </form>
  )
}


