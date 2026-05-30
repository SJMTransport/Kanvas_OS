'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useVideos } from '@/lib/hooks/useVideos'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { TableView } from './table-view'
import { KanbanView } from './kanban-view'
import { VideoDetailPanel } from './video-detail-panel'
import { AddVideoSheet } from './add-video-sheet'
import { ImportExcelDialog } from './import-excel-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { LayoutList, Columns, Search, Upload, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_ORDER } from '@/lib/utils/status'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'
import type { VideoStatus } from '@/lib/types'

type ViewMode = 'table' | 'kanban'
const PAGE_SIZE = 25

export default function ContentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { workspaceId } = useWorkspace()

  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'all'>((searchParams.get('status') as VideoStatus) ?? 'all')
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [selectedVideo, setSelectedVideo] = useState<VideoWithSchedules | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

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
    search: search || undefined,
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
    setSelectedVideo(video)
    setPanelOpen(true)
  }

  // Debounce search → reset page
  useEffect(() => { setPage(0) }, [search, statusFilter])

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)]">
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
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as VideoStatus | 'all')}>
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
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
          <span className="hidden sm:inline">Tambah Video</span>
        </Button>
      </div>

      {/* Content area */}
      <div className={cn('flex-1 overflow-hidden relative', panelOpen && viewMode === 'table' && 'lg:pr-80')}>
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

        {/* Desktop side panel */}
        {panelOpen && selectedVideo && (
          <div className="hidden lg:flex fixed right-0 top-14 bottom-0 w-80 border-l border-border bg-white z-20 flex-col">
            <VideoDetailPanel video={selectedVideo} onClose={() => { setPanelOpen(false); setSelectedVideo(null) }} />
          </div>
        )}
      </div>

      {/* Mobile: full sheet for video detail */}
      <Sheet open={panelOpen && typeof window !== 'undefined' && window.innerWidth < 1024} onOpenChange={(v) => { if (!v) { setPanelOpen(false); setSelectedVideo(null) } }}>
        <SheetContent side="bottom" className="h-[92vh] p-0">
          <VideoDetailPanel video={selectedVideo} onClose={() => { setPanelOpen(false); setSelectedVideo(null) }} />
        </SheetContent>
      </Sheet>

      <AddVideoSheet open={addOpen} onOpenChange={setAddOpen} />
      <ImportExcelDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
