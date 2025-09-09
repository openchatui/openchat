// Types
export interface Connection {
  id: string
  type: string
  baseUrl: string
  apiKey: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateConnectionData {
  type: string
  baseUrl: string
  apiKey?: string
}

// API utility functions
export const connectionsApi = {
  // Get all connections
  async getAll(): Promise<Connection[]> {
    const response = await fetch('/api/connections')
    if (!response.ok) {
      throw new Error('Failed to fetch connections')
    }
    return response.json()
  },

  // Get single connection
  async getById(id: string): Promise<Connection> {
    const response = await fetch(`/api/connections/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch connection')
    }
    return response.json()
  },

  // Create single or multiple connections
  async create(data: CreateConnectionData | CreateConnectionData[]): Promise<Connection[]> {
    const response = await fetch('/api/connections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create connections')
    }
    
    return response.json()
  },

  // Update connection
  async update(id: string, data: CreateConnectionData): Promise<Connection> {
    const response = await fetch(`/api/connections/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update connection')
    }
    
    return response.json()
  },

  // Delete connection
  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/connections/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete connection')
    }
  },
}
