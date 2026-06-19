'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useVideos } from '@/lib/hooks/useVideos'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { TableView } from './table-view'
import { KanbanView } from './kanban-view'
import { AddVideoSheet } from './add-video-sheet'
import { ImportExcelDialog } from './import-excel-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LayoutList, Columns, Search, Upload, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_ORDER } from '@/lib/utils/status'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'
import type { VideoStatus, ContentType } from '@/lib/types'

type ViewMode = 'table' | 'kanban'
const PAGE_SIZE = 25

export default function ContentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { workspaceId } = useWorkspace()

  const initialStatusParam = searchParams.get('status')
  const initialMonthParam = searchParams.get('month')

  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<VideoStatus[] | 'all'>(
    initialStatusParam ? (initialStatusParam.split(',') as VideoStatus[]) : 'all'
  )
  const [monthCurrent, setMonthCurrent] = useState(initialMonthParam === 'current')
  const [sortBy, setSortBy] = useState('sort_order')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [temaFilter, setTemaFilter] = useState<string | null>(null)
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

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

  function changeView(v: ViewMode) {
    setViewMode(v)
    if (workspaceId) localStorage.setItem(`view-content-${workspaceId}`, v)
  }

  function handleSort(col: string) {
    if (col === sortBy) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(0)
  }

  const videosQuery = useVideos({
    status: statusFilter === 'all' ? null : statusFilter,
    contentType: contentTypeFilter,
    search: search || undefined,
    tema: temaFilter,
    monthCurrent,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  })

  // For kanban we need all videos (no pagination)
  const allVideosQuery = useVideos({
    status: null,
    search: search || undefined,
    sortBy: 'updated_at',
    sortDir: 'desc',
    page: 0,
    pageSize: 500,
  })

  // Total count for pagination (rough: if we got full page, there might be more)
  const total = videosQuery.data?.length === PAGE_SIZE ? (page + 2) * PAGE_SIZE : (page * PAGE_SIZE) + (videosQuery.data?.length ?? 0)

  function handleRowClick(video: VideoWithSchedules) {
    router.push('/content/' + video.id)
  }

  // Reset page on filter changes
  useEffect(() => { setPage(0) }, [search, statusFilter, temaFilter, contentTypeFilter, monthCurrent])

  function clearFilters() {
    setStatusFilter('all')
    setContentTypeFilter(null)
    setMonthCurrent(false)
    router.replace('/content')
  }

  const statusFilterLabel = statusFilter === 'all'
    ? null
    : statusFilter.length === 1
      ? statusFilter[0].charAt(0).toUpperCase() + statusFilter[0].slice(1)
      : `${statusFilter.length} status`
  const hasActiveFilter = statusFilter !== 'all' || monthCurrent || !!contentTypeFilter

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

        {/* Status filter */}
        <Select
          value={statusFilter === 'all' ? 'all' : statusFilter.length === 1 ? statusFilter[0] : 'multi'}
          onValueChange={(v) => { setStatusFilter(v === 'all' ? 'all' : [v as VideoStatus]); setMonthCurrent(false) }}
        >
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {statusFilter !== 'all' && statusFilter.length > 1 && <SelectItem value="multi" disabled>{statusFilter.length} status</SelectItem>}
            {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Tema filter */}
        {workspaceTemas.length > 0 && (
          <Select value={temaFilter ?? 'all'} onValueChange={(v) => setTemaFilter(v === 'all' ? null : v)}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="Tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tema</SelectItem>
              {workspaceTemas.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Content type filter */}
        <Select value={contentTypeFilter ?? 'all'} onValueChange={(v) => setContentTypeFilter(v === 'all' ? null : v as ContentType)}>
          <SelectTrigger className="h-8 text-sm w-32">
            <SelectValue placeholder="Tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="video">🎬 Video</SelectItem>
            <SelectItem value="foto">🖼️ Foto</SelectItem>
          </SelectContent>
        </Select>

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
        <div className="bg-white border-b border-border px-4 py-1.5 flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Filter aktif:</span>
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-[11px] rounded-full font-medium">
              Status: {statusFilterLabel}
            </span>
          )}
          {contentTypeFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-[11px] rounded-full font-medium">
              Tipe: {contentTypeFilter === 'video' ? '🎬 Video' : '🖼️ Foto'}
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
