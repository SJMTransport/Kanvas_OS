import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// Brand -> Jadwal aggregation. Every item reads its date directly from its
// real source record (deal_deliverables, deal_schedules, shooting_sessions,
// video_platform_schedules, videos) — this is a read-only aggregation
// layer, never a second copy/source of truth for any of these dates.

export type BrandScheduleCategory =
  | 'deliverable_shooting'
  | 'deliverable_deadline'
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
}

export function useBrandSchedule(brandId: string | null) {
  return useQuery<BrandScheduleItem[]>({
    queryKey: ['brand-schedule', brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const supabase = createClient()
      const items: BrandScheduleItem[] = []

      const { data: deals } = await supabase.from('deals').select('id').eq('brand_id', brandId)
      const dealIds = (deals ?? []).map((d: any) => d.id)

      if (dealIds.length > 0) {
        const [{ data: deliverables }, { data: milestones }] = await Promise.all([
          supabase.from('deal_deliverables').select('id, deal_id, name, shooting_date, deadline').in('deal_id', dealIds),
          supabase.from('deal_schedules').select('id, deal_id, title, date, type').in('deal_id', dealIds),
        ])

        for (const d of deliverables ?? []) {
          if (d.shooting_date) {
            items.push({
              id: `deliverable_shooting-${d.id}`,
              category: 'deliverable_shooting',
              date: d.shooting_date,
              icon: '🎥',
              label: `Shooting — ${d.name}`,
              href: `/brand/deals/${d.deal_id}`,
            })
          }
          if (d.deadline) {
            items.push({
              id: `deliverable_deadline-${d.id}`,
              category: 'deliverable_deadline',
              date: d.deadline,
              icon: '🎯',
              label: `Deadline — ${d.name}`,
              href: `/brand/deals/${d.deal_id}`,
            })
          }
        }

        for (const m of milestones ?? []) {
          items.push({
            id: `milestone-${m.id}`,
            category: 'milestone',
            date: m.date,
            icon: '📌',
            label: m.title,
            sublabel: m.type,
            href: `/brand/deals/${m.deal_id}`,
          })
        }
      }

      const { data: videos } = await supabase
        .from('videos')
        .select('id, no_video, judul, deadline_posting, shooting_session_id, deal_id')
        .eq('brand_id', brandId)
        .not('status', 'eq', 'archived')

      const videoLabel = (v: any) => (v.no_video ? `${v.no_video} — ${v.judul}` : v.judul || 'Content')

      for (const v of videos ?? []) {
        if (v.deadline_posting) {
          items.push({
            id: `content_deadline-${v.id}`,
            category: 'content_deadline',
            date: v.deadline_posting,
            icon: '🎯',
            label: `Deadline Content — ${videoLabel(v)}`,
            href: `/content/${v.id}`,
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
            icon: '📅',
            label: `Publish (${s.platform}) — ${v ? videoLabel(v) : 'Content'}`,
            href: v ? `/content/${v.id}` : '/content',
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
          items.push({
            id: `shooting_session-${s.id}`,
            category: 'shooting_session',
            date: s.session_date,
            icon: '🎥',
            label: `Sesi Shooting — ${linked.map(videoLabel).join(', ')}`,
            href: '/brand/shooting',
          })
        }
      }

      return items.sort((a, b) => a.date.localeCompare(b.date))
    },
  })
}
