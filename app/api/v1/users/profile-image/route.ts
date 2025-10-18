import { NextRequest, NextResponse } from "next/server"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import crypto from "crypto"
import { fetchToken, getUserIdFromToken, isSameOrigin } from '@/lib'

export const runtime = "nodejs"

function readStringField(obj: unknown, key: string): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined
  const value = (obj as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

function getExtensionFromFile(file: File): string {
  const name = readStringField(file, 'name')
  const fromName = name && name.includes('.') ? name.split('.').pop() : undefined
  if (fromName) return fromName.toLowerCase()
  const type = file.type
  if (type === "image/png") return "png"
  if (type === "image/jpeg") return "jpg"
  if (type === "image/webp") return "webp"
  if (type === "image/gif") return "gif"
  return "bin"
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF: same-origin check
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Auth: require logged-in user
    const token = await fetchToken(request)
    const userId = getUserIdFromToken(token)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    // Validate file type and size (max 10MB)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const maxBytes = 10 * 1024 * 1024
    if (buffer.length > maxBytes) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

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

/**
 * @swagger
 * /api/users/profile-image:
 *   post:
 *     tags: [Users]
 *     summary: Upload a profile image for the current user
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Upload failed
 */


