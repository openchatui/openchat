"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { ActionState } from "@/app/setup/actions"
import { createAdminAction } from "@/app/setup/actions"

const initialState: ActionState = { status: 'idle' }

export function AdminSetupForm() {
  const [state, formAction] = useActionState(createAdminAction, initialState)
  const router = useRouter()
  const [username, setUsername] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")

  useEffect(() => {
    if (state?.fields) {
      if (typeof state.fields.username === 'string') setUsername(state.fields.username)
      if (typeof state.fields.email === 'string') setEmail(state.fields.email)
      // Do not populate password fields from server state
    }
  }, [state])

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/login?message=' + encodeURIComponent('Account created successfully! Please sign in.'))
    }
  }, [state, router])

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-2 text-left">
        <label className="text-sm font-medium">Username</label>
        <Input name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Admin username" type="text" required autoComplete="username" />
      </div>
      <div className="grid gap-2 text-left">
        <label className="text-sm font-medium">Email</label>
        <Input name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required autoComplete="email" />
      </div>
      <div className="grid gap-2 text-left">
        <label className="text-sm font-medium">Password</label>
        <Input name="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 characters)" type="password" required autoComplete="new-password" />
      </div>
      <div className="grid gap-2 text-left">
        <Input name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" type="password" required autoComplete="new-password" />
      </div>

      <Button variant="outline" className="w-full mt-2" type="submit">
        Create Admin Account
      </Button>

      {state.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
          {state.message}
        </div>
      )}
      {state.status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
          {state.message || 'Admin account created.'}
        </div>
      )}
    </form>
  )
}


