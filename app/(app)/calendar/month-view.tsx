'use client'

import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, format
} from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getPlatformChipClass, getPlatformDot } from '@/lib/utils/platform'
import type { ScheduleEvent } from './types'

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MAX_VISIBLE = 3

interface Props {
  activeDate: Date
  events: ScheduleEvent[]
  onDayClick: (date: string) => void
  onEventClick: (event: ScheduleEvent) => void
}

export function MonthView({ activeDate, events, onDayClick, onEventClick }: Props) {
  const start = startOfWeek(startOfMonth(activeDate), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(activeDate), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end })

  function getEventsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter((e) => e.tanggal_tayang === dateStr)
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-border sticky top-0 bg-white z-10">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-text-muted">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 divide-x divide-border">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, activeDate)
          const today = isToday(day)
          const hasMore = dayEvents.length > MAX_VISIBLE
          const visible = dayEvents.slice(0, MAX_VISIBLE)
          const dateStr = format(day, 'yyyy-MM-dd')

          return (
            <div
              key={dateStr}
              className={cn(
                'min-h-[100px] p-1 border-b border-border relative cursor-pointer hover:bg-surface transition-colors',
                !isCurrentMonth && 'bg-surface/50'
              )}
              onClick={() => onDayClick(dateStr)}
            >
              <div className={cn(
                'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 mx-auto',
                today ? 'bg-accent text-white font-bold' : isCurrentMonth ? 'text-text-primary' : 'text-text-muted'
              )}>
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {visible.map((ev) => (
                  <button
                    key={ev.id}
                    className={cn(
                      'w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate leading-tight transition-opacity hover:opacity-80',
                      getPlatformChipClass(ev.platform)
                    )}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
                    title={`${ev.platform} · ${ev.videos?.judul ?? ''}`}
                  >
                    {ev.jam_post && <span className="mr-1 opacity-70">{ev.jam_post.slice(0, 5)}</span>}
                    {ev.videos?.judul ?? 'Video'}
                  </button>
                ))}
                {hasMore && (
                  <button
                    className="w-full text-left text-[10px] px-1.5 py-0.5 text-text-muted hover:text-accent transition-colors"
                    onClick={(e) => { e.stopPropagation(); onDayClick(dateStr) }}
                  >
                    +{dayEvents.length - MAX_VISIBLE} lagi
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
