'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Video, Lightbulb, MapPin, BookmarkIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Work, WorkItem } from '@/lib/types/domain'

const ITEM_TYPE_LABEL: Record<string, { label: string; icon: typeof Video; color: string }> = {
  video: { label: 'Video', icon: Video, color: 'bg-blue-100 text-blue-700' },
  idea: { label: 'Ide', icon: Lightbulb, color: 'bg-amber-100 text-amber-700' },
  reference: { label: 'Referensi', icon: BookmarkIcon, color: 'bg-purple-100 text-purple-700' },
  location: { label: 'Lokasi', icon: MapPin, color: 'bg-green-100 text-green-700' },
}

interface WorkItemWithMeta extends WorkItem {
  meta?: { title?: string; name?: string; judul?: string } | null
}

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()

  const { data: work, isLoading: workLoading } = useQuery<Work | null>({
    queryKey: ['work', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('works').select('*').eq('id', id).single()
      return data as Work | null
    },
    enabled: !!id,
  })

  const { data: items = [], isLoading: itemsLoading } = useQuery<WorkItemWithMeta[]>({
    queryKey: ['work-items', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('work_items')
        .select('*')
        .eq('work_id', id)
        .order('sort_order', { ascending: true })
      if (!data) return []

      const enriched: WorkItemWithMeta[] = await Promise.all(
        (data as WorkItem[]).map(async (item) => {
          const table = item.item_type === 'video' ? 'videos'
            : item.item_type === 'idea' ? 'idea_cards'
            : item.item_type === 'location' ? 'locations'
            : null
          if (!table) return { ...item, meta: null }
          const { data: meta } = await supabase
            .from(table)
            .select(item.item_type === 'video' ? 'judul' : item.item_type === 'idea' ? 'title' : 'name')
            .eq('id', item.item_id)
            .single()
          return { ...item, meta }
        })
      )
      return enriched
    },
    enabled: !!id,
  })

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const supabase = createClient()
      await supabase.from('work_items').delete().eq('id', itemId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items', id] })
      toast.success('Item dihapus dari karya')
    },
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

  if (!work) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-text-muted">Karya tidak ditemukan</p>
        <Link href="/works" className="text-accent text-sm mt-2 inline-block hover:underline">Kembali</Link>
      </div>
    )
  }

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

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-text-primary">Item dalam Karya</h2>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-surface rounded-xl border border-border">
            <Plus className="w-10 h-10 text-border mb-2" />
            <p className="text-sm text-text-muted mb-1">Belum ada item</p>
            <p className="text-xs text-text-muted">Tambahkan video, ide, referensi, atau lokasi ke karya ini</p>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-xl divide-y divide-border">
            {items.map((item) => {
              const config = ITEM_TYPE_LABEL[item.item_type] ?? ITEM_TYPE_LABEL.video
              const Icon = config.icon
              const label = item.meta?.judul ?? item.meta?.title ?? item.meta?.name ?? 'Tanpa judul'
              return (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{label}</p>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${config.color}`}>{config.label}</Badge>
                  <button onClick={() => removeMutation.mutate(item.id)} className="p-1 rounded hover:bg-error/10 opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5 text-error" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
