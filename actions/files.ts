"use server"
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getRootFolderId } from '@/lib/modules/drive'
import { createFolderRecord, getTrashFolderId } from '@/lib/modules/drive'

const CreateFolderSchema = z.object({
  parent: z.string().default(''),
  name: z.string().min(1).max(128),
})

// One-arg wrappers for use as <form action={...}>
export async function createFolderSubmitAction(formData: FormData): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const parsed = CreateFolderSchema.parse({
      parent: String(formData.get('parent') ?? ''),
      name: String(formData.get('name') ?? ''),
    })

    await createFolderRecord(session.user.id, parsed.name, parsed.parent || null)
    revalidatePath('/files')
  } catch {
    // no-op
  }
}

const MoveFolderSchema = z.object({
  folderId: z.string().min(1),
  targetParentId: z.string().min(1),
})

export async function moveFolderSubmitAction(formData: FormData): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const parsed = MoveFolderSchema.parse({
      folderId: String(formData.get('folderId') ?? ''),
      targetParentId: String(formData.get('targetParentId') ?? ''),
    })

    const userId = session.user.id
    const nowSec = Math.floor(Date.now() / 1000)

    const client: any = (await import('@/lib/db')).default as any
    if (client?.folder?.update) {
      try {
        await client.folder.update({
          where: { id_userId: { id: parsed.folderId, userId } },
          data: { parentId: parsed.targetParentId, updatedAt: nowSec },
        })
      } catch (_prismaErr) {
        await client.$executeRaw`UPDATE "folder" SET parent_id = ${parsed.targetParentId}, updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
      }
    } else {
      const db = (await import('@/lib/db')).default as any
      await db.$executeRaw`UPDATE "folder" SET parent_id = ${parsed.targetParentId}, updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
    }

    revalidatePath('/drive')
  } catch {
    // no-op
  }
}

const MoveFileSchema = z.object({
  fileId: z.string().min(1),
  targetParentId: z.string().min(1),
})

export async function moveFileSubmitAction(formData: FormData): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const parsed = MoveFileSchema.parse({
      fileId: String(formData.get('fileId') ?? ''),
      targetParentId: String(formData.get('targetParentId') ?? ''),
    })

    const userId = session.user.id
    const nowSec = Math.floor(Date.now() / 1000)

    const client: any = (await import('@/lib/db')).default as any
    if (client?.file?.update) {
      await client.file.update({
        where: { id: parsed.fileId },
        data: { parentId: parsed.targetParentId, updatedAt: nowSec },
      })
    } else {
      const db = (await import('@/lib/db')).default as any
      await db.$executeRaw`UPDATE "file" SET parent_id = ${parsed.targetParentId}, updated_at = ${nowSec} WHERE id = ${parsed.fileId} AND user_id = ${userId}`
    }

    revalidatePath('/drive')
  } catch {
    // no-op
  }
}


const MoveFolderToTrashSchema = z.object({
  folderId: z.string().min(1),
})

export async function moveFolderToTrashSubmitAction(formData: FormData): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const parsed = MoveFolderToTrashSchema.parse({
      folderId: String(formData.get('folderId') ?? ''),
    })

    const userId = session.user.id
    const trashId = await getTrashFolderId(userId)
    const client: any = (await import('@/lib/db')).default as any
    const nowSec = Math.floor(Date.now() / 1000)

    if (client?.folder?.update && client?.folder?.findUnique) {
      const existing = await client.folder.findUnique({ where: { id_userId: { id: parsed.folderId, userId } } })
      const previousParentId: string | null = existing?.parentId ?? null
      const existingMeta = (existing?.meta ?? {}) as Record<string, any>
      const nextMeta = { ...existingMeta, restore_id: previousParentId }
      await client.folder.update({
        where: { id_userId: { id: parsed.folderId, userId } },
        data: { parentId: trashId, meta: nextMeta, updatedAt: nowSec },
      })
    } else {
      const db = (await import('@/lib/db')).default as any
      const rows = await db.$queryRaw<{ parentId: string | null }[]>`SELECT parent_id as parentId FROM "folder" WHERE id = ${parsed.folderId} AND user_id = ${userId} LIMIT 1`
      const previousParentId: string | null = rows && rows[0] ? (rows[0].parentId ? String(rows[0].parentId) : null) : null
      try {
        await db.$executeRaw`UPDATE "folder" SET meta = json_set(COALESCE(meta, '{}'), '$.restore_id', ${previousParentId}), parent_id = ${trashId}, updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
      } catch {
        await db.$executeRaw`UPDATE "folder" SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('restore_id', ${previousParentId})::jsonb, parent_id = ${trashId}, updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
      }
    }

    revalidatePath('/drive/trash')
  } catch {
    // no-op
  }
}

const MoveFileToTrashSchema = z.object({ fileId: z.string().min(1) })

export async function moveFileToTrashSubmitAction(formData: FormData): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const parsed = MoveFileToTrashSchema.parse({ fileId: String(formData.get('fileId') ?? '') })
    const userId = session.user.id
    const trashId = await getTrashFolderId(userId)
    const nowSec = Math.floor(Date.now() / 1000)

    const client: any = (await import('@/lib/db')).default as any
    if (client?.file?.update && client?.file?.findUnique) {
      const existing = await client.file.findUnique({ where: { id: parsed.fileId } })
      const existingMeta = (existing?.meta ?? {}) as Record<string, any>
      const previousParentId: string | null = (existing?.parentId as string | undefined) ?? null
      const nextMeta = { ...existingMeta, restore_id: previousParentId }
      try {
        await client.file.update({ where: { id: parsed.fileId }, data: { meta: nextMeta, parentId: trashId, updatedAt: nowSec } })
      } catch {
        await client.file.update({ where: { id: parsed.fileId }, data: { meta: nextMeta, updatedAt: nowSec } })
        await client.$executeRaw`UPDATE "file" SET parent_id = ${trashId} WHERE id = ${parsed.fileId} AND user_id = ${userId}`
      }
    } else {
      const db = (await import('@/lib/db')).default as any
      try {
        await db.$executeRaw`UPDATE "file" SET meta = json_set(COALESCE(meta, '{}'), '$.restore_id', parent_id), parent_id = ${trashId}, updated_at = ${nowSec} WHERE id = ${parsed.fileId} AND user_id = ${userId}`
      } catch {
        await db.$executeRaw`UPDATE "file" SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('restore_id', parent_id)::jsonb, parent_id = ${trashId}, updated_at = ${nowSec} WHERE id = ${parsed.fileId} AND user_id = ${userId}`
      }
    }
    revalidatePath('/drive/trash')
  } catch {
    // no-op
  }
}

const RestoreFolderSchema = z.object({
  folderId: z.string().min(1),
})

export async function restoreFolderFromTrashSubmitAction(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return redirect('/login')
  const folderId = String(formData.get('folderId') ?? '')
  const userId = session.user.id

  // Determine the previous parent (restore target) BEFORE mutating
  let previousParentId: string | null = null
  const client: any = (await import('@/lib/db')).default as any
  if (client?.folder?.findUnique) {
    const existing = await client.folder.findUnique({ where: { id_userId: { id: folderId, userId } } })
    const meta = (existing?.meta ?? {}) as any
    previousParentId = (meta?.restore_id as string | undefined) ?? ((existing?.data as any)?.system?.previousParentId as string | undefined) ?? null
  } else {
    const db = (await import('@/lib/db')).default as any
    try {
      const rs = await db.$queryRaw<any[]>`SELECT json_extract(meta, '$.restore_id') AS prev, json_extract(data, '$.system.previousParentId') AS legacy FROM "folder" WHERE id = ${folderId} AND user_id = ${userId} LIMIT 1`
      const prev = rs && rs[0] ? (rs[0].prev ?? rs[0].legacy) : null
      previousParentId = prev ? String(prev) : null
    } catch {
      const rs = await db.$queryRaw<any[]>`SELECT COALESCE((meta ->> 'restore_id'), (data -> 'system' ->> 'previousParentId')) AS prev FROM "folder" WHERE id = ${folderId} AND user_id = ${userId} LIMIT 1`
      previousParentId = rs && rs[0] ? (rs[0].prev ? String(rs[0].prev) : null) : null
    }
  }
  if (!previousParentId) previousParentId = await getRootFolderId(userId)

  try {
    const client: any = (await import('@/lib/db')).default as any
    const nowSec = Math.floor(Date.now() / 1000)
    const targetParentId = previousParentId || await getRootFolderId(userId)

    if (client?.folder?.update && client?.folder?.findUnique) {
      const existing = await client.folder.findUnique({ where: { id_userId: { id: folderId, userId } } })
      const existingMeta = (existing?.meta ?? {}) as Record<string, any>
      const nextMeta = { ...existingMeta }
      delete (nextMeta as any).restore_id
      await client.folder.update({
        where: { id_userId: { id: folderId, userId } },
        data: { parentId: targetParentId, meta: nextMeta, updatedAt: nowSec },
      })
    } else {
      const db = (await import('@/lib/db')).default as any
      try {
        await db.$executeRaw`UPDATE "folder" SET meta = json_remove(COALESCE(meta, '{}'), '$.restore_id'), parent_id = ${targetParentId}, updated_at = ${nowSec} WHERE id = ${folderId} AND user_id = ${userId}`
      } catch {
        await db.$executeRaw`UPDATE "folder" SET meta = (COALESCE(meta, '{}'::jsonb) - 'restore_id'), parent_id = ${targetParentId}, updated_at = ${nowSec} WHERE id = ${folderId} AND user_id = ${userId}`
      }
    }

    revalidatePath('/drive')
    revalidatePath('/drive/trash')
  } catch {
    // no-op
  }

  const restoreTargetId: string = previousParentId || await getRootFolderId(userId)
  return redirect(`/drive/folder/${encodeURIComponent(restoreTargetId)}`)
}

// Rename folder
const RenameFolderSchema = z.object({
  folderId: z.string().min(1),
  name: z.string().min(1).max(128),
})

export async function renameFolderSubmitAction(formData: FormData): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const parsed = RenameFolderSchema.parse({
      folderId: String(formData.get('folderId') ?? ''),
      name: String(formData.get('name') ?? ''),
    })

    const userId = session.user.id
    const nowSec = Math.floor(Date.now() / 1000)

    const client: any = (await import('@/lib/db')).default as any
    if (client?.folder?.update) {
      await client.folder.update({
        where: { id_userId: { id: parsed.folderId, userId } },
        data: { name: parsed.name, updatedAt: nowSec },
      })
    } else {
      const db = (await import('@/lib/db')).default as any
      await db.$executeRaw`UPDATE "folder" SET name = ${parsed.name}, updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
    }

    revalidatePath('/drive')
  } catch {
    // no-op
  }
}

// Rename file
const RenameFileSchema = z.object({
  fileId: z.string().min(1),
  filename: z.string().min(1).max(255),
})

export async function renameFileSubmitAction(formData: FormData): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const parsed = RenameFileSchema.parse({
      fileId: String(formData.get('fileId') ?? ''),
      filename: String(formData.get('filename') ?? ''),
    })

    const userId = session.user.id
    const nowSec = Math.floor(Date.now() / 1000)

    const client: any = (await import('@/lib/db')).default as any
    if (client?.file?.update) {
      await client.file.update({
        where: { id: parsed.fileId },
        data: { filename: parsed.filename, updatedAt: nowSec },
      })
    } else {
      const db = (await import('@/lib/db')).default as any
      await db.$executeRaw`UPDATE "file" SET filename = ${parsed.filename}, updated_at = ${nowSec} WHERE id = ${parsed.fileId} AND user_id = ${userId}`
    }

    revalidatePath('/drive')
  } catch {
    // no-op
  }
}

const RestoreFileSchema = z.object({ fileId: z.string().min(1) })

export async function restoreFileFromTrashSubmitAction(formData: FormData): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const parsed = RestoreFileSchema.parse({ fileId: String(formData.get('fileId') ?? '') })
    const userId = session.user.id
    const nowSec = Math.floor(Date.now() / 1000)

    const client: any = (await import('@/lib/db')).default as any
    if (client?.file?.update && client?.file?.findUnique) {
      const existing = await client.file.findUnique({ where: { id: parsed.fileId } })
      const meta = (existing?.meta ?? {}) as Record<string, any>
      const previousParentId: string | null = (meta?.restore_id as string | undefined) ?? null
      const nextMeta: Record<string, any> = { ...meta }
      delete (nextMeta as any).restore_id
      try {
        await client.file.update({ where: { id: parsed.fileId }, data: { meta: nextMeta, parentId: previousParentId, updatedAt: nowSec } })
      } catch {
        await client.file.update({ where: { id: parsed.fileId }, data: { meta: nextMeta, updatedAt: nowSec } })
        await client.$executeRaw`UPDATE "file" SET parent_id = ${previousParentId} WHERE id = ${parsed.fileId} AND user_id = ${userId}`
      }
    } else {
      const db = (await import('@/lib/db')).default as any
      try {
        await db.$executeRaw`UPDATE "file" SET parent_id = json_extract(meta, '$.restore_id'), meta = json_remove(COALESCE(meta, '{}'), '$.restore_id'), updated_at = ${nowSec} WHERE id = ${parsed.fileId} AND user_id = ${userId}`
      } catch {
        await db.$executeRaw`UPDATE "file" SET parent_id = (meta ->> 'restore_id'), meta = (COALESCE(meta, '{}'::jsonb) - 'restore_id'), updated_at = ${nowSec} WHERE id = ${parsed.fileId} AND user_id = ${userId}`
      }
    }

    revalidatePath('/drive')
    revalidatePath('/drive/trash')
  } catch {
    // no-op
  }
}

// Bulk move items
export async function moveItemsSubmitAction(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return
  const targetParentId = String(formData.get('targetParentId') ?? '')
  const folderIds = formData.getAll('folderIds') as string[]
  const fileIds = formData.getAll('fileIds') as string[]
  for (const id of folderIds) {
    const fd = new FormData()
    fd.set('folderId', String(id))
    fd.set('targetParentId', targetParentId)
    await moveFolderSubmitAction(fd)
  }
  for (const id of fileIds) {
    const fd = new FormData()
    fd.set('fileId', String(id))
    fd.set('targetParentId', targetParentId)
    await moveFileSubmitAction(fd)
  }
  // Revalidate common views
  revalidatePath('/drive')
  if (targetParentId) {
    revalidatePath(`/drive/folder/${encodeURIComponent(targetParentId)}`)
  }
}

// Star/unstar file
const SetFileStarredSchema = z.object({
  fileId: z.string().min(1),
  starred: z.union([z.string(), z.boolean()]).transform(v => v === true || v === 'true'),
  currentFolderId: z.string().optional(),
})

export async function setFileStarredSubmitAction(formData: FormData): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const parsed = SetFileStarredSchema.parse({
      fileId: String(formData.get('fileId') ?? ''),
      starred: (formData.get('starred') as any) ?? 'false',
      currentFolderId: formData.get('currentFolderId') ? String(formData.get('currentFolderId')) : undefined,
    })

    const userId = session.user.id
    const nowSec = Math.floor(Date.now() / 1000)
    const client: any = (await import('@/lib/db')).default as any
    if (client?.file?.update && client?.file?.findUnique) {
      const existing = await client.file.findUnique({ where: { id: parsed.fileId } })
      const meta = { ...((existing?.meta ?? {}) as Record<string, any>), starred: parsed.starred }
      await client.file.update({ where: { id: parsed.fileId }, data: { meta, updatedAt: nowSec } })
    } else {
      const db = (await import('@/lib/db')).default as any
      try {
        await db.$executeRaw`UPDATE "file" SET meta = json_set(COALESCE(meta, '{}'), '$.starred', ${parsed.starred ? 1 : 0}), updated_at = ${nowSec} WHERE id = ${parsed.fileId} AND user_id = ${userId}`
      } catch {
        await db.$executeRaw`UPDATE "file" SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('starred', ${parsed.starred})::jsonb, updated_at = ${nowSec} WHERE id = ${parsed.fileId} AND user_id = ${userId}`
      }
    }

    revalidatePath('/drive')
    revalidatePath('/drive/starred')
    if (parsed.currentFolderId) revalidatePath(`/drive/folder/${encodeURIComponent(parsed.currentFolderId)}`)
  } catch {
    // no-op
  }
}

// Star/unstar folder
const SetFolderStarredSchema = z.object({
  folderId: z.string().min(1),
  starred: z.union([z.string(), z.boolean()]).transform(v => v === true || v === 'true'),
  currentFolderId: z.string().optional(),
})

export async function setFolderStarredSubmitAction(formData: FormData): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const parsed = SetFolderStarredSchema.parse({
      folderId: String(formData.get('folderId') ?? ''),
      starred: (formData.get('starred') as any) ?? 'false',
      currentFolderId: formData.get('currentFolderId') ? String(formData.get('currentFolderId')) : undefined,
    })

    const userId = session.user.id
    const nowSec = Math.floor(Date.now() / 1000)
    const client: any = (await import('@/lib/db')).default as any
    if (client?.folder?.update && client?.folder?.findUnique) {
      const existing = await client.folder.findUnique({ where: { id_userId: { id: parsed.folderId, userId } } })
      const meta = { ...((existing?.meta ?? {}) as Record<string, any>), starred: parsed.starred }
      await client.folder.update({ where: { id_userId: { id: parsed.folderId, userId } }, data: { meta, updatedAt: nowSec } })
    } else {
      const db = (await import('@/lib/db')).default as any
      try {
        await db.$executeRaw`UPDATE "folder" SET meta = json_set(COALESCE(meta, '{}'), '$.starred', ${parsed.starred ? 1 : 0}), updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
      } catch {
        await db.$executeRaw`UPDATE "folder" SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('starred', ${parsed.starred})::jsonb, updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
      }
    }

    revalidatePath('/drive')
    revalidatePath('/drive/starred')
    if (parsed.currentFolderId) revalidatePath(`/drive/folder/${encodeURIComponent(parsed.currentFolderId)}`)
  } catch {
    // no-op
  }
}

