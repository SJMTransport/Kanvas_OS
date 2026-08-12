'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useVideos } from '@/lib/hooks/useVideos'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { TableView } from './table-view'
import { KanbanView } from './kanban-view'
import { AddVideoSheet } from './add-video-sheet'
import { ImportExcelDialog } from './import-excel-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LayoutList, Columns, Search, Upload, Plus, X, ChevronDown, ListOrdered, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_ORDER, STATUS_CONFIG } from '@/lib/utils/status'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'
import type { VideoStatus, ContentType, Platform } from '@/lib/types'

type ViewMode = 'table' | 'kanban'
const PAGE_SIZE = 200

export default function ContentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()

  const initialStatusParam = searchParams.get('status')
  const initialMonthParam = searchParams.get('month')

  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<VideoStatus[] | 'all'>(
    initialStatusParam ? (initialStatusParam.split(',') as VideoStatus[]) : 'all'
  )
  const [monthCurrent, setMonthCurrent] = useState(initialMonthParam === 'current')
  const [platformFilter, setPlatformFilter] = useState<Platform[] | 'all'>('all')
  const [sortBy, setSortBy] = useState('sort_order')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [temaFilter, setTemaFilter] = useState<string[] | 'all'>('all')
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType[] | 'all'>('all')
  const [pilarFilter, setPilarFilter] = useState<string[] | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [numberingSaving, setNumberingSaving] = useState(false)

  async function handleNumbering() {
    if (!workspaceId) return
    if (!confirm('Apakah Anda yakin ingin mengurutkan nomor video (VID-XXX) mulai dari 1 dari baris paling bawah ke atas?')) return
    
    setNumberingSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('calibrate_workspace_videos', { ws_id: workspaceId })
      if (error) throw error
      toast.success('Nomor video berhasil diurutkan!')
      videosQuery.refetch()
      allVideosQuery.refetch()
    } catch (err: any) {
      toast.error('Gagal mengurutkan nomor: ' + (err.message ?? err))
    } finally {
      setNumberingSaving(false)
    }
  }

  const { data: workspaceTemas = [] } = useQuery<string[]>({
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

  // Restore view from localStorage
  useEffect(() => {
    if (workspaceId) {
      const saved = localStorage.getItem(`view-content-${workspaceId}`)
      if (saved === 'kanban' || saved === 'table') setViewMode(saved)
    }
  }, [workspaceId])

  // Auto-promote scheduled videos to live once they have a posting link and
  // their tayang date has arrived. Runs once when the content list opens.
  useEffect(() => {
    if (!workspaceId) return
    const supabase = createClient()
    supabase.rpc('promote_scheduled_to_live', { ws_id: workspaceId }).then((res: { data: number | null }) => {
      if (res.data && Number(res.data) > 0) {
        queryClient.invalidateQueries({ queryKey: ['videos'] })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  function changeView(v: ViewMode) {
    setViewMode(v)
    if (workspaceId) localStorage.setItem(`view-content-${workspaceId}`, v)
  }

  function handleSort(col: string) {
    if (col === sortBy) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(0)
  }

  const handleStatusChange = (status: VideoStatus, checked: boolean) => {
    setStatusFilter((prev) => {
      if (checked) {
        return prev === 'all' ? [status] : [...prev, status]
      } else {
        if (prev === 'all') return 'all'
        const next = prev.filter((s) => s !== status)
        return next.length === 0 ? 'all' : next
      }
    })
    setMonthCurrent(false)
  }

  const handlePlatformChange = (p: Platform, checked: boolean) => {
    setPlatformFilter((prev) => {
      if (checked) {
        return prev === 'all' ? [p] : [...prev, p]
      } else {
        if (prev === 'all') return 'all'
        const next = prev.filter((x) => x !== p)
        return next.length === 0 ? 'all' : next
      }
    })
  }

  const handleTemaChange = (t: string, checked: boolean) => {
    setTemaFilter((prev) => {
      if (checked) {
        return prev === 'all' ? [t] : [...prev, t]
      } else {
        if (prev === 'all') return 'all'
        const next = prev.filter((x) => x !== t)
        return next.length === 0 ? 'all' : next
      }
    })
  }

  const handleContentTypeChange = (type: ContentType, checked: boolean) => {
    setContentTypeFilter((prev) => {
      if (checked) {
        return prev === 'all' ? [type] : [...prev, type]
      } else {
        if (prev === 'all') return 'all'
        const next = prev.filter((x) => x !== type)
        return next.length === 0 ? 'all' : next
      }
    })
  }

  const handlePilarChange = (pilar: string, checked: boolean) => {
    setPilarFilter((prev) => {
      if (checked) {
        return prev === 'all' ? [pilar] : [...prev, pilar]
      } else {
        if (prev === 'all') return 'all'
        const next = prev.filter((x) => x !== pilar)
        return next.length === 0 ? 'all' : next
      }
    })
  }

  const videosQuery = useVideos({
    status: statusFilter === 'all' ? null : statusFilter,
    contentType: contentTypeFilter === 'all' ? null : contentTypeFilter,
    platform: platformFilter === 'all' ? null : platformFilter,
    search: search || undefined,
    tema: temaFilter === 'all' ? null : temaFilter,
    pilarKonten: pilarFilter === 'all' ? null : pilarFilter,
    monthCurrent,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
    enabled: viewMode === 'table',
  })

  // For kanban we need all videos (no pagination). Only fetch when kanban is active
  // so the default table view doesn't pay for a second full videos fetch.
  const allVideosQuery = useVideos({
    status: null,
    search: search || undefined,
    sortBy: 'updated_at',
    sortDir: 'desc',
    page: 0,
    pageSize: 500,
    enabled: viewMode === 'kanban',
  })

  const total = videosQuery.data?.length ?? 0

  function handleRowClick(video: VideoWithSchedules) {
    router.push('/content/' + video.id)
  }

  // Reset page on filter changes
  useEffect(() => { setPage(0) }, [search, statusFilter, temaFilter, contentTypeFilter, platformFilter, monthCurrent, pilarFilter])

  function clearFilters() {
    setStatusFilter('all')
    setContentTypeFilter('all')
    setPlatformFilter('all')
    setTemaFilter('all')
    setPilarFilter('all')
    setMonthCurrent(false)
    router.replace('/content')
  }

  const statusFilterLabel = statusFilter === 'all'
    ? 'Semua Status'
    : statusFilter.length === 1
      ? STATUS_CONFIG[statusFilter[0]]?.label ?? statusFilter[0]
      : `${statusFilter.length} Status`

  const platformFilterLabel = platformFilter === 'all'
    ? 'Semua Platform'
    : platformFilter.length === 1
      ? platformFilter[0].charAt(0).toUpperCase() + platformFilter[0].slice(1)
      : `${platformFilter.length} Platform`

  const temaFilterLabel = temaFilter === 'all'
    ? 'Semua Tema'
    : temaFilter.length === 1
      ? temaFilter[0]
      : `${temaFilter.length} Tema`

  const contentTypeFilterLabel = contentTypeFilter === 'all'
    ? 'Semua Tipe'
    : contentTypeFilter.length === 1
      ? (contentTypeFilter[0] === 'video' ? '🎬 Video' : '🖼️ Foto')
      : `${contentTypeFilter.length} Tipe`

  const pilarFilterLabel = pilarFilter === 'all'
    ? 'Semua Pilar'
    : pilarFilter.length === 1
      ? pilarFilter[0]
      : `${pilarFilter.length} Pilar`

  const hasActiveFilter = statusFilter !== 'all' || platformFilter !== 'all' || temaFilter !== 'all' || contentTypeFilter !== 'all' || pilarFilter !== 'all' || monthCurrent

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)] min-h-0">
      {/* Toolbar */}
      <div className="bg-white border-b border-border px-4 py-2.5 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <Input
            placeholder="Cari judul..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button onClick={() => changeView('table')} className={cn('p-1.5 transition-colors', viewMode === 'table' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle')}>
            <LayoutList className="w-4 h-4" />
          </button>
          <button onClick={() => changeView('kanban')} className={cn('p-1.5 transition-colors', viewMode === 'kanban' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle')}>
            <Columns className="w-4 h-4" />
          </button>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 text-xs border-border bg-white text-text-primary hover:bg-subtle" 
          onClick={handleNumbering}
          disabled={numberingSaving || !workspaceId}
        >
          {numberingSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ListOrdered className="w-3.5 h-3.5" />
          )}
          <span>Numbering</span>
        </Button>

        <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setImportOpen(true)}>
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Import Excel</span>
        </Button>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tambah Konten</span>
        </Button>
      </div>

      {/* Active filter chip */}
      {hasActiveFilter && (
        <div className="bg-white border-b border-border px-4 py-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-text-muted">Filter aktif:</span>
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-[11px] rounded-full font-medium">
              Status: {statusFilterLabel}
            </span>
          )}
          {temaFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-[11px] rounded-full font-medium">
              Tema: {temaFilterLabel}
            </span>
          )}
          {contentTypeFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-[11px] rounded-full font-medium">
              Tipe: {contentTypeFilterLabel}
            </span>
          )}
          {platformFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-[11px] rounded-full font-medium">
              Platform: {platformFilterLabel}
            </span>
          )}
          {pilarFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-[11px] rounded-full font-medium">
              Pilar: {pilarFilterLabel}
            </span>
          )}
          {monthCurrent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-[11px] rounded-full font-medium">
              Bulan ini
            </span>
          )}
          <button onClick={clearFilters} className="text-[11px] text-text-muted hover:text-error underline ml-1">
            Hapus filter
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto relative min-h-0">
        {viewMode === 'table' ? (
          <TableView
            videos={videosQuery.data ?? []}
            loading={videosQuery.isLoading}
            sortBy={sortBy}
            sortDir={sortDir}
            page={page}
            onSort={handleSort}
            onPageChange={setPage}
            onRowClick={handleRowClick}
            total={total}
            pageSize={PAGE_SIZE}
            activePlatformFilter={platformFilter === 'all' ? null : platformFilter}
            columnFilters={{
              status: {
                value: statusFilter,
                toggle: (v, c) => handleStatusChange(v as VideoStatus, c),
                reset: () => setStatusFilter('all'),
                options: STATUS_ORDER.map((s) => ({ value: s, label: STATUS_CONFIG[s]?.label ?? s })),
              },
              tema: {
                value: temaFilter,
                toggle: (v, c) => handleTemaChange(v, c),
                reset: () => setTemaFilter('all'),
                options: workspaceTemas.map((t) => ({ value: t, label: t })),
              },
              pilar: {
                value: pilarFilter,
                toggle: (v, c) => handlePilarChange(v, c),
                reset: () => setPilarFilter('all'),
                options: ['Edukasi', 'Hiburan', 'Promosi', 'Inspirasi', 'Behind the Scenes'].map((p) => ({ value: p, label: p })),
              },
              platform: {
                value: platformFilter,
                toggle: (v, c) => handlePlatformChange(v as Platform, c),
                reset: () => setPlatformFilter('all'),
                options: [
                  { value: 'tiktok', label: '🎵 TikTok' },
                  { value: 'instagram', label: '📸 Instagram' },
                  { value: 'youtube', label: '📺 YouTube' },
                  { value: 'facebook', label: '👥 Facebook' },
                ],
              },
            }}
          />
        ) : (
          <KanbanView
            videos={allVideosQuery.data ?? []}
            onCardClick={handleRowClick}
          />
        )}
      </div>

      <AddVideoSheet open={addOpen} onOpenChange={setAddOpen} />
      <ImportExcelDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
