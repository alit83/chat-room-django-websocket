import type { User } from '../../data/mockChats'
import { Avatar } from '../ui/Avatar'

type ChatHeaderProps = {
  user: User
  showBack?: boolean
  onBack?: () => void
  typingNames?: string[]
}

function formatTypingLabel(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing`
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`
  const [first, second, ...rest] = names
  return `${first}, ${second} and ${rest.length} other${rest.length > 1 ? 's' : ''} are typing`
}

export function ChatHeader({
  user,
  showBack,
  onBack,
  typingNames = [],
}: ChatHeaderProps) {
  const isTyping = typingNames.length > 0
  return (
    <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          data-cursor="pointer"
          aria-label="Back to chats"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)] md:hidden"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <Avatar label={user.avatar} online={user.online} size="lg" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-semibold text-[var(--text-primary)]">
          {user.name}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          {isTyping ? (
            <span className="inline-flex items-center gap-1 text-[var(--accent)]">
              {formatTypingLabel(typingNames)}
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block h-1 w-1 animate-bounce rounded-full bg-[var(--accent)]"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
            </span>
          ) : user.online ? (
            <span className="text-emerald-500">Online</span>
          ) : (
            'Last seen recently'
          )}
        </p>
      </div>
    </header>
  )
}
