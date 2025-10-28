import { Suspense } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth, AuthService } from "@/lib/auth"
import { isAuthEnabled } from "@/lib/auth/toggle"
import { ensurePublicUser } from "@/lib/auth/public-user"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { getInitialChats } from "@/lib/api/chats"
import { listActiveModelsLight } from "@/lib/api/models"
import { getUserSettings, getUserSettingsRaw } from "@/lib/api/userSettings"
import { IntegrationsProvider } from "@/components/providers/IntegrationsProvider"

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // If no users exist yet, redirect to setup before any data fetching
  const firstUser = await AuthService.isFirstUser()
  if (firstUser) redirect('/setup')

  // In public mode, ensure the public user exists for permission management
  if (!isAuthEnabled()) {
    try { await ensurePublicUser() } catch {}
  }

  // Require authentication for main layout once a user exists (unless AUTH=false)
  const session = await auth()
  if (isAuthEnabled() && !session?.user?.id) redirect('/login')

  // Read sidebar state from cookie to prevent remounting on refresh
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get('sidebar_state')?.value
  const defaultOpen = sidebarState === 'false' ? false : true // Default to true if no cookie or cookie is 'true'

  // Load all sidebar data upfront - this ensures sidebar renders immediately without Suspense
  const userId = session?.user?.id
  const [initialChats, models, userSettings, rawSettings] = await Promise.all([
    getInitialChats(),
    listActiveModelsLight(),
    userId ? getUserSettings(userId).catch(() => ({} as Record<string, any>)) : Promise.resolve({} as Record<string, any>),
    userId ? getUserSettingsRaw(userId).catch(() => ({} as Record<string, any>)) : Promise.resolve({} as Record<string, any>),
  ])

  const pinnedIds: string[] = Array.isArray((userSettings as any)?.ui?.pinned_models)
    ? ((userSettings as any).ui.pinned_models as string[])
    : []
  const pinnedModels = models.filter((m: any) => pinnedIds.includes(m.id))
  const timeZone = cookieStore.get('tz')?.value || 'UTC'

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar 
        session={session} 
        initialChats={initialChats} 
        pinnedModels={pinnedModels} 
        timeZone={timeZone} 
      />
      <IntegrationsProvider initial={{ integrations: (rawSettings as any)?.integrations }}>
        {children}
      </IntegrationsProvider>
    </SidebarProvider>
  );
}
