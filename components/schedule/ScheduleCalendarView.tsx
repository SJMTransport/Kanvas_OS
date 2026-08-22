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

// Shared month-grid preview for the Schedule Engine (ScheduleEvent[]).
// Used by both /brand/jadwal ("Kalender" view) and the Dashboard ("Jadwal
// Bulan Ini" preview). Deliberately NOT built on top of
// app/(app)/calendar/month-view.tsx — that component is tightly coupled to
// Content Calendar's CalendarEvent shape, drag-to-reschedule, and its own
// 9 categories; adapting it would risk a Content Calendar regression. This
// component only ever renders whatever `events` it's given — it never
// fetches anything itself, so both call sites stay on one data source.
//
// Two usage modes:
//   - Uncontrolled month (activeDate/onActiveDateChange omitted): the
//     component manages its own month state internally. This is Brand
//     Jadwal's mode — it already fetches ALL events unbounded, so month
//     navigation is a pure client-side filter of what's already in memory.
//   - Controlled month (activeDate/onActiveDateChange passed): the parent
//     owns the current month, e.g. because it wants to fetch a
//     month-scoped range from the server. This is Dashboard's mode.
//
// `compact` swaps the always-visible event chips for a lighter, dot-based
// day cell plus a click-through to `onDayClick` (day-level, not
// event-level) — used by Dashboard to keep the preview small; Brand
// Jadwal's Kalender view keeps the full chip layout (compact omitted).

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MAX_VISIBLE = 3
const MAX_DOTS = 4

interface Props {
  events: ScheduleEvent[]
  onEventClick: (e: ScheduleEvent) => void
  activeDate?: Date
  onActiveDateChange?: (date: Date) => void
  onDayClick?: (dateStr: string, dayEvents: ScheduleEvent[]) => void
  compact?: boolean
}

export function ScheduleCalendarView({ events, onEventClick, activeDate: controlledDate, onActiveDateChange, onDayClick, compact }: Props) {
  const [internalDate, setInternalDate] = useState(new Date())
  const activeDate = controlledDate ?? internalDate
  const setActiveDate = onActiveDateChange ?? setInternalDate

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
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setActiveDate(subMonths(activeDate, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setActiveDate(addMonths(activeDate, 1))}>
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
          const cellBody = (
            <>
              <p className={cn('text-[11px] font-semibold mb-1', isToday(day) && 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white')}>
                {format(day, 'd')}
              </p>
              {compact ? (
                dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, MAX_DOTS).map((e) => (
                      <span key={e.id} className="text-[10px] leading-none">{e.icon}</span>
                    ))}
                    {dayEvents.length > MAX_DOTS && (
                      <span className="text-[9px] text-text-muted leading-none">+{dayEvents.length - MAX_DOTS}</span>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-1">
                  {dayEvents.slice(0, MAX_VISIBLE).map((e) => (
                    <button
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); onEventClick(e) }}
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
              )}
            </>
          )
          return compact ? (
            <button
              key={dateStr}
              onClick={() => onDayClick?.(dateStr, dayEvents)}
              className={cn(
                'min-h-[56px] rounded-lg p-1.5 border text-left transition-colors',
                muted ? 'bg-subtle/20 border-transparent text-text-muted/50' : 'bg-white border-border/60 hover:border-accent/50 hover:bg-accent-light/30'
              )}
            >
              {cellBody}
            </button>
          ) : (
            <div
              key={dateStr}
              className={cn(
                'min-h-[92px] rounded-xl p-1.5 border shadow-subtle',
                muted ? 'bg-subtle/20 border-transparent text-text-muted/50' : 'bg-white border-border/60'
              )}
            >
              {cellBody}
            </div>
          )
        })}
      </div>
    </div>
  )
}
