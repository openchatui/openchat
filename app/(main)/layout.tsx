import { Suspense } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth, AuthService } from "@/lib/auth"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { getInitialChats, getActiveModelsLight, getUserSettings } from "@/actions/chat"
import { IntegrationsProvider } from "@/components/providers/IntegrationsProvider"

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // If no users exist yet, redirect to setup before any data fetching
  const firstUser = await AuthService.isFirstUser()
  if (firstUser) redirect('/setup')

  // Require authentication for main layout once a user exists
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Read sidebar state from cookie to prevent remounting on refresh
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get('sidebar_state')?.value
  const defaultOpen = sidebarState === 'false' ? false : true // Default to true if no cookie or cookie is 'true'

  // Load all sidebar data upfront - this ensures sidebar renders immediately without Suspense
  const [initialChats, models, userSettings] = await Promise.all([
    getInitialChats(),
    getActiveModelsLight(),
    getUserSettings().catch(() => ({} as Record<string, any>)),
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
      <IntegrationsProvider initial={{ integrations: (userSettings as any)?.integrations }}>
        {children}
      </IntegrationsProvider>
    </SidebarProvider>
  );
}
