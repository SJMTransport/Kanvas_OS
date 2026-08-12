'use client'

import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, format
} from 'date-fns'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { getPlatformDot } from '@/lib/utils/platform'
import type { ScheduleEvent } from './types'

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MAX_VISIBLE = 3

interface Props {
  activeDate: Date
  events: ScheduleEvent[]
  onDayClick: (date: string) => void
  onEventClick: (event: ScheduleEvent) => void
}

function EventChip({ ev, onEventClick }: { ev: ScheduleEvent; onEventClick: (e: ScheduleEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ev.id,
    data: { scheduleId: ev.id },
  })

  const isTarget = ev.videos && !['scheduled', 'live'].includes(ev.videos.status)

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }}
      className={cn(
        'w-full flex items-center gap-1.5 text-left text-[11px] px-1.5 py-1 rounded-md bg-white border border-border leading-tight',
        'hover:border-accent hover:shadow-sm transition-all cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'shadow-lg ring-2 ring-accent/40',
        isTarget && 'border-dashed'
      )}
      onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
      title={`${ev.platform} · ${ev.videos?.judul ?? ''}${isTarget ? ' (Target/Reminder)' : ''}`}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', getPlatformDot(ev.platform))} />
      {ev.jam_post && <span className="text-text-muted shrink-0">{ev.jam_post.slice(0, 5)}</span>}
      <span className="truncate text-text-primary">{ev.videos?.judul ?? 'Video'}</span>
    </button>
  )
}

function DayCell({ dateStr, children, muted, onClick }: {
  dateStr: string; children: React.ReactNode; muted?: boolean; onClick: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr, data: { date: dateStr } })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[108px] rounded-xl p-2 relative cursor-pointer transition-all border',
        muted ? 'bg-transparent border-transparent' : 'bg-subtle/40 border-transparent hover:bg-subtle hover:border-border',
        isOver && 'bg-accent-light border-accent ring-1 ring-accent'
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
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
    <div className="flex-1 overflow-auto px-3 md:px-4 pb-4">
      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1.5 sticky top-0 bg-white z-10 pt-3 pb-1.5">
        {DAY_NAMES.map((d) => (
          <div key={d} className="px-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, activeDate)
          const today = isToday(day)
          const hasMore = dayEvents.length > MAX_VISIBLE
          const visible = dayEvents.slice(0, MAX_VISIBLE)
          const dateStr = format(day, 'yyyy-MM-dd')

          return (
            <DayCell key={dateStr} dateStr={dateStr} muted={!isCurrentMonth} onClick={() => onDayClick(dateStr)}>
              <div className="flex items-center justify-end mb-1">
                <span className={cn(
                  'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold',
                  today ? 'bg-accent text-white' : isCurrentMonth ? 'text-text-primary' : 'text-text-muted/50'
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              <div className="space-y-1">
                {visible.map((ev) => (
                  <EventChip key={ev.id} ev={ev} onEventClick={onEventClick} />
                ))}
                {hasMore && (
                  <button
                    className="w-full text-left text-[10px] px-1.5 py-0.5 text-text-muted hover:text-accent transition-colors font-medium"
                    onClick={(e) => { e.stopPropagation(); onDayClick(dateStr) }}
                  >
                    +{dayEvents.length - MAX_VISIBLE} lagi
                  </button>
                )}
              </div>
            </DayCell>
          )
        })}
      </div>
    </div>
  )
}
