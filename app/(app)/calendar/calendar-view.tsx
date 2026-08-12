'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, List, LayoutGrid, CalendarDays, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MonthView } from './month-view'
import { WeekView } from './week-view'
import { ListView } from './list-view'
import { EventDetail } from './event-detail'
import { QuickAdd } from './quick-add'
import { cn } from '@/lib/utils'
import type { ScheduleEvent, ViewMode } from './types'
import type { Platform } from '@/lib/types'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']
const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook',
}

export function CalendarView() {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [activeDate, setActiveDate] = useState(new Date())
  const [activePlatforms, setActivePlatforms] = useState<Platform[]>([...PLATFORMS])
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
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

  const { data: events = [], isLoading } = useQuery<ScheduleEvent[]>({
    queryKey: ['schedules', workspaceId, startDate, endDate, activePlatforms],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('video_platform_schedules')
        .select('*, videos(id, judul, thumbnail_url, status, workspace_id)')
        .gte('tanggal_tayang', startDate)
        .lte('tanggal_tayang', endDate)
        .in('platform', activePlatforms)
      // Filter by workspace
      return ((data ?? []) as (ScheduleEvent & { videos: ScheduleEvent['videos'] & { workspace_id: string } | null })[])
        .filter((e) => e.videos?.workspace_id === workspaceId)
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  })

  function togglePlatform(p: Platform) {
    setActivePlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  function navigate(dir: 1 | -1) {
    if (viewMode === 'month') setActiveDate((d) => dir === 1 ? addMonths(d, 1) : subMonths(d, 1))
    else if (viewMode === 'week') setActiveDate((d) => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1))
    else setActiveDate((d) => dir === 1 ? addMonths(d, 1) : subMonths(d, 1))
  }

  function goToday() {
    setActiveDate(new Date())
  }

  function handleDayClick(dateStr: string) {
    setQuickAddDate(dateStr)
    setQuickAddOpen(true)
  }

  function handleEventClick(event: ScheduleEvent) {
    setSelectedEvent(event)
    setDetailOpen(true)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const scheduleId = active.data.current?.scheduleId as string
    const newDate = over.data.current?.date as string
    if (!scheduleId || !newDate) return

    const queryKey = ['schedules', workspaceId, startDate, endDate, activePlatforms]
    const previous = queryClient.getQueryData<ScheduleEvent[]>(queryKey)
    if (!previous) return
    const target = previous.find((e) => e.id === scheduleId)
    if (!target || target.tanggal_tayang === newDate) return

    queryClient.setQueryData<ScheduleEvent[]>(queryKey, (old) =>
      (old ?? []).map((e) => e.id === scheduleId ? { ...e, tanggal_tayang: newDate } : e)
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('video_platform_schedules')
      .update({ tanggal_tayang: newDate, updated_at: new Date().toISOString() })
      .eq('id', scheduleId)

    if (error) {
      queryClient.setQueryData(queryKey, previous)
      toast.error('Gagal mengubah jadwal')
    } else {
      toast.success('Jadwal diperbarui')
    }
  }

  const headerLabel = viewMode === 'week'
    ? `${format(startOfWeek(activeDate, { weekStartsOn: 1 }), 'd MMM', { locale: localeId })} – ${format(endOfWeek(activeDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: localeId })}`
    : format(activeDate, 'MMMM yyyy', { locale: localeId })

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-heading text-lg font-bold text-text-primary capitalize mr-1">
            {headerLabel}
          </h2>
          {/* Nav */}
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-subtle text-accent">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-md hover:bg-subtle text-accent">
            <ChevronRight className="w-4 h-4" />
          </button>
          <Button variant="outline" size="sm" onClick={goToday} className="h-8 text-xs">Hari Ini</Button>

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            {([['month', LayoutGrid], ['week', CalendarDays], ['list', List]] as [ViewMode, typeof List][]).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-2.5 py-1.5 text-xs transition-colors flex items-center gap-1',
                  viewMode === mode ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle'
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
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
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

      {/* Legend / platform filter — checkbox style */}
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

      {/* Desktop side panel */}
      <div className={cn(
        'hidden lg:flex fixed right-0 top-14 bottom-0 w-80 bg-white border-l border-border flex-col z-20 transition-transform duration-200',
        detailOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {selectedEvent && (
          <EventDetail
            event={selectedEvent}
            onClose={() => setDetailOpen(false)}
          />
        )}
      </div>

      {/* Mobile bottom sheet */}
      <Sheet open={detailOpen && typeof window !== 'undefined' && window.innerWidth < 1024} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="h-[75vh] p-0">
          {selectedEvent && (
            <EventDetail
              event={selectedEvent}
              onClose={() => setDetailOpen(false)}
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

function getPlatformBgColor(p: Platform): string {
  return { tiktok: '#000000', instagram: '#E1306C', youtube: '#FF0000', facebook: '#1877F2' }[p]
}
