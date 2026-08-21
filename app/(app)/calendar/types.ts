export type ViewMode = 'month' | 'week' | 'list'

// Phase 4 — unified operational calendar event. Every category is a
// read-time projection of an existing source row (videos, deals, invoices,
// deal_payments) — never a second persisted copy of the date. `raw` carries
// the original row so EventDetail can show real context, not just a label.
export type CalendarEventCategory =
  | 'shooting'
  | 'deadline'
  | 'publishing'
  | 'deal_start'
  | 'deal_end'
  | 'invoice_due'
  | 'payment_due'
  | 'waiting_approval'
  | 'revision'

export interface CalendarEvent {
  id: string
  category: CalendarEventCategory
  date: string
  time?: string | null
  title: string
  subtitle?: string
  href: string
  overdue: boolean
  severity: 'normal' | 'attention' | 'overdue'
  raw: any
}

export const CALENDAR_CATEGORY_GROUP: Record<CalendarEventCategory, 'content' | 'financial' | 'deal' | 'approval'> = {
  shooting: 'content',
  deadline: 'content',
  publishing: 'content',
  deal_start: 'deal',
  deal_end: 'deal',
  invoice_due: 'financial',
  payment_due: 'financial',
  waiting_approval: 'approval',
  revision: 'approval',
}

export const CALENDAR_CATEGORY_CONFIG: Record<CalendarEventCategory, { label: string; dot: string; badgeClass: string }> = {
  shooting:          { label: 'Shooting',        dot: '#3b82f6', badgeClass: 'text-blue-700 bg-blue-50 border-blue-200' },
  deadline:          { label: 'Deadline',        dot: '#f97316', badgeClass: 'text-orange-700 bg-orange-50 border-orange-200' },
  publishing:        { label: 'Publishing',      dot: '#22c55e', badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  deal_start:        { label: 'Deal Start',      dot: '#8b5cf6', badgeClass: 'text-purple-700 bg-purple-50 border-purple-200' },
  deal_end:          { label: 'Deal End',        dot: '#8b5cf6', badgeClass: 'text-purple-700 bg-purple-50 border-purple-200' },
  invoice_due:       { label: 'Invoice Due',     dot: '#d97706', badgeClass: 'text-amber-700 bg-amber-50 border-amber-200' },
  payment_due:       { label: 'Payment Due',     dot: '#d97706', badgeClass: 'text-amber-700 bg-amber-50 border-amber-200' },
  waiting_approval:  { label: 'Waiting Approval', dot: '#eab308', badgeClass: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  revision:          { label: 'Revision',        dot: '#e11d48', badgeClass: 'text-rose-700 bg-rose-50 border-rose-200' },
}
