import { useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { MessageBubble, hasRealId } from './MessageBubble'
import { useChatStore, useActiveChat } from '../../hooks/useChatStore'
import type { Message } from '../../data/mockChats'
import type { ParticipantInfo } from '../../lib/participants'

type MessageListProps = {
  isRoomCreator?: boolean
  onEditMessage?: (id: string | number, text: string) => void
  onDeleteMessage?: (id: string | number) => void
  onJoinLink?: (link: string) => void
  participants?: Record<string, ParticipantInfo>
  currentUserId?: string | number | null
  // Called with the numeric ids of messages that just became visible on
  // screen and still need a read receipt sent. Omit/undefined to disable
  // (e.g. while the socket isn't connected).
  onMessagesRead?: (ids: number[]) => void
}

const READ_FLUSH_DELAY_MS = 500
const VISIBILITY_THRESHOLD = 0.6

function needsReadReceipt(
  m: Message,
  currentUserId: string | number | null | undefined,
  alreadyRequested: Set<string>,
) {
  if (currentUserId == null) return false
  if (!hasRealId(m.id)) return false
  if (String(m.senderId) === String(currentUserId)) return false
  if ((m.readBy || []).some((r) => r.userId === String(currentUserId))) return false
  if (alreadyRequested.has(String(m.id))) return false
  return true
}

export function MessageList({
  isRoomCreator = false,
  onEditMessage,
  onDeleteMessage,
  onJoinLink,
  participants = {},
  currentUserId = null,
  onMessagesRead,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const previousScrollHeight = useRef<number>(0)
  const isNearBottomRef = useRef<boolean>(true)
  const activeChatIdRef = useRef<string | null>(null)
  const hasDoneInitialScrollRef = useRef<boolean>(false)

  // --- Read-receipt observer ---
  const observerRef = useRef<IntersectionObserver | null>(null)
  const pendingReadIds = useRef<Set<number>>(new Set())
  const alreadyRequestedRef = useRef<Set<string>>(new Set())
  const flushTimeoutRef = useRef<number | null>(null)

  const { loadMessages } = useChatStore()
  const activeChat = useActiveChat()
  const messages = activeChat?.messages || []
  const hasMoreMessages = activeChat?.hasMoreMessages || false
  const currentPage = activeChat?.currentPage || 0
  const loadingMessages = activeChat?.loadingMessages || false

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) return
    flushTimeoutRef.current = window.setTimeout(() => {
      flushTimeoutRef.current = null
      const ids = Array.from(pendingReadIds.current)
      pendingReadIds.current.clear()
      if (ids.length === 0) return
      ids.forEach((id) => alreadyRequestedRef.current.add(String(id)))
      onMessagesRead?.(ids)
    }, READ_FLUSH_DELAY_MS)
  }, [onMessagesRead])

  // Set up the IntersectionObserver once the scroll container exists.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const idAttr = entry.target.getAttribute('data-message-id')
          if (!idAttr) return
          if (alreadyRequestedRef.current.has(idAttr)) return
          pendingReadIds.current.add(Number(idAttr))
          changed = true
          observer.unobserve(entry.target)
        })
        if (changed) scheduleFlush()
      },
      { root, threshold: VISIBILITY_THRESHOLD },
    )

    observerRef.current = observer
    return () => observer.disconnect()
  }, [scheduleFlush])

  const registerBubbleRef = useCallback(
    (m: Message) => (node: HTMLDivElement | null) => {
      if (!node || !observerRef.current) return
      if (needsReadReceipt(m, currentUserId, alreadyRequestedRef.current)) {
        observerRef.current.observe(node)
      }
    },
    [currentUserId],
  )

  // Reset scroll + read-tracking state whenever we switch chats
  useEffect(() => {
    if (activeChat?.id !== activeChatIdRef.current) {
      activeChatIdRef.current = activeChat?.id ?? null
      isNearBottomRef.current = true
      previousScrollHeight.current = 0
      hasDoneInitialScrollRef.current = false
    }
  }, [activeChat?.id])

  useLayoutEffect(() => {
    if (loadingMessages && scrollRef.current) {
      previousScrollHeight.current = scrollRef.current.scrollHeight
    }
  }, [loadingMessages])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || messages.length === 0) return

    if (previousScrollHeight.current > 0 && !loadingMessages) {
      const newScrollHeight = el.scrollHeight
      el.scrollTop += newScrollHeight - previousScrollHeight.current
      previousScrollHeight.current = 0
      return
    }

    if (!hasDoneInitialScrollRef.current) {
      el.scrollTop = el.scrollHeight
      hasDoneInitialScrollRef.current = true
      isNearBottomRef.current = true
      return
    }

    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loadingMessages])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100

    if (el.scrollTop < 50 && hasMoreMessages && !loadingMessages && activeChat?.id) {
      loadMessages(Number(activeChat.id), currentPage + 1)
    }
  }, [activeChat, currentPage, hasMoreMessages, loadingMessages, loadMessages])

  useEffect(() => {
    const el = scrollRef.current
    el?.addEventListener('scroll', handleScroll)
    return () => el?.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4" ref={scrollRef}>
      <div className="flex flex-col gap-3">
        {loadingMessages && <div className="text-center text-gray-500">Loading...</div>}
        {messages.map((m, i) => (
          <div key={m.id} ref={registerBubbleRef(m)} data-message-id={String(m.id)}>
            <MessageBubble
              message={m}
              animationIndex={i}
              isRoomCreator={isRoomCreator}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onJoinLink={onJoinLink}
              participants={participants}
              allMessages={messages}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}