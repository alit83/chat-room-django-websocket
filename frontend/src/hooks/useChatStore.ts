import { create } from 'zustand'
import { initialChats, type Chat, type Message } from '../data/mockChats'
import { roomsApi, messagesApi } from '../lib/api'

type ChatStore = {
  chats: Chat[]
  activeChatId: string | null
  searchQuery: string
  loading: boolean
  setChats: (chats: Chat[]) => void
  setActiveChatId: (id: string | null) => void
  setSearchQuery: (q: string) => void
  setLoading: (loading: boolean) => void
  addMessage: (message: Message) => void
  updateMessage: (id: string | number, updates: Partial<Message>) => void
  deleteMessages: (ids: (string | number)[]) => void
  markMessagesAsRead: (ids: (string | number)[]) => void
  setTyping: (userId: string | number, isTyping: boolean) => void
  setUserPresence: (userId: string | number, isOnline: boolean, lastSeen?: string) => void
  addOptimisticMessage: (message: Message) => void
  confirmOptimisticMessage: (tempId: number) => void
  removeOptimisticMessage: (tempId: number) => void
  selectChat: (id: string) => void
  clearActiveChat: () => void
  loadRooms: () => Promise<void>
  loadMessages: (roomId: number) => Promise<void>
}

function mapRoomToChat(room: Record<string, unknown>): Chat {
  const profile = room.profile || null
  const name = (room.name as string) || (profile ? `${(profile as Record<string, string>).first_name} ${(profile as Record<string, string>).last_name}`.trim() : 'Unknown')
  const avatar = (profile as Record<string, string>)?.avatar ? '👤' : name.slice(0, 2).toUpperCase()
  const online = (room.participants as Array<Record<string, unknown>>)?.some((p) => p.online) ?? false

  return {
    id: String(room.id),
    user: {
      id: String(room.id),
      name,
      avatar,
      online,
    },
    messages: [],
    lastMessage: '',
    lastMessageAt: 0,
    unread: 0,
    typingUsers: [],
  }
}

function mapMessageToMessage(msg: Record<string, unknown>): Message {
  return {
    id: (msg.id as string | number) || (msg.message_id as string | number),
    text: (msg.text as string) || (msg.message as string),
    senderId: String((msg.sender.pk as number | string) || (msg.sender as Record<string, string | number>)?.id),
    senderName: (msg.sender as Record<string, string>)?.first_name
      ? `${(msg.sender as Record<string, string>).first_name} ${(msg.sender as Record<string, string>).last_name}`.trim()
      : undefined,
    timestamp: new Date(msg.created_date as string).getTime(),
    room: (msg.room as number) || (msg.room_id as number),
    created_date: msg.created_date as string,
    updated_date: (msg.updated_date as string) || (msg.created_date as string),
    read: msg.read as boolean | undefined,
  }
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: initialChats,
  activeChatId: null,
  searchQuery: '',
  loading: false,
  setChats: (chats) => set({ chats }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (loading) => set({ loading }),
  addMessage: (message) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === message.room.toString()
          ? {
              ...c,
              messages: [...c.messages.filter((m) => m.id !== message.id), message],
              lastMessage: message.text,
              lastMessageAt: new Date(message.created_date).getTime(),
              unread: c.id === state.activeChatId ? c.unread : c.unread + 1,
            }
          : c,
      ),
    })),
  updateMessage: (id, updates) =>
    set((state) => ({
      chats: state.chats.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === id ? { ...m, ...updates } : m,
        ),
      })),
    })),
  deleteMessages: (ids) =>
    set((state) => {
      const idSet = new Set(ids.map(String))
      return {
        chats: state.chats.map((c) => ({
          ...c,
          messages: c.messages.filter((m) => !idSet.has(String(m.id))),
        })),
      }
    }),
  markMessagesAsRead: (ids) =>
    set((state) => {
      const idSet = new Set(ids.map(String))
      return {
        chats: state.chats.map((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            idSet.has(String(m.id)) ? { ...m, read: true } : m,
          ),
          unread: 0,
        })),
      }
    }),
  setTyping: (userId, isTyping) =>
    set((state) => ({
      chats: state.chats.map((c) => ({
        ...c,
        typingUsers: isTyping
          ? [...new Set([...(c.typingUsers || []), userId])]
          : (c.typingUsers || []).filter((id) => id !== userId),
      })),
    })),
  setUserPresence: (userId, isOnline) =>
    set((state) => ({
      chats: state.chats.map((c) => ({
        ...c,
        user:
          c.user.id === String(userId)
            ? { ...c.user, online: isOnline }
            : c.user,
      })),
    })),
  addOptimisticMessage: (message) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === message.room.toString()
          ? {
              ...c,
              messages: [...c.messages, message],
              lastMessage: message.text,
              lastMessageAt: new Date(message.created_date).getTime(),
            }
          : c,
      ),
    })),
  confirmOptimisticMessage: () => {},
  removeOptimisticMessage: (tempId) =>
    set((state) => ({
      chats: state.chats.map((c) => ({
        ...c,
        messages: c.messages.filter((m) => m.id !== tempId),
      })),
    })),
  selectChat: (id) =>
    set((state) => ({
      activeChatId: id,
      chats: state.chats.map((c) =>
        c.id === id ? { ...c, unread: 0 } : c,
      ),
    })),
  clearActiveChat: () => set({ activeChatId: null }),

  // Load rooms from API
  loadRooms: async () => {
    set({ loading: true })
    try {
      const rooms = await roomsApi.list()
      const chats = rooms.map(mapRoomToChat)
      set({ chats, loading: false })
    } catch {
      set({ chats: initialChats, loading: false })
    }
  },
  loadMessages: async (roomId: number) => {
    try {
      const data = await messagesApi.list(roomId)
      const messages = (data.results || []).map(mapMessageToMessage)
      set((state) => ({
        chats: state.chats.map((c) =>
          c.id === String(roomId)
            ? {
                ...c,
                messages,
                lastMessage: messages[messages.length - 1]?.text || '',
                lastMessageAt: messages[messages.length - 1]
                  ? new Date(messages[messages.length - 1].created_date).getTime()
                  : 0,
              }
            : c,
        ),
      }))
    } catch {
      // Keep mock messages on error
    }
  },
}))

// Derived selectors
export const useFilteredChats = () => {
  const { chats, searchQuery } = useChatStore()
  const q = searchQuery.trim().toLowerCase()
  if (!q) return chats
  return chats.filter(
    (c) =>
      c.user.name.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q),
  )
}

export const useActiveChat = () => {
  const { chats, activeChatId } = useChatStore()
  return chats.find((c) => c.id === activeChatId) ?? null
}