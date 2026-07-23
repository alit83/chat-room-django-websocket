import { useAuthStore } from '../hooks/useAuthStore'

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}` 
  : 'http://127.0.0.1:8000';

const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin
  } catch {
    return ''
  }
})()

// Your Profile.avatar field returns a root-relative path like
// "/media/profiles/x.jpg" — this resolves it against the backend's own
// origin so <img> tags work regardless of which origin the frontend is
// served from (Vite dev server vs the API).
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

async function requestMultipart<T>(url: string, formData: FormData, method: string = 'PATCH'): Promise<T> {
  let { token, refreshAccessToken, clearAuth } = useAuthStore.getState()
  const headers: Record<string, string> = {}
  // Deliberately no Content-Type here — the browser sets
  // multipart/form-data with the correct boundary automatically for
  // FormData bodies; setting it manually breaks the upload.
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res = await fetch(`${API_BASE}${url}`, { method, headers, body: formData })

  if (res.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      token = useAuthStore.getState().token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
        res = await fetch(`${API_BASE}${url}`, { method, headers, body: formData })
      } else {
        clearAuth()
      }
    } else {
      clearAuth()
    }
  }

  if (res.status === 204) return undefined as T
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

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
  updateProfile: (data: { first_name?: string; last_name?: string; gender?: number | null; avatarFile?: File | null }) => {
   type ProfileResponse = { pk: number; first_name: string; last_name: string; gender: number | null; avatar: string | null; username: string }
   const { avatarFile, ...rest } = data
   if (avatarFile) {
     const formData = new FormData()
     if (rest.first_name !== undefined) formData.set('first_name', rest.first_name)
     if (rest.last_name !== undefined) formData.set('last_name', rest.last_name)
     if (rest.gender !== undefined && rest.gender !== null) formData.set('gender', String(rest.gender))
     formData.set('avatar', avatarFile)
     return requestMultipart<ProfileResponse>('/accounts/api/v1/profile/update/', formData)
   }
   return request<ProfileResponse>('/accounts/api/v1/profile/update/', {
     method: 'PATCH',
    body: JSON.stringify(rest),
   })
 },
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
   create: (data: { name: string; link: string; participants: number[]; model: number; profileFile?: File | null }) => {
   const { profileFile, ...rest } = data
   if (profileFile) {
     const formData = new FormData()
     formData.set('name', rest.name)
     formData.set('link', rest.link)
     rest.participants.forEach((pid) => formData.append('participants', String(pid)))
     formData.set('model', String(rest.model))
     formData.set('profile', profileFile)
     return requestMultipart<RoomItem>('/rooms/api/v1/room-create/', formData)
   }
   return request<RoomItem>('/rooms/api/v1/room-create/', {
     method: 'POST',
     body: JSON.stringify(rest),
   })
 },
   update: (id: number, data: { name?: string; link?: string; participants?: number[]; profileFile?: File | null }) => {
    const { profileFile, ...rest } = data
    if (profileFile) {
      const formData = new FormData()
      if (rest.name !== undefined) formData.set('name', rest.name)
      if (rest.link !== undefined) formData.set('link', rest.link)
      if (rest.participants !== undefined) {
        rest.participants.forEach((pid) => formData.append('participants', String(pid)))
      }
      formData.set('profile', profileFile)
      return requestMultipart<RoomItem>(`/rooms/api/v1/room-update/${id}/`, formData)
    }
    return request<RoomItem>(`/rooms/api/v1/room-update/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(rest),
    })
  },
  delete: (id: number) =>
    request<void>(`/rooms/api/v1/room-delete/${id}/`, { method: 'DELETE' }),
  joinByLink: (link: string) =>
     request<void>(`/rooms/api/v1/room/${link}/link/`, { method: 'POST' }),
}