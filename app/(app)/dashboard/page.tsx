'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { DashboardClient } from './dashboard-client'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  const { workspaceId, role } = useWorkspace()

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      // Current month bounds as YYYY-MM-DD for the "Live Bulan Ini" metric,
      // which counts videos actually aired this month (by tayang date).
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const monthEnd = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth() + 1).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`

      // All queries run in parallel — much faster than sequential.
      // Each is settled independently so one flaky request can't sink the whole dashboard.
      const results = await Promise.allSettled([
        supabase.from('video_platform_schedules').select('*, videos!inner(id, judul, thumbnail_url, status, workspace_id)').eq('videos.workspace_id', workspaceId).eq('tanggal_tayang', today).order('jam_post', { ascending: true }),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'scheduled'),
        supabase.from('video_platform_schedules').select('video_id, videos!inner(workspace_id)').eq('videos.workspace_id', workspaceId).gte('tanggal_tayang', monthStart).lte('tanggal_tayang', monthEnd),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).in('status', ['ide', 'scripting', 'produksi', 'editing']),
        supabase.from('brands').select('id, nama_brand, status, next_followup_date, industri').eq('workspace_id', workspaceId).not('status', 'in', '("selesai","cold")').lte('next_followup_date', today).order('next_followup_date', { ascending: true }).limit(5),
        supabase.from('invoices').select('id, invoice_number, total, due_date, brands(nama_brand)').eq('workspace_id', workspaceId).eq('status', 'overdue').order('due_date', { ascending: true }).limit(5),
        supabase.from('videos').select('id, judul, status, updated_at, created_by, users(full_name)').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }).limit(5),
        supabase.rpc('pilar_konten_counts', { ws_id: workspaceId }),
      ])

      const settledValue = <T,>(r: PromiseSettledResult<T>): T | undefined =>
        r.status === 'fulfilled' ? r.value : undefined

      const todaySchedules = (settledValue(results[0]) as any)?.data ?? []
      const totalVideos = (settledValue(results[1]) as any)?.count ?? 0
      const scheduledCount = (settledValue(results[2]) as any)?.count ?? 0
      // Distinct videos aired this month (a video posted to multiple platforms counts once).
      const liveRows = (settledValue(results[3]) as any)?.data ?? []
      const liveCount = new Set((liveRows as { video_id: string }[]).map((r) => r.video_id)).size
      const draftCount = (settledValue(results[4]) as any)?.count ?? 0
      const followups = (settledValue(results[5]) as any)?.data ?? []
      const overdueInvoices = (settledValue(results[6]) as any)?.data ?? []
      const recentVideos = (settledValue(results[7]) as any)?.data ?? []
      // RPC returns one row per pillar: { pilar_konten, count }. Flatten back into the
      // string[] the client expects — bounded by distinct pillars, not total videos.
      const pilarRaw = (settledValue(results[8]) as any)?.data ?? []
      const pilarVideos = (pilarRaw as { pilar_konten: string; count: number }[])
        .flatMap((r) => Array.from({ length: Number(r.count) || 0 }, () => r.pilar_konten))
        .filter(Boolean) as string[]

      return {
        userName: 'Kreator',
        todaySchedules,
        pipeline: { total: totalVideos ?? 0, scheduled: scheduledCount ?? 0, live: liveCount ?? 0, draft: draftCount ?? 0 },
        followups: followups ?? [],
        overdueInvoices: (overdueInvoices ?? []) as any[],
        recentVideos: (recentVideos ?? []) as any[],
        pilarVideos,
      }
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  })

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-error mx-auto mb-3" />
        <h2 className="font-heading text-lg font-bold text-text-primary mb-1">Gagal memuat dashboard</h2>
        <p className="text-sm text-text-secondary mb-4">Pastikan koneksi stabil, lalu coba lagi.</p>
        <Button onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? 'Memuat...' : 'Coba Lagi'}
        </Button>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  return (
    <DashboardClient
      userName={data.userName}
      role={role ?? 'editor'}
      todaySchedules={data.todaySchedules as any}
      pipeline={data.pipeline}
      followups={data.followups as any}
      overdueInvoices={data.overdueInvoices}
      recentVideos={data.recentVideos}
      pilarVideos={data.pilarVideos}
    />
  )
}

// Keep type export for dashboard-client
export interface RecentVideo {
  id: string
  judul: string
  status: string
  updated_at: string | null
  created_by: string | null
  users: { full_name: string | null } | { full_name: string | null }[] | null
}
