// Phase 5 — the ONE centralized operational rule engine. Dashboard's Action
// Center and (indirectly, via the same underlying utilities) Calendar must
// never disagree about what counts as overdue/waiting/ready — this module
// is the single place that turns raw workflow/financial data into
// actionable items. It does not recompute anything itself: every judgment
// call (overdue invoice, approval aging, ready-to-publish) is delegated to
// the existing Phase 2/3.5 utilities so there is exactly one implementation
// of each rule anywhere in the app.

import { differenceInDays } from 'date-fns'
import { getApprovalAgingText, getApprovalSeverity, isReadyToPublish } from '@/lib/utils/workflow'
import { isInvoiceOverdue } from '@/lib/utils/financial'

export type ActionKind =
  | 'revision_required'
  | 'waiting_approval'
  | 'overdue_shooting'
  | 'upcoming_shooting'
  | 'overdue_deadline'
  | 'upcoming_deadline'
  | 'invoice_overdue'
  | 'invoice_due'
  | 'payment_overdue'
  | 'payment_due'
  | 'ready_to_publish'

export interface ActionItem {
  id: string
  kind: ActionKind
  severity: 'urgent' | 'attention' | 'info'
  title: string
  subtitle: string
  href: string
  /** Lower sorts first. */
  priority: number
}

// URGENT/BLOCKING kinds outrank informational ones. Revision is the single
// biggest blocker (a client is actively waiting on rework), then anything
// actually overdue, then approval waiting (blocked on someone else but not
// yet late), then money, then future-dated heads-ups, then the "you can
// act right now" positive signal last — it's good news, not a blocker.
const KIND_PRIORITY: Record<ActionKind, number> = {
  revision_required: 0,
  overdue_shooting: 1,
  overdue_deadline: 1,
  waiting_approval: 2,
  payment_overdue: 3,
  invoice_overdue: 3,
  payment_due: 4,
  invoice_due: 4,
  upcoming_deadline: 5,
  upcoming_shooting: 6,
  ready_to_publish: 7,
}

const UPCOMING_WINDOW_DAYS = 3

/** Shared by Calendar (deadline hiding) and the Action Center (overdue
 * deadline detection) — a video's publishing obligation is fully done only
 * when it has at least one platform schedule and every one of them is
 * 'posted'. Never derived from videos.status/publishing_status: migration
 * 030 auto-promotes legacy status to 'live' the moment a single platform
 * posts, which would wrongly call a multi-platform video "done". */
export function isPublishingFullyDone(scheduleStatuses: string[] | undefined): boolean {
  if (!scheduleStatuses || scheduleStatuses.length === 0) return false
  return scheduleStatuses.every((s) => s === 'posted')
}

function todayStart() {
  return new Date(new Date().toDateString())
}

interface VideoRow {
  id: string
  judul: string
  no_video?: string | null
  status?: string | null
  production_status?: string | null
  approval_status?: string | null
  publishing_status?: string | null
  approval_waiting_since?: string | null
  tanggal_shooting?: string | null
  deadline_posting?: string | null
  deal_id?: string | null
}

function videoLabel(v: VideoRow) {
  return v.no_video ? `${v.no_video} · ${v.judul}` : v.judul
}

/** Approval dimension: Revision Required and Waiting Approval. */
export function buildApprovalActionItems(videos: VideoRow[]): ActionItem[] {
  const items: ActionItem[] = []
  for (const v of videos) {
    if (v.approval_status === 'revision_requested') {
      items.push({
        id: `revision-${v.id}`,
        kind: 'revision_required',
        severity: 'urgent',
        title: videoLabel(v),
        subtitle: 'Revision requested',
        href: `/content/${v.id}`,
        priority: KIND_PRIORITY.revision_required,
      })
    } else if (v.approval_status === 'waiting_approval') {
      const severity = getApprovalSeverity(v.approval_waiting_since)
      items.push({
        id: `waiting-${v.id}`,
        kind: 'waiting_approval',
        severity: severity === 'overdue' ? 'urgent' : severity === 'attention' ? 'attention' : 'info',
        title: videoLabel(v),
        subtitle: getApprovalAgingText(v.approval_waiting_since),
        href: `/content/${v.id}`,
        priority: KIND_PRIORITY.waiting_approval,
      })
    }
  }
  return items
}

/** Shooting/Deadline dimension — mirrors Calendar's own overdue rule
 * (dateObj < today && not already done) so the two surfaces can never
 * disagree about the same content. isPublishingDone should be computed the
 * same way Calendar does (all video_platform_schedules rows 'posted') —
 * callers pass it in rather than this module re-deriving it, so there is
 * still only one implementation of that check. */
export function buildContentDateActionItems(
  videos: VideoRow[],
  isPublishingDone: (videoId: string) => boolean
): ActionItem[] {
  const items: ActionItem[] = []
  const today = todayStart()

  for (const v of videos) {
    if (v.tanggal_shooting && !['scheduled', 'live', 'archived'].includes(v.status || '')) {
      const d = new Date(v.tanggal_shooting)
      const daysUntil = differenceInDays(d, today)
      if (d < today) {
        items.push({
          id: `shooting-overdue-${v.id}`,
          kind: 'overdue_shooting',
          severity: 'urgent',
          title: videoLabel(v),
          subtitle: `Shooting terlewat — ${v.tanggal_shooting}`,
          href: `/content/${v.id}`,
          priority: KIND_PRIORITY.overdue_shooting,
        })
      } else if (daysUntil <= UPCOMING_WINDOW_DAYS) {
        items.push({
          id: `shooting-upcoming-${v.id}`,
          kind: 'upcoming_shooting',
          severity: 'info',
          title: videoLabel(v),
          subtitle: `Shooting ${v.tanggal_shooting}`,
          href: `/content/${v.id}`,
          priority: KIND_PRIORITY.upcoming_shooting,
        })
      }
    }

    if (v.deadline_posting && !isPublishingDone(v.id)) {
      const isLegacyDone = ['live', 'archived'].includes(v.status || '')
      if (!isLegacyDone) {
        const d = new Date(v.deadline_posting)
        const daysUntil = differenceInDays(d, today)
        if (d < today) {
          items.push({
            id: `deadline-overdue-${v.id}`,
            kind: 'overdue_deadline',
            severity: 'urgent',
            title: videoLabel(v),
            subtitle: `Deadline terlewat — ${v.deadline_posting}`,
            href: `/content/${v.id}`,
            priority: KIND_PRIORITY.overdue_deadline,
          })
        } else if (daysUntil <= UPCOMING_WINDOW_DAYS) {
          items.push({
            id: `deadline-upcoming-${v.id}`,
            kind: 'upcoming_deadline',
            severity: 'info',
            title: videoLabel(v),
            subtitle: `Deadline ${v.deadline_posting}`,
            href: `/content/${v.id}`,
            priority: KIND_PRIORITY.upcoming_deadline,
          })
        }
      }
    }
  }
  return items
}

/** Ready-to-publish — delegates entirely to the existing Phase 2 rule. */
export function buildReadyToPublishActionItems(videos: VideoRow[]): ActionItem[] {
  return videos
    .filter((v) => isReadyToPublish(v))
    .map((v) => ({
      id: `ready-${v.id}`,
      kind: 'ready_to_publish' as const,
      severity: 'info' as const,
      title: videoLabel(v),
      subtitle: 'Production Ready · Approved',
      href: `/content/${v.id}`,
      priority: KIND_PRIORITY.ready_to_publish,
    }))
}

interface InvoiceRow {
  id: string
  invoice_number: string
  total: number
  due_date?: string | null
  status?: string | null
  deal_id?: string | null
  brandName?: string | null
}

/** Invoice dimension — reuses isInvoiceOverdue(), never re-derives overdue
 * from a stored status. */
export function buildInvoiceActionItems(invoices: InvoiceRow[]): ActionItem[] {
  const items: ActionItem[] = []
  for (const inv of invoices) {
    if (!inv.due_date || inv.status === 'paid' || inv.status === 'cancelled') continue
    const overdue = isInvoiceOverdue(inv, 0)
    const href = inv.deal_id ? `/brand/deals/${inv.deal_id}` : '/brand'
    if (overdue) {
      items.push({
        id: `invoice-overdue-${inv.id}`,
        kind: 'invoice_overdue',
        severity: 'urgent',
        title: inv.brandName ? `${inv.invoice_number} — ${inv.brandName}` : inv.invoice_number,
        subtitle: `Rp ${Number(inv.total).toLocaleString('id-ID')} · Jatuh tempo ${inv.due_date}`,
        href,
        priority: KIND_PRIORITY.invoice_overdue,
      })
    } else {
      const daysUntil = differenceInDays(new Date(inv.due_date), todayStart())
      if (daysUntil >= 0 && daysUntil <= UPCOMING_WINDOW_DAYS) {
        items.push({
          id: `invoice-due-${inv.id}`,
          kind: 'invoice_due',
          severity: 'attention',
          title: inv.brandName ? `${inv.invoice_number} — ${inv.brandName}` : inv.invoice_number,
          subtitle: `Rp ${Number(inv.total).toLocaleString('id-ID')} · Jatuh tempo ${inv.due_date}`,
          href,
          priority: KIND_PRIORITY.invoice_due,
        })
      }
    }
  }
  return items
}

interface PaymentRow {
  id: string
  amount: number
  payment_type?: string | null
  due_date?: string | null
  status?: string | null
  deal_id?: string | null
  dealTitle?: string | null
  brandName?: string | null
}

/** Payment dimension — overdue is computed from the actual due_date, same
 * shape as isInvoiceOverdue, never trusted from a stale stored status. */
export function buildPaymentActionItems(payments: PaymentRow[]): ActionItem[] {
  const items: ActionItem[] = []
  const today = todayStart()
  for (const p of payments) {
    if (!p.due_date || p.status === 'paid') continue
    const label = p.brandName || p.dealTitle || 'Deal'
    const href = p.deal_id ? `/brand/deals/${p.deal_id}` : '/brand'
    const overdue = new Date(p.due_date) < today
    if (overdue) {
      items.push({
        id: `payment-overdue-${p.id}`,
        kind: 'payment_overdue',
        severity: 'urgent',
        title: label,
        subtitle: `Rp ${Number(p.amount).toLocaleString('id-ID')} · Jatuh tempo ${p.due_date}`,
        href,
        priority: KIND_PRIORITY.payment_overdue,
      })
    } else {
      const daysUntil = differenceInDays(new Date(p.due_date), today)
      if (daysUntil <= UPCOMING_WINDOW_DAYS) {
        items.push({
          id: `payment-due-${p.id}`,
          kind: 'payment_due',
          severity: 'attention',
          title: label,
          subtitle: `Rp ${Number(p.amount).toLocaleString('id-ID')} · Jatuh tempo ${p.due_date}`,
          href,
          priority: KIND_PRIORITY.payment_due,
        })
      }
    }
  }
  return items
}

export function sortActionItems(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => a.priority - b.priority)
}
