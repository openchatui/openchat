"use client"

import { Zap } from "lucide-react"
interface PromptSuggestion {
  title: string
  description: string
  prompt_message: string
}

const SUGGESTIONS: PromptSuggestion[] = [
  {
    title: "Help me study",
    description: "Summarize key concepts from notes",
    prompt_message:
      "I need help studying a topic. Ask me what subject I'm studying, then create a concise study guide with: key concepts, short summaries, practical examples, and 5 practice questions with answers. Include a spaced-repetition schedule.",
  },
  {
    title: "Write an email",
    description: "Polite, concise, professional email",
    prompt_message:
      "Draft a concise, professional email. Ask me for the recipient, goal, tone, and key points. Provide a subject line and three variations, then the final email.",
  },
  {
    title: "Brainstorm ideas",
    description: "Generate diverse creative approaches",
    prompt_message:
      "Help me brainstorm ideas. Ask for my goal, audience, and constraints. Return 10 distinct ideas with pros/cons and a next-step suggestion.",
  },
  {
    title: "Debug my code",
    description: "Diagnose and propose fixes",
    prompt_message:
      "I have a bug. Ask me for the error, expected behavior, code snippet, and environment. Provide likely causes, a minimal repro, and step-by-step fixes.",
  },
  {
    title: "Improve my writing",
    description: "Edit for clarity and tone",
    prompt_message:
      "I want help improving a paragraph. Ask for the text and desired tone. Return an edited version, bullet feedback, and two stylistic alternatives.",
  },
  {
    title: "Plan a trip",
    description: "Itinerary with budget and tips",
    prompt_message:
      "Help me plan a trip. Ask for destination, dates, budget, and preferences. Propose a 3-day itinerary with activities, transport tips, and cost estimates.",
  },
]

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export function PromptSuggestions({ onSelect, disabled = false }: PromptSuggestionsProps) {
  return (
    <div className="max-w-2xl mx-auto w-full mt-4 md:mt-2 px-6 md:px-0">
      <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
        <Zap className="h-4 w-4" />
        <span>Suggestions</span>
      </div>
      <div className="max-h-46 overflow-y-auto scrollbar-hide">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={`${s.title}-${idx}`}
            type="button"
            className="w-full text-left rounded-md px-3 py-2 hover:bg-muted/40 transition-colors"
            onClick={() => onSelect(s.prompt_message)}
            disabled={disabled}
          >
            <div className="font-medium">{s.title}</div>
            <div className="text-sm text-muted-foreground">{s.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PromptSuggestions


