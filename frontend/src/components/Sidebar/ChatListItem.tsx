import type { Chat } from '../../data/mockChats'
import { formatListTime } from '../../lib/formatTime'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'

type ChatListItemProps = {
  chat: Chat
  isActive: boolean
  onSelect: () => void
}

export function ChatListItem({ chat, isActive, onSelect }: ChatListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-cursor="pointer"
      className={cn(
        'relative flex w-full items-center gap-3 border-b border-[var(--border)] px-3 py-3 text-left transition-all duration-200 hover:translate-x-1 hover:bg-[var(--bg-elevated)]',
        isActive && 'bg-red-950/30',
      )}
    >
      {isActive && (
        <span className="animate-active-border absolute left-0 top-0 h-full w-1 origin-top rounded-r bg-[var(--accent)]" />
      )}
      <Avatar label={chat.user.avatar} src={chat.user.avatarSrc} online={chat.user.online} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-[var(--text-primary)]">
            {chat.user.name}
          </span>
          <span className="shrink-0 text-xs text-[var(--text-muted)]">
            {formatListTime(chat.lastMessageAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-sm text-[var(--text-muted)]">
            {chat.lastMessage}
          </p>
          <Badge count={chat.unread} />
        </div>
      </div>
    </button>
  )
}
