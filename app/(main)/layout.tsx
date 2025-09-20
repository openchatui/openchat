import { cookies } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { getInitialChats, getModels, getUserSettings } from "@/actions/chat"

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()

  // Load lightweight sidebar data server-side
  const [initialChats, models, userSettings] = await Promise.all([
    getInitialChats(),
    getModels(),
    getUserSettings().catch(() => ({} as Record<string, any>)),
  ])

  // Build pinned models list from user settings
  const pinnedIds: string[] = Array.isArray((userSettings as any)?.ui?.pinned_models)
    ? ((userSettings as any).ui.pinned_models as string[])
    : []
  const pinnedModels = models.filter((m: any) => pinnedIds.includes(m.id))

  // Resolve user timezone from cookie (fallback to UTC)
  const cookieStore = await cookies()
  const timeZone = cookieStore.get('tz')?.value || 'UTC'

  return (
    <SidebarProvider>
      <AppSidebar session={session} initialChats={initialChats} pinnedModels={pinnedModels} timeZone={timeZone} />
      {children}
    </SidebarProvider>
  );
}
