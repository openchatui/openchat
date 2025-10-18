"use server"
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import { saveFile, getRootFolderId } from '@/lib/modules/drive'
import { createFolderRecord, getTrashFolderId } from '@/lib/modules/drive'

export type ActionResult =
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string }

const CreateFolderSchema = z.object({
  parent: z.string().default(''),
  name: z.string().min(1).max(128),
})

export async function createFolderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = CreateFolderSchema.parse({
      parent: String(formData.get('parent') ?? ''),
      name: String(formData.get('name') ?? ''),
    })

    await createFolderRecord(session.user.id, parsed.name, parsed.parent || null)
    revalidatePath('/files')
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to create folder' }
  }
}

const UploadFileSchema = z.object({
  parent: z.string().default(''),
  file: z.instanceof(File),
})

export async function uploadFileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const file = formData.get('file')
    const parsed = UploadFileSchema.parse({
      parent: String(formData.get('parent') ?? ''),
      file,
    })

    // Determine parent folder id first
    const userId = session.user.id
    const nowSec = Math.floor(Date.now() / 1000)
    const resolvedParentId: string = parsed.parent && parsed.parent.length > 0
      ? parsed.parent
      : await getRootFolderId(userId)

    // Save into data/files/<parentId>/
    const savedName = await saveFile(resolvedParentId, parsed.file)

    const client: any = (await import('@/lib/db')).default as any
    if (client?.file?.create) {
      await client.file.create({
        data: {
          id: randomUUID(),
          userId,
          filename: savedName,
          parentId: resolvedParentId,
          meta: {},
          createdAt: nowSec,
          updatedAt: nowSec,
          path: `/data/files/${resolvedParentId}/${savedName}`,
        },
      })
    } else {
      const db = (await import('@/lib/db')).default as any
      await db.$executeRaw`INSERT INTO "file" (id, user_id, filename, parent_id, meta, created_at, updated_at, path)
        VALUES (${randomUUID()}, ${userId}, ${savedName}, ${resolvedParentId}, ${JSON.stringify({})}, ${nowSec}, ${nowSec}, ${`/data/files/${resolvedParentId}/${savedName}`})`
    }
    revalidatePath('/files')
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to upload file' }
  }
}

export async function uploadFolderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parent = String(formData.get('parent') ?? '')
    const files = formData.getAll('files')
    if (!files || files.length === 0) return { status: 'error', message: 'No files provided' }

    for (const f of files) {
      if (!(f instanceof File)) continue
      const rel = ((f as any).webkitRelativePath as string | undefined) || f.name
      const parts = rel.split('/')
      const dirParts = parts.slice(0, -1)
      const subdir = dirParts.join('/')
      const targetParent = subdir ? `${parent ? parent.replace(/\/$/, '') + '/' : ''}${subdir}` : parent
      await saveFile(targetParent, f)
    }

    revalidatePath('/files')
    return { status: 'success' }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to upload folder' }
  }
}

// One-arg wrappers for use as <form action={...}>
export async function createFolderSubmitAction(formData: FormData): Promise<void> {
  await createFolderAction({ status: 'success' }, formData)
}

export async function uploadFileSubmitAction(formData: FormData): Promise<void> {
  await uploadFileAction({ status: 'success' }, formData)
}

export async function uploadFolderSubmitAction(formData: FormData): Promise<void> {
  await uploadFolderAction({ status: 'success' }, formData)
}

const MoveFolderSchema = z.object({
  folderId: z.string().min(1),
  targetParentId: z.string().min(1),
})

export async function moveFolderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = MoveFolderSchema.parse({
      folderId: String(formData.get('folderId') ?? ''),
      targetParentId: String(formData.get('targetParentId') ?? ''),
    })

    const userId = session.user.id
    const nowSec = Math.floor(Date.now() / 1000)

    // Update using Prisma if available, else raw SQL
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

    // Revalidate root and the affected folder path
    revalidatePath('/drive')
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to move folder' }
  }
}

export async function moveFolderSubmitAction(formData: FormData): Promise<void> {
  await moveFolderAction({ status: 'success' }, formData)
}

const MoveFileSchema = z.object({
  fileId: z.string().min(1),
  targetParentId: z.string().min(1),
})

export async function moveFileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

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
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to move file' }
  }
}

export async function moveFileSubmitAction(formData: FormData): Promise<void> {
  await moveFileAction({ status: 'success' }, formData)
}


const MoveFolderToTrashSchema = z.object({
  folderId: z.string().min(1),
})

export async function moveFolderToTrashAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

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
      // Read current parent
      const rows = await db.$queryRaw<{ parentId: string | null }[]>`SELECT parent_id as parentId FROM "folder" WHERE id = ${parsed.folderId} AND user_id = ${userId} LIMIT 1`
      const previousParentId: string | null = rows && rows[0] ? (rows[0].parentId ? String(rows[0].parentId) : null) : null
      // Update meta.restore_id and move to trash
      try {
        await db.$executeRaw`UPDATE "folder" SET meta = json_set(COALESCE(meta, '{}'), '$.restore_id', ${previousParentId}), parent_id = ${trashId}, updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
      } catch {
        await db.$executeRaw`UPDATE "folder" SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('restore_id', ${previousParentId})::jsonb, parent_id = ${trashId}, updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
      }
    }

    revalidatePath('/drive/trash')
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to move to trash' }
  }
}

export async function moveFolderToTrashSubmitAction(formData: FormData): Promise<void> {
  await moveFolderToTrashAction({ status: 'success' }, formData)
}

const MoveFileToTrashSchema = z.object({ fileId: z.string().min(1) })

export async function moveFileToTrashAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

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
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to move file to trash' }
  }
}

export async function moveFileToTrashSubmitAction(formData: FormData): Promise<void> {
  await moveFileToTrashAction({ status: 'success' }, formData)
}

const RestoreFolderSchema = z.object({
  folderId: z.string().min(1),
})

export async function restoreFolderFromTrashAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = RestoreFolderSchema.parse({ folderId: String(formData.get('folderId') ?? '') })
    const userId = session.user.id
    const client: any = (await import('@/lib/db')).default as any
    const nowSec = Math.floor(Date.now() / 1000)

    let previousParentId: string | null = null
    if (client?.folder?.findUnique) {
      const existing = await client.folder.findUnique({ where: { id_userId: { id: parsed.folderId, userId } } })
      const meta = (existing?.meta ?? {}) as any
      // Prefer new meta.restore_id, fallback to legacy data.system.previousParentId
      previousParentId = (meta?.restore_id as string | undefined) ?? ((existing?.data as any)?.system?.previousParentId as string | undefined) ?? null
    } else {
      const db = (await import('@/lib/db')).default as any
      try {
        const rs = await db.$queryRaw<any[]>`SELECT json_extract(meta, '$.restore_id') AS prev, json_extract(data, '$.system.previousParentId') AS legacy FROM "folder" WHERE id = ${parsed.folderId} AND user_id = ${userId} LIMIT 1`
        const prev = rs && rs[0] ? (rs[0].prev ?? rs[0].legacy) : null
        previousParentId = prev ? String(prev) : null
      } catch {
        const rs = await db.$queryRaw<any[]>`SELECT COALESCE((meta ->> 'restore_id'), (data -> 'system' ->> 'previousParentId')) AS prev FROM "folder" WHERE id = ${parsed.folderId} AND user_id = ${userId} LIMIT 1`
        previousParentId = rs && rs[0] ? (rs[0].prev ? String(rs[0].prev) : null) : null
      }
    }

    if (!previousParentId) {
      previousParentId = await getRootFolderId(userId)
    }

    if (client?.folder?.update && client?.folder?.findUnique) {
      const existing = await client.folder.findUnique({ where: { id_userId: { id: parsed.folderId, userId } } })
      const existingMeta = (existing?.meta ?? {}) as Record<string, any>
      const nextMeta = { ...existingMeta }
      delete (nextMeta as any).restore_id
      await client.folder.update({
        where: { id_userId: { id: parsed.folderId, userId } },
        data: { parentId: previousParentId, meta: nextMeta, updatedAt: nowSec },
      })
    } else {
      const db = (await import('@/lib/db')).default as any
      try {
        await db.$executeRaw`UPDATE "folder" SET meta = json_remove(COALESCE(meta, '{}'), '$.restore_id'), parent_id = ${previousParentId}, updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
      } catch {
        await db.$executeRaw`UPDATE "folder" SET meta = (COALESCE(meta, '{}'::jsonb) - 'restore_id'), parent_id = ${previousParentId}, updated_at = ${nowSec} WHERE id = ${parsed.folderId} AND user_id = ${userId}`
      }
    }

    revalidatePath('/drive')
    revalidatePath('/drive/trash')
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to restore folder' }
  }
}

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

  await restoreFolderFromTrashAction({ status: 'success' }, formData)
  const restoreTargetId: string = previousParentId || await getRootFolderId(userId)
  return redirect(`/drive/folder/${encodeURIComponent(restoreTargetId)}`)
}

// Rename folder
const RenameFolderSchema = z.object({
  folderId: z.string().min(1),
  name: z.string().min(1).max(128),
})

export async function renameFolderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

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
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to rename folder' }
  }
}

export async function renameFolderSubmitAction(formData: FormData): Promise<void> {
  await renameFolderAction({ status: 'success' }, formData)
}

// Rename file
const RenameFileSchema = z.object({
  fileId: z.string().min(1),
  filename: z.string().min(1).max(255),
})

export async function renameFileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

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
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to rename file' }
  }
}

export async function renameFileSubmitAction(formData: FormData): Promise<void> {
  await renameFileAction({ status: 'success' }, formData)
}

const RestoreFileSchema = z.object({ fileId: z.string().min(1) })

export async function restoreFileFromTrashAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

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
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to restore file' }
  }
}

export async function restoreFileFromTrashSubmitAction(formData: FormData): Promise<void> {
  await restoreFileFromTrashAction({ status: 'success' }, formData)
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
    await moveFolderAction({ status: 'success' }, fd)
  }
  for (const id of fileIds) {
    const fd = new FormData()
    fd.set('fileId', String(id))
    fd.set('targetParentId', targetParentId)
    await moveFileAction({ status: 'success' }, fd)
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

export async function setFileStarredAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

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
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to update star' }
  }
}

export async function setFileStarredSubmitAction(formData: FormData): Promise<void> {
  await setFileStarredAction({ status: 'success' }, formData)
}

// Star/unstar folder
const SetFolderStarredSchema = z.object({
  folderId: z.string().min(1),
  starred: z.union([z.string(), z.boolean()]).transform(v => v === true || v === 'true'),
  currentFolderId: z.string().optional(),
})

export async function setFolderStarredAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

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
    return { status: 'success' }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any
      const message = validationError.issues?.map((i: any) => i.message).join(', ') || 'Invalid input'
      return { status: 'error', message }
    }
    return { status: 'error', message: error?.message || 'Failed to update star' }
  }
}

export async function setFolderStarredSubmitAction(formData: FormData): Promise<void> {
  await setFolderStarredAction({ status: 'success' }, formData)
}

