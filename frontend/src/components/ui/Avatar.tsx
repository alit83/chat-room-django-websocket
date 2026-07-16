import { cn } from '../../lib/cn'

type AvatarProps = {
  label: string
  online?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-11 w-11 text-sm',
  lg: 'h-12 w-12 text-base',
}

export function Avatar({ label, online, size = 'md', className }: AvatarProps) {
  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[var(--bg-elevated)] font-semibold text-[var(--accent)] ring-1 ring-[var(--border)]',
          sizeClasses[size],
        )}
      >
        {label.slice(0, 2).toUpperCase()}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--bg-secondary)]',
            online ? 'bg-emerald-500' : 'bg-[var(--text-muted)]',
          )}
        />
      )}
    </div>
  )
}
