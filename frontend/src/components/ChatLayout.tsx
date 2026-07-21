import { useState, useEffect, useMemo } from 'react'
import { resolveParticipantName, type ParticipantInfo } from '../lib/participants'
import { useChatStore, useFilteredChats, useActiveChat } from '../hooks/useChatStore'
import { useAuthStore } from '../hooks/useAuthStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { roomsApi } from '../lib/api'
import { SearchBar } from './Sidebar/SearchBar'
import { ChatList } from './Sidebar/ChatList'
import { ChatHeader } from './ChatPanel/ChatHeader'
import { MessageList } from './ChatPanel/MessageList'
import { MessageInput } from './ChatPanel/MessageInput'
import { cn } from '../lib/cn'
import { useNotificationSocket } from '../hooks/useNotificationSocket'






export function ChatLayout() {
  const { searchQuery, setSearchQuery, activeChatId, selectChat, clearActiveChat, loadRooms, loadMessages, loading } = useChatStore()
  const filteredChats = useFilteredChats()
  const activeChat = useActiveChat()
  const { token, user } = useAuthStore()
  useNotificationSocket()
  const { sendMessage, editMessage, deleteMessages, markAsRead, setTypingStatus, connected, error } = useWebSocket(activeChatId ? Number(activeChatId) : null)

  const [participantsByRoom, setParticipantsByRoom] = useState<Record<string, Record<string, ParticipantInfo>>>({})
  const showChatOnMobile = !!activeChatId

  // Load rooms on mount
  useEffect(() => {
    if (token) {
      loadRooms()
    }
  }, [token, loadRooms])

  // Load messages when selecting a room
  useEffect(() => {
    if (activeChatId && token) {
      loadMessages(Number(activeChatId))
    }
  }, [activeChatId, token, loadMessages])
  // Fetch participant names once per room, so typing indicators can show a
  // name even before that participant has sent any message this session.
  useEffect(() => {
    if (!activeChatId || !token || participantsByRoom[activeChatId]) return
    roomsApi.detail(Number(activeChatId))
      .then((detail) => {
        const map: Record<string, ParticipantInfo> = {}
        detail.participants.forEach((p) => {
          map[String(p.pk)] = { firstName: p.first_name, lastName: p.last_name, username: p.username }
        })
        setParticipantsByRoom((prev) => ({ ...prev, [activeChatId]: map }))
      })
      .catch((err) => console.error('Failed to load room participants:', err))
  }, [activeChatId, token, participantsByRoom])



 const handleSend = (text: string) => {
    sendMessage(text)
  }

 const isRoomCreator = !!(
   activeChat?.creatorId &&
   user?.id != null &&
   String(activeChat.creatorId) === String(user.id)
 )

 const handleEditMessage = (id: string | number, text: string) => {
   editMessage(Number(id), text)
 }

 const handleDeleteMessage = (id: string | number) => {
   deleteMessages([Number(id)])
 }

  const handleTyping = (focused: boolean) => {
   setTypingStatus(focused)
  }

  const typingNames = useMemo(() => {
    if (!activeChat?.typingUsers?.length) return []
    const roomParticipants = participantsByRoom[activeChat.id] || {}
    return activeChat.typingUsers
      .filter((uid) => user?.id == null || String(uid) !== String(user.id))
      .map((uid) => resolveParticipantName(uid, roomParticipants, activeChat.messages))
  }, [activeChat?.typingUsers, activeChat?.messages, activeChat?.id, participantsByRoom, user?.id])
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex w-full shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] md:w-80',
          'transition-transform duration-300 ease-out md:translate-x-0',
          showChatOnMobile
            ? 'absolute inset-0 z-10 -translate-x-full md:relative md:z-auto'
            : 'relative translate-x-0',
        )}
      >
        <div className="border-b border-[var(--border)] px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-[var(--text-primary)]">Chat</span>
              <span className="text-[var(--accent)]">Room</span>
            </h1>
            <button
              onClick={() => useAuthStore.getState().clearAuth()}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              Logout
            </button>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Messages · Black & Red
          </p>
          {!connected && activeChatId && (
            <p className="mt-1 text-xs text-yellow-500">
              {error || 'Connecting...'}
            </p>
          )}
        </div>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[var(--text-muted)]">Loading rooms...</p>
          </div>
        ) : (
          <ChatList
            chats={filteredChats}
            activeChatId={activeChatId}
            onSelect={selectChat}
          />
        )}
      </aside>

      {/* Main panel */}
      <main
        className={cn(
          'flex min-w-0 flex-1 flex-col bg-[var(--bg-primary)]',
          'transition-transform duration-300 ease-out',
          !showChatOnMobile && 'absolute inset-0 translate-x-full md:relative md:translate-x-0',
          showChatOnMobile && 'relative translate-x-0',
        )}
      >
        {activeChat ? (
          <>
            <ChatHeader
              user={activeChat.user}
              showBack
              onBack={clearActiveChat}
              typingNames={typingNames}
            />
             <MessageList
              isRoomCreator={isRoomCreator}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              participants={participantsByRoom[activeChat.id] || {}}
              currentUserId={user?.id ?? null}
             onMessagesRead={connected ? markAsRead : undefined}
           />
            <MessageInput
              onSend={handleSend}
              onFocusChange={handleTyping}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="animate-glow relative">
              <div className="absolute inset-0 rounded-full bg-[var(--accent)] opacity-20 blur-2xl" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]">
                <svg
                  className="h-12 w-12 text-[var(--accent)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Select a chat
              </h2>
              <p className="mt-1 max-w-xs text-sm text-[var(--text-muted)]">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}