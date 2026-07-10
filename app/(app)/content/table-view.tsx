'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { ChevronUp, ChevronDown, Video, Trash2, GripVertical } from 'lucide-react'
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueryClient } from '@tanstack/react-query'
import { getPlatformBadge } from '@/lib/utils/platform'
import { getStatusBadgeClass, STATUS_CONFIG } from '@/lib/utils/status'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'
import type { VideoStatus, Platform } from '@/lib/types'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']

interface Props {
  videos: VideoWithSchedules[]
  loading: boolean
  sortBy: string
  sortDir: 'asc' | 'desc'
  page: number
  onSort: (col: string) => void
  onPageChange: (p: number) => void
  onRowClick: (video: VideoWithSchedules) => void
  total: number
  pageSize: number
  activePlatformFilter?: Platform[] | null
}

function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: string }) {
  if (col !== sortBy) return <span className="w-3 h-3" />
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
}

function Th({ children, col, sortBy, sortDir, onSort, className }: {
  children: React.ReactNode; col?: string; sortBy: string; sortDir: string
  onSort: (c: string) => void; className?: string
}) {
  return (
    <th
      className={cn('px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap', col && 'cursor-pointer hover:text-text-primary select-none', className)}
      onClick={() => col && onSort(col)}
    >
      <div className="flex items-center gap-1">
        {children}
        {col && <SortIcon col={col} sortBy={sortBy} sortDir={sortDir} />}
      </div>
    </th>
  )
}

function SortableRow({ video, index, page, pageSize, onRowClick, onDelete, activePlatformFilter }: {
  video: VideoWithSchedules
  index: number
  page: number
  pageSize: number
  onRowClick: (v: VideoWithSchedules) => void
  onDelete: (v: VideoWithSchedules) => void
  activePlatformFilter?: Platform[] | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const scheduledPlatforms = video.video_platform_schedules?.map((s) => s.platform as Platform) ?? []

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn('hover:bg-surface cursor-pointer transition-colors', isDragging && 'opacity-50 bg-surface')}
      onClick={() => onRowClick(video)}
    >
      <td className="px-2 py-2.5 w-6" onClick={(e) => e.stopPropagation()}>
        <button
          {...attributes}
          {...listeners}
          className="text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing touch-none p-0.5"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </td>
      <td className="px-3 py-2.5 text-xs">
        {video.no_video ? (
          <span className={cn("font-mono", video.no_video === 'VID-000' ? "text-text-muted/60" : "font-semibold text-text-primary")}>
            {video.no_video}
          </span>
        ) : (
          <span className="text-text-muted/60 font-mono">
            {video.status === 'scheduled' || video.status === 'live'
              ? `VID-${String(page * pageSize + index + 1).padStart(3, '0')}`
              : 'VID-000'}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 max-w-[200px]">
        <p className="font-medium text-text-primary text-sm truncate">{video.judul}</p>
      </td>
      <td className="px-3 py-2.5 text-xs text-text-secondary max-w-[150px] truncate">
        {video.temas && video.temas.length > 0 ? video.temas.join(', ') : video.tema ?? '-'}
      </td>
      <td className="px-3 py-2.5">
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', getStatusBadgeClass(video.status as VideoStatus))}>
          {STATUS_CONFIG[video.status as VideoStatus]?.label ?? video.status}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          {PLATFORMS.map((p) => {
            const scheduled = scheduledPlatforms.includes(p)
            const isActiveFilterSet = activePlatformFilter && activePlatformFilter.length > 0
            const isFocused = !isActiveFilterSet || activePlatformFilter.includes(p)
            const isLit = scheduled && isFocused
            return (
              <div
                key={p}
                title={`${p}${scheduled ? ' (terjadwal)' : ''}`}
                className={cn(
                  'w-5 h-5 rounded-full text-[8px] font-bold flex items-center justify-center transition-all',
                  isLit ? getPlatformBadge(p) : 'bg-border text-text-muted/45'
                )}
              >
                {p[0].toUpperCase()}
              </div>
            )
          })}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-text-muted whitespace-nowrap">
        {(() => {
          const isLiveOrScheduled = video.status === 'live' || video.status === 'scheduled'
          if (isLiveOrScheduled) {
            const schedules = video.video_platform_schedules ?? []
            const targetSchedules = activePlatformFilter && activePlatformFilter.length > 0
              ? schedules.filter((s) => activePlatformFilter.includes(s.platform as Platform))
              : schedules
            if (targetSchedules.length > 0) {
              const sorted = [...targetSchedules].sort((a, b) => a.tanggal_tayang.localeCompare(b.tanggal_tayang))
              const icon = video.status === 'live' ? '🚀' : '📅'
              const textClass = video.status === 'live' ? 'text-emerald-600 font-medium' : 'text-accent font-medium'
              return (
                <span className={cn("flex items-center gap-1.5", textClass)} title={video.status === 'live' ? "Tanggal Tayang (Live)" : "Tanggal Tayang (Scheduled)"}>
                  <span>{icon}</span> {format(new Date(sorted[0].tanggal_tayang), 'd MMM', { locale: localeId })}
                </span>
              )
            }
            return <span className="text-text-muted/40 font-mono">-</span>
          } else {
            if (video.deadline_posting) {
              return (
                <span className="text-text-secondary flex items-center gap-1.5" title="Tanggal Target (Deadline)">
                  <span>🎯</span> {format(new Date(video.deadline_posting), 'd MMM', { locale: localeId })}
                </span>
              )
            }
            return <span className="text-text-muted/40 font-mono">-</span>
          }
        })()}
      </td>
      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onDelete(video)}
          className="p-1 rounded hover:bg-red-50 text-text-muted hover:text-error transition-colors inline-flex"
          title="Hapus"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}

export function TableView({ videos: initialVideos, loading, sortBy, sortDir, page, onSort, onPageChange, onRowClick, total, pageSize, activePlatformFilter }: Props) {
  const totalPages = Math.ceil(total / pageSize)
  const [localVideos, setLocalVideos] = useState<VideoWithSchedules[] | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const queryClient = useQueryClient()

  async function handleDelete(video: VideoWithSchedules) {
    if (!confirm(`Hapus "${video.judul}"? Data jadwal dan performa terkait juga akan dihapus.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('videos').delete().eq('id', video.id)
    if (error) { toast.error('Gagal menghapus: ' + error.message); return }
    toast.success('Konten dihapus')
    queryClient.invalidateQueries({ queryKey: ['videos'] })
  }

  // When initialVideos changes (like new fetch or page refetch), reset local reordered state
  useEffect(() => {
    setLocalVideos(null)
  }, [initialVideos])

  const videos = localVideos ?? initialVideos

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = videos.findIndex((v) => v.id === active.id)
    const newIdx = videos.findIndex((v) => v.id === over.id)
    // Use current page offset so sort_order stays globally consistent across pages
    const offset = page * pageSize
    const reordered = arrayMove(videos, oldIdx, newIdx)
    setLocalVideos(reordered)
    const supabase = createClient()
    const { error } = await Promise.all(
      reordered.map((v, i) =>
        supabase.from('videos').update({ sort_order: offset + i }).eq('id', v.id)
      )
    ).then(() => ({ error: null })).catch((e) => ({ error: e }))
    if (error) toast.error('Gagal menyimpan urutan')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse min-w-[840px]">
          <thead className="sticky top-0 bg-white border-b border-border z-10">
            <tr>
              <th className="w-6 px-2" />
              <Th col="no_video" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-28">No. Video</Th>
              <Th col="judul" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Judul</Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-40">Tema</Th>
              <Th col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Status</Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Platform</Th>
              <Th col="updated_at" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-36">Tanggal</Th>
              <th className="w-10" />
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={videos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
              <tbody className="divide-y divide-border">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  : videos.map((v, index) => (
                      <SortableRow
                        key={v.id}
                        video={v}
                        index={index}
                        page={page}
                        pageSize={pageSize}
                        onRowClick={onRowClick}
                        onDelete={handleDelete}
                        activePlatformFilter={activePlatformFilter}
                      />
                    ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
        {!loading && videos.length === 0 && (
          <div className="py-16 text-center">
            <Video className="w-10 h-10 text-border mx-auto mb-2" />
            <p className="text-sm text-text-muted">Tidak ada video ditemukan</p>
          </div>
        )}
      </div>

      {/* Total Count */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-white">
          <p className="text-xs text-text-muted">
            Menampilkan {total} video
          </p>
        </div>
      )}
    </div>
  )
}
