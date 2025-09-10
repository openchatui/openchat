"use client"

import { SettingsSidebar } from '@/components/settings/SettingsSidebar'
import { Session } from 'next-auth'
import { SETTINGS_MESSAGES } from '@/constants/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApiKeys } from '@/hooks/useApiKeys'
import { useMemo, useState } from 'react'
import { Loader2, Trash2, Plus, Copy } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SettingsKeysProps {
  session: Session | null
}

export function SettingsKeys({ session }: SettingsKeysProps) {
  const { keys, isLoading, isCreating, deletingIds, createKey, deleteKey } = useApiKeys()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSecretDialogOpen, setIsSecretDialogOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [currentSecret, setCurrentSecret] = useState<string>('')

  const createdBy = useMemo(() => session?.user?.name || session?.user?.email || 'You', [session])

  const handleCreate = async () => {
    const created = await createKey(keyName.trim() || 'API Key')
    if (created?.id && created?.key) {
      setSecrets(prev => ({ ...prev, [created.id]: created.key }))
      setIsDialogOpen(false)
      setKeyName('')
      setCurrentSecret(created.key)
      setIsSecretDialogOpen(true)
    }
  }

  const mask = (len: number = 35) => '•'.repeat(len)

  return (
    <SettingsSidebar session={session}>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{SETTINGS_MESSAGES.KEYS_TITLE}</h2>
            <p className="text-muted-foreground">{SETTINGS_MESSAGES.KEYS_DESCRIPTION}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create new api key
            </Button>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <label className="text-sm font-medium">{SETTINGS_MESSAGES.KEY_NAME_LABEL}</label>
                <Input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="My API Key"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating || !keyName.trim()}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create api key'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Secondary dialog to show secret with copy */}
        <Dialog open={isSecretDialogOpen} onOpenChange={setIsSecretDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Your new API key</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Copy and store this key now. You won't be able to view it again.
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 border rounded-md bg-muted/50 font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                  {currentSecret}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(currentSecret)
                    toast.success('Copied to clipboard')
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsSecretDialogOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="border rounded-lg overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3 min-w-[200px]">Name</TableHead>
                <TableHead className="w-[340px]">Key</TableHead>
                <TableHead className="w-[220px]">Created At</TableHead>
                <TableHead className="w-[200px]">Created By</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    <div className="flex items-center gap-2 p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {SETTINGS_MESSAGES.LOADING_KEYS}
                    </div>
                  </TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground p-4">
                    {SETTINGS_MESSAGES.NO_KEYS}
                  </TableCell>
                </TableRow>
              ) : (
                keys.map(k => {
                  const secret = secrets[k.id]
                  const suffix = (secret ? secret.slice(-4) : k.id.slice(-4))
                  return (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.keyName}</TableCell>
                      <TableCell className="w-[340px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm block w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {`sk-...${suffix}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[220px]">{new Date(k.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="w-[200px]">{createdBy}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteKey(k.id)}
                          disabled={deletingIds.has(k.id)}
                          title={SETTINGS_MESSAGES.DELETE}
                        >
                          {deletingIds.has(k.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </SettingsSidebar>
  )
}


