import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { authApi, resolveMediaUrl } from '../../lib/api'
import { useAuthStore } from '../../hooks/useAuthStore'

type ProfileUpdateResult = {
  pk: number
  first_name: string
  last_name: string
  gender: number | null
  avatar: string | null
  username: string
}

type ProfileEditModalProps = {
  isOpen: boolean
  onClose: () => void
  onSaved?: (updated: ProfileUpdateResult) => void
}

const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: '1', label: 'Male' },
  { value: '2', label: 'Female' },
  { value: '3', label: 'Not to mention' },
]

export function ProfileEditModal({ isOpen, onClose, onSaved }: ProfileEditModalProps) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [gender, setGender] = useState(user?.gender != null ? String(user.gender) : '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setFirstName(user?.first_name || '')
      setLastName(user?.last_name || '')
      setGender(user?.gender != null ? String(user.gender) : '')
      setAvatarFile(null)
      setPreviewUrl(null)
      setError(null)
    }
  }, [isOpen, user])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Revoke the blob URL whenever it's replaced/unmounted, to avoid leaking memory
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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
    setAvatarFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  const displayAvatarUrl = previewUrl || resolveMediaUrl(user?.avatar)

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender: gender ? Number(gender) : null,
        avatarFile,
      })
      setUser({
        ...user!,
        first_name: updated.first_name,
        last_name: updated.last_name,
        gender: updated.gender,
        avatar: updated.avatar,
      })
      onSaved?.(updated)
      onClose()
    } catch (err) {
      console.error('Failed to update profile:', err)
      setError('Could not save changes. Please try again.')
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
          aria-label="Edit profile"
          className="animate-menu-in w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl shadow-black/70"
        >
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Edit Profile</h2>
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
                {displayAvatarUrl ? (
                  <img src={displayAvatarUrl} alt="Your avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--bg-elevated)] text-xl font-semibold text-[var(--accent)]">
                    {(firstName || user?.username || '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                data-cursor="pointer"
                className="text-xs font-medium text-[var(--accent)] hover:underline disabled:opacity-60"
              >
                Change photo
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={saving}
                className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={saving}
                className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={saving}
                className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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
              onClick={handleSave}
              disabled={saving}
              data-cursor="pointer"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </>,
    portalTarget,
  )
}