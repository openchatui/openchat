import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { Integrations } from "@/components/settings/Integrations";
import { auth } from "@/lib/auth"

export default async function SettingsIntegrationsPage() {
  const session = await auth()
  return (
    <SettingsSidebar session={session}>
      <Integrations />
    </SettingsSidebar>
  )
}
