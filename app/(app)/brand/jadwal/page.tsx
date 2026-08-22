'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useAllBrandsSchedule } from '@/lib/hooks/useBrandSchedule'
import { PageContainer, PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/formatters'
import { ArrowLeft, CalendarClock, CalendarDays } from 'lucide-react'

// Consolidated, read-only Brand Schedule — the "Jadwal" action from the
// main Brand page. Aggregates Shooting / Deadline / Posting / Milestone
// across ALL brands via useAllBrandsSchedule (same source tables as the
// per-brand Jadwal tab on /brand/[id] — nothing is duplicated here).
// Shooting Session creation/editing stays on its own page (/brand/shooting);
// this view only displays and links out to original records.

export default function BrandJadwalPage() {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const { data: items = [], isLoading } = useAllBrandsSchedule(workspaceId)

  const groupedByBrand = useMemo(() => {
    const groups: Record<string, { brandName: string; items: typeof items }> = {}
    for (const item of items) {
      const key = item.brand_id || 'unknown'
      if (!groups[key]) groups[key] = { brandName: item.brandName || 'Tanpa Brand', items: [] }
      groups[key].items.push(item)
    }
    return Object.values(groups).sort((a, b) => (a.items[0]?.date || '').localeCompare(b.items[0]?.date || ''))
  }, [items])

  return (
    <PageContainer className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/brand')} className="p-1.5 rounded-lg border border-border bg-white hover:bg-subtle text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader title="Jadwal Brand" subtitle="Shooting, Deadline, Posting, & Milestone SOW — semua Brand" className="mb-0" />
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => router.push('/brand/shooting')} className="gap-1.5 font-semibold">
          <CalendarClock className="w-4 h-4" />
          <span>Kelola Sesi Shooting</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : groupedByBrand.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-text-muted">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 text-border" />
          <p className="text-sm font-semibold">Belum ada jadwal</p>
          <p className="text-xs mt-1">Tanggal Shooting/Deadline/Posting Deliverable, Milestone SOW, dan Sesi Shooting akan muncul di sini.</p>
        </div>
      ) : (
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
                    onClick={() => item.href && router.push(item.href)}
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
      )}
    </PageContainer>
  )
}
