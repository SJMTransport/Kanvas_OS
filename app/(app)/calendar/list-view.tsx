'use client'

import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { getPlatformDot } from '@/lib/utils/platform'
import { cn } from '@/lib/utils'
import type { ScheduleEvent } from './types'
import Link from 'next/link'

interface Props {
  events: ScheduleEvent[]
  onEventClick: (event: ScheduleEvent) => void
}

export function ListView({ events, onEventClick }: Props) {
  // Group by date
  const grouped = events.reduce<Record<string, ScheduleEvent[]>>((acc, ev) => {
    const key = ev.tanggal_tayang
    if (!acc[key]) acc[key] = []
    acc[key].push(ev)
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
        const dayEvents = grouped[dateStr].sort((a, b) =>
          (a.jam_post ?? '00:00').localeCompare(b.jam_post ?? '00:00')
        )
        const date = parseISO(dateStr)

        return (
          <div key={dateStr}>
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              {format(date, 'EEEE, d MMMM', { locale: localeId })}
            </h3>
            <div className="bg-white border border-border rounded-xl divide-y divide-border">
              {dayEvents.map((ev) => (
                <button
                  key={ev.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors text-left"
                  onClick={() => onEventClick(ev)}
                >
                  <span className="text-sm text-text-muted w-12 shrink-0 font-mono">
                    {ev.jam_post ? ev.jam_post.slice(0, 5) : '—'}
                  </span>
                  <div className={cn('w-2 h-2 rounded-full shrink-0', getPlatformDot(ev.platform))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {ev.videos?.judul ?? 'Video'}
                    </p>
                    <p className="text-xs text-text-muted capitalize">{ev.platform}</p>
                  </div>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
                    ev.status === 'posted' ? 'bg-green-100 text-success' :
                    ev.status === 'failed' ? 'bg-red-100 text-error' :
                    'bg-accent-light text-accent'
                  )}>
                    {ev.status === 'posted' ? 'Tayang' : ev.status === 'failed' ? 'Gagal' : 'Terjadwal'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
