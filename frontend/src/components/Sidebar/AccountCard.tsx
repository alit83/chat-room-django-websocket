import { Avatar } from '../ui/Avatar'

type AccountCardProps = {
  name: string
  username?: string
  avatarLabel: string
  avatarSrc?: string | null
  onEditProfile: () => void
  onLogout: () => void
}

export function AccountCard({ name, username, avatarLabel, avatarSrc, onEditProfile, onLogout }: AccountCardProps) {

  return (
    <div className="flex items-center gap-3 border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
      <Avatar label={avatarLabel} src={avatarSrc} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{name}</p>
        {username && <p className="truncate text-xs text-[var(--text-muted)]">@{username}</p>}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEditProfile}
          data-cursor="pointer"
          aria-label="Edit profile"
          title="Edit profile"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onLogout}
          data-cursor="pointer"
          aria-label="Log out"
          title="Log out"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-red-950/40 hover:text-[var(--accent)]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  )
}