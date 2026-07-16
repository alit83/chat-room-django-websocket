import { useState } from 'react'
import { useAuthStore } from '../../hooks/useAuthStore'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { authApi } from '../../lib/api'

export function RegisterForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password1, setPassword1] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== password1) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApi.register(username, password, password1)
      const { access, refresh } = await authApi.login(username, password)
      useAuthStore.getState().setAuth(access, refresh, { username, first_name: '', last_name: '' })

      const profile = await authApi.getProfile()
      useAuthStore.getState().setUser({ ...profile, username })
      navigate('/')
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-[var(--text-primary)]">Chat</span>
            <span className="text-[var(--accent)]">Room</span>
          </h1>
          <p className="mt-2 text-[var(--text-muted)]">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-8">
          {error && (
            <div className="text-sm text-red-400 bg-red-950/20 border border-red-950/50 rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="password1" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Confirm password
            </label>
            <input
              id="password1"
              type="password"
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200',
              'bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]',
              loading && 'opacity-50 cursor-not-allowed',
            )}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Already have an account?{' '}
          <a href="/login" className="text-[var(--accent)] hover:underline font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}