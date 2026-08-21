'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Video, ExternalLink, Edit2, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getPlatformBadge } from '@/lib/utils/platform'
import { formatRupiah } from '@/lib/utils/formatters'
import { STATUS_CONFIG } from '@/lib/utils/status'
import { PRODUCTION_STATUS_CONFIG, APPROVAL_STATUS_CONFIG } from '@/lib/utils/workflow'
import { cn } from '@/lib/utils'
import { CALENDAR_CATEGORY_CONFIG, type CalendarEvent } from './types'

interface Props {
  event: CalendarEvent
  onClose: () => void
  onEdit?: (event: CalendarEvent) => void
}

export function EventDetail({ event, onClose, onEdit }: Props) {
  const cfg = CALENDAR_CATEGORY_CONFIG[event.category]
  const dateStr = format(new Date(event.date), 'EEEE, d MMMM yyyy', { locale: localeId })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {event.severity === 'overdue' && <AlertTriangle className="w-4 h-4 text-error" />}
          <h3 className="font-heading font-semibold text-text-primary text-sm">{cfg.label}{event.severity === 'overdue' ? ' — Overdue' : ''}</h3>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1 rounded">
          <X className="w-4 h-4" />
        </button>
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
          <Button variant="default" className="w-full">
            {event.category === 'publishing' || event.category === 'shooting' || event.category === 'deadline' || event.category === 'waiting_approval' || event.category === 'revision' ? (
              <>Lihat Detail Konten</>
            ) : event.category === 'invoice_due' || event.category === 'payment_due' || event.category === 'deal_start' || event.category === 'deal_end' ? (
              <>Buka Deal</>
            ) : (
              <>Buka Detail</>
            )}
          </Button>
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
      <Field label="Konten">{event.title} {v.no_video && <span className="text-text-muted font-mono text-xs">({v.no_video})</span>}</Field>
      <Field label="Tanggal">{format(new Date(event.date), 'd MMMM yyyy', { locale: localeId })}</Field>
      <Field label="Status">
        <Badge variant="secondary">{STATUS_CONFIG[v.status as keyof typeof STATUS_CONFIG]?.label ?? v.status}</Badge>
      </Field>
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
      <Field label="Status Deal"><Badge variant="outline" className="capitalize">{d.status}</Badge></Field>
    </div>
  )
}

function InvoiceDetail({ event }: { event: CalendarEvent }) {
  const inv = event.raw
  return (
    <div className="space-y-4">
      <Field label="Brand">{inv.brands?.name || inv.brands?.nama_brand}</Field>
      {(inv.deals?.title || inv.deals?.nama_campaign) && <Field label="Campaign">{inv.deals?.title || inv.deals?.nama_campaign}</Field>}
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
      <Field label="Brand">{p.deals?.brands?.name || p.deals?.brands?.nama_brand}</Field>
      {(p.deals?.title || p.deals?.nama_campaign) && <Field label="Campaign">{p.deals?.title || p.deals?.nama_campaign}</Field>}
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
      <Field label="Konten">{event.title}</Field>
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
