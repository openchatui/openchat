import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { fetchToken, isAdminToken, isSameOrigin } from '@/lib/auth/authz'
import { z } from 'zod'

/**
 * @swagger
 * /api/users/{id}/delete:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a user by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to delete user
 */
// authz helpers in '@/lib/auth/authz'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // CSRF: same-origin check
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Re-derive identity and enforce admin role
    const token = await fetchToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminToken(token)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate path params
    const Params = z.object({ id: z.string().min(1) })
    const { id } = Params.parse(await params)

    const existingUser = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await db.user.delete({ where: { id } })

    return NextResponse.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email
      }
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}


