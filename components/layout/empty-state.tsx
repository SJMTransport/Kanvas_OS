import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// One empty-state look across the whole app: same surface, icon size, and
// text hierarchy, with an optional action.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 bg-surface rounded-xl border border-border', className)}>
      {Icon && <Icon className="w-12 h-12 text-border mb-3" />}
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && <p className="text-sm text-text-muted mt-1 max-w-sm px-4">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
