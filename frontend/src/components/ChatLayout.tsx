import { useState, useEffect, useMemo } from 'react'
import { RoomInfoPanel } from './ChatPanel/RoomInfoPanel'
import { resolveParticipantName, type ParticipantInfo } from '../lib/participants'
import { useChatStore, useFilteredChats, useActiveChat } from '../hooks/useChatStore'
import { useAuthStore } from '../hooks/useAuthStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { roomsApi, resolveMediaUrl } from '../lib/api'
import { SearchBar } from './Sidebar/SearchBar'
import { ChatList } from './Sidebar/ChatList'
import { ChatHeader } from './ChatPanel/ChatHeader'
import { MessageList } from './ChatPanel/MessageList'
import { MessageInput } from './ChatPanel/MessageInput'
import { cn } from '../lib/cn'
import { useNotificationSocket } from '../hooks/useNotificationSocket'
import { AccountCard } from './Sidebar/AccountCard'
import { ProfileEditModal } from './Sidebar/ProfileEditModal'
import type { RoomDetail, RoomItem } from '../lib/api'
import { GroupEditModal } from './ChatPanel/GroupEditModal'
import { CreateGroupModal } from './Sidebar/CreateGroupModal'





export function ChatLayout() {
  const { searchQuery, setSearchQuery, activeChatId, selectChat, clearActiveChat, loadRooms, loadMessages, loading } = useChatStore()
  const filteredChats = useFilteredChats()
  const activeChat = useActiveChat()
  const { token, user } = useAuthStore()
  useNotificationSocket()
  const { sendMessage, editMessage, deleteMessages, markAsRead, setTypingStatus, connected, error } = useWebSocket(activeChatId ? Number(activeChatId) : null)

  const [roomDetailsById, setRoomDetailsById] = useState<Record<string, RoomDetail>>({})
  const [isRoomInfoOpen, setIsRoomInfoOpen] = useState(false)
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false)
  const [isGroupEditOpen, setIsGroupEditOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const onlinePresence = useChatStore((s) => s.onlinePresence)
  const updateChatMeta = useChatStore((s) => s.updateChatMeta)
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
    if (!activeChatId || !token || roomDetailsById[activeChatId]) return
    roomsApi.detail(Number(activeChatId))
      .then((detail) => {
        
        setRoomDetailsById((prev) => ({ ...prev, [activeChatId]: detail }))
      })
      .catch((err) => console.error('Failed to load room participants:', err))
   }, [activeChatId, token, roomDetailsById])

  // Flattened name lookup, derived from the cached room detail — same shape
  // typing/read-receipt resolution already expects.
  const participants = useMemo(() => {
    const detail = activeChat ? roomDetailsById[activeChat.id] : undefined
    if (!detail) return {}
    const map: Record<string, ParticipantInfo> = {}
    detail.participants.forEach((p) => {
      map[String(p.pk)] = { firstName: p.first_name, lastName: p.last_name, username: p.username }
    })
    return map
 }, [activeChat?.id, roomDetailsById])

   // After you edit your own profile, patch every cached room's participant
 // list so RoomInfoPanel/typing/header reflect it immediately, without
 // needing to refetch. This only updates YOUR local view — other users
 // won't see it live until they reopen the room (no backend broadcast
 // exists for profile changes yet).
 const handleProfileSaved = (updated: { pk: number; first_name: string; last_name: string; gender: number | null; avatar: string | null }) => {
   setRoomDetailsById((prev) => {
     const next: typeof prev = {}
     for (const [roomId, detail] of Object.entries(prev)) {
       next[roomId] = {
         ...detail,
         participants: detail.participants.map((p) =>
           p.pk === updated.pk
             ? { ...p, first_name: updated.first_name, last_name: updated.last_name, gender: updated.gender, avatar: updated.avatar }
             : p,
         ),
       }
     }
     return next
   })
 }

 const activeRoomDetail = activeChat ? roomDetailsById[activeChat.id] : undefined
 const headerAvatarUrl = activeRoomDetail
   ? (activeRoomDetail.model === 1
       ? resolveMediaUrl(activeRoomDetail.participants.find((p) => String(p.pk) !== String(user?.id))?.avatar)
       : resolveMediaUrl(activeRoomDetail.profile))
   : null

 const currentUserName = user
   ? (`${user.first_name} ${user.last_name}`.trim() || user.username)
   : ''

 const handleLogout = () => {
   useAuthStore.getState().clearAuth()
 }
 const handleGroupCreated = async (created: RoomItem) => {
   await loadRooms()
   selectChat(String(created.id))
 }
 const handleGroupSaved = (updated: RoomItem) => {
   if (!activeChat) return
   setRoomDetailsById((prev) => {
     const existing = prev[activeChat.id]
     if (!existing) return prev
     return { ...prev, [activeChat.id]: { ...existing, name: updated.name, link: updated.link, profile: updated.profile } }
   })
   updateChatMeta(Number(activeChat.id), {
     name: updated.name || undefined,
     avatarLabel: (updated.name || '').slice(0, 2).toUpperCase(),
   })
 }
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
    return activeChat.typingUsers
      .filter((uid) => user?.id == null || String(uid) !== String(user.id))
      .map((uid) => resolveParticipantName(uid, participants, activeChat.messages))
   }, [activeChat?.typingUsers, activeChat?.messages, activeChat?.id, participants, user?.id])
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
             type="button"
             onClick={() => setIsCreateGroupOpen(true)}
             data-cursor="pointer"
             aria-label="Create group"
             title="Create group"
             className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--accent)]"
           >
             <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
             </svg>
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
        {user && (
          <AccountCard
            name={currentUserName}
            username={user.username}
            avatarSrc={resolveMediaUrl(user.avatar)}
            avatarLabel={currentUserName}
            onEditProfile={() => setIsProfileEditOpen(true)}
            onLogout={handleLogout}
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
              onOpenInfo={() => setIsRoomInfoOpen(true)}
              avatarSrc={headerAvatarUrl}
            />
            <RoomInfoPanel
             isOpen={isRoomInfoOpen}
             onClose={() => setIsRoomInfoOpen(false)}
             room={activeChat ? roomDetailsById[activeChat.id] ?? null : null}
             loading={!!activeChat && !roomDetailsById[activeChat.id]}
             currentUserId={user?.id ?? null}
             onlinePresence={onlinePresence}
             onEditGroup={() => setIsGroupEditOpen(true)}
             />
             <MessageList
              isRoomCreator={isRoomCreator}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              participants={participants}
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
      <ProfileEditModal
       isOpen={isProfileEditOpen}
       onClose={() => setIsProfileEditOpen(false)}
       onSaved={handleProfileSaved}
     />
      <GroupEditModal
       isOpen={isGroupEditOpen}
       onClose={() => setIsGroupEditOpen(false)}
       room={activeChat ? roomDetailsById[activeChat.id] ?? null : null}
       onSaved={handleGroupSaved}
     />
     <CreateGroupModal
       isOpen={isCreateGroupOpen}
       onClose={() => setIsCreateGroupOpen(false)}
       onCreated={handleGroupCreated}
     />
    </div>
  )
}