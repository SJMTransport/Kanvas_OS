import type { VideoStatus } from '@/lib/types'

export const STATUS_CONFIG: Record<VideoStatus, { label: string; color: string; bg: string; border: string }> = {
  ide:       { label: 'Ide',       color: 'text-slate-700',   bg: 'bg-slate-100',   border: 'border-slate-200' },
  scripting: { label: 'Scripting', color: 'text-blue-700',    bg: 'bg-blue-50',      border: 'border-blue-200' },
  produksi:  { label: 'Produksi',  color: 'text-orange-700',  bg: 'bg-orange-50',    border: 'border-orange-200' },
  editing:   { label: 'Editing',   color: 'text-purple-700',  bg: 'bg-purple-50',    border: 'border-purple-200' },
  scheduled: { label: 'Terjadwal', color: 'text-teal-700',    bg: 'bg-teal-50',      border: 'border-teal-200' },
  live:      { label: 'Live',      color: 'text-emerald-700', bg: 'bg-emerald-50',   border: 'border-emerald-200' },
  archived:  { label: 'Arsip',     color: 'text-text-muted',  bg: 'bg-gray-100',     border: 'border-gray-200' },
}

export const STATUS_ORDER: VideoStatus[] = ['ide', 'scripting', 'produksi', 'editing', 'scheduled', 'live']

export function getStatusBadgeClass(status: VideoStatus) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.ide
  return `${c.color} ${c.bg} border ${c.border} inline-flex items-center justify-center h-6 px-2.5 rounded-full text-[12px] font-medium leading-none whitespace-nowrap`
}
