import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getApprovalAgingText, getApprovalSeverity } from '@/lib/utils/workflow'
import { isInvoiceOverdue } from '@/lib/utils/financial'
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
            .select('*, videos!inner(id, judul, thumbnail_url, status, workspace_id)')
            .eq('videos.workspace_id', workspaceId)
            .gte('tanggal_tayang', startDate)
            .lte('tanggal_tayang', endDate)
          if (error) throw error
          return data ?? []
        }, [] as any[]),

        safeQuery('content shooting/deadline dates', async () => {
          const { data, error } = await supabase
            .from('videos')
            .select('id, judul, no_video, status, tanggal_shooting, deadline_posting, brand_id')
            .eq('workspace_id', workspaceId)
            .or(`and(tanggal_shooting.gte.${startDate},tanggal_shooting.lte.${endDate}),and(deadline_posting.gte.${startDate},deadline_posting.lte.${endDate})`)
          if (error) throw error
          return data ?? []
        }, [] as any[]),

        safeQuery('deal start/end dates', async () => {
          const { data, error } = await supabase
            .from('deals')
            .select('id, title, nama_campaign, start_date, tanggal_mulai, end_date, tanggal_selesai, brand_id, brands(name, nama_brand)')
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
            .select('id, judul, approval_status, approval_waiting_since')
            .eq('workspace_id', workspaceId)
            .in('approval_status', ['waiting_approval', 'revision_requested'])
            .not('approval_waiting_since', 'is', null)
            .gte('approval_waiting_since', startDate)
            .lte('approval_waiting_since', endDate + 'T23:59:59')
          if (error) throw error
          return data ?? []
        }, [] as any[]),
      ])

      // ── Publishing ────────────────────────────────────────────────────
      for (const s of schedules) {
        if (s.videos?.workspace_id !== workspaceId) continue
        events.push({
          id: `publishing-${s.id}`,
          category: 'publishing',
          date: s.tanggal_tayang,
          time: s.jam_post,
          title: s.videos?.judul ?? 'Video',
          subtitle: s.platform,
          href: s.videos?.id ? `/content/${s.videos.id}` : '/content',
          overdue: false,
          severity: 'normal',
          raw: s,
        })
      }

      // ── Content shooting / deadline ──────────────────────────────────
      for (const v of videosInRange) {
        if (v.tanggal_shooting && v.tanggal_shooting >= startDate && v.tanggal_shooting <= endDate) {
          const dateObj = new Date(v.tanggal_shooting)
          events.push({
            id: `shooting-${v.id}`,
            category: 'shooting',
            date: v.tanggal_shooting,
            title: v.judul ?? 'Video',
            subtitle: v.no_video || undefined,
            href: `/content/${v.id}`,
            overdue: dateObj < today && !['scheduled', 'live', 'archived'].includes(v.status),
            severity: dateObj < today && !['scheduled', 'live', 'archived'].includes(v.status) ? 'overdue' : 'normal',
            raw: v,
          })
        }
        if (v.deadline_posting && v.deadline_posting >= startDate && v.deadline_posting <= endDate) {
          const dateObj = new Date(v.deadline_posting)
          const isDone = ['live', 'archived'].includes(v.status)
          events.push({
            id: `deadline-${v.id}`,
            category: 'deadline',
            date: v.deadline_posting,
            title: v.judul ?? 'Video',
            subtitle: v.no_video || undefined,
            href: `/content/${v.id}`,
            overdue: dateObj < today && !isDone,
            severity: dateObj < today && !isDone ? 'overdue' : 'normal',
            raw: v,
          })
        }
      }

      // ── Deal start / end ──────────────────────────────────────────────
      for (const d of deals) {
        const brandName = d.brands?.name || d.brands?.nama_brand || 'Brand'
        const title = d.title || d.nama_campaign || 'Deal'
        const start = d.start_date || d.tanggal_mulai
        const end = d.end_date || d.tanggal_selesai
        if (start && start >= startDate && start <= endDate) {
          events.push({
            id: `deal_start-${d.id}`, category: 'deal_start', date: start,
            title, subtitle: brandName, href: `/brand/deals/${d.id}`,
            overdue: false, severity: 'normal', raw: d,
          })
        }
        if (end && end >= startDate && end <= endDate) {
          const dateObj = new Date(end)
          events.push({
            id: `deal_end-${d.id}`, category: 'deal_end', date: end,
            title, subtitle: brandName, href: `/brand/deals/${d.id}`,
            overdue: dateObj < today, severity: dateObj < today ? 'attention' : 'normal', raw: d,
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
        if (v.approval_status === 'waiting_approval') {
          const severity = getApprovalSeverity(v.approval_waiting_since)
          events.push({
            id: `waiting_approval-${v.id}`,
            category: 'waiting_approval',
            date: sinceDate,
            title: v.judul ?? 'Video',
            subtitle: getApprovalAgingText(v.approval_waiting_since),
            href: `/content/${v.id}`,
            overdue: severity === 'overdue',
            severity,
            raw: v,
          })
        }
        if (v.approval_status === 'revision_requested') {
          events.push({
            id: `revision-${v.id}`,
            category: 'revision',
            date: sinceDate,
            title: v.judul ?? 'Video',
            subtitle: 'Revision requested',
            href: `/content/${v.id}`,
            overdue: false,
            severity: 'attention',
            raw: v,
          })
        }
      }

      return events.sort((a, b) => a.date.localeCompare(b.date))
    },
  })
}
