'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { ChevronUp, ChevronDown, Video, Trash2, GripVertical, Pencil, Plus } from 'lucide-react'
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
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

const PILAR_OPTIONS = ['Edukasi', 'Hiburan', 'Promosi', 'Inspirasi', 'Behind the Scenes']

type SaveFn = (id: string, patch: Record<string, unknown>) => void

function PilarCell({ video, save }: { video: VideoWithSchedules; save: SaveFn }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={video.pilar_konten ?? ''}
        onChange={(e) => { save(video.id, { pilar_konten: e.target.value || null }); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="w-full text-xs h-7 border border-accent rounded px-1 bg-white"
      >
        <option value="">Tanpa Pilar</option>
        {PILAR_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    )
  }
  return (
    <button onClick={() => setEditing(true)} className="w-full text-left group/edit flex items-center gap-1">
      {video.pilar_konten
        ? <span className="font-semibold text-accent">{video.pilar_konten}</span>
        : <span className="text-text-muted/30 font-mono">-</span>}
      <Pencil className="w-3 h-3 text-text-muted/0 group-hover/edit:text-text-muted/50 transition-colors" />
    </button>
  )
}

function TemaCell({ video, save, temaOptions }: { video: VideoWithSchedules; save: SaveFn; temaOptions: string[] }) {
  const current = (video.temas && video.temas.length > 0) ? video.temas.join(', ') : (video.tema ?? '')
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(current)
  useEffect(() => { if (!editing) setVal(current) }, [current, editing])

  const segments = val.split(',').map((s) => s.trim()).filter(Boolean)
  const lastFragment = val.includes(',') ? (val.slice(val.lastIndexOf(',') + 1).trim()) : val.trim()
  const selectedLower = new Set(segments.map((s) => s.toLowerCase()))
  const suggestions = temaOptions
    .filter((t) => !selectedLower.has(t.toLowerCase()) && t.toLowerCase().includes(lastFragment.toLowerCase()))
    .slice(0, 8)

  function commit(next?: string) {
    const source = next ?? val
    const arr = source.split(',').map((s) => s.trim()).filter(Boolean)
    save(video.id, { temas: arr })
    setEditing(false)
  }
  function pick(t: string) {
    // Replace the in-progress last fragment with the picked tema.
    const kept = val.includes(',') ? val.slice(0, val.lastIndexOf(',')).trim() : ''
    const merged = [kept, t].filter(Boolean).join(', ')
    setVal(merged)
  }

  if (editing) {
    return (
      <div className="relative">
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => setTimeout(() => commit(), 120)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          placeholder="Ketik atau pilih tema"
          className="w-full text-xs h-7 border border-accent rounded px-1.5 bg-white"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
            {suggestions.map((t) => (
              <button
                key={t}
                onMouseDown={(e) => { e.preventDefault(); pick(t) }}
                className="block w-full text-left px-2 py-1.5 text-xs text-text-primary hover:bg-surface"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
  return (
    <button onClick={() => setEditing(true)} className="w-full text-left truncate group/edit flex items-center gap-1">
      <span className="truncate">{current || <span className="text-text-muted/30 font-mono">-</span>}</span>
      <Pencil className="w-3 h-3 shrink-0 text-text-muted/0 group-hover/edit:text-text-muted/50 transition-colors" />
    </button>
  )
}

function AsetCell({ video, save }: { video: VideoWithSchedules; save: SaveFn }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(video.google_drive_link ?? '')
  useEffect(() => { if (!editing) setVal(video.google_drive_link ?? '') }, [video.google_drive_link, editing])
  function commit() { save(video.id, { google_drive_link: val.trim() || null }); setEditing(false) }
  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        placeholder="https://drive.google.com/..."
        className="w-full text-xs h-7 border border-accent rounded px-1.5 bg-white"
      />
    )
  }
  return (
    <div className="flex items-center justify-center gap-1">
      {video.google_drive_link && (
        <a href={video.google_drive_link} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors" title="Buka Google Drive">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19.43 12.98l-6.7-11.53c-.3-.5-.8-.8-1.4-.8h.02c-.6 0-1.1.3-1.4.8L3.25 12.98c-.3.5-.3 1.1 0 1.6l3.35 5.76c.3.5.8.8 1.4.8h13.4c.6 0 1.1-.3 1.4-.8l3.35-5.76c.3-.5.3-1.1 0-1.6zm-10.4-8.98h2l5.7 9.8h-2zM8.82 17.5l-2.85-4.9 5.7-9.8 2.85 4.9zm11.36 0h-13.4l2.85-4.9h13.4z" /></svg>
        </a>
      )}
      <button onClick={() => setEditing(true)} className="text-text-muted/50 hover:text-accent transition-colors" title={video.google_drive_link ? 'Ubah link' : 'Tambah link aset'}>
        {video.google_drive_link ? <Pencil className="w-3 h-3" /> : <Plus className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

function SortableRow({ video, index, page, pageSize, onRowClick, onDelete, onFieldSave, temaOptions, activePlatformFilter }: {
  video: VideoWithSchedules
  index: number
  page: number
  pageSize: number
  onRowClick: (v: VideoWithSchedules) => void
  onDelete: (v: VideoWithSchedules) => void
  onFieldSave: SaveFn
  temaOptions: string[]
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
      <td className="px-3 py-2.5 text-xs text-text-secondary max-w-[150px]" onClick={(e) => e.stopPropagation()}>
        <TemaCell video={video} save={onFieldSave} temaOptions={temaOptions} />
      </td>
      <td className="px-3 py-2.5 text-xs text-text-secondary max-w-[120px]" onClick={(e) => e.stopPropagation()}>
        <PilarCell video={video} save={onFieldSave} />
      </td>
      <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
        <AsetCell video={video} save={onFieldSave} />
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
        <div className="flex flex-col gap-0.5">
          {video.deadline_posting && (
            <span className="text-text-secondary flex items-center gap-1" title="Tanggal Target (Deadline)">
              <span className="text-[10px]">🎯</span> {format(new Date(video.deadline_posting), 'd MMM', { locale: localeId })}
            </span>
          )}
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
                  <span className={cn("flex items-center gap-1", textClass)} title={video.status === 'live' ? "Tanggal Tayang (Live)" : "Tanggal Tayang (Scheduled)"}>
                    <span>{icon}</span> {format(new Date(sorted[0].tanggal_tayang), 'd MMM', { locale: localeId })}
                  </span>
                )
              }
            }
            return !video.deadline_posting ? <span className="text-text-muted/40 font-mono">-</span> : null
          })()}
        </div>
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
  const { workspaceId } = useWorkspace()

  // Existing workspace temas for the inline Tema suggestions.
  const { data: temaOptions = [] } = useQuery<string[]>({
    queryKey: ['workspace-temas', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase.rpc('get_workspace_temas', { ws_id: workspaceId })
      return (data ?? []) as string[]
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
  })

  async function handleDelete(video: VideoWithSchedules) {
    if (!confirm(`Hapus "${video.judul}"? Data jadwal dan performa terkait juga akan dihapus.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('videos').delete().eq('id', video.id)
    if (error) { toast.error('Gagal menghapus: ' + error.message); return }
    toast.success('Konten dihapus')
    queryClient.invalidateQueries({ queryKey: ['videos'] })
  }

  // Inline edit of a single video field (pilar/tema/aset) directly in the table.
  async function handleFieldSave(id: string, patch: Record<string, unknown>) {
    const supabase = createClient()
    const { error } = await supabase.from('videos').update(patch).eq('id', id)
    if (error) { toast.error('Gagal menyimpan: ' + error.message); return }
    toast.success('Tersimpan')
    queryClient.invalidateQueries({ queryKey: ['videos'] })
    // Refresh tema suggestions in case a new tema was just introduced.
    if ('temas' in patch) queryClient.invalidateQueries({ queryKey: ['workspace-temas', workspaceId] })
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
              <Th col="pilar_konten" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-32">Pilar</Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-14 text-center">Aset</Th>
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
                        onFieldSave={handleFieldSave}
                        temaOptions={temaOptions}
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
