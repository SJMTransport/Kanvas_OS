'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Link2, CheckCircle2, Loader2, X, Film, Image as ImageIcon, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG, STATUS_ORDER } from '@/lib/utils/status'
import type { Video, VideoStatus, Platform } from '@/lib/types'
import { toast } from 'sonner'

interface VideoWithBrand extends Video {
  brand_name?: string | null
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  brandId: string
  brandName?: string
  onLinked?: () => void
}

const PLATFORM_ICONS: Record<Platform, string> = {
  tiktok: '📱',
  instagram: '📸',
  youtube: '▶️',
  facebook: '📘',
}

const FORMAT_COLORS: Record<string, string> = {
  'Short Video': 'bg-violet-50 text-violet-700 border-violet-200',
  'Long Video': 'bg-blue-50 text-blue-700 border-blue-200',
  'Reels': 'bg-pink-50 text-pink-700 border-pink-200',
  'Live': 'bg-red-50 text-red-700 border-red-200',
}

function getPlatformFromFormat(format: string | null): Platform | null {
  if (!format) return null
  const f = format.toLowerCase()
  if (f.includes('reels')) return 'instagram'
  if (f.includes('short')) return 'tiktok'
  if (f.includes('long')) return 'youtube'
  return null
}

export function LinkVideoDialog({ open, onOpenChange, brandId, brandName, onLinked }: Props) {
  const { workspaceId } = useWorkspace()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'all'>('all')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [linking, setLinking] = useState<string | null>(null)

  // Fetch all videos in the workspace
  const { data: allVideos = [], isLoading } = useQuery<VideoWithBrand[]>({
    queryKey: ['all-workspace-videos-for-linking', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      // Select videos + join brands for current brand_id
      const { data } = await supabase
        .from('videos')
        .select('*, brands(nama_brand)')
        .eq('workspace_id', workspaceId)
        .order('no_upload', { ascending: false })
      return ((data ?? []) as any[]).map((v) => ({
        ...v,
        brand_name: v.brands?.nama_brand ?? null,
      }))
    },
    enabled: !!workspaceId && open,
    staleTime: 30_000,
  })

  // Unique format options from data
  const formatOptions = useMemo(() => {
    const formats = new Set<string>()
    allVideos.forEach((v) => { if (v.format) formats.add(v.format) })
    return Array.from(formats).sort()
  }, [allVideos])

  // Filter + search
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allVideos.filter((v) => {
      const matchesSearch =
        !q ||
        v.judul?.toLowerCase().includes(q) ||
        (v.no_video ?? '').toLowerCase().includes(q) ||
        (v.tema ?? '').toLowerCase().includes(q) ||
        (v.temas ?? []).some((t) => t.toLowerCase().includes(q)) ||
        (v.format ?? '').toLowerCase().includes(q) ||
        (v.pilar_konten ?? '').toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'all' || v.status === statusFilter
      const matchesFormat = formatFilter === 'all' || v.format === formatFilter

      return matchesSearch && matchesStatus && matchesFormat
    })
  }, [allVideos, search, statusFilter, formatFilter])

  async function handleLink(video: VideoWithBrand) {
    setLinking(video.id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('videos')
        .update({ brand_id: brandId, is_endorsement: true })
        .eq('id', video.id)
      if (error) throw error
      toast.success(`"${video.judul}" berhasil ditautkan ke ${brandName ?? 'brand ini'}`)
      onLinked?.()
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal menautkan video')
    } finally {
      setLinking(null)
    }
  }

  async function handleUnlink(video: VideoWithBrand) {
    setLinking(video.id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('videos')
        .update({ brand_id: null, is_endorsement: false })
        .eq('id', video.id)
      if (error) throw error
      toast.success(`"${video.judul}" berhasil dilepas dari brand ini`)
      onLinked?.()
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal melepas video')
    } finally {
      setLinking(null)
    }
  }

  const linkedToThis = (v: VideoWithBrand) => v.brand_id === brandId
  const linkedToOther = (v: VideoWithBrand) => !!(v.brand_id && v.brand_id !== brandId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent" />
            Tautkan Video ke Work
            {brandName && (
              <span className="text-xs font-medium text-text-muted ml-1 bg-subtle px-2 py-0.5 rounded-full">
                {brandName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-border/60 flex flex-wrap items-center gap-2 shrink-0 bg-slate-50/60">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <Input
              placeholder="Cari judul, VID-XXX, tema, format..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="h-8 text-xs w-36 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s} className="text-xs capitalize">
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Format filter */}
          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="h-8 text-xs w-36 bg-white">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua Format</SelectItem>
              {formatOptions.map((f) => (
                <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-[11px] font-medium text-text-muted ml-auto shrink-0">
            {filtered.length} video{filtered.length !== 1 ? '' : ''}
          </span>
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Memuat perpustakaan video...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Film className="w-10 h-10 text-border mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-muted">Tidak ada video ditemukan</p>
              <p className="text-xs text-text-muted mt-1">Coba ubah kata kunci atau filter</p>
            </div>
          ) : (
            filtered.map((video) => {
              const isLinkedHere = linkedToThis(video)
              const isLinkedElsewhere = linkedToOther(video)
              const isLoadingThis = linking === video.id
              const statusCfg = STATUS_CONFIG[video.status] ?? STATUS_CONFIG.ide
              const contentIcon = video.content_type === 'foto' ? (
                <ImageIcon className="w-3.5 h-3.5 text-text-muted" />
              ) : (
                <Film className="w-3.5 h-3.5 text-text-muted" />
              )

              return (
                <div
                  key={video.id}
                  className={cn(
                    'relative group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150',
                    isLinkedHere
                      ? 'bg-green-50 border-green-200 shadow-sm'
                      : isLinkedElsewhere
                      ? 'bg-amber-50/60 border-amber-200/70'
                      : 'bg-white border-border hover:border-accent/50 hover:shadow-sm'
                  )}
                >
                  {/* Status indicator strip */}
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{
                      background:
                        video.status === 'ide' ? '#94a3b8'
                        : video.status === 'scripting' ? '#3b82f6'
                        : video.status === 'produksi' ? '#f97316'
                        : video.status === 'editing' ? '#a855f7'
                        : video.status === 'scheduled' ? '#f59e0b'
                        : video.status === 'live' ? '#22c55e'
                        : '#e5e7eb'
                    }}
                  />

                  {/* Video Number */}
                  <div className="shrink-0 w-16 text-center">
                    <span className="text-[10px] font-bold font-mono text-text-muted bg-subtle border border-border/60 px-1.5 py-0.5 rounded tracking-wider">
                      {video.no_video ?? `#${video.no_upload ?? '—'}`}
                    </span>
                  </div>

                  {/* Content type icon */}
                  <div className="shrink-0">{contentIcon}</div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-text-primary line-clamp-1 leading-snug">
                      {video.judul || 'Tanpa Judul'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Status badge */}
                      <span className={cn(
                        'inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-bold border',
                        statusCfg.color, statusCfg.bg, statusCfg.border
                      )}>
                        {statusCfg.label}
                      </span>

                      {/* Format badge */}
                      {video.format && (
                        <span className={cn(
                          'inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium border',
                          FORMAT_COLORS[video.format] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                        )}>
                          {video.format}
                        </span>
                      )}

                      {/* Tema / Pilar */}
                      {(video.tema || video.pilar_konten) && (
                        <span className="inline-flex items-center text-[10px] text-text-muted gap-0.5">
                          <Layers className="w-2.5 h-2.5" />
                          {video.pilar_konten ?? video.tema}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Linked-to indicator */}
                  <div className="shrink-0 text-right min-w-[110px]">
                    {isLinkedHere ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Terhubung
                        </span>
                        <button
                          onClick={() => handleUnlink(video)}
                          disabled={isLoadingThis}
                          className="text-[9px] text-text-muted hover:text-error transition-colors mt-0.5"
                        >
                          {isLoadingThis ? 'Melepas...' : 'Lepas tautan'}
                        </button>
                      </div>
                    ) : isLinkedElsewhere ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Sudah di Work lain
                        </span>
                        <span className="text-[9px] text-text-muted font-medium truncate max-w-[100px]">
                          {video.brand_name ?? 'Brand lain'}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 text-[10px] px-2 mt-0.5"
                          disabled={isLoadingThis}
                          onClick={() => handleLink(video)}
                        >
                          {isLoadingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Pindahkan'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3 gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-150"
                        disabled={isLoadingThis}
                        onClick={() => handleLink(video)}
                      >
                        {isLoadingThis ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Link2 className="w-3 h-3" />
                            Tautkan
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between shrink-0 bg-slate-50/60">
          <p className="text-xs text-text-muted">
            💡 Video yang sudah ditautkan ke brand lain dapat dipindahkan ke brand ini.
          </p>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
