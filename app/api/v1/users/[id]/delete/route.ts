import { NextRequest, NextResponse } from 'next/server'
import { deleteUserById, findUserById } from '@/lib/db/users.db'
import { fetchToken, isAdminToken, isSameOrigin } from '@/lib/auth/authz'
import { z } from 'zod'

/**
 * @swagger
 * /api/v1/users/{id}/delete:
 *   delete:
 *     tags: [Users]
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

    const existing = await findUserById(id)
    const existingUser = existing ? { id: existing.id, email: existing.email, name: existing.name || null } : null

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await deleteUserById(id)

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


