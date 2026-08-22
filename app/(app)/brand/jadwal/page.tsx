'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useAllBrandsSchedule } from '@/lib/hooks/useBrandSchedule'
import type { ScheduleEvent } from '@/lib/hooks/useScheduleEvents'
import { PageContainer, PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs'
import { ScheduleCalendarView } from '@/components/schedule/ScheduleCalendarView'
import { formatDate } from '@/lib/utils/formatters'
import { ArrowLeft, CalendarClock, CalendarDays, Users, CalendarRange, ListTodo } from 'lucide-react'

// Consolidated, read-only Brand Schedule — the "Jadwal" action from the
// main Brand page. Aggregates Shooting / Deadline / Posting / Milestone
// across ALL brands via useAllBrandsSchedule (same shared Schedule Engine
// as the per-brand Jadwal tab on /brand/[id] — nothing is duplicated).
// Shooting Session creation/editing stays on its own page (/brand/shooting);
// this view only displays and links out to original records.
//
// Phase 2: three view modes (Per Brand / Kalender / Agenda) all render the
// SAME `items` array from the one useAllBrandsSchedule query below — no
// second fetch, no per-view data source. Switching view mode is a pure
// client-side re-grouping of already-fetched events.

type ViewMode = 'per_brand' | 'kalender' | 'agenda'

const VIEW_OPTIONS: TabOption<ViewMode>[] = [
  { value: 'per_brand', label: 'Per Brand', icon: Users },
  { value: 'kalender', label: 'Kalender', icon: CalendarRange },
  { value: 'agenda', label: 'Agenda', icon: ListTodo },
]

// Suggested display order within the same date/brand — matches the icon
// order already established across Brand Schedule (🎥 → 🔴 → 📤 → 📌).
const EVENT_TYPE_ORDER: Record<ScheduleEvent['event_type'], number> = {
  shooting: 0,
  deadline: 1,
  posting: 2,
  milestone: 3,
}

export default function BrandJadwalPage() {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('per_brand')
  const { data: items = [], isLoading } = useAllBrandsSchedule(workspaceId)

  function openEvent(e: ScheduleEvent) {
    if (e.href) router.push(e.href)
  }

  const groupedByBrand = useMemo(() => {
    const groups: Record<string, { brandName: string; items: ScheduleEvent[] }> = {}
    for (const item of items) {
      const key = item.brand_id || 'unknown'
      if (!groups[key]) groups[key] = { brandName: item.brandName || 'Tanpa Brand', items: [] }
      groups[key].items.push(item)
    }
    return Object.values(groups).sort((a, b) => (a.items[0]?.date || '').localeCompare(b.items[0]?.date || ''))
  }, [items])

  const groupedByDate = useMemo(() => {
    const groups: Record<string, ScheduleEvent[]> = {}
    for (const item of items) (groups[item.date] ??= []).push(item)
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dateItems]) => ({
        date,
        items: [...dateItems].sort((a, b) => EVENT_TYPE_ORDER[a.event_type] - EVENT_TYPE_ORDER[b.event_type]),
      }))
  }, [items])

  return (
    <PageContainer className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/brand')} className="p-1.5 rounded-lg border border-border bg-white hover:bg-subtle text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader title="Jadwal Brand" subtitle="Shooting, Deadline, Posting, & Milestone SOW — semua Brand" className="mb-0" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <SegmentedTabs options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
        <Button size="sm" variant="outline" onClick={() => router.push('/brand/shooting')} className="gap-1.5 font-semibold">
          <CalendarClock className="w-4 h-4" />
          <span>Kelola Sesi Shooting</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-text-muted">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 text-border" />
          <p className="text-sm font-semibold">Belum ada jadwal</p>
          <p className="text-xs mt-1">Tanggal Shooting/Deadline/Posting Deliverable, Milestone SOW, dan Sesi Shooting akan muncul di sini.</p>
        </div>
      ) : viewMode === 'per_brand' ? (
        <div className="space-y-4">
          {groupedByBrand.map((group) => (
            <div key={group.brandName} className="bg-white border border-border rounded-xl p-5">
              <h3 className="font-heading font-bold text-sm text-text-primary uppercase tracking-wide border-b border-border pb-2.5 mb-2">
                {group.brandName}
              </h3>
              <div className="divide-y divide-border/60">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openEvent(item)}
                    disabled={!item.href}
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-subtle/60 rounded-lg px-2 -mx-2 disabled:hover:bg-transparent"
                  >
                    <span className="text-[11px] font-mono font-semibold text-text-muted w-20 shrink-0">{formatDate(item.date)}</span>
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span className="text-xs font-medium text-text-primary flex-1 min-w-0 truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'kalender' ? (
        <ScheduleCalendarView events={items} onEventClick={openEvent} />
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.date} className="bg-white border border-border rounded-xl p-5">
              <h3 className="font-heading font-bold text-sm text-text-primary uppercase tracking-wide border-b border-border pb-2.5 mb-2">
                {formatDate(group.date)}
              </h3>
              <div className="divide-y divide-border/60">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openEvent(item)}
                    disabled={!item.href}
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-subtle/60 rounded-lg px-2 -mx-2 disabled:hover:bg-transparent"
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span className="text-xs font-semibold text-text-primary shrink-0">{item.brandName || 'Tanpa Brand'}</span>
                    <span className="text-xs text-text-muted flex-1 min-w-0 truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
