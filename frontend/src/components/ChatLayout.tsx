import { useState, useEffect } from 'react'
import { useChatStore, useFilteredChats, useActiveChat } from '../hooks/useChatStore'
import { useAuthStore } from '../hooks/useAuthStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { SearchBar } from './Sidebar/SearchBar'
import { ChatList } from './Sidebar/ChatList'
import { ChatHeader } from './ChatPanel/ChatHeader'
import { MessageList } from './ChatPanel/MessageList'
import { MessageInput } from './ChatPanel/MessageInput'
import { cn } from '../lib/cn'

export function ChatLayout() {
  const { searchQuery, setSearchQuery, activeChatId, selectChat, clearActiveChat, loadRooms, loadMessages, loading } = useChatStore()
  const filteredChats = useFilteredChats()
  const activeChat = useActiveChat()
  const { token } = useAuthStore()
  const { sendMessage, setTypingStatus, connected, error } = useWebSocket(activeChatId ? Number(activeChatId) : null)

  const [isTyping, setIsTyping] = useState(false)
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

  const handleSend = (text: string) => {
    sendMessage(text)
  }

  const handleTyping = (focused: boolean) => {
    setIsTyping(focused)
    setTypingStatus(focused)
  }

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
              isTyping={isTyping}
            />
            <MessageList />
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