'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Video, ExternalLink, Edit2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getPlatformBadge } from '@/lib/utils/platform'
import { cn } from '@/lib/utils'
import type { ScheduleEvent } from './types'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'success' | 'error' | 'secondary' }> = {
  scheduled: { label: 'Terjadwal', variant: 'default' },
  posted: { label: 'Tayang', variant: 'success' },
  failed: { label: 'Gagal', variant: 'error' },
}

const VIDEO_STATUS: Record<string, string> = {
  ide: 'Ide', scripting: 'Scripting', produksi: 'Produksi',
  editing: 'Editing', scheduled: 'Terjadwal', live: 'Live', archived: 'Arsip',
}

interface Props {
  event: ScheduleEvent
  onClose: () => void
  onEdit?: (event: ScheduleEvent) => void
}

export function EventDetail({ event, onClose, onEdit }: Props) {
  const dateStr = format(new Date(event.tanggal_tayang), 'EEEE, d MMMM yyyy', { locale: localeId })
  const statusInfo = STATUS_MAP[event.status] ?? { label: event.status, variant: 'secondary' as const }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-heading font-semibold text-text-primary text-sm">Detail Jadwal</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Thumbnail */}
        <div className="w-full aspect-video bg-subtle rounded-lg overflow-hidden flex items-center justify-center">
          {event.videos?.thumbnail_url ? (
            <img src={event.videos.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Video className="w-10 h-10 text-border" />
          )}
        </div>

        {/* Title & status */}
        <div>
          <h4 className="font-heading font-bold text-text-primary leading-snug">
            {event.videos?.judul ?? 'Video'}
          </h4>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            {event.videos?.status && (
              <Badge variant="secondary">{VIDEO_STATUS[event.videos.status] ?? event.videos.status}</Badge>
            )}
          </div>
        </div>

        {/* Platform + time */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', getPlatformBadge(event.platform))}>
              {event.platform}
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            📅 {dateStr}
            {event.jam_post && <span className="ml-2">🕐 {event.jam_post.slice(0, 5)}</span>}
          </p>
        </div>

        {/* URL */}
        {event.url_post && (
          <a
            href={event.url_post}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Lihat postingan
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {event.videos?.id && (
          <Link href={`/content/${event.videos.id}`} className="block">
            <Button variant="default" className="w-full">
              Lihat Detail Video
            </Button>
          </Link>
        )}
        <Button variant="secondary" className="w-full" onClick={() => onEdit?.(event)}>
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Jadwal
        </Button>
      </div>
    </div>
  )
}
