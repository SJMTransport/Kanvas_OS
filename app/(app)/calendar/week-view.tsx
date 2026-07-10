'use client'

import { startOfWeek, addDays, format, isToday } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getPlatformChipClass } from '@/lib/utils/platform'
import type { ScheduleEvent } from './types'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface Props {
  activeDate: Date
  events: ScheduleEvent[]
  onEventClick: (event: ScheduleEvent) => void
}

export function WeekView({ activeDate, events, onEventClick }: Props) {
  const weekStart = startOfWeek(activeDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function getEventsForDayHour(date: Date, hour: number) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter((e) => {
      if (e.tanggal_tayang !== dateStr) return false
      if (!e.jam_post) return hour === 0
      const eventHour = parseInt(e.jam_post.split(':')[0])
      return eventHour === hour
    })
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-border sticky top-0 bg-white z-10">
        <div className="py-2" />
        {days.map((day) => {
          const today = isToday(day)
          return (
            <div key={day.toISOString()} className="py-2 text-center">
              <p className="text-[10px] text-text-muted uppercase font-medium">
                {format(day, 'EEE', { locale: localeId })}
              </p>
              <div className={cn(
                'w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mx-auto mt-0.5',
                today ? 'bg-accent text-white' : 'text-text-primary'
              )}>
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time slots */}
      <div className="divide-y divide-border/50">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 min-h-[56px]">
            <div className="px-2 py-1 text-[10px] text-text-muted text-right pr-3 pt-1 shrink-0 w-14">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {days.map((day) => {
              const dayEvents = getEventsForDayHour(day, hour)
              return (
                <div key={day.toISOString()} className="border-l border-border/50 p-0.5 space-y-0.5">
                  {dayEvents.map((ev) => {
                    const isTarget = ev.videos && !['scheduled', 'live'].includes(ev.videos.status)
                    return (
                      <button
                        key={ev.id}
                        className={cn(
                          'w-full text-left text-[10px] px-1.5 py-1 rounded truncate hover:opacity-80 transition-opacity',
                          getPlatformChipClass(ev.platform),
                          isTarget && 'border-dashed opacity-65 italic'
                        )}
                        onClick={() => onEventClick(ev)}
                        title={`${ev.platform} · ${ev.videos?.judul ?? ''}${isTarget ? ' (Target/Reminder)' : ''}`}
                      >
                        {isTarget && <span className="mr-0.5 text-[8px]">🎯</span>}
                        {ev.jam_post && <span className="opacity-70 mr-1">{ev.jam_post.slice(0, 5)}</span>}
                        {ev.videos?.judul ?? 'Video'}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
