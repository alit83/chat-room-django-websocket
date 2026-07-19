import { useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { useChatStore, useActiveChat } from '../../hooks/useChatStore'

type MessageListProps = {
  canDeleteMessages?: boolean
  onEditMessage?: (id: string | number, text: string) => void
  onDeleteMessage?: (id: string | number) => void
}

export function MessageList({ canDeleteMessages = false, onEditMessage, onDeleteMessage }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const previousScrollHeight = useRef<number>(0)
  const isNearBottomRef = useRef<boolean>(true)
  const activeChatIdRef = useRef<string | null>(null)
  const hasDoneInitialScrollRef = useRef<boolean>(false)

  const { loadMessages } = useChatStore()
  const activeChat = useActiveChat()
  const messages = activeChat?.messages || []
  const hasMoreMessages = activeChat?.hasMoreMessages || false
  const currentPage = activeChat?.currentPage || 0
  const loadingMessages = activeChat?.loadingMessages || false

  // Reset scroll state whenever we switch chats
  useEffect(() => {
    if (activeChat?.id !== activeChatIdRef.current) {
      activeChatIdRef.current = activeChat?.id ?? null
      isNearBottomRef.current = true
      previousScrollHeight.current = 0
      hasDoneInitialScrollRef.current = false
    }
  }, [activeChat?.id])

  // Snapshot scroll height before an older page gets prepended
  useLayoutEffect(() => {
    if (loadingMessages && scrollRef.current) {
      previousScrollHeight.current = scrollRef.current.scrollHeight
    }
  }, [loadingMessages])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || messages.length === 0) return

    // Case 1: we just loaded an older page (pagination) — keep the view
    // anchored on the same message instead of jumping.
    if (previousScrollHeight.current > 0 && !loadingMessages) {
      const newScrollHeight = el.scrollHeight
      el.scrollTop += newScrollHeight - previousScrollHeight.current
      previousScrollHeight.current = 0
      return
    }

    // Case 2: first time this chat's messages have rendered — jump straight
    // to the bottom instantly (no animation), so there's no race with layout.
    if (!hasDoneInitialScrollRef.current) {
      el.scrollTop = el.scrollHeight
      hasDoneInitialScrollRef.current = true
      isNearBottomRef.current = true
      return
    }

    // Case 3: a new message arrived while already near the bottom — smooth
    // scroll down to reveal it. If the user has scrolled up to read history,
    // leave the view alone.
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
          <MessageBubble
            key={m.id}
            message={m}
            animationIndex={i}
            canDelete={canDeleteMessages}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}