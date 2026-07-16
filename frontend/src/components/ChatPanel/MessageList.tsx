import { useEffect, useRef } from 'react'
import type { Message } from '../../data/mockChats'
import { MessageBubble } from './MessageBubble'

type MessageListProps = {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-3">
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
