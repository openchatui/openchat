import { auth } from '@/lib/auth/auth'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'
import { SETTINGS_MESSAGES } from '@/constants/settings'

export default async function SettingsPage() {
  const session = await auth()
  return (
    <SettingsSidebar session={session}>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">{SETTINGS_MESSAGES.TITLE}</h2>
        <p className="text-muted-foreground">{SETTINGS_MESSAGES.DESCRIPTION}</p>
      </div>
    </SettingsSidebar>
  )
}


