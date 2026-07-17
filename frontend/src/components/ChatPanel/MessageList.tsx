import { useEffect, useRef, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { useChatStore, useActiveChat } from '../../hooks/useChatStore'

export function MessageList() {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const previousScrollHeight = useRef<number | null>(null)
  const { loadMessages } = useChatStore()
  const activeChat = useActiveChat()
  const messages = activeChat?.messages || []
  const hasMoreMessages = activeChat?.hasMoreMessages || false
  const currentPage = activeChat?.currentPage || 0
  const loadingMessages = activeChat?.loadingMessages || false

  // Scroll to bottom when new messages arrive (if it's the first page or a new message from input)
  useEffect(() => {
    if (currentPage === 1) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else if (scrollRef.current && previousScrollHeight.current !== null) {
      // Adjust scroll position to maintain view when prepending messages
      const newScrollHeight = scrollRef.current.scrollHeight
      scrollRef.current.scrollTop += newScrollHeight - previousScrollHeight.current
    }
  }, [messages, currentPage])

  // Capture scroll height before potential re-render
  useEffect(() => {
    if (scrollRef.current && loadingMessages) {
      previousScrollHeight.current = scrollRef.current.scrollHeight
    }
  }, [loadingMessages])

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current
      if (scrollTop === 0 && hasMoreMessages && !loadingMessages && activeChat?.id) {
        loadMessages(Number(activeChat.id), currentPage + 1)
      }
    }
  }, [activeChat, currentPage, hasMoreMessages, loadingMessages, loadMessages])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll)
      return () => scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4" ref={scrollRef}>
      <div className="flex flex-col gap-3">
        {loadingMessages && <div className="text-center text-gray-500">Loading more messages...</div>}
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            animationIndex={index}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
