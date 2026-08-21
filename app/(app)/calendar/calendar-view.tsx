'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useCalendarEvents } from '@/lib/hooks/useCalendarEvents'
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, List, LayoutGrid, CalendarDays, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MonthView } from './month-view'
import { WeekView } from './week-view'
import { ListView } from './list-view'
import { EventDetail } from './event-detail'
import { DailyAgenda } from './daily-agenda'
import { QuickAdd } from './quick-add'
import { cn } from '@/lib/utils'
import { isReadyToPublish } from '@/lib/utils/workflow'
import { CALENDAR_CATEGORY_GROUP, type CalendarEvent, type ViewMode } from './types'
import type { Platform } from '@/lib/types'
import Link from 'next/link'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']
const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook',
}
function getPlatformBgColor(p: Platform): string {
  return { tiktok: '#000000', instagram: '#E1306C', youtube: '#FF0000', facebook: '#1877F2' }[p]
}

const CATEGORY_GROUPS: { key: 'all' | 'content' | 'deal' | 'financial' | 'approval'; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'content', label: 'Content' },
  { key: 'deal', label: 'Deal' },
  { key: 'financial', label: 'Financial' },
  { key: 'approval', label: 'Approval' },
]

// Phase 5 refinement, Part F/G — the Content page's "Jadwal Konten" is a
// SCOPED VIEW over the exact same useCalendarEvents engine, not a second
// calendar. It only ever hides deal/invoice/payment categories at render
// time; nothing about the data source changes.
const CONTENT_SCOPE_CATEGORIES: CalendarEvent['category'][] = ['shooting', 'deadline', 'publishing', 'waiting_approval', 'revision']
const CONTENT_SCOPE_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'shooting', label: 'Shooting' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'publishing', label: 'Publishing' },
  { key: 'waiting_approval', label: 'Approval' },
  { key: 'revision', label: 'Revision' },
]

interface CalendarViewProps {
  /** 'content' scopes both the data shown and the category filter to
   * content-related activities only (Shooting/Deadline/Publishing/
   * Approval/Revision) — used by the Content page's "Jadwal Konten" tab.
   * Defaults to 'all', the full operational calendar. */
  scope?: 'all' | 'content'
}

export function CalendarView({ scope = 'all' }: CalendarViewProps = {}) {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [activeDate, setActiveDate] = useState(new Date())
  const [activeGroup, setActiveGroup] = useState<string>('all')
  const [activePlatforms, setActivePlatforms] = useState<Platform[]>([...PLATFORMS])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [agendaDate, setAgendaDate] = useState<string | null>(null)
  const [agendaOpen, setAgendaOpen] = useState(false)
  const [cameFromAgenda, setCameFromAgenda] = useState(false)
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Mobile: default week view
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('week')
    }
  }, [])

  // Date range for query
  const { startDate, endDate } = getDateRange(viewMode, activeDate)

  const { data: rawEvents = [], isLoading } = useCalendarEvents(workspaceId, startDate, endDate)

  // Content scope hides deal/invoice/payment categories entirely — applied
  // once here, upstream of both the category filter and Daily Agenda, so
  // neither can accidentally leak a non-content category back in.
  const allEvents = scope === 'content'
    ? rawEvents.filter((e) => CONTENT_SCOPE_CATEGORIES.includes(e.category))
    : rawEvents

  const events = allEvents
    .filter((e) => activeGroup === 'all' || (scope === 'content' ? e.category === activeGroup : CALENDAR_CATEGORY_GROUP[e.category] === activeGroup))
    .filter((e) => e.category !== 'publishing' || activePlatforms.includes(e.raw.platform))

  function togglePlatform(p: Platform) {
    setActivePlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])
  }

  // Ready-to-publish has no intrinsic calendar date (production=ready +
  // approval=approved + publishing!=published is a state, not a date) — so
  // it's a workspace-wide summary banner, not a dated cell, using the same
  // derived logic already built in Phase 2/3 (lib/utils/workflow.ts).
  const { data: readyToPublishCount = 0 } = useQuery({
    queryKey: ['calendar-ready-to-publish', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('videos')
        .select('id, status, production_status, approval_status, publishing_status')
        .eq('workspace_id', workspaceId)
      if (error) { console.error('Failed to load ready-to-publish count:', error); return 0 }
      return (data ?? []).filter((v: any) => isReadyToPublish(v)).length
    },
    staleTime: 30_000,
  })

  function navigate(dir: 1 | -1) {
    if (viewMode === 'month') setActiveDate((d) => dir === 1 ? addMonths(d, 1) : subMonths(d, 1))
    else if (viewMode === 'week') setActiveDate((d) => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1))
    else setActiveDate((d) => dir === 1 ? addMonths(d, 1) : subMonths(d, 1))
  }

  function goToday() {
    setActiveDate(new Date())
  }

  // Clicking a date opens the Level 3 Daily Agenda. "Tambah Jadwal" (Quick
  // Add) stays reachable via its own header button — unaffected.
  function handleDayClick(dateStr: string) {
    setAgendaDate(dateStr)
    setAgendaOpen(true)
    setDetailOpen(false)
  }

  function handleEventClick(event: CalendarEvent) {
    setSelectedEvent(event)
    setDetailOpen(true)
    setAgendaOpen(false)
    setCameFromAgenda(false)
  }

  // From within the Daily Agenda, an activity opens the Level 2 preview
  // rather than navigating away — the date is preserved via agendaDate so
  // "← Semua Aktivitas" can return to the same day's agenda.
  function handleAgendaEventClick(event: CalendarEvent) {
    setSelectedEvent(event)
    setDetailOpen(true)
    setAgendaOpen(false)
    setCameFromAgenda(true)
  }

  function handleBackToAgenda() {
    setDetailOpen(false)
    setAgendaOpen(true)
  }

  // Drag-to-reschedule only applies to publishing events — the schedule id
  // lives at ev.raw.id (the CalendarEvent's own id is category-prefixed).
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const scheduleId = active.data.current?.scheduleId as string
    const newDate = over.data.current?.date as string
    if (!scheduleId || !newDate) return

    const queryKey = ['calendar-events', workspaceId, startDate, endDate]
    const previous = queryClient.getQueryData<CalendarEvent[]>(queryKey)
    if (!previous) return
    const target = previous.find((e) => e.category === 'publishing' && e.raw.id === scheduleId)
    if (!target || target.date === newDate) return

    queryClient.setQueryData<CalendarEvent[]>(queryKey, (old) =>
      (old ?? []).map((e) => (e.category === 'publishing' && e.raw.id === scheduleId) ? { ...e, date: newDate, raw: { ...e.raw, tanggal_tayang: newDate } } : e)
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('video_platform_schedules')
      .update({ tanggal_tayang: newDate, updated_at: new Date().toISOString() })
      .eq('id', scheduleId)

    if (error) {
      console.error('Failed to reschedule:', error)
      queryClient.setQueryData(queryKey, previous)
      toast.error('Gagal mengubah jadwal')
    } else {
      toast.success('Jadwal diperbarui')
      queryClient.invalidateQueries({ queryKey })
      // Drag-reschedule changes a schedule's date, which Dashboard's
      // "Jadwal Hari Ini" and Action Center also depend on — invalidate
      // those too, forcing an immediate refetch regardless of mount state.
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['action-center'], refetchType: 'all' })
    }
  }

  const headerLabel = viewMode === 'week'
    ? `${format(startOfWeek(activeDate, { weekStartsOn: 1 }), 'd MMM', { locale: localeId })} – ${format(endOfWeek(activeDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: localeId })}`
    : format(activeDate, 'MMMM yyyy', { locale: localeId })

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white rounded-[16px] border border-[#E8EEEC] overflow-hidden">
      {/* Ready to Publish banner */}
      {readyToPublishCount > 0 && (
        <Link href="/content" className="shrink-0">
          <div className="bg-emerald-500 text-white px-4 py-2 flex items-center justify-between text-sm hover:bg-emerald-600 transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">Ready to Publish</span>
              <span className="opacity-90">— {readyToPublishCount} Content siap dijadwalkan</span>
            </div>
            <span className="text-xs underline">Buka Konten</span>
          </div>
        </Link>
      )}

      {/* Quiet Calendar Workspace Control Header */}
      <div className="bg-[#F7FAF9] border-b border-[#E8EEEC] px-4 py-2 flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary capitalize mr-1">
            {headerLabel}
          </span>
          <button onClick={() => navigate(-1)} className="p-1 rounded-md hover:bg-[#EFF7F5] text-[#4C9998] transition-colors" title="Sebelumnya">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(1)} className="p-1 rounded-md hover:bg-[#EFF7F5] text-[#4C9998] transition-colors" title="Berikutnya">
            <ChevronRight className="w-4 h-4" />
          </button>
          <Button variant="outline" size="sm" onClick={goToday} className="h-7 text-xs rounded-md border-[#E8EEEC] bg-white text-text-primary hover:bg-[#EFF7F5]">
            Hari Ini
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-[#E8EEEC] rounded-lg overflow-hidden bg-white p-0.5">
            {([['month', LayoutGrid], ['week', CalendarDays], ['list', List]] as [ViewMode, typeof List][]).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
                  viewMode === mode ? 'bg-[#4C9998] text-white' : 'text-text-secondary hover:bg-[#EFF7F5]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline capitalize">{mode === 'month' ? 'Bulan' : mode === 'week' ? 'Minggu' : 'List'}</span>
              </button>
            ))}
          </div>

          {/* Quick add */}
          <Popover open={quickAddOpen} onOpenChange={setQuickAddOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" className="h-7 text-xs gap-1 rounded-md bg-[#4C9998] text-white hover:bg-[#287978]">
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Jadwal</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <h3 className="font-heading font-semibold text-text-primary mb-3">Tambah Jadwal</h3>
              <QuickAdd
                defaultDate={quickAddDate ?? format(new Date(), 'yyyy-MM-dd')}
                onSuccess={() => setQuickAddOpen(false)}
                onCancel={() => setQuickAddOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Category filter */}
      <div className="bg-white border-b border-border px-4 py-2 flex items-center gap-1.5 flex-wrap shrink-0">
        {(scope === 'content' ? CONTENT_SCOPE_FILTERS : CATEGORY_GROUPS).map((g) => (
          <button
            key={g.key}
            onClick={() => setActiveGroup(g.key)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              activeGroup === g.key ? 'bg-accent text-white border-accent' : 'bg-white text-text-secondary border-border hover:bg-subtle'
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Calendar body */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted text-sm">Memuat jadwal...</p>
        </div>
      ) : viewMode === 'month' ? (
        <DndContext sensors={sensors} modifiers={[restrictToWindowEdges]} onDragEnd={handleDragEnd}>
          <MonthView
            activeDate={activeDate}
            events={events}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        </DndContext>
      ) : viewMode === 'week' ? (
        <WeekView
          activeDate={activeDate}
          events={events}
          onEventClick={handleEventClick}
        />
      ) : (
        <ListView
          events={events}
          onEventClick={handleEventClick}
        />
      )}

      {/* Platform legend / filter — only affects publishing events */}
      {viewMode !== 'list' && (
        <div className="bg-white border-t border-border px-4 py-2.5 flex items-center gap-5 flex-wrap shrink-0">
          {PLATFORMS.map((p) => {
            const on = activePlatforms.includes(p)
            return (
              <button key={p} onClick={() => togglePlatform(p)} className="flex items-center gap-2 text-sm select-none">
                <span
                  className={cn('w-4 h-4 rounded flex items-center justify-center border transition-colors', on ? 'border-transparent' : 'border-border bg-white')}
                  style={on ? { backgroundColor: getPlatformBgColor(p) } : undefined}
                >
                  {on && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className={cn(on ? 'text-text-primary font-medium' : 'text-text-muted')}>{PLATFORM_LABELS[p]}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Desktop side panel — Level 3 Daily Agenda or Level 2 event detail */}
      <div className={cn(
        'hidden lg:flex fixed right-0 top-14 bottom-0 w-80 bg-white border-l border-border flex-col z-20 transition-transform duration-200',
        (detailOpen || agendaOpen) ? 'translate-x-0' : 'translate-x-full'
      )}>
        {agendaOpen && agendaDate && (
          <DailyAgenda
            dateStr={agendaDate}
            events={allEvents}
            onClose={() => setAgendaOpen(false)}
            onEventClick={handleAgendaEventClick}
          />
        )}
        {detailOpen && selectedEvent && (
          <EventDetail
            event={selectedEvent}
            onClose={() => setDetailOpen(false)}
            onBack={cameFromAgenda ? handleBackToAgenda : undefined}
          />
        )}
      </div>

      {/* Mobile bottom sheet */}
      <Sheet open={(detailOpen || agendaOpen) && typeof window !== 'undefined' && window.innerWidth < 1024} onOpenChange={(open) => { setDetailOpen(open && detailOpen); setAgendaOpen(open && agendaOpen) }}>
        <SheetContent side="bottom" className="h-[75vh] p-0">
          {agendaOpen && agendaDate && (
            <DailyAgenda
              dateStr={agendaDate}
              events={allEvents}
              onClose={() => setAgendaOpen(false)}
              onEventClick={handleAgendaEventClick}
            />
          )}
          {detailOpen && selectedEvent && (
            <EventDetail
              event={selectedEvent}
              onClose={() => setDetailOpen(false)}
              onBack={cameFromAgenda ? handleBackToAgenda : undefined}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function getDateRange(viewMode: ViewMode, activeDate: Date) {
  if (viewMode === 'month') {
    return {
      startDate: format(startOfMonth(activeDate), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(activeDate), 'yyyy-MM-dd'),
    }
  }
  if (viewMode === 'week') {
    return {
      startDate: format(startOfWeek(activeDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      endDate: format(endOfWeek(activeDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    }
  }
  // list: current month
  return {
    startDate: format(startOfMonth(activeDate), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(activeDate), 'yyyy-MM-dd'),
  }
}
