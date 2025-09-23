import { auth } from "@/lib/auth"
import { SettingsKeys } from '@/components/settings/SettingsKeys'

export default async function SettingsKeysPage() {
  const session = await auth()
  return <SettingsKeys session={session} />
}


