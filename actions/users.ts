"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import db from "@/lib/db"
import { z } from "zod"

const reverseRoleMap = {
  user: "USER",
  admin: "ADMIN",
  moderator: "USER",
} as const

export type ActionResult =
| { status: "success" }
| { status: "error"; message: string }

const DeleteUserSchema = z.object({ id: z.string().min(1) })

const UpdateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["user", "admin", "moderator"]).default("user"),
  password: z.string().optional().or(z.literal("")),
  groupIds: z.string().optional().or(z.literal("")),
})

export async function updateUserAction(formData: FormData): Promise<void> {
  try {
    const parsed = UpdateUserSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role") ?? "user",
      password: formData.get("password") ?? undefined,
      groupIds: formData.get("groupIds") ?? undefined,
    })

    const existing = await db.user.findUnique({ where: { id: parsed.id } })
    if (!existing) return

    if (parsed.email && parsed.email !== existing.email) {
      const emailExists = await db.user.findUnique({ where: { email: parsed.email } })
      if (emailExists) return
    }

    const updateData: any = {
      name: parsed.name,
      email: parsed.email,
      role: reverseRoleMap[parsed.role as keyof typeof reverseRoleMap] || "USER",
    }

    if (parsed.password && parsed.password.trim()) {
      const bcrypt = await import("bcryptjs")
      updateData.hashedPassword = await bcrypt.hash(parsed.password, 12)
    }

    await db.user.update({ where: { id: parsed.id }, data: updateData })

    // Update user group memberships if provided
    if (typeof parsed.groupIds === 'string') {
      let selectedGroupIds: string[] | null = null
      if (parsed.groupIds) {
        try {
          const decoded = JSON.parse(parsed.groupIds)
          if (Array.isArray(decoded)) {
            selectedGroupIds = decoded.filter((v: any) => typeof v === 'string')
          }
        } catch {
          // ignore malformed payload; do not change groups
          selectedGroupIds = null
        }
      } else {
        selectedGroupIds = []
      }

      if (selectedGroupIds !== null) {
        const groups = await (db as any).group.findMany()
        await Promise.all((groups || []).map(async (g: any) => {
          const raw = Array.isArray(g.userIds)
            ? g.userIds
            : Array.isArray(g.user_ids)
              ? g.user_ids
              : typeof g.userIds === 'object' && g.userIds !== null && 'set' in g.userIds
                ? (g.userIds.set as string[])
                : []
          const current: string[] = Array.isArray(raw) ? raw.filter((v: any) => typeof v === 'string') : []
          const shouldHave = selectedGroupIds!.includes(g.id)
          const hasNow = current.includes(parsed.id)
          let next = current
          if (shouldHave && !hasNow) next = Array.from(new Set([...current, parsed.id]))
          if (!shouldHave && hasNow) next = current.filter((id) => id !== parsed.id)
          const changed = next.length !== current.length || next.some((v, i) => v !== current[i])
          if (changed) {
            await (db as any).group.update({ where: { id: g.id }, data: { userIds: next } })
          }
        }))
      }
    }

    revalidatePath("/admin/users")
    revalidateTag('admin-users')
  } catch (error) {
    // Swallow return; optionally log
  }
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  try {
    const parsed = DeleteUserSchema.parse({ id: formData.get("id") })

    const existing = await db.user.findUnique({ where: { id: parsed.id }, select: { id: true } })
    if (!existing) return

    await db.user.delete({ where: { id: parsed.id } })
    revalidatePath("/admin/users")
    revalidateTag('admin-users')
  } catch (error) {
    // Swallow return; optionally log
  }
}


