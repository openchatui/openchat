'use client'
import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'

interface StorageData {
  storageQuota: { limit: string; usage: string; usageInDrive: string } | null
  user: { emailAddress?: string; displayName?: string } | null
}

export function DriveStorageInfo() {
  const [storage, setStorage] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const res = await fetch('/api/v1/drive/about')
        if (res.ok) {
          const data = await res.json()
          setStorage(data)
        }
      } catch (error) {
        console.error('Failed to fetch storage:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStorage()
  }, [])

  if (loading || !storage?.storageQuota) return null

  const limit = parseFloat(storage.storageQuota.limit)
  const usage = parseFloat(storage.storageQuota.usage)
  const percentage = limit > 0 ? (usage / limit) * 100 : 0

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  return (
    <div className="border-t pt-4 pb-2 px-2 space-y-2 mt-auto">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Storage</span>
        <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
      <div className="text-xs text-muted-foreground text-center">
        {formatBytes(usage)} of {formatBytes(limit)}
      </div>
    </div>
  )
}

