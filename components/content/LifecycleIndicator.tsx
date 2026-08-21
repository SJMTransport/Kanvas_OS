import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LIFECYCLE_CONFIG, LIFECYCLE_ORDER, type ContentLifecycleStage } from '@/lib/operations/rules'

// Phase 03B-1 — the ONE user-facing Content lifecycle presentation. Always
// derived from computeContentLifecycleStage() (or an equivalent computed
// stage passed in by the caller) — never from raw videos.status. This
// replaces the legacy StatusStepper as the only status story a user sees.

interface LifecycleIndicatorProps {
  stage: ContentLifecycleStage
  /** false renders only the stage badge (for tight header spaces). */
  showSteps?: boolean
  /** false omits the stage badge (use when a badge is already shown elsewhere). */
  showBadge?: boolean
  className?: string
}

export function LifecycleIndicator({ stage, showSteps = true, showBadge = true, className }: LifecycleIndicatorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {showBadge && (
        <Badge variant="outline" className={cn('text-xs font-bold px-3 py-1', LIFECYCLE_CONFIG[stage].badgeClass)}>
          {LIFECYCLE_CONFIG[stage].label}
        </Badge>
      )}
      {showSteps && (
        <div className="flex items-center gap-1 overflow-x-auto">
          {LIFECYCLE_ORDER.map((s, i) => {
            const currentIdx = LIFECYCLE_ORDER.indexOf(stage)
            const isDone = i < currentIdx
            const isCurrent = s === stage
            return (
              <div key={s} className="flex items-center shrink-0">
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap',
                  isCurrent ? cn('ring-1 ring-offset-1', LIFECYCLE_CONFIG[s].badgeClass) :
                  isDone ? 'text-text-muted bg-subtle' : 'text-text-muted/50 bg-subtle/50'
                )}>
                  {LIFECYCLE_CONFIG[s].label}
                </span>
                {i < LIFECYCLE_ORDER.length - 1 && <span className="w-3 h-px bg-border mx-0.5" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
