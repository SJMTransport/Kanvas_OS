'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileBarChart, Plus, Trash2, ArrowLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import Link from 'next/link'
import { EMPTY_CAMPAIGN } from '@/lib/types/report'
import type { PerformanceReport } from '@/lib/types/report'

export default function ReportsPage() {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: reports = [], isLoading } = useQuery<PerformanceReport[]>({
    queryKey: ['performance-reports', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('performance_reports')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PerformanceReport[]
    },
    enabled: !!workspaceId,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Workspace tidak ditemukan')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('performance_reports')
        .insert({
          workspace_id: workspaceId,
          created_by: user?.id ?? null,
          name: 'Laporan Baru',
          data: { campaign: EMPTY_CAMPAIGN, videos: [] },
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['performance-reports', workspaceId] })
      router.push(`/performance/reports/${id}`)
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Gagal membuat laporan'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('performance_reports').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reports', workspaceId] })
      toast.success('Laporan dihapus')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Gagal menghapus'),
  })

  function confirmDelete(r: PerformanceReport) {
    if (confirm(`Hapus laporan "${r.name}"? Tindakan ini tidak bisa dibatalkan.`)) {
      deleteMutation.mutate(r.id)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <Link href="/performance" className="text-sm text-text-muted hover:text-text-primary flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Performa
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text-primary">Laporan Campaign</h1>
            <p className="text-sm text-text-secondary mt-0.5">Susun video jadi laporan performa siap kirim ke klien</p>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Laporan Baru
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-surface rounded-xl border border-border">
          <FileBarChart className="w-12 h-12 text-border mb-3" />
          <p className="text-sm text-text-muted mb-4">Belum ada laporan. Buat laporan pertamamu!</p>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Laporan Baru
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => {
            const videoCount = Array.isArray(r.data?.videos) ? r.data.videos.length : 0
            return (
              <div key={r.id} className="group bg-white border border-border rounded-xl p-4 hover:border-accent hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-light text-accent">{videoCount} video</span>
                  <button onClick={() => confirmDelete(r)} className="p-1 rounded hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5 text-error" />
                  </button>
                </div>
                <Link href={`/performance/reports/${r.id}`}>
                  <h3 className="font-heading font-semibold text-text-primary truncate group-hover:text-accent transition-colors">{r.name || 'Tanpa nama'}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">KOL: {r.kol_name || '-'}</p>
                </Link>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-text-muted">
                    {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true, locale: localeId })}
                  </span>
                  <Link href={`/performance/reports/${r.id}`} className="text-xs text-accent flex items-center gap-0.5 hover:underline">
                    Buka <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
