import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LIFECYCLE_CONFIG, LIFECYCLE_ORDER, type ContentLifecycleStage } from '@/lib/operations/rules'

// Phase 03B-1 — the ONE user-facing Content lifecycle presentation. Always
// derived from computeContentLifecycleStage() (or an equivalent computed
// stage passed in by the caller) — never from raw videos.status. This
// replaces the legacy StatusStepper as the only status story a user sees.
//
// Phase 03E UI correction — the stepper itself is the control. There is no
// separate dropdown/status row anywhere else. Only the stages that map
// 1:1 onto videos.production_status (idea/scripting/production/editing/
// ready_to_publish) are directly clickable — clicking writes that one
// canonical field, nothing else. "Terjadwal"/"Live"/"Arsip" stay visible
// but disabled, since they're earned by real scheduling/publishing
// actions elsewhere, not by a field flip (see rules.ts comments).

const STAGE_TO_PRODUCTION_STATUS: Partial<Record<ContentLifecycleStage, string>> = {
  idea: 'idea',
  scripting: 'scripting',
  production: 'production',
  editing: 'editing',
  ready_to_publish: 'ready',
}

const DISABLED_HINT: Partial<Record<ContentLifecycleStage, string>> = {
  scheduled: 'Buat jadwal publikasi di tab Distribusi untuk mencapai tahap ini.',
  live: 'Tahap ini tercapai otomatis setelah semua jadwal publikasi selesai tayang.',
  archived: 'Diatur lewat status konten, bukan dari sini.',
}

interface LifecycleIndicatorProps {
  stage: ContentLifecycleStage
  /** false renders only the stage badge (for tight header spaces). */
  showSteps?: boolean
  /** false omits the stage badge (use when a badge is already shown elsewhere). */
  showBadge?: boolean
  className?: string
  /** When provided, the production-mapped stages become clickable. */
  onSelectStage?: (nextStage: ContentLifecycleStage, productionStatus: string) => void
  disabled?: boolean
}

export function LifecycleIndicator({ stage, showSteps = true, showBadge = true, className, onSelectStage, disabled }: LifecycleIndicatorProps) {
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
            const productionValue = STAGE_TO_PRODUCTION_STATUS[s]
            const clickable = !!onSelectStage && !!productionValue && !disabled
            const pill = (
              <span className={cn(
                'text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap transition-colors',
                isCurrent ? cn('ring-1 ring-offset-1', LIFECYCLE_CONFIG[s].badgeClass) :
                isDone ? 'text-text-muted bg-subtle' : 'text-text-muted/50 bg-subtle/50',
                clickable && !isCurrent && 'hover:bg-accent-light hover:text-accent cursor-pointer',
                clickable && 'cursor-pointer'
              )}>
                {LIFECYCLE_CONFIG[s].label}
              </span>
            )
            return (
              <div key={s} className="flex items-center shrink-0">
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onSelectStage!(s, productionValue!)}
                    title={isCurrent ? undefined : `Ubah ke ${LIFECYCLE_CONFIG[s].label}`}
                    disabled={isCurrent}
                  >
                    {pill}
                  </button>
                ) : (
                  <span title={DISABLED_HINT[s]}>{pill}</span>
                )}
                {i < LIFECYCLE_ORDER.length - 1 && <span className="w-3 h-px bg-border mx-0.5" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
