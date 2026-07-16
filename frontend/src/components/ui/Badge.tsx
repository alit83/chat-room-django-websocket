import { cn } from '../../lib/cn'

type BadgeProps = {
  count: number
  className?: string
}

export function Badge({ count, className }: BadgeProps) {
  if (count <= 0) return null

  return (
    <span
      className={cn(
        'flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-semibold text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
