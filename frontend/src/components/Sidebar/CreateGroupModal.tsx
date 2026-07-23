import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { roomsApi, type RoomItem } from '../../lib/api'
import { useAuthStore } from '../../hooks/useAuthStore'
import { cn } from '../../lib/cn'

type CreateGroupModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: (room: RoomItem) => void
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const user = useAuthStore((s) => s.user)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [linkTouched, setLinkTouched] = useState(false)
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setVisibility('public')
      setName('')
      setLink('')
      setLinkTouched(false)
      setProfileFile(null)
      setPreviewUrl(null)
      setError(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Auto-suggest a link from the name, until the person edits the link themselves
  useEffect(() => {
    if (!linkTouched) setLink(slugify(name))
  }, [name, linkTouched])

  if (!isOpen) return null
  const portalTarget = typeof document !== 'undefined' ? document.body : null
  if (!portalTarget) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setProfileFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Group name is required')
      return
    }
    const slug = slugify(link) || slugify(name)
    if (!slug) {
      setError('Invite link is required')
      return
    }
    if (user?.id == null) {
      setError('You must be signed in to create a group')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await roomsApi.create({
        name: name.trim(),
        link: slug,
        participants: [Number(user.id)],
        model: visibility === 'public' ? 2 : 3,
        profileFile,
      })
      onCreated(created)
      onClose()
    } catch (err) {
      console.error('Failed to create group:', err)
      setError('Could not create the group. The link might already be taken.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ zIndex: 99998 }}
        onClick={saving ? undefined : onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center px-4" style={{ zIndex: 99999 }}>
        <div
          role="dialog"
          aria-label="Create group"
          className="animate-menu-in w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl shadow-black/70"
        >
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">New Group</h2>
          </div>

          <div className="flex flex-col gap-4 px-5 py-5">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                data-cursor="pointer"
                className="group relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-[var(--border)] transition-opacity disabled:opacity-60"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent)] to-red-900 text-xl font-semibold text-white">
                    {(name || 'GR').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                data-cursor="pointer"
                className="text-xs font-medium text-[var(--accent)] hover:underline disabled:opacity-60"
              >
                Add photo
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Visibility</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  disabled={saving}
                  data-cursor="pointer"
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    visibility === 'public'
                      ? 'border-[var(--accent)] bg-red-950/30 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                  )}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  disabled={saving}
                  data-cursor="pointer"
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    visibility === 'private'
                      ? 'border-[var(--accent)] bg-red-950/30 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                  )}
                >
                  Private
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {visibility === 'public'
                  ? 'Anyone with the invite link can join instantly.'
                  : "The invite link stays view-only — people can't join through it."}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Group name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                placeholder="e.g. Weekend Trip"
                className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Invite link</label>
              <input
                type="text"
                value={link}
                onChange={(e) => { setLink(e.target.value); setLinkTouched(true) }}
                disabled={saving}
                placeholder="weekend-trip"
                className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            {error && <p className="text-xs text-[var(--accent)]">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              data-cursor="pointer"
              className="rounded-lg px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              data-cursor="pointer"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create group'}
            </button>
          </div>
        </div>
      </div>
    </>,
    portalTarget,
  )
}