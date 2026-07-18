import { useCallback, useEffect, useRef, useState } from 'react'
import { useChatStore } from './useChatStore'
import { useAuthStore } from './useAuthStore'
import type { Message } from '../data/mockChats'

// Server to Client Messages
type WSMessage =
  | { type: 'message'; room_id: number; message_id: number; sender_id: number; message: string; sender_username: string; sender_firstname: string; sender_lastname: string }
  | { type: 'message_edit'; room_id: number; message_id: number; sender_id: number; message: string; edited_at: string }
  | { type: 'message_delete'; room_id: number; user_id: number; message_ids: number[] }
  | { type: 'read'; room_id: number; user_id: number; message_ids: number[] }
  | { type: 'typing'; room_id: number; user_id: number; is_typing: boolean }
  | { type: 'presence'; user_id: number; is_online: boolean; last_seen?: string }
  | { type: 'error'; error: string }
  | { type: 'validation_error'; errors: Record<string, string[]> }

// Client to Server Messages
type ClientMessage =
  | { type: 'message'; message: string }
  | { type: 'message_edit'; message_id: number; message: string }
  | { type: 'message_delete'; message_ids: number[] }
  | { type: 'read'; message_ids: number[] }
  | { type: 'typing'; is_typing: boolean }
  | { type: 'heartbeat' }
  | { type: 'disconnect'; token: string }

const RECONNECT_BASE_DELAY = 1000 // 1 second
const MAX_RECONNECT_DELAY = 30 * 1000 // 30 seconds
const HEARTBEAT_INTERVAL = 30 * 1000 // 30 seconds

export function useWebSocket(roomId: number | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttempts = useRef(0)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { token: accessToken, user: currentUser } = useAuthStore()
  const {
    addMessage,
    updateMessage,
    deleteMessages: storeDeleteMessages,
    markMessagesAsRead,
    setTyping,
    setUserPresence,
  } = useChatStore()

  const handleMessage = useCallback((data: WSMessage) => {
    switch (data.type) {
      case 'error':
        setError(data.error)
        return
      case 'validation_error':
        setError(JSON.stringify(data.errors))
        return
      case 'message': {
        const nowStr = new Date().toISOString()
        const msg: Message = {
          id: String(data.message_id),
          text: data.message,
          senderId: String(data.sender_id),
          senderUsername: data.sender_username,
          senderFirstName: data.sender_firstname,
          senderLastName: data.sender_lastname,
          senderName: (data.sender_firstname && data.sender_lastname)
            ? `${data.sender_firstname} ${data.sender_lastname}`.trim()
            : data.sender_username,
          timestamp: Date.now(),
          room: data.room_id,
          created_date: nowStr,
          updated_date: nowStr,
        }

        // If the sender is the current user, assume this is the server's confirmation
        // for an optimistically sent message. Update the existing message rather than adding a new one.
        if (currentUser?.id && data.sender_id === currentUser.id) {
          updateMessage(msg.id, { ...msg, id: msg.id }) // Update with real ID and data
        } else {
          addMessage(msg)
        }
        break
      }
      case 'message_edit': {
        updateMessage(data.message_id, { text: data.message, updated_date: data.edited_at })
        break
      }
      case 'message_delete': {
        storeDeleteMessages(data.message_ids)
        break
      }
      case 'read': {
        markMessagesAsRead(data.message_ids)
        break
      }
      case 'typing': {
        // Only update if the typing event is not from the current user
        if (currentUser && data.user_id !== currentUser.id) {
          setTyping(data.user_id, data.is_typing)
        }
        break
      }
      case 'presence': {
        setUserPresence(data.user_id, data.is_online, data.last_seen)
        break
      }
      default:
        // Ignore unknown event types for forward compatibility
        console.warn('Unknown WebSocket event type:', data)
        break
    }
  }, [addMessage, updateMessage, storeDeleteMessages, markMessagesAsRead, setTyping, setUserPresence, currentUser])
  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    } else {
      console.warn('WebSocket not open. Message not sent:', msg)
    }
  }, [])

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return // Prevent sending empty messages
    const now = Date.now()
    const tempMessageId = `temp-${now}` // Unique temporary ID for optimistic update
    const currentUser = useAuthStore.getState().user
    console.log('DEBUG: sendMessage current user state', currentUser);

    if (currentUser?.id && roomId) {
      addMessage({
        id: tempMessageId,
        text: text,
        senderId: String(currentUser.id),
        senderUsername: currentUser.username,
        senderFirstName: currentUser.first_name,
        senderLastName: currentUser.last_name,
        senderName: (currentUser.first_name && currentUser.last_name)
            ? `${currentUser.first_name} ${currentUser.last_name}`.trim()
            : currentUser.username,
        timestamp: now,
        room: roomId,
        created_date: new Date(now).toISOString(),
        updated_date: new Date(now).toISOString(),
      })
    } else {
      console.error('DEBUG: Missing currentUser.id or roomId', { currentUser, roomId });
    }
    send({ type: 'message', message: text })
  }, [send, addMessage, roomId])

  const editMessage = useCallback((messageId: number, text: string) => {
    if (!text.trim()) return // Prevent editing to empty message
    send({ type: 'message_edit', message_id: messageId, message: text })
  }, [send])

  const deleteMessages = useCallback((messageIds: number[]) => {
    if (messageIds.length === 0) return
    send({ type: 'message_delete', message_ids: messageIds })
  }, [send])

  const markAsRead = useCallback((messageIds: number[]) => {
    if (messageIds.length === 0) return
    send({ type: 'read', message_ids: messageIds })
  }, [send])

  const setTypingStatus = useCallback((isTyping: boolean) => {
    send({ type: 'typing', is_typing: isTyping })
  }, [send])

  // Clear all intervals/timeouts and close WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (accessToken) {
        wsRef.current.send(JSON.stringify({ type: 'disconnect', token: accessToken }))
      }
      wsRef.current.close(1000, 'Client disconnect') // 1000 is Normal Closure
      wsRef.current = null
    }
    setConnected(false)
    setError(null)
    reconnectAttempts.current = 0
  }, [accessToken])

  const connect = useCallback(() => {
    if (!roomId || !accessToken) {
      console.warn('Cannot connect: roomId or accessToken missing.')
      return
    }
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return // Already connected or connecting
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${protocol}://${window.location.host}/ws/room/${roomId}/?token=${accessToken}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setError(null)
      reconnectAttempts.current = 0 // Reset reconnect attempts on successful connection

      // Start heartbeat
      heartbeatIntervalRef.current = window.setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'heartbeat' }))
        }
      }, HEARTBEAT_INTERVAL)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage
        handleMessage(data)
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e, event.data)
        // Optionally, send an error back to the server if malformed JSON is a client issue
      }
    }

    ws.onclose = (event) => {
      setConnected(false)
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }

      // Handle specific close codes
      if (event.code === 4001) {
        setError('Authentication failed. Please log in again.')
        disconnect() // Do not attempt to reconnect for auth failure
      } else if (event.code === 4004) {
        setError('Room not found or access denied.')
        disconnect() // Do not attempt to reconnect for room access issues
      } else if (event.code !== 1000) {
        // Normal closure (1000) or client disconnect (handled by `disconnect()` call) should not trigger reconnects
        console.log(`WebSocket closed with code ${event.code}. Attempting reconnect...`)
        const delay = Math.min(
          RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current),
          MAX_RECONNECT_DELAY
        )
        reconnectAttempts.current += 1
        reconnectTimeoutRef.current = window.setTimeout(() => connect(), delay)
      } else {
        // Clean disconnect (code 1000)
        console.log('WebSocket disconnected normally.')
        disconnect()
      }
    }

    ws.onerror = (event) => {
      console.error('WebSocket error:', event)
      setError('WebSocket connection error.')
      // onerror usually precedes onclose, so onclose will handle reconnection logic
    }
  }, [roomId, accessToken, handleMessage, disconnect])

  useEffect(() => {
    // Connect when roomId or accessToken changes
    // This also handles initial connection and re-connection when navigating between rooms
    connect()
    // The disconnect function will be called on unmount or when dependencies change
    return () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.close(1000, 'Component unmounted or dependencies changed');
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
        setConnected(false);
        reconnectAttempts.current = 0;
    };
  }, [connect, roomId, accessToken]);

  return {
    connected,
    error,
    sendMessage,
    editMessage,
    deleteMessages,
    markAsRead,
    setTypingStatus,
    disconnect,
    reconnect: connect,
  }
}
