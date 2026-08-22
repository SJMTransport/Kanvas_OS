import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ============================================================================
// Shared Schedule Engine (Phase 1)
// ============================================================================
// ONE SOURCE OF TRUTH -> MULTIPLE VIEWS.
//
// This is the single aggregation layer for "what's scheduled" across Brand
// Schedule and Dashboard. It reads dates directly from their real source
// tables — deal_deliverables, deal_schedules, shooting_sessions,
// video_platform_schedules — every time it runs. Nothing here is stored;
// there is no schedule table. If a source date changes, the next fetch of
// this function reflects it automatically.
//
// Content Calendar (lib/hooks/useCalendarEvents.ts) is intentionally NOT
// merged into this engine — it has its own drag-to-reschedule/approval-aging
// concerns this engine doesn't need. invoice_due/payment_due (deal_payments,
// invoices) were added on top of the original 4 categories (shooting/
// deadline/posting/milestone) the same additive way — no schema change, no
// new fetch layer, just more event_type branches over existing tables.

export type ScheduleEventType = 'shooting' | 'deadline' | 'posting' | 'milestone' | 'payment_due' | 'invoice_due'
export type ScheduleSourceType = 'deliverable' | 'shooting_session' | 'platform_schedule' | 'milestone' | 'content' | 'payment' | 'invoice'

export interface ScheduleEvent {
  id: string
  event_type: ScheduleEventType
  date: string
  source_type: ScheduleSourceType
  source_id: string
  brand_id: string | null
  deal_id: string | null
  deliverable_id: string | null
  content_id: string | null
  title: string
  label: string
  icon: string
  href: string
  brandName?: string
}

function brandNameOf(b: any): string {
  return b?.name || b?.nama_brand || 'Brand'
}

interface FetchScope {
  brandId?: string | null
  workspaceId?: string | null
  /** Inclusive date range (YYYY-MM-DD). Omit for no bound. */
  startDate?: string
  endDate?: string
}

function inRange(date: string | null | undefined, scope: FetchScope): boolean {
  if (!date) return false
  if (scope.startDate && date < scope.startDate) return false
  if (scope.endDate && date > scope.endDate) return false
  return true
}

// Core fetch — reused by every hook below. Scoped to exactly one brand OR
// one workspace (never unscoped), preserving the workspace isolation
// already enforced by the rest of the app.
async function fetchScheduleEvents(scope: FetchScope): Promise<ScheduleEvent[]> {
  const supabase = createClient()
  const events: ScheduleEvent[] = []
  const scopedToOneBrand = !!scope.brandId

  const dealsQuery = supabase.from('deals').select('id, brand_id, brands(name, nama_brand)')
  const { data: deals, error: dealsError } = scopedToOneBrand
    ? await dealsQuery.eq('brand_id', scope.brandId as string)
    : await dealsQuery.eq('workspace_id', scope.workspaceId as string)
  // Each source below is independent — one failing (e.g. a column/table
  // from a not-yet-applied migration) must not blank out categories that
  // don't depend on it. Log and degrade that one category to empty,
  // exactly like this aggregation behaved before this file existed.
  if (dealsError) console.error('ScheduleEvents: failed to load deals:', dealsError)

  const dealIds = (deals ?? []).map((d: any) => d.id)
  const brandByDeal = new Map<string, { brandId: string; brandName: string }>(
    (deals ?? []).map((d: any) => [d.id, { brandId: d.brand_id, brandName: brandNameOf(d.brands) }])
  )

  if (dealIds.length > 0) {
    const [{ data: deliverables, error: delivErr }, { data: milestones, error: msErr }] = await Promise.all([
      supabase.from('deal_deliverables').select('id, deal_id, name, shooting_date, deadline, posting_date').in('deal_id', dealIds),
      supabase.from('deal_schedules').select('id, deal_id, title, date, type').in('deal_id', dealIds),
    ])
    if (delivErr) console.error('ScheduleEvents: failed to load deal_deliverables (shooting_date/posting_date require migrations 038/039):', delivErr)
    if (msErr) console.error('ScheduleEvents: failed to load deal_schedules (milestones):', msErr)

    for (const d of deliverables ?? []) {
      const b = brandByDeal.get(d.deal_id)
      if (inRange(d.shooting_date, scope)) {
        events.push({
          id: `deliverable_shooting-${d.id}`,
          event_type: 'shooting',
          date: d.shooting_date,
          source_type: 'deliverable',
          source_id: d.id,
          brand_id: b?.brandId ?? null,
          deal_id: d.deal_id,
          deliverable_id: d.id,
          content_id: null,
          title: d.name,
          label: `Shooting — ${d.name}`,
          icon: '🎥',
          href: `/brand/deals/${d.deal_id}`,
          brandName: b?.brandName,
        })
      }
      if (inRange(d.deadline, scope)) {
        events.push({
          id: `deliverable_deadline-${d.id}`,
          event_type: 'deadline',
          date: d.deadline,
          source_type: 'deliverable',
          source_id: d.id,
          brand_id: b?.brandId ?? null,
          deal_id: d.deal_id,
          deliverable_id: d.id,
          content_id: null,
          title: d.name,
          label: `Deadline — ${d.name}`,
          icon: '🔴',
          href: `/brand/deals/${d.deal_id}`,
          brandName: b?.brandName,
        })
      }
      if (inRange(d.posting_date, scope)) {
        events.push({
          id: `deliverable_posting-${d.id}`,
          event_type: 'posting',
          date: d.posting_date,
          source_type: 'deliverable',
          source_id: d.id,
          brand_id: b?.brandId ?? null,
          deal_id: d.deal_id,
          deliverable_id: d.id,
          content_id: null,
          title: d.name,
          label: `Posting (Rencana) — ${d.name}`,
          icon: '📤',
          href: `/brand/deals/${d.deal_id}`,
          brandName: b?.brandName,
        })
      }
    }

    for (const m of milestones ?? []) {
      if (!inRange(m.date, scope)) continue
      const b = brandByDeal.get(m.deal_id)
      events.push({
        id: `milestone-${m.id}`,
        event_type: 'milestone',
        date: m.date,
        source_type: 'milestone',
        source_id: m.id,
        brand_id: b?.brandId ?? null,
        deal_id: m.deal_id,
        deliverable_id: null,
        content_id: null,
        title: m.title,
        label: m.title,
        icon: '📌',
        href: `/brand/deals/${m.deal_id}`,
        brandName: b?.brandName,
      })
    }

    const { data: payments, error: payErr } = await supabase
      .from('deal_payments')
      .select('id, deal_id, amount, payment_type, due_date, status')
      .in('deal_id', dealIds)
    if (payErr) console.error('ScheduleEvents: failed to load deal_payments:', payErr)

    for (const p of payments ?? []) {
      if (!inRange(p.due_date, scope)) continue
      const b = brandByDeal.get(p.deal_id)
      events.push({
        id: `payment_due-${p.id}`,
        event_type: 'payment_due',
        date: p.due_date,
        source_type: 'payment',
        source_id: p.id,
        brand_id: b?.brandId ?? null,
        deal_id: p.deal_id,
        deliverable_id: null,
        content_id: null,
        title: `${p.payment_type?.toUpperCase() || 'Payment'} — ${b?.brandName || 'Brand'}`,
        label: `Payment (${p.payment_type}) — ${b?.brandName || 'Brand'}`,
        icon: '💰',
        href: `/brand/deals/${p.deal_id}`,
        brandName: b?.brandName,
      })
    }
  }

  const invoicesQuery = supabase
    .from('invoices')
    .select('id, invoice_number, total, due_date, status, deal_id, brand_id, brands(name, nama_brand)')
  const { data: invoices, error: invErr } = scopedToOneBrand
    ? await invoicesQuery.eq('brand_id', scope.brandId as string)
    : await invoicesQuery.eq('workspace_id', scope.workspaceId as string)
  if (invErr) console.error('ScheduleEvents: failed to load invoices:', invErr)

  for (const inv of invoices ?? []) {
    if (!inRange(inv.due_date, scope)) continue
    if (inv.status === 'paid' || inv.status === 'cancelled') continue
    const brandName = inv.brands ? brandNameOf(inv.brands) : undefined
    events.push({
      id: `invoice_due-${inv.id}`,
      event_type: 'invoice_due',
      date: inv.due_date,
      source_type: 'invoice',
      source_id: inv.id,
      brand_id: inv.brand_id ?? null,
      deal_id: inv.deal_id ?? null,
      deliverable_id: null,
      content_id: null,
      title: `Invoice ${inv.invoice_number} — ${brandName || 'Brand'}`,
      label: `Invoice Due (${inv.invoice_number}) — ${brandName || 'Brand'}`,
      icon: '🧾',
      href: inv.deal_id ? `/brand/deals/${inv.deal_id}` : (inv.brand_id ? `/brand/${inv.brand_id}` : '/brand'),
      brandName,
    })
  }

  // videos.brand_id has no real foreign-key constraint to brands (unlike
  // deals.brand_id/invoices.brand_id, which do) — it's a plain UUID
  // column, always was. PostgREST can only auto-embed a related table
  // over an actual FK, so `brands(...)` on this select fails outright
  // ("Could not find a relationship between 'videos' and 'brands'"),
  // taking down every event below it. Resolved with a small separate
  // brand-name lookup instead of an embed.
  const videosQuery = supabase
    .from('videos')
    .select('id, no_video, judul, tanggal_shooting, deadline_posting, shooting_session_id, deal_id, brand_id')
    .not('status', 'eq', 'archived')
  const { data: videos, error: videosError } = scopedToOneBrand
    ? await videosQuery.eq('brand_id', scope.brandId as string)
    : await videosQuery.eq('workspace_id', scope.workspaceId as string)
  if (videosError) console.error('ScheduleEvents: failed to load videos:', videosError)

  const videoBrandIds = Array.from(new Set((videos ?? []).map((v: any) => v.brand_id).filter(Boolean))) as string[]
  const brandNameById = new Map<string, string>()
  for (const [, b] of brandByDeal) brandNameById.set(b.brandId, b.brandName)
  const missingBrandIds = videoBrandIds.filter((id) => !brandNameById.has(id))
  if (missingBrandIds.length > 0) {
    const { data: extraBrands, error: extraBrandsError } = await supabase
      .from('brands')
      .select('id, name, nama_brand')
      .in('id', missingBrandIds)
    if (extraBrandsError) console.error('ScheduleEvents: failed to load brand names for videos:', extraBrandsError)
    for (const b of extraBrands ?? []) brandNameById.set(b.id, brandNameOf(b))
  }

  const videoLabel = (v: any) => (v.no_video ? `${v.no_video} — ${v.judul}` : v.judul || 'Content')

  for (const v of videos ?? []) {
    // Content's own recorded shoot date — independent of any Deliverable
    // (shooting_date) or Shooting Session (session_date). Deliberately
    // NOT merged/deduped against those: a Content row can have all three
    // set to different dates (planned Deliverable date, actual Session
    // date, and its own tanggal_shooting), and each represents a
    // distinct fact that must stay individually visible.
    if (inRange(v.tanggal_shooting, scope)) {
      events.push({
        id: `content_shooting-${v.id}`,
        event_type: 'shooting',
        date: v.tanggal_shooting,
        source_type: 'content',
        source_id: v.id,
        brand_id: v.brand_id ?? null,
        deal_id: v.deal_id ?? null,
        deliverable_id: null,
        content_id: v.id,
        title: videoLabel(v),
        label: `Shooting Content — ${videoLabel(v)}`,
        icon: '🎥',
        href: `/content/${v.id}`,
        brandName: v.brand_id ? brandNameById.get(v.brand_id) : undefined,
      })
    }
    if (inRange(v.deadline_posting, scope)) {
      events.push({
        id: `content_deadline-${v.id}`,
        event_type: 'deadline',
        date: v.deadline_posting,
        source_type: 'content',
        source_id: v.id,
        brand_id: v.brand_id ?? null,
        deal_id: v.deal_id ?? null,
        deliverable_id: null,
        content_id: v.id,
        title: videoLabel(v),
        label: `Deadline Content — ${videoLabel(v)}`,
        icon: '🔴',
        href: `/content/${v.id}`,
        brandName: v.brand_id ? brandNameById.get(v.brand_id) : undefined,
      })
    }
  }

  // Joined via videos!inner(...) and scoped the same way as the videos
  // query above — NOT `.in('video_id', videoIds)`, which for a workspace
  // with hundreds of videos builds a URL far past normal length limits
  // and fails outright (silently, since every source here only logs and
  // degrades). This mirrors the safe join pattern already used by
  // lib/hooks/useCalendarEvents.ts for the same table.
  {
    let schedulesQuery = supabase
      .from('video_platform_schedules')
      .select('id, tanggal_tayang, platform, video_id, videos!inner(workspace_id, brand_id)')
    schedulesQuery = scopedToOneBrand
      ? schedulesQuery.eq('videos.brand_id', scope.brandId as string)
      : schedulesQuery.eq('videos.workspace_id', scope.workspaceId as string)
    if (scope.startDate) schedulesQuery = schedulesQuery.gte('tanggal_tayang', scope.startDate)
    if (scope.endDate) schedulesQuery = schedulesQuery.lte('tanggal_tayang', scope.endDate)
    const { data: schedules, error: schedulesError } = await schedulesQuery
    if (schedulesError) console.error('ScheduleEvents: failed to load video_platform_schedules:', schedulesError)

    for (const s of schedules ?? []) {
      if (!s.tanggal_tayang) continue
      const v = (videos ?? []).find((vv: any) => vv.id === s.video_id)
      events.push({
        id: `publishing-${s.id}`,
        event_type: 'posting',
        date: s.tanggal_tayang,
        source_type: 'platform_schedule',
        source_id: s.id,
        brand_id: v?.brand_id ?? null,
        deal_id: v?.deal_id ?? null,
        deliverable_id: null,
        content_id: v?.id ?? null,
        title: v ? videoLabel(v) : 'Content',
        label: `Posting (${s.platform}) — ${v ? videoLabel(v) : 'Content'}`,
        icon: '📤',
        href: v ? `/content/${v.id}` : '/content',
        brandName: v?.brand_id ? brandNameById.get(v.brand_id) : undefined,
      })
    }
  }

  const sessionIds = Array.from(new Set((videos ?? []).map((v: any) => v.shooting_session_id).filter(Boolean))) as string[]
  if (sessionIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from('shooting_sessions')
      .select('id, session_date')
      .in('id', sessionIds)
    if (sessionsError) console.error('ScheduleEvents: failed to load shooting_sessions (requires migration 036):', sessionsError)

    for (const s of sessions ?? []) {
      if (!inRange(s.session_date, scope)) continue
      const linked = (videos ?? []).filter((v: any) => v.shooting_session_id === s.id)
      const first = linked[0]
      events.push({
        id: `shooting_session-${s.id}`,
        event_type: 'shooting',
        date: s.session_date,
        source_type: 'shooting_session',
        source_id: s.id,
        brand_id: first?.brand_id ?? null,
        deal_id: first?.deal_id ?? null,
        deliverable_id: null,
        content_id: linked.length === 1 ? linked[0].id : null,
        title: `Sesi Shooting — ${linked.map(videoLabel).join(', ')}`,
        label: `Sesi Shooting — ${linked.map(videoLabel).join(', ')}`,
        icon: '🎥',
        href: '/brand/shooting',
        brandName: first?.brand_id ? brandNameById.get(first.brand_id) : undefined,
      })
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}

// -- Brand Schedule (single brand) — used by /brand/[id]'s Jadwal tab -------
export function useBrandScheduleEvents(brandId: string | null) {
  return useQuery<ScheduleEvent[]>({
    queryKey: ['schedule-events', 'brand', brandId],
    enabled: !!brandId,
    queryFn: () => fetchScheduleEvents({ brandId }),
  })
}

// -- Brand Schedule (all brands) — used by /brand/jadwal --------------------
export function useAllBrandsScheduleEvents(workspaceId: string | null) {
  return useQuery<ScheduleEvent[]>({
    queryKey: ['schedule-events', 'all-brands', workspaceId],
    enabled: !!workspaceId,
    queryFn: () => fetchScheduleEvents({ workspaceId }),
  })
}

// -- Workspace, date-bounded — used by Dashboard's schedule widget ---------
export function useWorkspaceScheduleEvents(workspaceId: string | null, startDate: string, endDate: string) {
  return useQuery<ScheduleEvent[]>({
    queryKey: ['schedule-events', 'workspace-range', workspaceId, startDate, endDate],
    enabled: !!workspaceId,
    queryFn: () => fetchScheduleEvents({ workspaceId, startDate, endDate }),
  })
}
