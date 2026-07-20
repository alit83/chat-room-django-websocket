import { useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { Message } from '../../data/mockChats'
import { formatTime } from '../../lib/formatTime'
import { cn } from '../../lib/cn'
import { useAuthStore } from '../../hooks/useAuthStore'
import { MessageContextMenu } from './MessageContextMenu'
import { resolveParticipantName, type ParticipantInfo } from '../../lib/participants'

type MessageBubbleProps = {
  message: Message
  animationIndex: number
  isRoomCreator?: boolean
  onEdit?: (id: string | number, text: string) => void
  onDelete?: (id: string | number) => void
  participants?: Record<string, ParticipantInfo>
  allMessages?: Message[]
}

// Messages loaded via REST pagination don't carry a real numeric id from the
// backend yet — only ones received live over the WebSocket this session do.
// Edit/Delete need that real id to send a valid websocket request.
export function hasRealId(id: string | number) {
  return typeof id === 'number' || /^\d+$/.test(String(id))
}

export function MessageBubble({
  message,
  animationIndex,
  isRoomCreator = false,
  onEdit,
  onDelete,
  participants = {},
  allMessages = [],
}: MessageBubbleProps) {
  const userId = useAuthStore((s) => s.user?.id)
  const isMe = userId != null && String(message.senderId) === String(userId)
  const editable = hasRealId(message.id)

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(message.text)

  const handleContextMenu = (e: ReactMouseEvent) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY })
  }
    // Backend sets created_date/updated_date a few microseconds apart even on
    // brand-new messages (two separate timestamp calls at creation), so treat
    // anything under ~2s apart as "not actually edited."
  const EDITED_THRESHOLD_MS = 2000

  function wasActuallyEdited(message: Message) {
    const created = new Date(message.created_date).getTime()
    const updated = new Date(message.updated_date).getTime()
    return updated - created > EDITED_THRESHOLD_MS
}

  const startEdit = () => {
    setDraft(message.text)
    setIsEditing(true)
  }

  const saveEdit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== message.text) onEdit?.(message.id, trimmed)
    setIsEditing(false)
  }

  const cancelEdit = () => {
    setDraft(message.text)
    setIsEditing(false)
  }

  const canEdit = isMe && editable
  const canDeleteThis = (isRoomCreator || isMe) && editable
  const wasEdited = wasActuallyEdited(message)

  const readByOthers = isMe
   ? (message.readBy || []).filter((r) => r.userId !== String(userId))
   : []
  const readByNames = readByOthers.map((r) => resolveParticipantName(r.userId, participants, allMessages))

  return (
    <div
      className={cn('flex w-full animate-message', isMe ? 'justify-end' : 'justify-start')}
      style={{ animationDelay: `${Math.min(animationIndex * 40, 200)}ms` }}
    >
      <div className={cn('max-w-[70%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
        {!isMe && (
          <p className="mb-0.5 px-1 text-[11px] font-medium text-[var(--text-muted)]">
            {message.senderName || 'User'}
          </p>
        )}

        <div
          onContextMenu={handleContextMenu}
          data-cursor="pointer"
          className={cn(
            'select-none px-3.5 py-2 text-sm leading-relaxed text-[var(--text-primary)] transition-shadow',
            isMe
              ? 'rounded-2xl rounded-br-sm bg-gradient-to-br from-[var(--accent)] to-red-800 shadow-lg shadow-red-950/40'
              : 'rounded-2xl rounded-bl-sm bg-[var(--bg-elevated)] ring-1 ring-[var(--border)]',
            menu && 'ring-2 ring-white/25',
          )}
        >
          {isEditing ? (
            <div className="flex min-w-[180px] flex-col gap-2">
              <textarea
                autoFocus
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    saveEdit()
                  } else if (e.key === 'Escape') {
                    cancelEdit()
                  }
                }}
                className="w-full resize-none rounded-lg border border-white/20 bg-black/20 px-2 py-1.5 text-sm text-inherit outline-none focus:border-white/40"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button type="button" onClick={cancelEdit} data-cursor="pointer" className="rounded-md px-2 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  Cancel
                </button>
                <button type="button" onClick={saveEdit} data-cursor="pointer" className="rounded-md bg-white/15 px-2 py-1 font-medium hover:bg-white/25">
                  Save
                </button>
              </div>
            </div>
          ) : (
            message.text
          )}
        </div>

        <p
          className={cn(
            'mt-1 px-1 text-[10px] text-[var(--text-muted)] flex items-center gap-1',
            isMe ? 'justify-end' : 'justify-start',
          )}
        >
          {isMe && (
           <span
             className="group relative inline-flex cursor-default items-center"
             title={readByNames.length > 0 ? `Seen by ${readByNames.join(', ')}` : 'Sent'}
           >
             {readByOthers.length > 0 ? (
               <svg className="h-3.5 w-3.5 text-[var(--accent)]" viewBox="0 0 16 16" fill="none">
                 <path d="M1 8.5L4.5 12L10 5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                 <path d="M6 8.5L9.5 12L15 5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
             ) : (
               <svg className="h-3.5 w-3.5 text-[var(--text-muted)]" viewBox="0 0 16 16" fill="none">
                 <path d="M1 8.5L5.5 13L15 3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
             )}
           </span>
         )}
          {formatTime(message.timestamp)}
          {wasEdited && !isEditing && <span className="italic">edited</span>}
        </p>
      </div>

      {menu && (
        <MessageContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          canEdit={canEdit}
          canDelete={canDeleteThis}
          onEdit={startEdit}
          onDelete={() => onDelete?.(message.id)}
          disabledReason={!editable ? "This message can't be edited or deleted yet" : undefined}
        />
      )}
    </div>
  )
}