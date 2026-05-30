import type { VideoStatus } from '@/lib/types'

export const STATUS_CONFIG: Record<VideoStatus, { label: string; color: string; bg: string; border: string }> = {
  ide:       { label: 'Ide',       color: 'text-text-secondary', bg: 'bg-subtle',      border: 'border-border' },
  scripting: { label: 'Scripting', color: 'text-blue-700',       bg: 'bg-blue-50',     border: 'border-blue-200' },
  produksi:  { label: 'Produksi',  color: 'text-orange-700',     bg: 'bg-orange-50',   border: 'border-orange-200' },
  editing:   { label: 'Editing',   color: 'text-purple-700',     bg: 'bg-purple-50',   border: 'border-purple-200' },
  scheduled: { label: 'Terjadwal', color: 'text-amber-700',      bg: 'bg-amber-50',    border: 'border-amber-200' },
  live:      { label: 'Live',      color: 'text-success',        bg: 'bg-green-50',    border: 'border-green-200' },
  archived:  { label: 'Arsip',     color: 'text-text-muted',     bg: 'bg-gray-100',    border: 'border-gray-200' },
}

export const STATUS_ORDER: VideoStatus[] = ['ide', 'scripting', 'produksi', 'editing', 'scheduled', 'live']

export function getStatusBadgeClass(status: VideoStatus) {
  const c = STATUS_CONFIG[status]
  return `${c.color} ${c.bg} border ${c.border}`
}
