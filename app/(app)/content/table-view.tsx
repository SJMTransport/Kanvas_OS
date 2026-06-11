'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, isPast, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { ChevronUp, ChevronDown, Video, ChevronLeft, ChevronRight, ClipboardList, GripVertical } from 'lucide-react'
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
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

function SortableRow({ video, onRowClick, sortBy, sortDir }: {
  video: VideoWithSchedules
  onRowClick: (v: VideoWithSchedules) => void
  sortBy: string
  sortDir: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const isDeadlinePast = video.deadline_posting && isPast(parseISO(video.deadline_posting))
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
      <td className="px-3 py-2.5 text-xs text-text-muted">{video.no_upload ?? '—'}</td>
      <td className="px-3 py-2.5">
        <div className="w-10 h-10 rounded-md overflow-hidden bg-subtle flex items-center justify-center shrink-0">
          {video.thumbnail_url
            ? <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
            : <Video className="w-4 h-4 text-border" />}
        </div>
      </td>
      <td className="px-3 py-2.5 max-w-[200px]">
        <p className="font-medium text-text-primary text-sm truncate">{video.judul}</p>
        {video.no_video && <p className="text-[11px] text-text-muted">{video.no_video}</p>}
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
            return (
              <div
                key={p}
                title={`${p}${scheduled ? ' (terjadwal)' : ''}`}
                className={cn(
                  'w-5 h-5 rounded-full text-[8px] font-bold flex items-center justify-center',
                  scheduled ? getPlatformBadge(p) : 'bg-border text-text-muted'
                )}
              >
                {p[0].toUpperCase()}
              </div>
            )
          })}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
        {video.deadline_posting ? (
          <span className={isDeadlinePast ? 'text-error font-medium' : 'text-text-secondary'}>
            {isDeadlinePast ? 'Terlewat' : format(parseISO(video.deadline_posting), 'd MMM', { locale: localeId })}
          </span>
        ) : <span className="text-text-muted">—</span>}
      </td>
      <td className="px-3 py-2.5 text-xs text-text-secondary">
        {video.is_endorsement ? '✓' : '—'}
      </td>
      <td className="px-3 py-2.5">
        {video.users ? (
          <Avatar className="w-6 h-6" title={video.users.full_name ?? ''}>
            <AvatarImage src={video.users.avatar_url ?? ''} />
            <AvatarFallback className="text-[9px] bg-accent-light text-accent">
              {video.users.full_name?.slice(0, 2).toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
        ) : <span className="text-text-muted text-xs">—</span>}
      </td>
      <td className="px-3 py-2.5 text-xs text-text-muted whitespace-nowrap">
        {format(new Date(video.updated_at), 'd MMM', { locale: localeId })}
      </td>
      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/content/${video.id}/production`}
          className="p-1 rounded hover:bg-accent-light text-text-muted hover:text-accent transition-colors inline-flex"
          title="Production Sheet"
        >
          <ClipboardList className="w-3.5 h-3.5" />
        </Link>
      </td>
    </tr>
  )
}

export function TableView({ videos: initialVideos, loading, sortBy, sortDir, page, onSort, onPageChange, onRowClick, total, pageSize }: Props) {
  const totalPages = Math.ceil(total / pageSize)
  const [videos, setVideos] = useState(initialVideos)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Sync only when initialVideos reference changes (new page/filter/fetch)
  useEffect(() => {
    if (!loading) setVideos(initialVideos)
  }, [initialVideos])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = videos.findIndex((v) => v.id === active.id)
    const newIdx = videos.findIndex((v) => v.id === over.id)
    // Use current page offset so sort_order stays globally consistent across pages
    const offset = page * pageSize
    const reordered = arrayMove(videos, oldIdx, newIdx)
    setVideos(reordered)
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
              <Th col="no_upload" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-10">#</Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-12">Thumb</Th>
              <Th col="judul" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Judul</Th>
              <Th col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Status</Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Platform</Th>
              <Th col="deadline_posting" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Deadline</Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Brand</Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Assigned</Th>
              <Th col="updated_at" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Update</Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-10">{''}</Th>
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={videos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
              <tbody className="divide-y divide-border">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 11 }).map((_, j) => (
                          <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  : videos.map((v) => (
                      <SortableRow key={v.id} video={v} onRowClick={onRowClick} sortBy={sortBy} sortDir={sortDir} />
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

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-white">
          <p className="text-xs text-text-muted">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} dari {total} video
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="p-1.5 rounded hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-secondary px-2">{page + 1} / {totalPages || 1}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
