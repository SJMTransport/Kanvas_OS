// Phase 3.5 — centralized financial status computation. Deal Detail, Brand
// Detail, and any future Action Center rule must import from here rather
// than re-deriving this logic locally, and must never trust a stored
// invoice.status = 'overdue' at face value — overdue is always computed
// from the actual due date + outstanding amount, since a stored status can
// go stale the moment a payment is recorded against it.

export type FinancialStatus = 'no_value' | 'not_invoiced' | 'invoiced' | 'partially_paid' | 'paid' | 'overdue'

export interface FinancialStatusInput {
  dealValue: number
  invoicedTotal: number
  paidTotal: number
  /** Whether any unpaid/partially-paid invoice's due_date has passed. */
  hasOverdueInvoice: boolean
}

export const FINANCIAL_STATUS_CONFIG: Record<FinancialStatus, { label: string; badgeClass: string }> = {
  no_value:        { label: 'Belum Ada Nilai',  badgeClass: 'text-text-muted border-border bg-subtle' },
  not_invoiced:    { label: 'Belum Diinvoice',  badgeClass: 'text-slate-700 border-slate-300 bg-slate-50' },
  invoiced:        { label: 'Diinvoice',        badgeClass: 'text-blue-700 border-blue-300 bg-blue-50' },
  partially_paid:  { label: 'Sebagian',         badgeClass: 'text-amber-700 border-amber-300 bg-amber-50' },
  paid:            { label: 'Lunas',            badgeClass: 'text-emerald-700 border-emerald-300 bg-emerald-50' },
  overdue:         { label: 'Overdue',          badgeClass: 'text-rose-700 border-rose-300 bg-rose-50' },
}

export function computeFinancialStatus({ dealValue, invoicedTotal, paidTotal, hasOverdueInvoice }: FinancialStatusInput): FinancialStatus {
  const outstanding = Math.max(0, invoicedTotal - paidTotal)
  if (dealValue <= 0 && invoicedTotal <= 0) return 'no_value'
  if (invoicedTotal <= 0) return 'not_invoiced'
  if (outstanding <= 0) return 'paid'
  if (hasOverdueInvoice) return 'overdue'
  if (paidTotal > 0) return 'partially_paid'
  return 'invoiced'
}

/** An invoice is overdue only if it actually has an outstanding balance
 * past its due date — never just because its stored `status` says so. */
export function isInvoiceOverdue(invoice: { due_date?: string | null; total?: number | null }, paidForThisInvoice: number): boolean {
  if (!invoice.due_date) return false
  const outstanding = Number(invoice.total || 0) - paidForThisInvoice
  if (outstanding <= 0) return false
  return new Date(invoice.due_date) < new Date(new Date().toDateString())
}
