'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Video, CalendarDays, ClipboardList } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ContentIdentity } from '@/components/content/ContentIdentity'
import { getStatusBadgeClass, STATUS_CONFIG, STATUS_ORDER } from '@/lib/utils/status'
import { getPlatformDot } from '@/lib/utils/platform'
import { useUpdateVideoStatus } from '@/lib/hooks/useVideos'
import { cn } from '@/lib/utils'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'
import type { VideoStatus, Platform } from '@/lib/types'

interface KanbanCardProps {
  video: VideoWithSchedules
  onClick: (v: VideoWithSchedules) => void
  overlay?: boolean
}

function KanbanCard({ video, onClick, overlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const platforms = [...new Set(video.video_platform_schedules?.map((s) => s.platform as Platform) ?? [])]
  const nextSchedule = video.video_platform_schedules?.[0]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white border border-border/70 rounded-xl p-3 cursor-grab active:cursor-grabbing select-none shadow-card hover:shadow-subtle transition-all',
        isDragging && 'opacity-40',
        overlay && 'shadow-modal rotate-1'
      )}
      {...attributes}
      {...listeners}
      onClick={(e) => { if (!isDragging) onClick(video) }}
    >
      {video.thumbnail_url && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-subtle mb-2.5">
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-snug mb-2.5">
        <ContentIdentity videoNo={video.no_video} judul={video.judul} numberClassName="font-mono text-text-muted" />
      </p>
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <div className="flex items-center gap-1">
          {platforms.slice(0, 3).map((p) => (
            <div key={p} className={cn('w-3.5 h-3.5 rounded-full', getPlatformDot(p))} title={p} />
          ))}
          {nextSchedule?.tanggal_tayang && (
            <span className="text-[10px] text-text-muted font-medium ml-1">
              {format(parseISO(nextSchedule.tanggal_tayang), 'd MMM', { locale: localeId })}
            </span>
          )}
        </div>
        {video.users && (
          <Avatar className="w-5 h-5">
            <AvatarImage src={video.users.avatar_url ?? ''} />
            <AvatarFallback className="text-[8px] bg-teal-50 text-teal-700 font-bold">
              {video.users.full_name?.slice(0, 2).toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
        )}
        <Link
          href={`/content/${video.id}/production`}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded-md hover:bg-subtle text-text-muted hover:text-teal-700 transition-colors"
          title="Production Sheet"
        >
          <ClipboardList className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

interface Props {
  videos: VideoWithSchedules[]
  onCardClick: (v: VideoWithSchedules) => void
}

export function KanbanView({ videos, onCardClick }: Props) {
  const [dragging, setDragging] = useState<VideoWithSchedules | null>(null)
  const updateStatus = useUpdateVideoStatus()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_CONFIG[status].label,
    videos: videos.filter((v) => v.status === status),
  }))

  function handleDragStart(e: DragStartEvent) {
    const video = videos.find((v) => v.id === e.active.id)
    if (video) setDragging(video)
  }

  function handleDragEnd(e: DragEndEvent) {
    setDragging(null)
    const { active, over } = e
    if (!over) return
    const overId = String(over.id)
    const targetStatus = STATUS_ORDER.includes(overId as VideoStatus)
      ? (overId as VideoStatus)
      : videos.find((v) => v.id === overId)?.status

    if (!targetStatus) return
    const activeVideo = videos.find((v) => v.id === active.id)
    if (activeVideo && activeVideo.status !== targetStatus) {
      updateStatus.mutate({ id: activeVideo.id, status: targetStatus })
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden gap-3 p-4 bg-[#F7FAF9]/60 rounded-[16px] border border-[#E8EEEC]">
        {columns.map((col) => (
          <div
            key={col.status}
            id={col.status}
            className="flex flex-col shrink-0 w-64 h-full bg-white rounded-xl border border-[#E8EEEC] p-2"
          >
            <div className="flex items-center justify-between px-2.5 py-2 border-b border-[#E8EEEC] mb-1.5">
              <span className={getStatusBadgeClass(col.status)}>
                {col.label}
              </span>
              <span className="text-xs text-text-muted font-bold px-2 py-0.5 rounded-full bg-[#F7FAF9] border border-[#E8EEEC]">{col.videos.length}</span>
            </div>
            <SortableContext items={col.videos.map((v) => v.id)} strategy={verticalListSortingStrategy} id={col.status}>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-2 min-h-0">
                {col.videos.map((v) => (
                  <KanbanCard key={v.id} video={v} onClick={onCardClick} />
                ))}
                {col.videos.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-xs text-text-muted font-medium">Tidak ada konten</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
      <DragOverlay>
        {dragging && <KanbanCard video={dragging} onClick={() => {}} overlay />}
      </DragOverlay>
    </DndContext>
  )
}
