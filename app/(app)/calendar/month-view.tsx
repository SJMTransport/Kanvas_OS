'use client'

import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, format
} from 'date-fns'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { getPlatformDot } from '@/lib/utils/platform'
import { CALENDAR_CATEGORY_CONFIG, type CalendarEvent } from './types'

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MAX_VISIBLE = 3

interface Props {
  activeDate: Date
  events: CalendarEvent[]
  onDayClick: (date: string) => void
  onEventClick: (event: CalendarEvent) => void
}

function EventChip({ ev, onEventClick }: { ev: CalendarEvent; onEventClick: (e: CalendarEvent) => void }) {
  const draggable = ev.category === 'publishing'
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ev.id,
    data: { scheduleId: ev.raw.id },
    disabled: !draggable,
  })
  const cfg = CALENDAR_CATEGORY_CONFIG[ev.category]

  return (
    <button
      ref={setNodeRef}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      style={draggable ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 } : undefined}
      className={cn(
        'w-full flex items-center gap-1.5 text-left text-[11px] px-2 py-1 rounded-lg bg-white border leading-tight font-medium',
        'hover:border-teal-500 hover:shadow-subtle transition-all touch-none',
        draggable && 'cursor-grab active:cursor-grabbing',
        ev.severity === 'overdue' ? 'border-rose-300 bg-rose-50/50' : ev.severity === 'attention' ? 'border-amber-300 bg-amber-50/40' : 'border-border/80',
        isDragging && 'shadow-modal ring-2 ring-teal-500/40'
      )}
      onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
      title={`${cfg.label} · ${ev.title}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: ev.category === 'publishing' ? undefined : cfg.dot }}
      >
        {ev.category === 'publishing' && <span className={cn('block w-1.5 h-1.5 rounded-full', getPlatformDot(ev.raw.platform))} />}
      </span>
      {ev.time && <span className="text-text-muted shrink-0 text-[10px]">{ev.time.slice(0, 5)}</span>}
      <span className="truncate text-text-primary">{ev.title}</span>
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
        'min-h-[108px] rounded-xl p-2 relative cursor-pointer transition-all border shadow-subtle',
        muted ? 'bg-subtle/20 border-transparent text-text-muted/50' : 'bg-white border-border/60 hover:border-teal-500 hover:shadow-card',
        isOver && 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/30'
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
    return events.filter((e) => e.date === dateStr)
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
                  today ? 'bg-teal-500 text-white shadow-subtle' : isCurrentMonth ? 'text-text-primary' : 'text-text-muted/50'
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
