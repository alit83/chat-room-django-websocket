import { useAuthStore } from '../hooks/useAuthStore'

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}` 
  : 'http://192.168.1.3:8000';

async function rawRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) }
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers })
  if (res.status === 204) return undefined as T
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  let { token, refreshAccessToken, clearAuth } = useAuthStore.getState()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(`${API_BASE}${url}`, { ...options, headers })

  if (res.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      // Get the new token from the store after successful refresh
      token = useAuthStore.getState().token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
        res = await fetch(`${API_BASE}${url}`, { ...options, headers }) // Retry original request
      } else {
        clearAuth() // Should not happen if refreshAccessToken returns true, but safeguard
      }
    } else {
      clearAuth() // Refresh token failed
    }
  }

  if (res.status === 204) return undefined as T
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    request<{ access: string; refresh: string; user_id: number }>('/accounts/api/v1/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  refreshToken: (refresh: string) =>
    rawRequest<{ access: string }>('/accounts/api/v1/jwt/refresh-token/', { // Use rawRequest for refreshToken to avoid infinite loop
      method: 'POST',
      body: JSON.stringify({ refresh }),
    }),
  verifyToken: (token: string) =>
    request<{ token: string }>('/accounts/api/v1/jwt/token-verification/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  getProfile: () =>
    request<{ first_name: string; last_name: string; avatar: string | null; gender: number | null }>('/accounts/api/v1/profile/details/'),
  register: (username: string, password: string, password1: string) =>
    request<{ username: string }>('/accounts/registration/', {
      method: 'POST',
      body: JSON.stringify({ username, password, password1 }),
    }),
}

// Messages
export type MessageItem = {
  pk: number
  sender: { pk: number; first_name: string; last_name: string; avatar: string | null; gender: number | null }
  text: string
  room: number
  created_date: string
  updated_date: string
}

export const messagesApi = {
  list: (roomId: number, page?: number, pageSize?: number) => {
    const params = new URLSearchParams()
    if (page) params.set('page', String(page))
    if (pageSize) params.set('page_size', String(pageSize))
    return request<{ count: number; results: MessageItem[] }>(
      `/messages/api/v1/room/${roomId}/message-list/?${params}`,
    )
  },
}

// Rooms
export type RoomItem = {
  id: number
  name: string | null
  link: string | null
  model: number
  creator: number
  participants: number[]
  profile: string | null
  created_date: string
  updated_date: string
}

export type RoomDetail = {
  id: number
  name: string | null
  link: string | null
  model: number
  creator: number
  participants: { pk: number; username: string; first_name: string; last_name: string; avatar: string | null; gender: number | null }[]
  profile: string | null
}

export const roomsApi = {
  list: () => request<RoomItem[]>('/rooms/api/v1/room-list/'),
  detail: (id: number) => request<RoomDetail>(`/rooms/api/v1/room-detail/${id}/`),
  create: (data: { name: string; link: string; participants: number[]; model: number; profile?: string }) =>
    request<RoomItem>('/rooms/room-create/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name?: string; link?: string; participants?: number[]; profile?: string }) =>
    request<RoomItem>(`/rooms/room-update/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/rooms/room-delete/${id}/`, { method: 'DELETE' }),
  joinByLink: (link: string) =>
    request<void>(`/rooms/room/${link}/link/`, { method: 'POST' }),
}