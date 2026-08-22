'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, format,
  addMonths, subMonths,
} from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ScheduleEvent } from '@/lib/hooks/useScheduleEvents'

// Small, self-contained month grid for Brand -> Jadwal's "Kalender" view.
// Deliberately NOT reusing app/(app)/calendar/month-view.tsx — that
// component is tightly coupled to Content Calendar's CalendarEvent shape,
// drag-to-reschedule, and its own 9 categories. Reusing it here would mean
// either changing it (risking a Content Calendar regression, explicitly
// out of scope) or adapting ScheduleEvent to its shape (fragile). This
// view mirrors its visual language (rounded cells, teal accent, subtle
// border) without sharing its code. It reads the SAME events array the
// Per Brand / Agenda views receive — no separate fetch, no new data.

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MAX_VISIBLE = 3

export function ScheduleCalendarView({ events, onEventClick }: { events: ScheduleEvent[]; onEventClick: (e: ScheduleEvent) => void }) {
  const [activeDate, setActiveDate] = useState(new Date())

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(activeDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(activeDate), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [activeDate])

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {}
    for (const e of events) (map[e.date] ??= []).push(e)
    return map
  }, [events])

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-sm text-text-primary">
          {format(activeDate, 'MMMM yyyy', { locale: localeId })}
        </h3>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs font-semibold" onClick={() => setActiveDate(new Date())}>
            Hari Ini
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setActiveDate((d) => subMonths(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setActiveDate((d) => addMonths(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-text-muted py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate[dateStr] ?? []
          const muted = !isSameMonth(day, activeDate)
          return (
            <div
              key={dateStr}
              className={cn(
                'min-h-[92px] rounded-xl p-1.5 border shadow-subtle',
                muted ? 'bg-subtle/20 border-transparent text-text-muted/50' : 'bg-white border-border/60'
              )}
            >
              <p className={cn('text-[11px] font-semibold mb-1', isToday(day) && 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white')}>
                {format(day, 'd')}
              </p>
              <div className="space-y-1">
                {dayEvents.slice(0, MAX_VISIBLE).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onEventClick(e)}
                    title={`${e.brandName ?? ''} — ${e.label}`}
                    className="w-full flex items-center gap-1 text-left text-[10px] px-1.5 py-0.5 rounded-md bg-subtle/60 hover:bg-accent-light hover:text-accent transition-colors truncate"
                  >
                    <span className="shrink-0">{e.icon}</span>
                    <span className="truncate">{e.brandName ? `${e.brandName} — ` : ''}{e.title}</span>
                  </button>
                ))}
                {dayEvents.length > MAX_VISIBLE && (
                  <p className="text-[10px] text-text-muted px-1.5">+{dayEvents.length - MAX_VISIBLE} lainnya</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
