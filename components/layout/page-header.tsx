import { cn } from '@/lib/utils'

// Shared page shell + header so every screen shares the same width, padding,
// title size, and action placement — the backbone of a cohesive, flowless UI.

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('max-w-6xl mx-auto px-4 sm:px-6 py-6', className)}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6', className)}>
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold text-text-primary truncate">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  )
}
