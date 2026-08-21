'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useVideos } from '@/lib/hooks/useVideos'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { TableView } from './table-view'
import { KanbanView } from './kanban-view'
import { CalendarView } from '@/app/(app)/calendar/calendar-view'
import { PerformanceView } from '@/app/(app)/performance/page'
import { AddVideoSheet } from './add-video-sheet'
import { ImportExcelDialog } from './import-excel-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Upload, Plus, ListOrdered, Loader2, MoreHorizontal, Trash2, AlertTriangle, CheckSquare } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/page-header'
import { PageToolbar, SearchInput } from '@/components/layout/page-toolbar'
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs'
import { cn } from '@/lib/utils'
import { STATUS_ORDER, STATUS_CONFIG } from '@/lib/utils/status'
import { toast } from 'sonner'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'
import type { VideoStatus, ContentType, Platform } from '@/lib/types'

type ViewMode = 'table' | 'kanban' | 'calendar' | 'performance'
const DEFAULT_PAGE_SIZE = 200

export default function ContentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()

  const initialStatusParam = searchParams.get('status')
  const initialMonthParam = searchParams.get('month')
  const initialViewParam = searchParams.get('view') as ViewMode | null

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (initialViewParam && ['table', 'kanban', 'calendar', 'performance'].includes(initialViewParam)) {
      return initialViewParam
    }
    return 'table'
  })
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<VideoStatus[] | 'all'>(
    initialStatusParam ? (initialStatusParam.split(',') as VideoStatus[]) : 'all'
  )
  const [monthCurrent, setMonthCurrent] = useState(initialMonthParam === 'current')
  const [platformFilter, setPlatformFilter] = useState<Platform[] | 'all'>('all')
  const [sortBy, setSortBy] = useState('sort_order')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [temaFilter, setTemaFilter] = useState<string[] | 'all'>('all')
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType[] | 'all'>('all')
  const [pilarFilter, setPilarFilter] = useState<string[] | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [numberingSaving, setNumberingSaving] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [bulkSelectMode, setBulkSelectMode] = useState(false)

  async function handleDeleteAll() {
    if (!workspaceId) return
    setDeletingAll(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('videos').delete().eq('workspace_id', workspaceId)
      if (error) throw error
      toast.success('Seluruh data konten di workspace berhasil dihapus!')
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      setDeleteAllOpen(false)
    } catch (err: any) {
      toast.error('Gagal menghapus data: ' + err.message)
    } finally {
      setDeletingAll(false)
    }
  }

  function changeView(v: ViewMode) {
    setViewMode(v)
    if (workspaceId) localStorage.setItem(`view-content-${workspaceId}`, v)
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', v)
    router.replace(`/content?${params.toString()}`)
  }

  // Restore view from URL or localStorage
  useEffect(() => {
    if (initialViewParam && ['table', 'kanban', 'calendar', 'performance'].includes(initialViewParam)) {
      setViewMode(initialViewParam)
    } else if (workspaceId) {
      const saved = localStorage.getItem(`view-content-${workspaceId}`)
      if (saved && ['table', 'kanban', 'calendar', 'performance'].includes(saved)) {
        setViewMode(saved as ViewMode)
      }
    }
  }, [workspaceId, initialViewParam])

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

  // Auto-promote scheduled videos to live once their posting link exists & tayang date arrived
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

  function handleSort(col: string) {
    if (col === sortBy) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
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
    pageSize,
    enabled: viewMode === 'table',
  })

  // For kanban we need all videos (no pagination) — only run when kanban is active
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

  const viewOptions: TabOption<ViewMode>[] = [
    { value: 'table', label: 'Tabel' },
    { value: 'kanban', label: 'Kanban' },
    { value: 'calendar', label: 'Kalender' },
    { value: 'performance', label: 'Performa' },
  ]

  return (
    <PageContainer className="flex flex-col h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)] min-h-0 space-y-4">
      <PageHeader title="Konten" subtitle="Kelola dan pantau seluruh rencana & produksi konten" className="mb-0" />
      {/* Global Content Toolbar: Fixed & Anchored across ALL 4 view modes */}
      <PageToolbar
        left={
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul..." />
            <SegmentedTabs options={viewOptions} value={viewMode} onChange={changeView} />
          </div>
        }
        right={
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-[12px] border-[#E8EEEC]" title="Opsi & Alat">
                  <MoreHorizontal className="w-4 h-4 text-text-secondary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {viewMode === 'table' && (
                  <>
                    <DropdownMenuItem onClick={handleNumbering} disabled={numberingSaving || !workspaceId} className="gap-2 text-xs">
                      {numberingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListOrdered className="w-3.5 h-3.5" />}
                      <span>Auto-Numbering</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBulkSelectMode((prev) => !prev)} className="gap-2 text-xs cursor-pointer">
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{bulkSelectMode ? 'Sembunyikan Centang' : 'Pilih Banyak (Centang)'}</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => setImportOpen(true)} className="gap-2 text-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteAllOpen(true)} className="gap-2 text-xs text-error focus:text-error focus:bg-red-50 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5 text-error" />
                  <span>Hapus Semua Konten</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="lg" className="h-10 gap-1.5 text-sm font-semibold rounded-[12px] bg-[#4C9998] hover:bg-[#287978] text-white" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Tambah Konten</span>
            </Button>
          </div>
        }
      />

      {/* Active filter chip */}
      {hasActiveFilter && viewMode === 'table' && (
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

      {/* Content area based on active viewMode */}
      <div className={cn("flex-1 relative min-h-0 flex flex-col", viewMode === 'table' ? "overflow-hidden" : "overflow-auto")}>
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
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0) }}
            bulkSelectMode={bulkSelectMode}
            onToggleBulkSelectMode={setBulkSelectMode}
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
        ) : viewMode === 'kanban' ? (
          <KanbanView
            videos={allVideosQuery.data ?? []}
            onCardClick={handleRowClick}
          />
        ) : viewMode === 'calendar' ? (
          <CalendarView />
        ) : (
          <PerformanceView searchQuery={search} embedded />
        )}
      </div>

      <AddVideoSheet open={addOpen} onOpenChange={setAddOpen} />
      <ImportExcelDialog open={importOpen} onOpenChange={setImportOpen} />

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 text-error" />
            </div>
            <DialogTitle className="text-base text-text-primary">Hapus Seluruh Data Konten?</DialogTitle>
            <DialogDescription className="text-xs text-text-secondary leading-relaxed pt-1">
              Tindakan ini akan menghapus <strong>SELURUH {total} data konten</strong> di workspace ini secara permanen. Setelah dihapus, Anda dapat mengunggah ulang file Excel yang bersih.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteAllOpen(false)} disabled={deletingAll}>
              Batal
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteAll} disabled={deletingAll} className="gap-1.5 bg-error hover:bg-error/90 text-white font-semibold">
              {deletingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Ya, Hapus Semua Konten
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
