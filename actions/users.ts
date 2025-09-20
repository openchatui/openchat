"use server"

import { revalidatePath } from "next/cache"
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

const UpdateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["user", "admin", "moderator"]).default("user"),
  password: z.string().optional().or(z.literal("")),
})

export async function updateUserAction(formData: FormData): Promise<void> {
  try {
    const parsed = UpdateUserSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role") ?? "user",
      password: formData.get("password") ?? undefined,
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

    revalidatePath("/admin/users")
  } catch (error) {
    // Swallow return; optionally log
  }
}

const DeleteUserSchema = z.object({ id: z.string().min(1) })

export async function deleteUserAction(formData: FormData): Promise<void> {
  try {
    const parsed = DeleteUserSchema.parse({ id: formData.get("id") })

    const existing = await db.user.findUnique({ where: { id: parsed.id }, select: { id: true } })
    if (!existing) return

    await db.user.delete({ where: { id: parsed.id } })
    revalidatePath("/admin/users")
  } catch (error) {
    // Swallow return; optionally log
  }
}


