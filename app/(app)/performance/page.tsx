'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useRouter } from 'next/navigation'
import { formatNumber } from '@/lib/utils/formatters'
import { getPlatformDot } from '@/lib/utils/platform'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { BarChart2, Video, FileBarChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PerformanceSummary } from './performance-summary'
import type { Platform } from '@/lib/types'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']

export default function PerformancePage() {
  const router = useRouter()
  const { workspaceId } = useWorkspace()

  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos-performance', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('videos')
        .select('id, judul, thumbnail_url, status, video_performance(platform, views, likes, comments, recorded_at)')
        .eq('workspace_id', workspaceId)
        .in('status', ['live', 'scheduled', 'archived'])
        .order('updated_at', { ascending: false })
        .limit(50)
      return data ?? []
    },
    enabled: !!workspaceId,
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Performa</h1>
          <p className="text-sm text-text-secondary mt-0.5">Input & pantau metrik video per platform</p>
        </div>
        <Button size="sm" onClick={() => router.push('/performance/reports')} className="gap-1.5">
          <FileBarChart className="w-3.5 h-3.5" /> Laporan Campaign
        </Button>
      </div>

      {/* Ringkasan agregat semua konten */}
      <PerformanceSummary />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !videos?.length ? (
        <div className="py-16 text-center bg-surface rounded-xl border border-border">
          <BarChart2 className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-text-muted">Belum ada video live.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(videos as any[]).map((v) => {
            const perfs: any[] = v.video_performance ?? []
            return (
              <div
                key={v.id}
                className="bg-white border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => router.push(`/performance/${v.id}`)}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-subtle shrink-0 flex items-center justify-center">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Video className="w-5 h-5 text-border" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary text-sm truncate">{v.judul}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {PLATFORMS.map((p) => {
                      const pd = perfs.find((d) => d.platform === p)
                      return (
                        <div key={p} className="flex items-center gap-1">
                          <div className={cn('w-2 h-2 rounded-full', pd ? getPlatformDot(p) : 'bg-border')} />
                          {pd && <span className="text-[10px] text-text-muted font-mono">{formatNumber(pd.views ?? 0)}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <Button size="sm" variant={perfs.length > 0 ? 'secondary' : 'default'} className="shrink-0 text-xs h-8">
                  {perfs.length > 0 ? 'Update' : '+ Input'}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
