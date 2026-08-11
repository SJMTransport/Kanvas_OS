'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ArrowLeft, Plus, Video as VideoIcon, Lightbulb, MapPin, Bookmark,
  Trash2, AlertTriangle, Search, Check, ChevronRight, Film, Layers, X,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Work, WorkItem, WorkItemType } from '@/lib/types/domain'
import { STATUS_CONFIG, STATUS_ORDER } from '@/lib/utils/status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { VideoStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const ITEM_TYPES: Record<WorkItemType, { label: string; icon: typeof VideoIcon; color: string; table: string; labelField: string; href?: (id: string) => string }> = {
  video: { label: 'Video', icon: VideoIcon, color: 'bg-blue-100 text-blue-700', table: 'videos', labelField: 'judul', href: (id) => `/content/${id}` },
  idea: { label: 'Ide', icon: Lightbulb, color: 'bg-amber-100 text-amber-700', table: 'idea_cards', labelField: 'title', href: () => '/incubator/idea' },
  reference: { label: 'Referensi', icon: Bookmark, color: 'bg-purple-100 text-purple-700', table: 'creator_saved_content', labelField: 'title', href: () => '/incubator/saved' },
  location: { label: 'Lokasi', icon: MapPin, color: 'bg-green-100 text-green-700', table: 'locations', labelField: 'name', href: () => '/locations' },
}

interface WorkItemWithMeta extends WorkItem {
  label: string
}

interface RichVideo {
  id: string
  label: string
  no_video: string | null
  no_upload: number | null
  status: VideoStatus
  format: string | null
  tema: string | null
  pilar_konten: string | null
  content_type: string | null
}

const FORMAT_COLORS: Record<string, string> = {
  'Short Video': 'bg-violet-50 text-violet-700 border-violet-200',
  'Long Video': 'bg-blue-50 text-blue-700 border-blue-200',
  'Reels': 'bg-pink-50 text-pink-700 border-pink-200',
  'Live': 'bg-red-50 text-red-700 border-red-200',
}

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const [addType, setAddType] = useState<WorkItemType | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')

  const { data: work, isLoading: workLoading, isError: workError, refetch } = useQuery<Work | null>({
    queryKey: ['work', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('works').select('*').eq('id', id).single()
      if (error) throw error
      return data as Work | null
    },
    enabled: !!id,
  })

  const { data: items = [], isLoading: itemsLoading } = useQuery<WorkItemWithMeta[]>({
    queryKey: ['work-items', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('work_items')
        .select('*')
        .eq('work_id', id)
        .order('sort_order', { ascending: true })
        .order('added_at', { ascending: true })
      if (error) throw error
      if (!data) return []
      const rows = data as WorkItem[]

      // Batch label lookups: one query per item_type (grouped .in) instead of one per item.
      const byType = new Map<WorkItemType, string[]>()
      for (const item of rows) {
        if (!byType.has(item.item_type)) byType.set(item.item_type, [])
        byType.get(item.item_type)!.push(item.item_id)
      }

      const labelMap = new Map<string, string>() // `${type}:${id}` -> label
      await Promise.all(
        Array.from(byType.entries()).map(async ([type, ids]) => {
          const config = ITEM_TYPES[type]
          if (!config) return
          const { data: metas } = await supabase
            .from(config.table)
            .select(`id, ${config.labelField}`)
            .in('id', ids)
          for (const m of (metas ?? []) as Record<string, string>[]) {
            labelMap.set(`${type}:${m.id}`, m[config.labelField] ?? 'Tanpa judul')
          }
        })
      )

      return rows.map((item) => ({
        ...item,
        label: labelMap.get(`${item.item_type}:${item.item_id}`) ?? 'Tanpa judul',
      }))
    },
    enabled: !!id,
  })

  // Raw candidates (non-video types: id + label only)
  const linkedIds = new Set(items.filter((i) => i.item_type === addType).map((i) => i.item_id))
  const [pickerStatusFilter, setPickerStatusFilter] = useState<VideoStatus | 'all'>('all')

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<{ id: string; label: string }[]>({
    queryKey: ['work-candidates', workspaceId, addType],
    queryFn: async () => {
      if (!workspaceId || !addType || addType === 'video') return []
      const supabase = createClient()
      const config = ITEM_TYPES[addType]
      let query = supabase.from(config.table).select(`id, ${config.labelField}`)
      if (addType !== 'reference') {
        query = query.eq('workspace_id', workspaceId)
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      return ((data ?? []) as Record<string, string>[]).map((r) => ({ id: r.id, label: r[config.labelField] ?? 'Tanpa judul' }))
    },
    enabled: !!workspaceId && !!addType && addType !== 'video',
  })

  // Rich video candidates
  const { data: richVideos = [], isLoading: richVideosLoading } = useQuery<RichVideo[]>({
    queryKey: ['work-video-candidates', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('videos')
        .select('id, judul, no_video, no_upload, status, format, tema, pilar_konten, content_type')
        .eq('workspace_id', workspaceId)
        .order('no_upload', { ascending: false })
        .limit(500)
      if (error) throw error
      return ((data ?? []) as any[]).map((v) => ({
        id: v.id,
        label: v.judul ?? 'Tanpa judul',
        no_video: v.no_video,
        no_upload: v.no_upload,
        status: v.status,
        format: v.format,
        tema: v.tema,
        pilar_konten: v.pilar_konten,
        content_type: v.content_type,
      }))
    },
    enabled: !!workspaceId && addType === 'video',
  })

  const addMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!addType) return
      const supabase = createClient()
      const { error } = await supabase
        .from('work_items')
        .insert({ work_id: id, item_type: addType, item_id: itemId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items', id] })
      toast.success('Item ditambahkan ke karya')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Gagal menambahkan'),
  })

  const removeMutation = useMutation({
    mutationFn: async (workItemId: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('work_items').delete().eq('id', workItemId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items', id] })
      toast.success('Item dihapus dari karya')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Gagal menghapus'),
  })

  if (workLoading || itemsLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (workError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-error mx-auto mb-3" />
        <h2 className="font-heading text-lg font-bold text-text-primary mb-1">Gagal memuat Karya</h2>
        <p className="text-sm text-text-secondary mb-4">Pastikan migrasi database sudah dijalankan, lalu coba lagi.</p>
        <Button onClick={() => refetch()}>Coba Lagi</Button>
      </div>
    )
  }

  if (!work) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-text-muted">Karya tidak ditemukan</p>
        <Link href="/works" className="text-accent text-sm mt-2 inline-block hover:underline">Kembali</Link>
      </div>
    )
  }

  const grouped = (Object.keys(ITEM_TYPES) as WorkItemType[]).map((t) => ({
    type: t,
    config: ITEM_TYPES[t],
    entries: items.filter((i) => i.item_type === t),
  }))

  const filteredCandidates = candidates.filter(
    (c) => !linkedIds.has(c.id) && c.label.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  const filteredRichVideos = richVideos.filter((v) => {
    const q = pickerSearch.toLowerCase()
    const matchesSearch =
      !q ||
      v.label.toLowerCase().includes(q) ||
      (v.no_video ?? '').toLowerCase().includes(q) ||
      (v.tema ?? '').toLowerCase().includes(q) ||
      (v.pilar_konten ?? '').toLowerCase().includes(q) ||
      (v.format ?? '').toLowerCase().includes(q)
    const matchesStatus = pickerStatusFilter === 'all' || v.status === pickerStatusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <Link href="/works" className="text-sm text-text-muted hover:text-text-primary flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Semua Karya
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">{work.title}</h1>
        {work.description && <p className="text-sm text-text-secondary mt-1">{work.description}</p>}
        <p className="text-xs text-text-muted mt-2">
          Terakhir diubah {formatDistanceToNow(new Date(work.updated_at), { addSuffix: true, locale: localeId })}
        </p>
      </div>

      {/* Quick-add buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(ITEM_TYPES) as WorkItemType[]).map((t) => {
          const Icon = ITEM_TYPES[t].icon
          return (
            <Button key={t} variant="outline" size="sm" onClick={() => { setAddType(t); setPickerSearch('') }}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              <Icon className="w-3.5 h-3.5 mr-1" />
              {ITEM_TYPES[t].label}
            </Button>
          )
        })}
      </div>

      {/* Items grouped by type */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-surface rounded-xl border border-border">
          <Plus className="w-10 h-10 text-border mb-2" />
          <p className="text-sm text-text-muted mb-1">Belum ada item</p>
          <p className="text-xs text-text-muted">Gunakan tombol di atas untuk menautkan video, ide, referensi, atau lokasi</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.filter((g) => g.entries.length > 0).map((g) => {
            const Icon = g.config.icon
            return (
              <div key={g.type}>
                <h2 className="font-heading font-semibold text-text-primary mb-2 flex items-center gap-2 text-sm">
                  <Icon className="w-4 h-4 text-text-muted" />
                  {g.config.label}
                  <span className="text-text-muted font-normal">({g.entries.length})</span>
                </h2>
                <div className="bg-white border border-border rounded-xl divide-y divide-border">
                  {g.entries.map((item) => {
                    const href = g.config.href?.(item.item_id)
                    return (
                      <div key={item.id} className="group flex items-center gap-3 p-3">
                        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-text-muted" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {href ? (
                            <Link href={href} className="text-sm font-medium text-text-primary truncate hover:text-accent flex items-center gap-1">
                              {item.label} <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                            </Link>
                          ) : (
                            <p className="text-sm font-medium text-text-primary truncate">{item.label}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className={`text-[10px] ${g.config.color}`}>{g.config.label}</Badge>
                        <button onClick={() => removeMutation.mutate(item.id)} className="p-1 rounded hover:bg-error/10">
                          <Trash2 className="w-3.5 h-3.5 text-error" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Link picker dialog */}
      <Dialog open={!!addType} onOpenChange={(o) => { if (!o) { setAddType(null); setPickerStatusFilter('all') } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              {addType && (() => { const Icon = ITEM_TYPES[addType].icon; return <Icon className="w-4 h-4 text-accent" /> })()}
              Tautkan {addType ? ITEM_TYPES[addType].label : ''} ke Karya
            </DialogTitle>
          </DialogHeader>

          {/* Search + filters toolbar */}
          <div className="px-5 py-3 border-b border-border/60 flex flex-wrap gap-2 shrink-0 bg-slate-50/60">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              <Input
                placeholder={addType === 'video' ? 'Cari judul, VID-XXX, tema, format...' : 'Cari...'}
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-white"
              />
              {pickerSearch && (
                <button onClick={() => setPickerSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {addType === 'video' && (
              <Select value={pickerStatusFilter} onValueChange={(v) => setPickerStatusFilter(v as any)}>
                <SelectTrigger className="h-8 text-xs w-36 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className="text-[11px] font-medium text-text-muted self-center ml-auto shrink-0">
              {addType === 'video' ? filteredRichVideos.length : filteredCandidates.length} item
            </span>
          </div>

          {/* Item list */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
            {addType === 'video' ? (
              // Rich video picker
              richVideosLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : filteredRichVideos.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-12">Tidak ada video ditemukan</p>
              ) : (
                filteredRichVideos.map((v) => {
                  const alreadyLinked = linkedIds.has(v.id)
                  const statusCfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.ide
                  return (
                    <button
                      key={v.id}
                      onClick={() => !alreadyLinked && addMutation.mutate(v.id)}
                      disabled={addMutation.isPending || alreadyLinked}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all duration-150',
                        alreadyLinked
                          ? 'bg-green-50 border-green-200 cursor-default'
                          : 'bg-white border-border hover:border-accent/50 hover:shadow-sm hover:bg-accent/5'
                      )}
                    >
                      {/* Status strip */}
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{
                        background:
                          v.status === 'ide' ? '#94a3b8'
                          : v.status === 'scripting' ? '#3b82f6'
                          : v.status === 'produksi' ? '#f97316'
                          : v.status === 'editing' ? '#a855f7'
                          : v.status === 'scheduled' ? '#f59e0b'
                          : v.status === 'live' ? '#22c55e'
                          : '#e5e7eb'
                      }} />

                      {/* VID number */}
                      <span className="text-[10px] font-bold font-mono text-text-muted bg-subtle border border-border/60 px-1.5 py-0.5 rounded tracking-wider shrink-0 w-16 text-center">
                        {v.no_video ?? (v.no_upload ? `#${v.no_upload}` : '—')}
                      </span>

                      {/* Content icon */}
                      <Film className="w-3.5 h-3.5 text-text-muted shrink-0" />

                      {/* Main info */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-text-primary line-clamp-1">{v.label}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-bold border',
                            statusCfg.color, statusCfg.bg, statusCfg.border
                          )}>
                            {statusCfg.label}
                          </span>
                          {v.format && (
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-medium border',
                              FORMAT_COLORS[v.format] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                            )}>
                              {v.format}
                            </span>
                          )}
                          {(v.tema || v.pilar_konten) && (
                            <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                              <Layers className="w-2.5 h-2.5" />
                              {v.pilar_konten ?? v.tema}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action / state */}
                      {alreadyLinked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full shrink-0">
                          <Check className="w-2.5 h-2.5" /> Terhubung
                        </span>
                      ) : (
                        <Plus className="w-4 h-4 text-accent shrink-0 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>
                  )
                })
              )
            ) : (
              // Simple picker for non-video types
              candidatesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
                </div>
              ) : filteredCandidates.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">
                  {candidates.length === 0 ? 'Belum ada item untuk ditautkan' : 'Semua item sudah ditautkan atau tidak cocok'}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredCandidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addMutation.mutate(c.id)}
                      disabled={addMutation.isPending}
                      className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-surface text-left transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-sm text-text-primary truncate flex-1">{c.label}</span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border/60 flex justify-end shrink-0 bg-slate-50/60">
            <Button variant="secondary" size="sm" onClick={() => { setAddType(null); setPickerStatusFilter('all') }}>Selesai</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
