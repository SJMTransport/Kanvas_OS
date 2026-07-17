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
  Trash2, AlertTriangle, Search, Check, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Work, WorkItem, WorkItemType } from '@/lib/types/domain'

const ITEM_TYPES: Record<WorkItemType, { label: string; icon: typeof VideoIcon; color: string; table: string; labelField: string; href?: (id: string) => string }> = {
  video: { label: 'Video', icon: VideoIcon, color: 'bg-blue-100 text-blue-700', table: 'videos', labelField: 'judul', href: (id) => `/content/${id}` },
  idea: { label: 'Ide', icon: Lightbulb, color: 'bg-amber-100 text-amber-700', table: 'idea_cards', labelField: 'title', href: () => '/incubator/idea' },
  reference: { label: 'Referensi', icon: Bookmark, color: 'bg-purple-100 text-purple-700', table: 'creator_saved_content', labelField: 'title', href: () => '/incubator/saved' },
  location: { label: 'Lokasi', icon: MapPin, color: 'bg-green-100 text-green-700', table: 'locations', labelField: 'name', href: () => '/locations' },
}

interface WorkItemWithMeta extends WorkItem {
  label: string
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

      const enriched: WorkItemWithMeta[] = await Promise.all(
        (data as WorkItem[]).map(async (item) => {
          const config = ITEM_TYPES[item.item_type]
          if (!config) return { ...item, label: 'Item' }
          const { data: meta } = await supabase
            .from(config.table)
            .select(config.labelField)
            .eq('id', item.item_id)
            .maybeSingle()
          const label = (meta as Record<string, string> | null)?.[config.labelField] ?? 'Tanpa judul'
          return { ...item, label }
        })
      )
      return enriched
    },
    enabled: !!id,
  })

  // Candidates to link — the entities of the chosen type not already in this Work.
  const linkedIds = new Set(items.filter((i) => i.item_type === addType).map((i) => i.item_id))
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<{ id: string; label: string }[]>({
    queryKey: ['work-candidates', workspaceId, addType],
    queryFn: async () => {
      if (!workspaceId || !addType) return []
      const supabase = createClient()
      const config = ITEM_TYPES[addType]
      let query = supabase.from(config.table).select(`id, ${config.labelField}`)
      // References live under creator_saved_content which is not directly workspace-scoped; the rest are.
      if (addType !== 'reference') {
        query = query.eq('workspace_id', workspaceId)
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      return ((data ?? []) as Record<string, string>[]).map((r) => ({ id: r.id, label: r[config.labelField] ?? 'Tanpa judul' }))
    },
    enabled: !!workspaceId && !!addType,
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
      <Dialog open={!!addType} onOpenChange={(o) => { if (!o) setAddType(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tautkan {addType ? ITEM_TYPES[addType].label : ''} ke Karya</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input placeholder="Cari..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-80 overflow-y-auto -mx-1 px-1">
              {candidatesLoading ? (
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
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
