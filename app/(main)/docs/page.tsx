"use server"

import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserDocuments, createDocumentAction } from "@/actions/documents"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export default async function DocsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const documents = await getUserDocuments()

  async function create(formData: FormData) {
    'use server'
    // Bridge to the zod-validated action that expects (prevState, formData)
    await createDocumentAction({ status: 'success' } as any, formData)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={create} className="flex items-center gap-2">
            <Input name="title" placeholder="Untitled Document" className="max-w-sm" />
            <Button type="submit">New Document</Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {documents.length === 0 ? (
        <div className="text-sm text-muted-foreground">No documents yet. Create your first one above.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/docs/${doc.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="line-clamp-1 text-base">{doc.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    {new Date(doc.updatedAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}


