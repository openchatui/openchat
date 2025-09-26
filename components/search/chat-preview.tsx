"use client"

import type { AppUIMessage, ChatData } from "@/lib/features/chat"
import { cn } from "@/lib/utils"
import { Response } from "@/components/ai/response"

interface ChatPreviewProps {
  chat: ChatData
  className?: string
  maxMessages?: number
}

function getTextParts(message: AppUIMessage): string[] {
  try {
    const parts = (message as any)?.parts || []
    return parts
      .filter((p: any) => p?.type === 'text' && typeof p?.text === 'string')
      .map((p: any) => String(p.text))
  } catch {
    return []
  }
}

export function ChatPreview({ chat, className, maxMessages = 16 }: ChatPreviewProps) {
  const messages: AppUIMessage[] = Array.isArray(chat.messages) ? chat.messages : []
  const last = messages.slice(-maxMessages)

  return (
    <div className={cn("w-full h-full flex flex-col", className)}>
      <div className="px-4 py-3">
        <div className="text-sm font-medium truncate">{chat.title || 'Untitled'}</div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {last.length === 0 && (
          <div className="text-sm text-muted-foreground">No messages yet</div>
        )}
        {last.map((m) => {
          const textBlocks = getTextParts(m)
          if (textBlocks.length === 0) return null
          const content = textBlocks.join("\n\n")
          if (m.role === 'user') {
            return (
              <div key={m.id} className="w-full flex flex-col items-end gap-2">
                <div className="flex flex-col gap-3 overflow-hidden rounded-4xl px-5 py-4 max-w-[80%] bg-muted text-primary">
                  <Response className="prose prose-sm leading-normal prose-invert max-w-none">
                    {content}
                  </Response>
                </div>
              </div>
            )
          }
          return (
            <div key={m.id} className="w-full flex flex-col items-start gap-2">
              <div className="flex flex-col gap-3 overflow-hidden rounded-4xl px-5 py-4 max-w-[80%] bg-background">
                <Response className="prose prose-sm leading-normal max-w-none">
                  {content}
                </Response>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ChatPreview


