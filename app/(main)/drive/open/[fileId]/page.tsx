"use server"

import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import db from "@/lib/db"
import { sign } from "jsonwebtoken"
import { exportGoogleDriveFile } from "@/lib/modules/drive/providers/google-drive.service"
import { CollaborativeEditor } from "@/components/docs/CollaborativeEditor"
import { DocsChrome } from "@/components/docs/DocsChrome"

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = []
  return await new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on("error", (err) => reject(err))
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
  })
}

export default async function OpenGoogleDocPage({ params }: { params: Promise<{ fileId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { fileId } = await params
  if (!fileId) notFound()

  // Verify the file exists for this user and is a Google Doc
  const file = await db.file.findFirst({
    where: { id: fileId, userId: session.user.id },
    select: { filename: true, meta: true },
  })
  if (!file) notFound()

  const meta = (file.meta ?? {}) as any
  const mimeType = meta?.mimeType as string | undefined
  if (mimeType !== 'application/vnd.google-apps.document') {
    // Only Google Docs supported for editor import currently
    notFound()
  }

  // Export Google Doc as HTML
  const { stream } = await exportGoogleDriveFile(session.user.id, fileId, 'text/html')
  const initialHTML = await streamToString(stream)

  // Upsert a local document with the same id so the collaboration server allows access
  await db.document.upsert({
    where: { id: fileId },
    update: {
      title: file.filename,
      ownerId: session.user.id,
    },
    create: {
      id: fileId,
      title: file.filename,
      ownerId: session.user.id,
    },
  })

  const TOKEN_SECRET = process.env.TOKEN_SECRET || 'supersecret-secret'
  const collabToken = sign({ userId: session.user.id, email: session.user.email }, TOKEN_SECRET, { expiresIn: '2h' })

  return (
    <div className="h-[100svh] w-full overflow-hidden flex flex-col">
      <DocsChrome title={file.filename} />
      <CollaborativeEditor
        chrome="page"
        className="min-h-0 flex-1 overflow-hidden"
        documentId={fileId}
        user={{ id: session.user.id, name: session.user.name ?? null, email: session.user.email ?? '', image: session.user.image ?? null }}
        token={collabToken}
        initialHTML={initialHTML}
        enableGoogleSave
        syncWithGoogle
      />
    </div>
  )
}


