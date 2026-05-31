'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { DashboardClient } from './dashboard-client'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const { workspaceId, role } = useWorkspace()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const startOfMonth = new Date(); startOfMonth.setDate(1)

      // All queries run in parallel — much faster than sequential
      const [
        { data: { user } },
        { data: todaySchedules },
        { count: totalVideos },
        { count: scheduledCount },
        { count: liveCount },
        { count: draftCount },
        { data: followups },
        { data: overdueInvoices },
        { data: recentVideos },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('video_platform_schedules').select('*, videos(id, judul, thumbnail_url, status, workspace_id)').eq('tanggal_tayang', today).order('jam_post', { ascending: true }),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'scheduled'),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'live').gte('updated_at', startOfMonth.toISOString()),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).in('status', ['ide', 'scripting', 'produksi', 'editing']),
        supabase.from('brands').select('id, nama_brand, status, next_followup_date, industri').eq('workspace_id', workspaceId).not('status', 'in', '("selesai","cold")').lte('next_followup_date', today).order('next_followup_date', { ascending: true }).limit(5),
        supabase.from('invoices').select('id, invoice_number, total, due_date, brands(nama_brand)').eq('workspace_id', workspaceId).eq('status', 'overdue').order('due_date', { ascending: true }).limit(5),
        supabase.from('videos').select('id, judul, status, updated_at, created_by, users(full_name)').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }).limit(5),
      ])

      const filteredSchedules = (todaySchedules ?? []).filter(
        (s: any) => s.videos?.workspace_id === workspaceId
      )

      return {
        userName: (user?.user_metadata?.full_name as string) ?? user?.email ?? 'Kreator',
        todaySchedules: filteredSchedules,
        pipeline: { total: totalVideos ?? 0, scheduled: scheduledCount ?? 0, live: liveCount ?? 0, draft: draftCount ?? 0 },
        followups: followups ?? [],
        overdueInvoices: (overdueInvoices ?? []) as any[],
        recentVideos: (recentVideos ?? []) as any[],
      }
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  })

  if (isLoading || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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
    />
  )
}

// Keep type export for dashboard-client
export interface RecentVideo {
  id: string
  judul: string
  status: string
  updated_at: string
  created_by: string | null
  users: { full_name: string | null } | null
}
