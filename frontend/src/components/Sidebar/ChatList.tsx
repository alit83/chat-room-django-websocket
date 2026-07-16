import type { Chat } from '../../data/mockChats'
import { ChatListItem } from './ChatListItem'

type ChatListProps = {
  chats: Chat[]
  activeChatId: string | null
  onSelect: (id: string) => void
}

export function ChatList({ chats, activeChatId, onSelect }: ChatListProps) {
  if (chats.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-[var(--text-muted)]">
        No chats found
      </div>
    )
  }

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto">
      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === activeChatId}
          onSelect={() => onSelect(chat.id)}
        />
      ))}
    </div>
  )
}
