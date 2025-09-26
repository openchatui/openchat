"use server"
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { saveFile } from '@/lib/server/file-management'
import { FolderDbService } from '@/lib/server/file-management/folder-db.service'

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

    await FolderDbService.createFolderRecord(session.user.id, parsed.name, parsed.parent || null)
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

    await saveFile(parsed.parent, parsed.file)
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


