export type UpdateUserInput = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin' | 'moderator'
  password?: string
  groupIds?: string[]
}

export async function updateUser(input: UpdateUserInput): Promise<void> {
  const { id, ...body } = input
  const res = await fetch(`/api/v1/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to update user')
  }
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/v1/users/${id}/delete`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to delete user')
  }
}

export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('userId', userId)
  formData.append('file', file)
  const res = await fetch('/api/v1/users/profile-image', { method: 'POST', body: formData })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Upload failed')
  }
  const data = await res.json().catch(() => ({}))
  const url = typeof data?.url === 'string' ? data.url : ''
  if (!url) throw new Error('Upload failed')
  return url
}

export async function listUsers(): Promise<any[]> {
  const res = await fetch('/api/v1/users', { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to fetch users')
  }
  return await res.json()
}


