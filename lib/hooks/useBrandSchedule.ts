import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// Brand -> Jadwal aggregation. Every item reads its date directly from its
// real source record (deal_deliverables, deal_schedules, shooting_sessions,
// video_platform_schedules, videos) — this is a read-only aggregation
// layer, never a second copy/source of truth for any of these dates.
//
// Two entry points share the same fetch logic:
//   - useBrandSchedule(brandId)         -> single Brand's Jadwal tab
//   - useAllBrandsSchedule(workspaceId) -> workspace-wide Jadwal page,
//     grouped by Brand (items additionally carry brandId/brandName)

export type BrandScheduleCategory =
  | 'deliverable_shooting'
  | 'deliverable_deadline'
  | 'deliverable_posting'
  | 'content_deadline'
  | 'publishing'
  | 'milestone'
  | 'shooting_session'

export interface BrandScheduleItem {
  id: string
  category: BrandScheduleCategory
  date: string
  icon: string
  label: string
  sublabel?: string
  href: string
  brandId?: string
  brandName?: string
}

function brandNameOf(b: any): string {
  return b?.name || b?.nama_brand || 'Brand'
}

async function fetchScheduleItems(opts: { brandId?: string | null; workspaceId?: string | null }): Promise<BrandScheduleItem[]> {
  const supabase = createClient()
  const items: BrandScheduleItem[] = []
  const scopedToOneBrand = !!opts.brandId

  const dealsQuery = supabase.from('deals').select('id, brand_id, brands(name, nama_brand)')
  const { data: deals } = scopedToOneBrand
    ? await dealsQuery.eq('brand_id', opts.brandId as string)
    : await dealsQuery.eq('workspace_id', opts.workspaceId as string)
  const dealIds = (deals ?? []).map((d: any) => d.id)
  const brandByDeal = new Map<string, { brandId: string; brandName: string }>(
    (deals ?? []).map((d: any) => [d.id, { brandId: d.brand_id, brandName: brandNameOf(d.brands) }])
  )

  if (dealIds.length > 0) {
    const [{ data: deliverables }, { data: milestones }] = await Promise.all([
      supabase.from('deal_deliverables').select('id, deal_id, name, shooting_date, deadline, posting_date').in('deal_id', dealIds),
      supabase.from('deal_schedules').select('id, deal_id, title, date, type').in('deal_id', dealIds),
    ])

    for (const d of deliverables ?? []) {
      const b = brandByDeal.get(d.deal_id)
      if (d.shooting_date) {
        items.push({
          id: `deliverable_shooting-${d.id}`,
          category: 'deliverable_shooting',
          date: d.shooting_date,
          icon: '🎥',
          label: `Shooting — ${d.name}`,
          href: `/brand/deals/${d.deal_id}`,
          brandId: b?.brandId,
          brandName: b?.brandName,
        })
      }
      if (d.deadline) {
        items.push({
          id: `deliverable_deadline-${d.id}`,
          category: 'deliverable_deadline',
          date: d.deadline,
          icon: '🔴',
          label: `Deadline — ${d.name}`,
          href: `/brand/deals/${d.deal_id}`,
          brandId: b?.brandId,
          brandName: b?.brandName,
        })
      }
      if (d.posting_date) {
        items.push({
          id: `deliverable_posting-${d.id}`,
          category: 'deliverable_posting',
          date: d.posting_date,
          icon: '📤',
          label: `Posting (Rencana) — ${d.name}`,
          href: `/brand/deals/${d.deal_id}`,
          brandId: b?.brandId,
          brandName: b?.brandName,
        })
      }
    }

    for (const m of milestones ?? []) {
      const b = brandByDeal.get(m.deal_id)
      items.push({
        id: `milestone-${m.id}`,
        category: 'milestone',
        date: m.date,
        icon: '📌',
        label: m.title,
        sublabel: m.type,
        href: `/brand/deals/${m.deal_id}`,
        brandId: b?.brandId,
        brandName: b?.brandName,
      })
    }
  }

  const videosQuery = supabase
    .from('videos')
    .select('id, no_video, judul, deadline_posting, shooting_session_id, deal_id, brand_id, brands(name, nama_brand)')
    .not('status', 'eq', 'archived')
  const { data: videos } = scopedToOneBrand
    ? await videosQuery.eq('brand_id', opts.brandId as string)
    : await videosQuery.eq('workspace_id', opts.workspaceId as string)

  const videoLabel = (v: any) => (v.no_video ? `${v.no_video} — ${v.judul}` : v.judul || 'Content')

  for (const v of videos ?? []) {
    if (v.deadline_posting) {
      items.push({
        id: `content_deadline-${v.id}`,
        category: 'content_deadline',
        date: v.deadline_posting,
        icon: '🔴',
        label: `Deadline Content — ${videoLabel(v)}`,
        href: `/content/${v.id}`,
        brandId: v.brand_id || undefined,
        brandName: v.brands ? brandNameOf(v.brands) : undefined,
      })
    }
  }

  const videoIds = (videos ?? []).map((v: any) => v.id)
  if (videoIds.length > 0) {
    const { data: schedules } = await supabase
      .from('video_platform_schedules')
      .select('id, tanggal_tayang, platform, video_id')
      .in('video_id', videoIds)
    for (const s of schedules ?? []) {
      if (!s.tanggal_tayang) continue
      const v = (videos ?? []).find((vv: any) => vv.id === s.video_id)
      items.push({
        id: `publishing-${s.id}`,
        category: 'publishing',
        date: s.tanggal_tayang,
        icon: '📤',
        label: `Posting (${s.platform}) — ${v ? videoLabel(v) : 'Content'}`,
        href: v ? `/content/${v.id}` : '/content',
        brandId: v?.brand_id || undefined,
        brandName: v?.brands ? brandNameOf(v.brands) : undefined,
      })
    }
  }

  const sessionIds = Array.from(new Set((videos ?? []).map((v: any) => v.shooting_session_id).filter(Boolean))) as string[]
  if (sessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from('shooting_sessions')
      .select('id, session_date')
      .in('id', sessionIds)
    for (const s of sessions ?? []) {
      const linked = (videos ?? []).filter((v: any) => v.shooting_session_id === s.id)
      const b = linked[0]
      items.push({
        id: `shooting_session-${s.id}`,
        category: 'shooting_session',
        date: s.session_date,
        icon: '🎥',
        label: `Sesi Shooting — ${linked.map(videoLabel).join(', ')}`,
        href: '/brand/shooting',
        brandId: b?.brand_id || undefined,
        brandName: b?.brands ? brandNameOf(b.brands) : undefined,
      })
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date))
}

export function useBrandSchedule(brandId: string | null) {
  return useQuery<BrandScheduleItem[]>({
    queryKey: ['brand-schedule', brandId],
    enabled: !!brandId,
    queryFn: () => fetchScheduleItems({ brandId }),
  })
}

// Workspace-wide aggregation across ALL brands, for the main Brand page's
// "Jadwal" action. Same source tables, same fetchScheduleItems — just
// scoped by workspace instead of a single brand_id.
export function useAllBrandsSchedule(workspaceId: string | null) {
  return useQuery<BrandScheduleItem[]>({
    queryKey: ['brand-schedule', 'all', workspaceId],
    enabled: !!workspaceId,
    queryFn: () => fetchScheduleItems({ workspaceId }),
  })
}
