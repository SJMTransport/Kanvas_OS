import { differenceInDays, parseISO } from 'date-fns'
import type { ApprovalStatus, ProductionStatus, PublishingStatus } from '@/lib/types/brand'

export function getApprovalAgingText(waitingSince?: string | null): string {
  if (!waitingSince) return 'Waiting approval'
  try {
    const date = parseISO(waitingSince)
    const days = differenceInDays(new Date(), date)
    if (days <= 0) return 'Waiting approval · today'
    if (days === 1) return 'Waiting approval · 1 day'
    return `Waiting approval · ${days} days`
  } catch (err) {
    return 'Waiting approval'
  }
}

export function getApprovalSeverity(waitingSince?: string | null): 'normal' | 'attention' | 'overdue' {
  if (!waitingSince) return 'normal'
  try {
    const date = parseISO(waitingSince)
    const days = differenceInDays(new Date(), date)
    if (days >= 5) return 'overdue'
    if (days >= 3) return 'attention'
    return 'normal'
  } catch (err) {
    return 'normal'
  }
}

export function isReadyToPublish(item: {
  production_status?: string | null
  status?: string | null
  approval_status?: string | null
  publishing_status?: string | null
}): boolean {
  const prodReady = item.production_status === 'ready' || item.status === 'editing' || item.status === 'scheduled' || item.status === 'live'
  const appApproved = item.approval_status === 'approved'
  const pubNotPublished = item.publishing_status !== 'published'
  return prodReady && appApproved && pubNotPublished
}

export const APPROVAL_STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  not_required: { label: 'Not Required', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  not_submitted: { label: 'Not Submitted', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  waiting_approval: { label: 'Waiting Approval', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300' },
  revision_requested: { label: 'Revision Requested', badgeClass: 'bg-rose-50 text-rose-700 border-rose-300' },
  revision_submitted: { label: 'Revision Submitted', badgeClass: 'bg-blue-50 text-blue-700 border-blue-300' },
  approved: { label: 'Approved', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
}

export const PRODUCTION_STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  idea: { label: 'Idea', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  scripting: { label: 'Scripting', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  production: { label: 'Production', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  editing: { label: 'Editing', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  ready: { label: 'Ready', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
}

export const PUBLISHING_STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  not_scheduled: { label: 'Not Scheduled', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  scheduled: { label: 'Scheduled', badgeClass: 'bg-teal-50 text-teal-800 border-teal-300' },
  published: { label: 'Published', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
}
