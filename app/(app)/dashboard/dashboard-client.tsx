'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/utils/formatters'
import { getPlatformBadge, getPlatformDot } from '@/lib/utils/platform'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Video, CalendarCheck, Sparkles, FileEdit, AlertCircle,
  Bell, ArrowRight, Clock, ChevronRight
} from 'lucide-react'
import { formatDistanceToNow, format, differenceInDays, isToday, isPast } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Platform } from '@/lib/types'
import type { RecentVideo } from './page'
import { cn } from '@/lib/utils'

const STATUS_MAP: Record<string, string> = {
  ide: 'Ide', scripting: 'Scripting', produksi: 'Produksi',
  editing: 'Editing', scheduled: 'Terjadwal', live: 'Live', archived: 'Arsip',
}

const BRAND_STATUS_LABEL: Record<string, string> = {
  prospect: 'Prospect', approach: 'Approach', negosiasi: 'Negosiasi',
  deal: 'Deal', aktif: 'Aktif', selesai: 'Selesai', cold: 'Cold',
}

interface Schedule {
  id: string
  platform: Platform
  jam_post: string | null
  tanggal_tayang: string
  videos: { id: string; judul: string; thumbnail_url: string | null; status: string } | null
}

interface Followup {
  id: string
  nama_brand: string
  status: string
  next_followup_date: string | null
  industri: string | null
}

interface OverdueInvoice {
  id: string
  invoice_number: string
  total: number
  due_date: string
  brands: { nama_brand: string } | null
}

interface Props {
  userName: string
  role: string
  todaySchedules: Schedule[]
  pipeline: { total: number; scheduled: number; live: number; draft: number }
  followups: Followup[]
  overdueInvoices: OverdueInvoice[]
  recentVideos: RecentVideo[]
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function getGreetingEmoji() {
  const h = new Date().getHours()
  if (h < 12) return '☀️'
  if (h < 18) return '🌤️'
  return '🌙'
}

export function DashboardClient({ userName, role, todaySchedules, pipeline, followups, overdueInvoices, recentVideos }: Props) {
  const router = useRouter()
  const firstName = userName.split(' ')[0]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">

      {/* Section 1 — Greeting */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          {getGreeting()}, {firstName} {getGreetingEmoji()}
        </h1>
        <p className="text-text-secondary text-sm mt-0.5">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: localeId })}
        </p>
      </div>

      {/* Section 2 — Today's Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-text-primary flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-accent" />
            Jadwal Hari Ini
          </h2>
          <Link href="/calendar" className="text-xs text-accent hover:underline flex items-center gap-0.5">
            Kalender <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {todaySchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-surface rounded-xl border border-border">
            <CalendarCheck className="w-10 h-10 text-border mb-2" />
            <p className="text-sm text-text-muted">Tidak ada konten terjadwal hari ini</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {todaySchedules.map((s) => (
              <Link
                key={s.id}
                href={s.videos ? `/content/${s.videos.id}` : '/calendar'}
                className="shrink-0 w-44 bg-white border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="w-full aspect-video bg-subtle flex items-center justify-center overflow-hidden">
                  {s.videos?.thumbnail_url ? (
                    <img src={s.videos.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Video className="w-6 h-6 text-border" />
                  )}
                </div>
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', getPlatformBadge(s.platform))}>
                      {s.platform}
                    </span>
                    {s.jam_post && (
                      <span className="text-[10px] text-text-muted">{s.jam_post.slice(0, 5)}</span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-text-primary line-clamp-2 leading-tight">
                    {s.videos?.judul ?? 'Video'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Section 3 — Pipeline Snapshot */}
      <div>
        <h2 className="font-heading font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          Pipeline Konten
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Video', value: pipeline.total, icon: Video, href: '/content' },
            { label: 'Terjadwal', value: pipeline.scheduled, icon: CalendarCheck, href: '/content?status=scheduled' },
            { label: 'Live Bulan Ini', value: pipeline.live, icon: Sparkles, href: '/content?status=live&month=current' },
            { label: 'Draft', value: pipeline.draft, icon: FileEdit, href: '/content?status=ide,scripting,produksi,editing' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <button
                key={stat.label}
                onClick={() => router.push(stat.href)}
                className="bg-white border border-border rounded-xl p-4 text-left hover:border-accent hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
                  <ArrowRight className="w-3 h-3 text-border group-hover:text-accent transition-colors" />
                </div>
                <p className="font-heading text-2xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-secondary mt-0.5">{stat.label}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 4 — Follow-up Reminder */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-text-primary flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" />
              Follow-up Hari Ini
            </h2>
            <Link href="/brand" className="text-xs text-accent hover:underline">Lihat semua</Link>
          </div>

          {followups.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-6 text-center">
              <p className="text-sm text-text-muted">Tidak ada follow-up yang perlu dilakukan</p>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl divide-y divide-border">
              {followups.map((f) => {
                const daysAgo = f.next_followup_date
                  ? differenceInDays(new Date(), new Date(f.next_followup_date))
                  : 0
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-accent-light text-accent text-xs font-bold">
                        {f.nama_brand.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{f.nama_brand}</p>
                      <p className="text-xs text-text-muted">
                        {BRAND_STATUS_LABEL[f.status] ?? f.status} •{' '}
                        <span className={cn(daysAgo > 0 ? 'text-error' : 'text-warning')}>
                          {daysAgo === 0 ? 'Hari ini' : daysAgo > 0 ? `${daysAgo} hari lalu` : 'Mendatang'}
                        </span>
                      </p>
                    </div>
                    <Link
                      href={`/brand?id=${f.id}`}
                      className="text-xs text-accent font-medium shrink-0 hover:underline"
                    >
                      Catat
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Section 5 — Invoice Alert + Recent Activity */}
        <div className="space-y-6">
          {/* Invoice Alert */}
          {role === 'owner' && overdueInvoices.length > 0 && (
            <div>
              <h2 className="font-heading font-semibold text-text-primary mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-error" />
                Invoice Overdue
              </h2>
              <div className="bg-white border border-error/30 rounded-xl divide-y divide-border">
                {overdueInvoices.map((inv) => {
                  const daysAgo = differenceInDays(new Date(), new Date(inv.due_date))
                  return (
                    <Link
                      key={inv.id}
                      href="/brand/invoice"
                      className="flex items-center gap-2 p-3 hover:bg-surface transition-colors"
                    >
                      <AlertCircle className="w-4 h-4 text-error shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{inv.invoice_number}</p>
                        <p className="text-xs text-text-muted">
                          {inv.brands?.nama_brand} · {daysAgo} hari lalu
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-error shrink-0">
                        {formatRupiah(inv.total)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section 6 — Recent Activity */}
          <div>
            <h2 className="font-heading font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Aktivitas Terbaru
            </h2>
            {recentVideos.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-6 text-center">
                <p className="text-sm text-text-muted">Belum ada aktivitas</p>
              </div>
            ) : (
              <div className="bg-white border border-border rounded-xl divide-y divide-border">
                {recentVideos.map((v) => (
                  <Link
                    key={v.id}
                    href={`/content/${v.id}`}
                    className="flex items-start gap-3 p-3 hover:bg-surface transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">
                        <span className="font-medium">{v.users?.full_name ?? 'Seseorang'}</span>
                        {' '}mengupdate{' '}
                        <span className="font-medium">"{v.judul}"</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                          {STATUS_MAP[v.status] ?? v.status}
                        </Badge>
                        <span className="text-[11px] text-text-muted">
                          {formatDistanceToNow(new Date(v.updated_at), { addSuffix: true, locale: localeId })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
