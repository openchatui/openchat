import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminWebSearch } from "@/components/admin/websearch/AdminWebSearch"
import { ChatStore } from "@/lib/modules/chat"
import { getWebSearchConfigAction } from "@/actions/websearch"

export default async function AdminWebSearchPage() {
  const session = await auth()
  if (!session || !session.user?.id) redirect("/login")

  const [chats, ws] = await Promise.all([
    ChatStore.getUserChats(session.user.id),
    getWebSearchConfigAction(),
  ])

  return (
    <AdminWebSearch
      session={session}
      initialChats={chats}
      initialEnabled={ws.ENABLED}
      initialProvider={ws.PROVIDER}
      initialSystemPrompt={ws.SYSTEM_PROMPT}
      envSystemPrompt={ws.ENV_SYSTEM_PROMPT}
      initialGooglePse={{
        apiKey: ws.googlepse.apiKey,
        engineId: ws.googlepse.engineId,
        resultCount: ws.googlepse.resultCount,
        domainFilters: ws.googlepse.domainFilters,
      }}
      initialBrowserless={{
        apiKey: ws.browserless.apiKey,
        stealth: ws.browserless.stealth,
        stealthRoute: ws.browserless.stealthRoute,
        blockAds: ws.browserless.blockAds,
        headless: ws.browserless.headless,
        locale: ws.browserless.locale,
        timezone: ws.browserless.timezone,
        userAgent: ws.browserless.userAgent,
        route: ws.browserless.route,
      }}
    />
  )
}



