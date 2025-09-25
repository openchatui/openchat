"use server"

import { searchUserModels } from "@/lib/features/search"
import { getActiveModelsLight } from "@/actions/chat"

interface ModelsResultsProps {
  userId: string
  query?: string
  mentions: string[]
}

export default async function ModelsResults({ userId, query, mentions }: ModelsResultsProps) {
  let models: any[] = []
  if (query && query.trim()) {
    models = await searchUserModels(userId, { query, mentions })
  } else {
    models = await getActiveModelsLight()
  }

  return (
    <div className="mt-4 space-y-6 min-w-[6rem] mx-86">
      <div>
        <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Models</div>
        {models.length === 0 ? (
          <div className="text-sm text-muted-foreground">No results</div>
        ) : (
          <ul className="space-y-2">
            {models.map((m: any) => (
              <li key={m.id} className="px-3 py-2 rounded-md hover:bg-accent/60 transition-colors">
                <div className="text-sm font-medium truncate">{m.name}</div>
                {m.provider && (
                  <div className="mt-0.5 text-xs text-muted-foreground truncate">{String(m.provider)}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}


