
import type { Message } from '../../data/mockChats'
import { formatTime } from '../../lib/formatTime'
import { cn } from '../../lib/cn'
import { useAuthStore } from '../../hooks/useAuthStore'

type MessageBubbleProps = {
  message: Message
  animationIndex: number
}

export function MessageBubble({ message, animationIndex }: MessageBubbleProps) {
  const userId = useAuthStore((s) => s.user?.id)
  const isMe = userId != null && String(message.senderId) === String(userId)

  const displayName = message.senderName
    || (message.senderFirstName && message.senderLastName
      ? `${message.senderFirstName} ${message.senderLastName}`.trim()
      : message.senderUsername)
    || 'User'  

  return (
    <div
      className={cn(
        'flex w-full animate-message',
        isMe ? 'justify-end' : 'justify-start'
      )}
      style={{ animationDelay: `${Math.min(animationIndex * 40, 200)}ms` }}
    >
      <div className={cn('max-w-[70%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
        {!isMe && (
          <p className="mb-0.5 px-1 text-[11px] font-medium text-[var(--text-muted)]">
            {displayName}
          </p>
        )}
        <div
          className={cn(
            'px-3.5 py-2 text-sm leading-relaxed text-[var(--text-primary)]',
            isMe
              ? 'rounded-2xl rounded-br-sm bg-gradient-to-br from-[var(--accent)] to-red-800 shadow-lg shadow-red-950/40'
              : 'rounded-2xl rounded-bl-sm bg-[var(--bg-elevated)] ring-1 ring-[var(--border)]'
          )}
        >
          {message.text}
        </div>
        <p
          className={cn(
            'mt-1 px-1 text-[10px] text-[var(--text-muted)] flex items-center gap-1',
            isMe ? 'justify-end' : 'justify-start'
          )}
        >
          {isMe && <span className="text-[var(--accent)]">✓</span>}
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  )
}
