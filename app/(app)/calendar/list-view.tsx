'use client'

import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { getPlatformDot } from '@/lib/utils/platform'
import { cn } from '@/lib/utils'
import { CALENDAR_CATEGORY_CONFIG, type CalendarEvent } from './types'

interface Props {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export function ListView({ events, onEventClick }: Props) {
  // Group by date
  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted text-sm">Tidak ada jadwal di periode ini.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      {sortedDates.map((dateStr) => {
        const dayEvents = grouped[dateStr].sort((a, b) => (a.time ?? '00:00').localeCompare(b.time ?? '00:00'))
        const date = parseISO(dateStr)

        return (
          <div key={dateStr}>
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              {format(date, 'EEEE, d MMMM', { locale: localeId })}
            </h3>
            <div className="bg-white border border-border rounded-xl divide-y divide-border">
              {dayEvents.map((ev) => {
                const cfg = CALENDAR_CATEGORY_CONFIG[ev.category]
                return (
                  <button
                    key={ev.id}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors text-left',
                      ev.severity === 'overdue' && 'bg-rose-50/40'
                    )}
                    onClick={() => onEventClick(ev)}
                  >
                    <span className="text-sm text-text-muted w-12 shrink-0 font-mono">
                      {ev.time ? ev.time.slice(0, 5) : '—'}
                    </span>
                    {ev.category === 'publishing' ? (
                      <div className={cn('w-2 h-2 rounded-full shrink-0', getPlatformDot(ev.raw.platform))} />
                    ) : (
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{ev.title}</p>
                      <p className="text-xs text-text-muted">
                        {cfg.label}{ev.subtitle && ` · ${ev.subtitle}`}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 border',
                      ev.severity === 'overdue' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                      ev.severity === 'attention' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      cfg.badgeClass
                    )}>
                      {ev.severity === 'overdue' ? 'Overdue' : cfg.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
