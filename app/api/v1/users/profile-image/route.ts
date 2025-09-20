import { NextRequest, NextResponse } from "next/server"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import crypto from "crypto"

export const runtime = "nodejs"

function getExtensionFromFile(file: File): string {
  const name = (file as any).name as string | undefined
  const fromName = name?.includes(".") ? name.split(".").pop() : undefined
  if (fromName) return fromName.toLowerCase()
  const type = file.type
  if (type === "image/png") return "png"
  if (type === "image/jpeg") return "jpg"
  if (type === "image/webp") return "webp"
  if (type === "image/gif") return "gif"
  return "bin"
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const userId = String(formData.get("userId") || "u")
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = getExtensionFromFile(file)
    const filename = `${userId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

    const publicDir = path.join(process.cwd(), "public")
    const profilesDir = path.join(publicDir, "profiles")
    await mkdir(profilesDir, { recursive: true })

    const filePath = path.join(profilesDir, filename)
    await writeFile(filePath, buffer)

    const url = `/profiles/${filename}`
    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}


