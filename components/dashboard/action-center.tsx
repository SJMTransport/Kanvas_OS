'use client'

import Link from 'next/link'
import {
  AlertTriangle, Clock, Wallet, Sparkles, CalendarClock, ListChecks,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActionItem, ActionKind } from '@/lib/operations/rules'

const KIND_ICON: Record<ActionKind, typeof AlertTriangle> = {
  revision_required: AlertTriangle,
  overdue_shooting: AlertTriangle,
  overdue_deadline: AlertTriangle,
  waiting_approval: Clock,
  invoice_overdue: Wallet,
  payment_overdue: Wallet,
  invoice_due: Wallet,
  payment_due: Wallet,
  upcoming_deadline: CalendarClock,
  upcoming_shooting: CalendarClock,
  ready_to_publish: Sparkles,
}

const KIND_LABEL: Record<ActionKind, string> = {
  revision_required: 'Revision Required',
  overdue_shooting: 'Overdue Shooting',
  overdue_deadline: 'Overdue Deadline',
  waiting_approval: 'Waiting Approval',
  invoice_overdue: 'Invoice Overdue',
  payment_overdue: 'Payment Overdue',
  invoice_due: 'Invoice Due',
  payment_due: 'Payment Due',
  upcoming_deadline: 'Upcoming Deadline',
  upcoming_shooting: 'Upcoming Shooting',
  ready_to_publish: 'Ready to Publish',
}

const SEVERITY_ICON_CLASS: Record<ActionItem['severity'], string> = {
  urgent: 'text-error bg-error/10',
  attention: 'text-warning bg-warning/10',
  info: 'text-accent bg-accent-light',
}

const MAX_VISIBLE = 8

interface Props {
  items: ActionItem[]
  isLoading?: boolean
}

export function ActionCenter({ items, isLoading }: Props) {
  const urgentCount = items.filter((i) => i.severity === 'urgent').length
  const attentionCount = items.filter((i) => i.severity === 'attention').length
  const readyCount = items.filter((i) => i.kind === 'ready_to_publish').length
  const visible = items.slice(0, MAX_VISIBLE)

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-y-1">
        <h2 className="font-heading font-semibold text-text-primary flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-accent" />
          Action Center
        </h2>
        {items.length > 0 && (
          <p className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">{items.length} Perlu Perhatian</span>
            {urgentCount > 0 && <span> · <span className="text-error font-medium">{urgentCount} Urgent</span></span>}
            {attentionCount > 0 && <span> · {attentionCount} Perhatian</span>}
            {readyCount > 0 && <span> · <span className="text-emerald-700 font-medium">{readyCount} Ready</span></span>}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-sm text-text-muted">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-text-muted">Semua aman — tidak ada yang perlu perhatian saat ini.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((item) => {
            const Icon = KIND_ICON[item.kind]
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface transition-colors"
              >
                <span className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', SEVERITY_ICON_CLASS[item.severity])}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{KIND_LABEL[item.kind]}</p>
                  <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                  <p className="text-xs text-text-muted truncate">{item.subtitle}</p>
                </div>
                <span className="text-xs text-accent font-medium shrink-0">
                  {item.href.startsWith('/brand') ? 'Buka Deal' : 'Buka Content'}
                </span>
              </Link>
            )
          })}
          {items.length > MAX_VISIBLE && (
            <Link href="/calendar" className="block px-4 py-2 text-xs text-center text-accent hover:underline">
              +{items.length - MAX_VISIBLE} lainnya — lihat Kalender
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
