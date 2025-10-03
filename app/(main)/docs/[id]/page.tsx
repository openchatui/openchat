"use server"

import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDocument } from "@/actions/documents"
import { CollaborativeEditor } from "@/components/docs/CollaborativeEditor"
import { DocsChrome } from "@/components/docs/DocsChrome"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { sign } from "jsonwebtoken"

export default async function DocumentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id: documentId } = await params

  const doc = await getDocument(documentId).catch(() => null)
  if (!doc) notFound()

  const TOKEN_SECRET = process.env.TOKEN_SECRET || 'supersecret-secret'
  const collabToken = sign({ userId: session.user.id, email: session.user.email }, TOKEN_SECRET, { expiresIn: '2h' })

  return (
    <div className="h-[100svh] w-full overflow-hidden flex flex-col">
      <DocsChrome title={doc.title} />
      <CollaborativeEditor
        chrome="page"
        className="min-h-0 flex-1 overflow-hidden"
        documentId={documentId}
        user={{ id: session.user.id, name: session.user.name ?? null, email: session.user.email ?? '' , image: session.user.image ?? null }}
        token={collabToken}
      />
    </div>
  )
}


