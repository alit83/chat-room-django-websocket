import { create } from 'zustand'
import { initialChats, type Chat, type Message } from '../data/mockChats'
import { roomsApi, messagesApi } from '../lib/api'

type ChatWithPagination = Chat & {
  currentPage: number
  hasMoreMessages: boolean
  loadingMessages: boolean
}

type ChatStore = {
  chats: ChatWithPagination[]
  activeChatId: string | null
  searchQuery: string
  loading: boolean
  setChats: (chats: ChatWithPagination[]) => void
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
  confirmOptimisticMessage: (tempId: string | number, confirmedMessage: Message) => void
  removeOptimisticMessage: (tempId: number) => void
  selectChat: (id: string) => void
  clearActiveChat: () => void
  loadRooms: () => Promise<void>
  loadMessages: (roomId: number, page?: number, pageSize?: number) => Promise<void>
}

function mapRoomToChat(room: Record<string, unknown>): ChatWithPagination {
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
    creatorId: room.creator != null ? String(room.creator) : undefined,
    currentPage: 0,
    hasMoreMessages: true,
    loadingMessages: false,
  }
}

// useChatStore.ts
function mapMessageToMessage(msg: Record<string, unknown>): Message {
  const sender = msg.sender as Record<string, string | number> | undefined
  const createdDate = msg.created_date as string
  const room = (msg.room as number) || (msg.room_id as number)
  const senderPk = sender?.pk ?? sender?.id

  return {
    // No stable id from the API — derive a unique key from room + sender + timestamp.
    id: (msg.pk as string | number)
     ?? (msg.id as string | number)
     ?? (msg.message_id as string | number)
     ?? `${room}-${senderPk}-${createdDate}`,
    text: (msg.text as string) || (msg.message as string),
    senderId: String(senderPk),
    senderUsername: sender?.username as string | undefined,
    senderFirstName: sender?.first_name as string | undefined,
    senderLastName: sender?.last_name as string | undefined,
    senderName: sender?.first_name
      ? `${sender.first_name} ${sender.last_name}`.toString().trim()
      : (sender?.username as string | undefined),
    timestamp: new Date(createdDate).getTime(),
    room,
    created_date: createdDate,
    updated_date: (msg.updated_date as string) || createdDate,
    read: msg.read as boolean | undefined,
  }
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: initialChats.map(chat => ({
    ...chat,
    currentPage: 0,
    hasMoreMessages: true,
    loadingMessages: false,
  })),
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
  confirmOptimisticMessage: (tempId, confirmedMessage) =>
    set((state) => ({
     chats: state.chats.map((c) => ({
       ...c,
       messages: c.messages.map((m) =>
         m.id === tempId ? { ...confirmedMessage, id: confirmedMessage.id } : m,
       ),
     })),
   })),
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

  loadRooms: async () => {
    set({ loading: true })
    try {
      const rooms = await roomsApi.list()
      const chats: ChatWithPagination[] = rooms.map(room => ({
        ...mapRoomToChat(room),
        currentPage: 0,
        hasMoreMessages: true,
        loadingMessages: false,
      }))
      set({ chats, loading: false })
    } catch (error) {
      console.error('Failed to load rooms:', error)
      set({ loading: false })
    }
  },
  loadMessages: async (roomId: number, page = 1, pageSize = 20) => {
  set((state) => ({
    chats: state.chats.map((c) =>
      c.id === String(roomId) ? { ...c, loadingMessages: true } : c
    ),
  }))

  try {
    const data = await messagesApi.list(roomId, page, pageSize)
    console.log('RAW MESSAGE RESULT:', data.results?.[0])

    const messages = (data.results || []).map(mapMessageToMessage)

    set((state) => ({
      chats: state.chats.map((c) => {
        if (c.id !== String(roomId)) return c

        // Safe merge: union by id (never drops anything), then always
        // sort by timestamp so display order doesn't depend on how
        // the backend orders any given page.
        const combined = page === 1 ? messages : [...messages, ...c.messages]
        const byId = new Map(combined.map((m) => [m.id, m]))
        const sortedMessages = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp)

        return {
          ...c,
          messages: sortedMessages,
          currentPage: page,
          hasMoreMessages: messages.length === pageSize,
          loadingMessages: false,
          lastMessage: sortedMessages[sortedMessages.length - 1]?.text || c.lastMessage,
          lastMessageAt: sortedMessages[sortedMessages.length - 1]
            ? sortedMessages[sortedMessages.length - 1].timestamp
            : c.lastMessageAt,
        }
      }),
    }))
  } catch (error) {
    console.error(`Failed to load messages for room ${roomId}:`, error)
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === String(roomId) ? { ...c, loadingMessages: false } : c
      ),
    }))
  }
},
}))

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
