import { useEffect, useRef } from 'react'
import { useChatStore } from './useChatStore'
import { useAuthStore } from './useAuthStore'

type NotificationMessage =
  | { type: 'room_notification'; room_id: number; message: string; sender_id: number; message_id: number; created_at: string }
  | { type: 'error'; error: string }

const RECONNECT_BASE_DELAY = 1000
const MAX_RECONNECT_DELAY = 30 * 1000
const HEARTBEAT_INTERVAL = 30 * 1000

/**
 * App-wide WebSocket, independent of which (if any) room is open. Only
 * job: keep the sidebar's unread count / last message fresh for rooms
 * the user isn't actively viewing right now — including before they've
 * opened any chat at all.
 */
export function useNotificationSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttempts = useRef(0)

  const { token: accessToken, user: currentUser } = useAuthStore()
  const applyRoomNotification = useChatStore((s) => s.applyRoomNotification)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false

    const connect = () => {
      if (cancelled) return
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const wsUrl = `${protocol}://${window.location.host}/ws/notifications/?token=${accessToken}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempts.current = 0
        heartbeatIntervalRef.current = window.setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'heartbeat' }))
          }
        }, HEARTBEAT_INTERVAL)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NotificationMessage
          if (data.type !== 'room_notification') return
          const activeChatId = useChatStore.getState().activeChatId
          // The currently open room's own socket already handles this one.
          if (activeChatId != null && String(data.room_id) === activeChatId) return
          if (currentUser && data.sender_id === currentUser.id) return
          applyRoomNotification(data.room_id, data.message, data.created_at)
        } catch (e) {
          console.error('Failed to parse notification message:', e, event.data)
        }
      }

      ws.onclose = (event) => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        if (cancelled || event.code === 4001 || event.code === 1000) return
        const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current), MAX_RECONNECT_DELAY)
        reconnectAttempts.current += 1
        reconnectTimeoutRef.current = window.setTimeout(connect, delay)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
      if (wsRef.current) {
        wsRef.current.close(1000, 'Client disconnect')
        wsRef.current = null
      }
    }
  }, [accessToken, currentUser, applyRoomNotification])
}