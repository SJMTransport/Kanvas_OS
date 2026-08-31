import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getApprovalAgingText, getApprovalSeverity } from '@/lib/utils/workflow'
import { isInvoiceOverdue } from '@/lib/utils/financial'
import { isPublishingFullyDone } from '@/lib/operations/rules'
import type { CalendarEvent } from '@/app/(app)/calendar/types'

// Phase 4 — Operational Calendar aggregation. Every category reads its date
// directly from its real source table (videos, deals, invoices,
// deal_payments) — nothing here is a second copy of the date. Queries run
// in parallel (Promise.all), not one-by-one, to avoid N+1.
//
// If one source query fails, the others must still render — each query is
// individually try/caught and logs to console rather than throwing and
// blanking the whole calendar.

async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`Calendar: failed to load ${label}:`, err)
    return fallback
  }
}

export function useCalendarEvents(workspaceId: string | null, startDate: string, endDate: string) {
  return useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', workspaceId, startDate, endDate],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createClient()
      const today = new Date(new Date().toDateString())
      const events: CalendarEvent[] = []

      const [schedules, videosInRange, deals, invoices, payments, approvalVideos] = await Promise.all([
        safeQuery('publishing schedules', async () => {
          const { data, error } = await supabase
            .from('video_platform_schedules')
            .select('*, videos!inner(id, judul, no_video, thumbnail_url, status, workspace_id, deal_id, deals!deal_id(title, nama_campaign, brands(name, nama_brand)))')
            .eq('videos.workspace_id', workspaceId)
            .gte('tanggal_tayang', startDate)
            .lte('tanggal_tayang', endDate)
          if (error) throw error
          return data ?? []
        }, [] as any[]),

        safeQuery('content shooting/deadline dates', async () => {
          const { data, error } = await supabase
            .from('videos')
            .select(`id, judul, no_video, status, tanggal_shooting, deadline_posting, brand_id, deal_id,
              production_status, approval_status, publishing_status,
              deals!deal_id(id, title, nama_campaign, brands(name, nama_brand)),
              content_deliverables(deal_deliverables(name, platform))`)
            .eq('workspace_id', workspaceId)
            .or(`and(tanggal_shooting.gte.${startDate},tanggal_shooting.lte.${endDate}),and(deadline_posting.gte.${startDate},deadline_posting.lte.${endDate})`)
          if (error) throw error
          return data ?? []
        }, [] as any[]),

        safeQuery('deal start/end dates', async () => {
          const { data, error } = await supabase
            .from('deals')
            .select('id, title, nama_campaign, start_date, tanggal_mulai, end_date, tanggal_selesai, total_value, brand_id, brands(name, nama_brand)')
            .eq('workspace_id', workspaceId)
            .or(`and(start_date.gte.${startDate},start_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate})`)
          if (error) throw error
          return data ?? []
        }, [] as any[]),

        safeQuery('invoice due dates', async () => {
          const { data, error } = await supabase
            .from('invoices')
            .select('id, invoice_number, total, due_date, status, deal_id, brand_id, brands(name, nama_brand), deals(title, nama_campaign)')
            .eq('workspace_id', workspaceId)
            .gte('due_date', startDate).lte('due_date', endDate)
          if (error) throw error
          return data ?? []
        }, [] as any[]),

        safeQuery('payment due dates', async () => {
          const { data, error } = await supabase
            .from('deal_payments')
            .select('id, amount, payment_type, due_date, status, invoice_id, deal_id, deals!inner(title, nama_campaign, workspace_id, brands(name, nama_brand))')
            .eq('deals.workspace_id', workspaceId)
            .gte('due_date', startDate).lte('due_date', endDate)
          if (error) throw error
          return data ?? []
        }, [] as any[]),

        safeQuery('approval waiting/revision', async () => {
          const { data, error } = await supabase
            .from('videos')
            .select(`id, judul, no_video, approval_status, approval_waiting_since, production_status, publishing_status, deal_id,
              deals!deal_id(id, title, nama_campaign, brands(name, nama_brand)),
              content_deliverables(deal_deliverables(name, platform))`)
            .eq('workspace_id', workspaceId)
            .in('approval_status', ['waiting_approval', 'revision_requested'])
            .not('approval_waiting_since', 'is', null)
            .gte('approval_waiting_since', startDate)
            .lte('approval_waiting_since', endDate + 'T23:59:59')
          if (error) throw error
          return data ?? []
        }, [] as any[]),
      ])

      // Deadline visibility rule — a Deadline is only a real action item if
      // the content's publishing obligations are NOT all done. The legacy
      // `videos.status` cannot answer this: migration 030 auto-promotes a
      // video to 'live' the moment ANY single platform schedule gets a
      // url_post, so a 2-platform video with only TikTok posted already
      // reads as 'live' even though Instagram is still outstanding. The
      // only authoritative source for "is EVERY publishing obligation
      // done" is video_platform_schedules.status per row — a video's
      // publishing is complete only if it has at least one schedule and
      // every one of them is 'posted'.
      const deadlineVideoIds = videosInRange
        .filter((v: any) => v.deadline_posting && v.deadline_posting >= startDate && v.deadline_posting <= endDate)
        .map((v: any) => v.id)

      const scheduleStatusesByVideo = await safeQuery('deadline completion check', async () => {
        if (deadlineVideoIds.length === 0) return {} as Record<string, string[]>
        const { data, error } = await supabase
          .from('video_platform_schedules')
          .select('video_id, status')
          .in('video_id', deadlineVideoIds)
        if (error) throw error
        const map: Record<string, string[]> = {}
        for (const row of data ?? []) {
          (map[row.video_id] ??= []).push(row.status)
        }
        return map
      }, {} as Record<string, string[]>)

      function videoPublishingDone(videoId: string): boolean {
        return isPublishingFullyDone(scheduleStatusesByVideo[videoId])
      }

      // Builds the shared Level-1/Level-2 context for a videos row — brand,
      // deal, first linked deliverable, and the 3 workflow dimensions.
      function videoCtx(v: any) {
        const brandName = v.deals?.brands?.name || v.deals?.brands?.nama_brand || null
        const deliverableName = v.content_deliverables?.[0]?.deal_deliverables?.name || null
        return {
          videoNo: v.no_video || null,
          brandName,
          dealId: v.deal_id || v.deals?.id || null,
          dealTitle: v.deals?.title || v.deals?.nama_campaign || null,
          deliverableName,
          productionStatus: v.production_status || null,
          approvalStatus: v.approval_status || null,
          publishingStatus: v.publishing_status || null,
        }
      }
      function videoLabel(v: any) {
        return v.no_video ? `${v.no_video} · ${v.judul ?? 'Video'}` : (v.judul ?? 'Video')
      }

      // ── Publishing ────────────────────────────────────────────────────
      for (const s of schedules) {
        if (s.videos?.workspace_id !== workspaceId) continue
        events.push({
          id: `publishing-${s.id}`,
          category: 'publishing',
          date: s.tanggal_tayang,
          time: s.jam_post,
          title: s.videos ? videoLabel(s.videos) : 'Video',
          subtitle: s.platform,
          href: s.videos?.id ? `/content/${s.videos.id}` : '/content',
          overdue: false,
          severity: 'normal',
          raw: s,
          ctx: s.videos ? videoCtx(s.videos) : undefined,
        })
      }

      // ── Content shooting / deadline ──────────────────────────────────
      for (const v of videosInRange) {
        const ctx = videoCtx(v)
        if (v.tanggal_shooting && v.tanggal_shooting >= startDate && v.tanggal_shooting <= endDate) {
          const dateObj = new Date(v.tanggal_shooting)
          events.push({
            id: `shooting-${v.id}`,
            category: 'shooting',
            date: v.tanggal_shooting,
            title: videoLabel(v),
            subtitle: ctx.brandName || undefined,
            href: `/content/${v.id}`,
            overdue: dateObj < today && !['scheduled', 'live', 'archived'].includes(v.status),
            severity: dateObj < today && !['scheduled', 'live', 'archived'].includes(v.status) ? 'overdue' : 'normal',
            raw: v,
            ctx,
          })
        }
        if (v.deadline_posting && v.deadline_posting >= startDate && v.deadline_posting <= endDate && !videoPublishingDone(v.id)) {
          const dateObj = new Date(v.deadline_posting)
          const isDone = ['live', 'archived'].includes(v.status)
          events.push({
            id: `deadline-${v.id}`,
            category: 'deadline',
            date: v.deadline_posting,
            title: videoLabel(v),
            subtitle: ctx.brandName || undefined,
            href: `/content/${v.id}`,
            overdue: dateObj < today && !isDone,
            severity: dateObj < today && !isDone ? 'overdue' : 'normal',
            raw: v,
            ctx,
          })
        }
      }

      // ── Deal start / end ──────────────────────────────────────────────
      for (const d of deals) {
        const brandName = d.brands?.name || d.brands?.nama_brand || 'Brand'
        const title = d.title || d.nama_campaign || 'Deal'
        const start = d.start_date || d.tanggal_mulai
        const end = d.end_date || d.tanggal_selesai
        const dealCtx = { brandName, dealId: d.id, dealTitle: title }
        if (start && start >= startDate && start <= endDate) {
          events.push({
            id: `deal_start-${d.id}`, category: 'deal_start', date: start,
            title, subtitle: brandName, href: `/brand/deals/${d.id}`,
            overdue: false, severity: 'normal', raw: d, ctx: dealCtx,
          })
        }
        if (end && end >= startDate && end <= endDate) {
          const dateObj = new Date(end)
          events.push({
            id: `deal_end-${d.id}`, category: 'deal_end', date: end,
            title, subtitle: brandName, href: `/brand/deals/${d.id}`,
            overdue: dateObj < today, severity: dateObj < today ? 'attention' : 'normal', raw: d, ctx: dealCtx,
          })
        }
      }

      // ── Invoice due (overdue computed from real outstanding, per
      // financial.ts's own rule — a stored status='overdue' is never
      // trusted on its own) ──────────────────────────────────────────────
      for (const inv of invoices) {
        if (!inv.due_date) continue
        const brandName = inv.brands?.name || inv.brands?.nama_brand || 'Brand'
        const dealTitle = inv.deals?.title || inv.deals?.nama_campaign
        const overdue = inv.status !== 'paid' && inv.status !== 'cancelled' && isInvoiceOverdue(inv, 0)
        events.push({
          id: `invoice_due-${inv.id}`,
          category: 'invoice_due',
          date: inv.due_date,
          title: `${inv.invoice_number} — ${brandName}`,
          subtitle: dealTitle,
          href: `/brand/deals/${inv.deal_id}`,
          overdue,
          severity: overdue ? 'overdue' : inv.status === 'paid' ? 'normal' : 'attention',
          raw: inv,
          ctx: { brandName, dealId: inv.deal_id || null, dealTitle: dealTitle || null },
        })
      }

      // ── Payment due ───────────────────────────────────────────────────
      for (const p of payments) {
        if (!p.due_date) continue
        const brandName = p.deals?.brands?.name || p.deals?.brands?.nama_brand || 'Brand'
        const dealTitle = p.deals?.title || p.deals?.nama_campaign
        const overdue = p.status !== 'paid' && new Date(p.due_date) < today
        events.push({
          id: `payment_due-${p.id}`,
          category: 'payment_due',
          date: p.due_date,
          title: `${p.payment_type?.toUpperCase()} — ${brandName}`,
          subtitle: dealTitle,
          href: `/brand/deals/${p.deal_id}`,
          overdue,
          severity: overdue ? 'overdue' : p.status === 'paid' ? 'normal' : 'attention',
          raw: p,
          ctx: { brandName, dealId: p.deal_id || null, dealTitle: dealTitle || null },
        })
      }

      // ── Waiting approval / revision — pinned to the day the state
      // began (approval_waiting_since), using the exact aging logic
      // already built in Phase 2's lib/utils/workflow.ts. Note:
      // revision_requested reuses the same timestamp (the schema has no
      // separate "revision requested at" column) — the aging shown for a
      // revision item is therefore "time since it last entered the
      // approval cycle", not strictly "time since revision was requested".
      // This is a known limitation of the current data model, not a bug.
      for (const v of approvalVideos as any[]) {
        const sinceDate = (v.approval_waiting_since as string).split('T')[0]
        if (sinceDate < startDate || sinceDate > endDate) continue
        const ctx = videoCtx(v)
        if (v.approval_status === 'waiting_approval') {
          const severity = getApprovalSeverity(v.approval_waiting_since)
          events.push({
            id: `waiting_approval-${v.id}`,
            category: 'waiting_approval',
            date: sinceDate,
            title: videoLabel(v),
            subtitle: getApprovalAgingText(v.approval_waiting_since),
            href: `/content/${v.id}`,
            overdue: severity === 'overdue',
            severity,
            raw: v,
            ctx,
          })
        }
        if (v.approval_status === 'revision_requested') {
          events.push({
            id: `revision-${v.id}`,
            category: 'revision',
            date: sinceDate,
            title: videoLabel(v),
            subtitle: 'Revision requested',
            href: `/content/${v.id}`,
            overdue: false,
            severity: 'attention',
            raw: v,
            ctx,
          })
        }
      }

      return events.sort((a, b) => a.date.localeCompare(b.date))
    },
  })
}
