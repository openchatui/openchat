import { Suspense } from "react"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { getInitialChats, getActiveModelsLight, getUserSettings } from "@/actions/chat"

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <Suspense fallback={<div style={{ width: 280 }} />}> 
        {/* Server Component chunk streams later */}
        <SidebarContent />
      </Suspense>
      {children}
    </SidebarProvider>
  );
}

async function SidebarContent() {
  const session = await auth()
  const [initialChats, models, userSettings] = await Promise.all([
    getInitialChats(),
    getActiveModelsLight(),
    getUserSettings().catch(() => ({} as Record<string, any>)),
  ])

  const pinnedIds: string[] = Array.isArray((userSettings as any)?.ui?.pinned_models)
    ? ((userSettings as any).ui.pinned_models as string[])
    : []
  const pinnedModels = models.filter((m: any) => pinnedIds.includes(m.id))

  const cookieStore = await cookies()
  const timeZone = cookieStore.get('tz')?.value || 'UTC'

  return (
    <AppSidebar session={session} initialChats={initialChats} pinnedModels={pinnedModels} timeZone={timeZone} />
  )
}
