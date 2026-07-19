import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type MessageContextMenuProps = {
  x: number
  y: number
  onClose: () => void
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
  disabledReason?: string
}

export function MessageContextMenu({
  x,
  y,
  onClose,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  disabledReason,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: y, left: x, ready: false })

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const { innerWidth, innerHeight } = window
    const rect = el.getBoundingClientRect()
    const padding = 8
    let left = x
    let top = y
    if (left + rect.width + padding > innerWidth) left = innerWidth - rect.width - padding
    if (top + rect.height + padding > innerHeight) top = innerHeight - rect.height - padding
    setPosition({ top: Math.max(padding, top), left: Math.max(padding, left), ready: true })
  }, [x, y])

  // Only Escape/scroll close via listeners now — outside-click closing is
  // handled by a backdrop element instead (see below), which avoids any
  // race between "click landed on the menu" and "click closed the menu."
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  const hasActions = canEdit || canDelete
  const portalTarget = typeof document !== 'undefined' ? document.body : null
  if (!portalTarget) return null

  // Pop the menu outward from whichever corner it's anchored to, so it never
  // feels like it's sliding in from a random direction.
  const originX = position.left < x ? 'right' : 'left'
  const originY = position.top < y ? 'bottom' : 'top'

  return createPortal(
    <>
      {/* Invisible backdrop: any click here closes the menu. Sits below the
          menu in z-index, so clicks on the menu itself never reach it. */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 99998 }}
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose() }}
      />
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          opacity: position.ready ? 1 : 0,
          zIndex: 99999,
          transformOrigin: `${originY} ${originX}`,
        }}
        className="animate-menu-in w-48 overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-elevated)]/95 shadow-2xl shadow-black/70 ring-1 ring-black/50 backdrop-blur-xl"
      >
        {hasActions ? (
          <div className="p-1.5">
            {canEdit && (
              <button
                type="button"
                role="menuitem"
                onClick={() => { onEdit(); onClose() }}
                data-cursor="pointer"
                className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-white/[0.06]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[var(--text-muted)] transition-colors group-hover:bg-white/10 group-hover:text-[var(--text-primary)]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828z" />
                  </svg>
                </span>
                Edit message
              </button>
            )}
            {canEdit && canDelete && (
              <div className="my-1 h-px bg-white/[0.06]" />
            )}
            {canDelete && (
              <button
                type="button"
                role="menuitem"
                onClick={() => { onDelete(); onClose() }}
                data-cursor="pointer"
                className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm font-medium text-[var(--accent)] transition-colors hover:bg-red-950/40"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10 transition-colors group-hover:bg-red-500/20">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                  </svg>
                </span>
                Delete message
              </button>
            )}
          </div>
        ) : (
          <p className="px-4 py-3.5 text-xs leading-snug text-[var(--text-muted)]">
            {disabledReason || 'No actions available'}
          </p>
        )}
      </div>
    </>,
    portalTarget,
  )
}