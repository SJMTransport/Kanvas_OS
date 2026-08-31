'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Video, ExternalLink, X, AlertTriangle, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getPlatformBadge } from '@/lib/utils/platform'
import { formatRupiah } from '@/lib/utils/formatters'
import { STATUS_CONFIG } from '@/lib/utils/status'
import { PRODUCTION_STATUS_CONFIG, APPROVAL_STATUS_CONFIG, PUBLISHING_STATUS_CONFIG } from '@/lib/utils/workflow'
import { computeContentLifecycleStage, LIFECYCLE_CONFIG } from '@/lib/operations/rules'
import { cn } from '@/lib/utils'
import { CALENDAR_CATEGORY_CONFIG, type CalendarEvent } from './types'

interface Props {
  event: CalendarEvent
  onClose: () => void
  onBack?: () => void
}

function ctaLabel(category: CalendarEvent['category']) {
  if (['publishing', 'shooting', 'deadline', 'waiting_approval', 'revision'].includes(category)) return 'Buka Content'
  if (['invoice_due', 'payment_due', 'deal_start', 'deal_end'].includes(category)) return 'Buka Deal'
  return 'Buka Detail'
}

export function EventDetail({ event, onClose, onBack }: Props) {
  const cfg = CALENDAR_CATEGORY_CONFIG[event.category]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="text-text-muted hover:text-text-primary p-1 -ml-1 rounded flex items-center gap-1 text-xs font-medium">
              <ChevronLeft className="w-3.5 h-3.5" /> Semua Aktivitas
            </button>
          )}
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pt-3 flex items-center gap-2">
        {event.severity === 'overdue' && <AlertTriangle className="w-4 h-4 text-error" />}
        <h3 className="font-heading font-semibold text-text-primary text-sm">{cfg.label}{event.severity === 'overdue' ? ' — Overdue' : ''}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {event.category === 'publishing' && <PublishingDetail event={event} />}
        {(event.category === 'shooting' || event.category === 'deadline') && <ContentDateDetail event={event} />}
        {(event.category === 'deal_start' || event.category === 'deal_end') && <DealDetail event={event} />}
        {event.category === 'invoice_due' && <InvoiceDetail event={event} />}
        {event.category === 'payment_due' && <PaymentDetail event={event} />}
        {(event.category === 'waiting_approval' || event.category === 'revision') && <ApprovalDetail event={event} />}
      </div>

      <div className="p-4 border-t border-border">
        <Link href={event.href} className="block">
          <Button variant="default" className="w-full">{ctaLabel(event.category)}</Button>
        </Link>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-semibold text-text-muted tracking-wide">{label}</p>
      <div className="text-sm text-text-primary font-medium mt-0.5">{children}</div>
    </div>
  )
}

function WorkflowSummary({ ctx }: { ctx?: CalendarEvent['ctx'] }) {
  if (!ctx || (!ctx.productionStatus && !ctx.approvalStatus && !ctx.publishingStatus)) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {ctx.productionStatus && (
        <Badge variant="outline" className={PRODUCTION_STATUS_CONFIG[ctx.productionStatus]?.badgeClass}>
          {PRODUCTION_STATUS_CONFIG[ctx.productionStatus]?.label ?? ctx.productionStatus}
        </Badge>
      )}
      {ctx.approvalStatus && (
        <Badge variant="outline" className={APPROVAL_STATUS_CONFIG[ctx.approvalStatus]?.badgeClass}>
          {APPROVAL_STATUS_CONFIG[ctx.approvalStatus]?.label ?? ctx.approvalStatus}
        </Badge>
      )}
      {ctx.publishingStatus && (
        <Badge variant="outline" className={PUBLISHING_STATUS_CONFIG[ctx.publishingStatus]?.badgeClass}>
          {PUBLISHING_STATUS_CONFIG[ctx.publishingStatus]?.label ?? ctx.publishingStatus}
        </Badge>
      )}
    </div>
  )
}

// Approximates the same computeContentLifecycleStage() used in Content
// Detail, using only what's already enriched onto the event's ctx —
// publishing_status stands in for the real per-schedule completion check
// here (Level 2 preview has no live schedule query), same central function,
// no second lifecycle implementation.
function LifecycleField({ ctx }: { ctx?: CalendarEvent['ctx'] }) {
  if (!ctx) return null
  const stage = computeContentLifecycleStage(
    { production_status: ctx.productionStatus, approval_status: ctx.approvalStatus },
    ctx.publishingStatus === 'published',
    ctx.publishingStatus === 'scheduled'
  )
  return (
    <Field label="Status Konten">
      <Badge variant="outline" className={cn('text-xs font-bold', LIFECYCLE_CONFIG[stage].badgeClass)}>
        {LIFECYCLE_CONFIG[stage].label}
      </Badge>
    </Field>
  )
}

function BrandDealFields({ ctx }: { ctx?: CalendarEvent['ctx'] }) {
  if (!ctx || (!ctx.brandName && !ctx.dealTitle)) return null
  return (
    <>
      {ctx.brandName && <Field label="Brand">{ctx.brandName}</Field>}
      {ctx.dealTitle && <Field label="Deal">{ctx.dealTitle}</Field>}
      {ctx.deliverableName && <Field label="Deliverable">{ctx.deliverableName}</Field>}
    </>
  )
}

function PublishingDetail({ event }: { event: CalendarEvent }) {
  const s = event.raw
  return (
    <div className="space-y-4">
      <div className="w-full aspect-video bg-subtle rounded-lg overflow-hidden flex items-center justify-center">
        {s.videos?.thumbnail_url ? (
          <img src={s.videos.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Video className="w-10 h-10 text-border" />
        )}
      </div>
      <Field label="Konten">{event.title}</Field>
      <BrandDealFields ctx={event.ctx} />
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', getPlatformBadge(s.platform))}>{s.platform}</span>
        <Badge variant="secondary">{STATUS_CONFIG[s.videos?.status as keyof typeof STATUS_CONFIG]?.label ?? s.videos?.status}</Badge>
      </div>
      <Field label="Tanggal">{format(new Date(event.date), 'd MMMM yyyy', { locale: localeId })}{event.time && ` · ${event.time.slice(0, 5)}`}</Field>
      <Field label="Status Jadwal">{s.status === 'posted' ? 'Tayang' : s.status === 'failed' ? 'Gagal' : 'Terjadwal'}</Field>
      {s.url_post && (
        <a href={s.url_post} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-accent hover:underline">
          <ExternalLink className="w-3.5 h-3.5" /> Lihat postingan
        </a>
      )}
    </div>
  )
}

function ContentDateDetail({ event }: { event: CalendarEvent }) {
  const v = event.raw
  return (
    <div className="space-y-4">
      <Field label="Konten">{v.judul ?? event.title} {v.no_video && <span className="text-text-muted font-mono text-xs">({v.no_video})</span>}</Field>
      <BrandDealFields ctx={event.ctx} />
      <Field label="Tanggal">{format(new Date(event.date), 'd MMMM yyyy', { locale: localeId })}</Field>
      <LifecycleField ctx={event.ctx} />
      {event.ctx && (event.ctx.productionStatus || event.ctx.approvalStatus || event.ctx.publishingStatus) && (
        <Field label="Detail Workflow"><WorkflowSummary ctx={event.ctx} /></Field>
      )}
      {event.severity === 'overdue' && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{event.category === 'shooting' ? 'Jadwal shooting sudah lewat dan konten belum diproses.' : 'Deadline posting sudah lewat.'}</span>
        </div>
      )}
    </div>
  )
}

function DealDetail({ event }: { event: CalendarEvent }) {
  const d = event.raw
  return (
    <div className="space-y-4">
      <Field label="Brand">{event.subtitle}</Field>
      <Field label="Deal">{event.title}</Field>
      <Field label="Tanggal">{format(new Date(event.date), 'd MMMM yyyy', { locale: localeId })}</Field>
      {typeof d.total_value === 'number' && d.total_value > 0 && (
        <Field label="Nilai Deal">{formatRupiah(Number(d.total_value))}</Field>
      )}
      <Field label="Status Deal"><Badge variant="outline" className="capitalize">{d.status}</Badge></Field>
    </div>
  )
}

function InvoiceDetail({ event }: { event: CalendarEvent }) {
  const inv = event.raw
  return (
    <div className="space-y-4">
      <BrandDealFields ctx={event.ctx} />
      <Field label="Invoice">{inv.invoice_number}</Field>
      <Field label="Nominal">{formatRupiah(Number(inv.total))}</Field>
      <Field label="Jatuh Tempo">{format(new Date(event.date), 'd MMMM yyyy', { locale: localeId })}</Field>
      <Field label="Status">
        <Badge variant="outline" className={event.severity === 'overdue' ? 'text-rose-700 border-rose-300 bg-rose-50' : 'capitalize'}>
          {event.severity === 'overdue' ? 'Overdue' : inv.status}
        </Badge>
      </Field>
    </div>
  )
}

function PaymentDetail({ event }: { event: CalendarEvent }) {
  const p = event.raw
  return (
    <div className="space-y-4">
      <BrandDealFields ctx={event.ctx} />
      <Field label="Tipe">{p.payment_type?.toUpperCase()}</Field>
      <Field label="Nominal">{formatRupiah(Number(p.amount))}</Field>
      <Field label="Jatuh Tempo">{format(new Date(event.date), 'd MMMM yyyy', { locale: localeId })}</Field>
      <Field label="Status">
        <Badge variant="outline" className={event.severity === 'overdue' ? 'text-rose-700 border-rose-300 bg-rose-50' : 'capitalize'}>
          {event.severity === 'overdue' ? 'Overdue' : p.status === 'paid' ? 'Lunas' : 'Belum Dibayar'}
        </Badge>
      </Field>
    </div>
  )
}

function ApprovalDetail({ event }: { event: CalendarEvent }) {
  const v = event.raw
  return (
    <div className="space-y-4">
      <Field label="Konten">{v.judul ?? event.title} {v.no_video && <span className="text-text-muted font-mono text-xs">({v.no_video})</span>}</Field>
      <BrandDealFields ctx={event.ctx} />
      <LifecycleField ctx={event.ctx} />
      <Field label="Production">{PRODUCTION_STATUS_CONFIG[v.production_status as keyof typeof PRODUCTION_STATUS_CONFIG]?.label ?? '—'}</Field>
      <Field label="Approval">
        <Badge variant="outline" className={cn(event.category === 'revision' ? 'text-rose-700 border-rose-300 bg-rose-50' : 'text-amber-700 border-amber-300 bg-amber-50')}>
          {APPROVAL_STATUS_CONFIG[v.approval_status as keyof typeof APPROVAL_STATUS_CONFIG]?.label ?? v.approval_status}
        </Badge>
      </Field>
      <Field label={event.category === 'revision' ? 'Status' : 'Menunggu Sejak'}>{event.subtitle}</Field>
    </div>
  )
}
