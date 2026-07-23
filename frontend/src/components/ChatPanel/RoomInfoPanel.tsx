import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import type { RoomDetail } from '../../lib/api'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/cn'
import { resolveMediaUrl } from '../../lib/api'

type PresenceMap = Record<string, { online: boolean; lastSeen?: string }>

type RoomInfoPanelProps = {
  isOpen: boolean
  onClose: () => void
  room: RoomDetail | null
  loading?: boolean
  currentUserId?: string | number | null
  onlinePresence: PresenceMap
}

function fullName(p: { first_name: string; last_name: string; username: string }) {
  const name = `${p.first_name} ${p.last_name}`.trim()
  return name || p.username
}

function formatLastSeen(lastSeen?: string) {
  if (!lastSeen) return 'Offline'
  const date = new Date(lastSeen)
  if (Number.isNaN(date.getTime())) return 'Offline'
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return 'last seen just now'
  if (diffMin < 60) return `last seen ${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `last seen ${diffHr}h ago`
  return `last seen ${date.toLocaleDateString()}`
}

export function RoomInfoPanel({ isOpen, onClose, room, loading, currentUserId, onlinePresence }: RoomInfoPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null
  const portalTarget = typeof document !== 'undefined' ? document.body : null
  if (!portalTarget) return null

  const isPv = room?.model === 1
  const otherParticipant = isPv
    ? room?.participants.find((p) => String(p.pk) !== String(currentUserId))
    : undefined
  const otherPresence = otherParticipant ? onlinePresence[String(otherParticipant.pk)] : undefined

  const title = loading
    ? 'Loading...'
    : isPv
      ? (otherParticipant ? fullName(otherParticipant) : 'Direct message')
      : (room?.name || 'Group')

  const subtitle = loading
    ? ''
    : isPv
      ? (otherPresence?.online ? 'Online' : formatLastSeen(otherPresence?.lastSeen))
      : room
        ? `${room.participants.length} member${room.participants.length === 1 ? '' : 's'}`
        : ''

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ zIndex: 99998 }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Room info"
        style={{ zIndex: 99999, position: 'fixed' }}
        className="animate-panel-in right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl shadow-black/70"
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            data-cursor="pointer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {isPv ? 'Contact Info' : 'Group Info'}
          </h2>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto">
          <div className="flex flex-col items-center gap-3 border-b border-[var(--border)] px-6 py-8">
           {(() => {
             const heroAvatarUrl = isPv
               ? resolveMediaUrl(otherParticipant?.avatar)
               : resolveMediaUrl(room?.profile)
             return heroAvatarUrl ? (
               <img
                 src={heroAvatarUrl}
                 alt={title}
                 className="h-24 w-24 rounded-full object-cover shadow-lg shadow-black/40 ring-4 ring-black/20"
               />
             ) : (
               <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-red-900 text-3xl font-bold text-white shadow-lg shadow-red-950/40 ring-4 ring-black/20">
                 {title.slice(0, 2).toUpperCase()}
               </div>
             )
           })()}
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
              {subtitle && (
                <p className={cn('text-sm', isPv && otherPresence?.online ? 'text-emerald-500' : 'text-[var(--text-muted)]')}>
                  {subtitle}
                </p>
              )}
              {isPv && otherParticipant?.username && (
                <p className="text-xs text-[var(--text-muted)]">@{otherParticipant.username}</p>
              )}
            </div>
          </div>

          {!isPv && room && (
            <div className="px-2 py-2">
              <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {room.participants.length} Member{room.participants.length === 1 ? '' : 's'}
              </p>
              <div className="flex flex-col">
                {room.participants.map((p) => {
                  const isCreator = String(p.pk) === String(room.creator)
                  const presence = onlinePresence[String(p.pk)]
                  return (
                    <div key={p.pk} className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.04]">
                       <Avatar label={fullName(p)} src={resolveMediaUrl(p.avatar)} online={presence?.online} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {fullName(p)}
                          {String(p.pk) === String(currentUserId) && (
                            <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">(You)</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {presence?.online ? 'online' : formatLastSeen(presence?.lastSeen)}
                        </p>
                      </div>
                      {isCreator && (
                        <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                          Creator
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    portalTarget,
  )
}