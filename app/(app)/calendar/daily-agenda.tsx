'use client'

import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { X, AlertTriangle } from 'lucide-react'
import { getPlatformDot } from '@/lib/utils/platform'
import { cn } from '@/lib/utils'
import { CALENDAR_CATEGORY_CONFIG, type CalendarEvent, type CalendarEventCategory } from './types'

interface Props {
  dateStr: string
  events: CalendarEvent[]
  onClose: () => void
  onEventClick: (event: CalendarEvent) => void
}

// Visual ordering only — never touches underlying dates/data. Overdue items
// always surface first regardless of category, then the rest follow the
// agreed operational priority.
const CATEGORY_PRIORITY: CalendarEventCategory[] = [
  'revision', 'waiting_approval', 'shooting', 'deadline', 'publishing', 'deal_start', 'deal_end', 'invoice_due', 'payment_due',
]

function priorityRank(e: CalendarEvent) {
  if (e.severity === 'overdue') return -1
  return CATEGORY_PRIORITY.indexOf(e.category)
}

export function DailyAgenda({ dateStr, events, onClose, onEventClick }: Props) {
  const date = parseISO(dateStr)
  const dayEvents = events
    .filter((e) => e.date === dateStr)
    .sort((a, b) => priorityRank(a) - priorityRank(b) || (a.time ?? '').localeCompare(b.time ?? ''))

  const overdueCount = dayEvents.filter((e) => e.severity === 'overdue').length
  const attentionCount = dayEvents.filter((e) => e.severity === 'attention').length
  const normalCount = dayEvents.filter((e) => e.severity === 'normal').length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-heading font-semibold text-text-primary text-sm">
          {format(date, 'EEEE, d MMMM yyyy', { locale: localeId })}
        </h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-border bg-subtle/40">
        {dayEvents.length === 0 ? (
          <p className="text-sm text-text-muted">Tidak ada aktivitas terjadwal</p>
        ) : (
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{dayEvents.length} Aktivitas</span>
            {overdueCount > 0 && <span> — {overdueCount} Overdue</span>}
            {attentionCount > 0 && <span>{overdueCount > 0 ? ',' : ' —'} {attentionCount} Perlu Perhatian</span>}
            {normalCount > 0 && <span>{(overdueCount > 0 || attentionCount > 0) ? ',' : ' —'} {normalCount} Terjadwal</span>}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {dayEvents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-text-muted text-sm">Tidak ada aktivitas terjadwal</p>
          </div>
        ) : (
          dayEvents.map((ev) => {
            const cfg = CALENDAR_CATEGORY_CONFIG[ev.category]
            return (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors bg-white',
                  ev.severity === 'overdue' ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50' : 'border-border hover:bg-surface'
                )}
              >
                {ev.severity === 'overdue' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-error" />
                ) : ev.category === 'publishing' ? (
                  <span className={cn('w-2 h-2 rounded-full shrink-0', getPlatformDot(ev.raw.platform))} />
                ) : (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{ev.title}</p>
                  <p className="text-xs text-text-muted truncate">
                    {cfg.label}{ev.subtitle && ` · ${ev.subtitle}`}
                  </p>
                </div>
                {ev.time && <span className="text-xs text-text-muted font-mono shrink-0">{ev.time.slice(0, 5)}</span>}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
