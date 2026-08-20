'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { ChevronUp, ChevronDown, Video, Trash2, GripVertical, Pencil, Plus, Filter, Copy, Check, Loader2 } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import { getStatusBadgeClass, STATUS_CONFIG, STATUS_ORDER } from '@/lib/utils/status'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'
import type { VideoStatus, Platform } from '@/lib/types'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']

// A single column filter: current value ('all' or a list), a per-option toggle,
// and a reset back to 'all'.
export interface FilterSpec {
  value: string[] | 'all'
  toggle: (v: string, checked: boolean) => void
  reset: () => void
  options: { value: string; label: string }[]
}
export interface ColumnFilters {
  status: FilterSpec
  tema: FilterSpec
  pilar: FilterSpec
  platform: FilterSpec
}

// Funnel button in a column header that opens the filter for that column.
function HeaderFilter({ label, spec }: { label: string; spec?: FilterSpec }) {
  if (!spec) return null
  const active = spec.value !== 'all'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn('p-0.5 rounded transition-colors', active ? 'text-accent' : 'text-text-muted/40 hover:text-text-muted')}
          title={`Filter ${label}`}
        >
          <Filter className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="start" className="w-48 max-h-72 overflow-y-auto bg-white border border-border">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={spec.value === 'all'} onCheckedChange={(c) => c && spec.reset()}>
          Semua
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {spec.options.map((o) => {
          const checked = spec.value !== 'all' && spec.value.includes(o.value)
          return (
            <DropdownMenuCheckboxItem key={o.value} checked={checked} onCheckedChange={(c) => spec.toggle(o.value, c)}>
              {o.label}
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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
  onPageSizeChange?: (size: number) => void
  activePlatformFilter?: Platform[] | null
  columnFilters?: ColumnFilters
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

function NoVideoCell({ video, index, page, pageSize, save }: {
  video: VideoWithSchedules
  index: number
  page: number
  pageSize: number
  save: SaveFn
}) {
  const defaultDisplay = video.no_video || (
    video.status === 'scheduled' || video.status === 'live'
      ? `VID-${String(page * pageSize + index + 1).padStart(3, '0')}`
      : 'VID-000'
  )

  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(defaultDisplay)

  useEffect(() => { if (!editing) setVal(defaultDisplay) }, [defaultDisplay, editing])

  function commit() {
    const trimmed = val.trim()
    save(video.id, { no_video: trimmed || null })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          placeholder="misal VID-015.1"
          className="w-24 text-xs h-7 border border-accent rounded px-1.5 font-mono bg-white font-semibold text-teal-800"
        />
      </div>
    )
  }

  return (
    <button onClick={(e) => { e.stopPropagation(); setEditing(true) }} className="group/num flex items-center gap-1 text-left" title="Klik untuk ubah penomoran / buat cabang (misal 15.1, 15.2)">
      <span className={cn(
        "font-mono transition-colors",
        defaultDisplay === 'VID-000' ? "text-text-muted/60" : "font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60 group-hover/num:border-teal-400"
      )}>
        {defaultDisplay}
      </span>
      <Pencil className="w-3 h-3 text-text-muted/0 group-hover/num:text-text-muted/50 transition-colors" />
    </button>
  )
}

const PILAR_OPTIONS = ['Edukasi', 'Hiburan', 'Promosi', 'Inspirasi', 'Behind the Scenes']

type SaveFn = (id: string, patch: Record<string, unknown>) => void

function PilarCell({ video, save, pilarOptions }: { video: VideoWithSchedules; save: SaveFn; pilarOptions?: string[] }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(video.pilar_konten ?? '')
  useEffect(() => { if (!editing) setVal(video.pilar_konten ?? '') }, [video.pilar_konten, editing])

  const options = Array.from(new Set([...PILAR_OPTIONS, ...(pilarOptions ?? [])]))
  const suggestions = options
    .filter((p) => p.toLowerCase().includes(val.toLowerCase().trim()))
    .slice(0, 8)

  function commit(nextVal?: string) {
    const finalVal = (nextVal !== undefined ? nextVal : val).trim()
    save(video.id, { pilar_konten: finalVal || null })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => setTimeout(() => commit(), 120)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          placeholder="Ketik atau pilih pilar"
          className="w-full text-xs h-7 border border-accent rounded px-1.5 bg-white font-medium text-accent"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
            {suggestions.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); commit(p) }}
                className="block w-full text-left px-2 py-1.5 text-xs text-text-primary hover:bg-surface font-medium"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); setEditing(true) }} className="w-full text-left group/edit flex items-center gap-1">
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

function CaptionCopyCell({ caption }: { caption: string | null | undefined }) {
  const [copied, setCopied] = useState(false)

  if (!caption || !caption.trim()) {
    return <span className="text-text-muted/30 font-mono text-xs text-center block">-</span>
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(caption)
    toast.success('Caption berhasil disalin!')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleCopy}
        title={caption}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-subtle cursor-pointer select-none",
          copied
            ? "bg-emerald-600 text-white border border-emerald-600"
            : "bg-teal-50 text-[#287978] border border-teal-200 hover:bg-[#4C9998] hover:text-white hover:border-[#4C9998]"
        )}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Tersalin!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  )
}

function SortableRow({ video, index, page, pageSize, isSelected, onToggleSelect, onRowClick, onDelete, onFieldSave, temaOptions, activePlatformFilter }: {
  video: VideoWithSchedules
  index: number
  page: number
  pageSize: number
  isSelected: boolean
  onToggleSelect: (id: string) => void
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
      className={cn('hover:bg-subtle/80 cursor-pointer transition-colors border-b border-border/60', isDragging && 'opacity-50 bg-subtle', isSelected && 'bg-accent-light/20')}
      onClick={() => onRowClick(video)}
    >
      <td className="px-2 py-3.5 w-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(video.id)}
            className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent accent-[#4C9998] cursor-pointer"
          />
          <button
            {...attributes}
            {...listeners}
            className="text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing touch-none p-0.5"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
      <td className="px-3.5 py-3.5 text-xs">
        <NoVideoCell video={video} index={index} page={page} pageSize={pageSize} save={onFieldSave} />
      </td>
      <td className="px-3.5 py-3.5 max-w-[220px]">
        <p className="font-semibold text-text-primary text-sm truncate leading-snug">{video.judul}</p>
      </td>
      <td className="px-3.5 py-3.5 text-xs text-text-secondary max-w-[150px]" onClick={(e) => e.stopPropagation()}>
        <TemaCell video={video} save={onFieldSave} temaOptions={temaOptions} />
      </td>
      <td className="px-3.5 py-3.5 text-xs text-text-secondary max-w-[120px]" onClick={(e) => e.stopPropagation()}>
        <PilarCell video={video} save={onFieldSave} pilarOptions={temaOptions} />
      </td>
      <td className="px-3.5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
        <AsetCell video={video} save={onFieldSave} />
      </td>
      <td className="px-3.5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
        <CaptionCopyCell caption={video.caption_default} />
      </td>
      <td className="px-3.5 py-3.5">
        <span className={getStatusBadgeClass(video.status as VideoStatus)}>
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
                  <div className="flex flex-col gap-0.5">
                    {sorted.map((s, sIdx) => (
                      <span key={s.id ?? sIdx} className={cn("flex items-center gap-1", textClass)} title={`${s.platform}: ${format(new Date(s.tanggal_tayang), 'd MMM yyyy', { locale: localeId })}`}>
                        <span>{icon}</span> {format(new Date(s.tanggal_tayang), 'd MMM', { locale: localeId })}
                      </span>
                    ))}
                  </div>
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

export function TableView({ videos: initialVideos, loading, sortBy, sortDir, page, onSort, onPageChange, onRowClick, total, pageSize, onPageSizeChange, activePlatformFilter, columnFilters }: Props) {
  const totalPages = Math.ceil(total / pageSize)
  const [localVideos, setLocalVideos] = useState<VideoWithSchedules[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deletingSelected, setDeletingSelected] = useState(false)
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

  const allRowIds = videos.map((v) => v.id)
  const isAllSelected = allRowIds.length > 0 && allRowIds.every((id) => selectedIds.includes(id))

  function toggleSelectAll() {
    if (isAllSelected) setSelectedIds([])
    else setSelectedIds(allRowIds)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  async function handleDeleteSelected() {
    if (!selectedIds.length) return
    if (!confirm(`Hapus ${selectedIds.length} konten terpilih? Data jadwal dan performa terkait juga akan dihapus.`)) return
    setDeletingSelected(true)
    try {
      const supabase = createClient()
      const BATCH_SIZE = 50
      for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
        const chunk = selectedIds.slice(i, i + BATCH_SIZE)
        const { error } = await supabase.from('videos').delete().in('id', chunk)
        if (error) throw error
      }
      toast.success(`${selectedIds.length} konten terpilih berhasil dihapus!`)
      setSelectedIds([])
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message)
    } finally {
      setDeletingSelected(false)
    }
  }

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
              <th className="w-10 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent accent-[#4C9998] cursor-pointer"
                  title="Pilih semua di halaman ini"
                />
              </th>
              <Th col="no_video" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-28">No. Video</Th>
              <Th col="judul" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Judul</Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-40">Tema <HeaderFilter label="Tema" spec={columnFilters?.tema} /></Th>
              <Th col="pilar_konten" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-32">Pilar <HeaderFilter label="Pilar" spec={columnFilters?.pilar} /></Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-14 text-center">Aset</Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-24 text-center">Caption</Th>
              <Th col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Status <HeaderFilter label="Status" spec={columnFilters?.status} /></Th>
              <Th sortBy={sortBy} sortDir={sortDir} onSort={onSort}>Platform <HeaderFilter label="Platform" spec={columnFilters?.platform} /></Th>
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
                        {Array.from({ length: 9 }).map((_, j) => (
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
                        isSelected={selectedIds.includes(v.id)}
                        onToggleSelect={toggleSelect}
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

      {/* Total Count & Page Size Selector */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-white text-xs text-text-muted">
          <p>
            {pageSize >= 10000 ? `Menampilkan Semua (${total} video)` : `Menampilkan ${total} video`}
          </p>
          <div className="flex items-center gap-2">
            <span>Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="text-xs border border-border rounded px-2 py-1 bg-white font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              <option value={50}>50 video</option>
              <option value={100}>100 video</option>
              <option value={200}>200 video (Default)</option>
              <option value={500}>500 video</option>
              <option value={10000}>Tampilkan Semua ({total > 0 ? `${total}+` : 'Semua'})</option>
            </select>
          </div>
        </div>
      )}

      {/* Floating Action Bar for Selected Rows */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-full px-5 py-2.5 shadow-2xl flex items-center gap-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <span className="text-xs font-semibold text-slate-200">{selectedIds.length} konten dipilih</span>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={handleDeleteSelected}
            disabled={deletingSelected}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold rounded-full transition-all shadow-sm cursor-pointer"
          >
            {deletingSelected ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Hapus {selectedIds.length} Terpilih</span>
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      )}
    </div>
  )
}
