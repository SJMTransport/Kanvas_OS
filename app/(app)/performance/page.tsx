'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useRouter } from 'next/navigation'
import { formatNumber } from '@/lib/utils/formatters'
import { getPlatformBadge } from '@/lib/utils/platform'
import { getStatusBadgeClass, STATUS_CONFIG } from '@/lib/utils/status'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BarChart2, Video, FileBarChart, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PerformanceSummary } from './performance-summary'
import { PageHeader } from '@/components/layout/page-header'
import type { Platform, VideoStatus } from '@/lib/types'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']

interface PerfVideo {
  id: string
  no_video: string | null
  judul: string
  thumbnail_url: string | null
  status: string
  video_performance: { platform: string; views: number; likes: number; comments: number; recorded_at: string }[]
}

interface PerformanceViewProps {
  searchQuery?: string
  embedded?: boolean
}

export function PerformanceView({ searchQuery, embedded }: PerformanceViewProps = {}) {
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const [internalSearch, setInternalSearch] = useState('')

  const activeSearch = searchQuery !== undefined ? searchQuery : internalSearch

  const { data: videos = [], isLoading } = useQuery<PerfVideo[]>({
    queryKey: ['videos-performance', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('videos')
        .select('id, no_video, judul, thumbnail_url, status, video_performance(platform, views, likes, comments, recorded_at)')
        .eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as PerfVideo[]
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  })

  // Latest views per platform for a video (dedupe time-series by recorded_at).
  function latestViews(v: PerfVideo, pl: Platform): number | null {
    const rows = (v.video_performance ?? []).filter((r) => r.platform === pl)
    if (rows.length === 0) return null
    const latest = rows.reduce((a, b) => (a.recorded_at >= b.recorded_at ? a : b))
    return latest.views ?? 0
  }

  const filtered = videos.filter((v) =>
    [v.judul, v.no_video].filter(Boolean).join(' ').toLowerCase().includes(activeSearch.toLowerCase())
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Show header/search only if NOT embedded */}
      {!embedded && (
        <>
          <div className="bg-white border-b border-border px-4 sm:px-6 pt-4 pb-3 shrink-0">
            <PageHeader
              title="Performa"
              subtitle="Input & pantau metrik video per platform"
              className="mb-0"
              action={<Button size="sm" onClick={() => router.push('/performance/reports')} className="gap-1.5"><FileBarChart className="w-3.5 h-3.5" /> Laporan Campaign</Button>}
            />
          </div>

          <div className="bg-white border-b border-border px-4 py-2.5 flex items-center gap-2 shrink-0">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <Input placeholder="Cari judul atau no. video..." value={internalSearch} onChange={(e) => setInternalSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
          </div>
        </>
      )}

      {/* Body: aggregate summary + full-width table */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="px-4 sm:px-6 pt-4">
          <PerformanceSummary />
        </div>

        {isLoading ? (
          <div className="px-4 sm:px-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 sm:px-6">
            <div className="py-16 text-center bg-surface rounded-xl border border-border">
              <BarChart2 className="w-10 h-10 text-border mx-auto mb-3" />
              <p className="text-text-muted">{activeSearch ? 'Tidak ada video cocok' : 'Belum ada video.'}</p>
            </div>
          </div>
        ) : (
          <>
            <table className="w-full border-collapse min-w-[760px]">
              <thead className="bg-surface border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide w-24">No. Video</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Judul</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide w-28">Status</th>
                  {PLATFORMS.map((p) => (
                    <th key={p} className="px-3 py-2.5 text-center text-xs font-semibold text-text-muted uppercase tracking-wide w-20">
                      {p === 'tiktok' ? 'TT' : p === 'instagram' ? 'IG' : p === 'youtube' ? 'YT' : 'FB'}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-surface cursor-pointer transition-colors" onClick={() => router.push(`/performance/${v.id}`)}>
                    <td className="px-3 py-2.5 text-xs">
                      <span className={cn('font-mono', v.no_video && v.no_video !== 'VID-000' ? 'font-semibold text-text-primary' : 'text-text-muted/60')}>
                        {v.no_video || 'VID-000'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded bg-subtle overflow-hidden shrink-0 flex items-center justify-center">
                          {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Video className="w-4 h-4 text-border" />}
                        </div>
                        <p className="font-medium text-text-primary text-sm truncate max-w-[240px]">{v.judul}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', getStatusBadgeClass(v.status as VideoStatus))}>
                        {STATUS_CONFIG[v.status as VideoStatus]?.label ?? v.status}
                      </span>
                    </td>
                    {PLATFORMS.map((p) => {
                      const views = latestViews(v, p)
                      return (
                        <td key={p} className="px-3 py-2.5 text-center">
                          {views !== null ? (
                            <div className="flex flex-col items-center">
                              <span className={cn('w-1.5 h-1.5 rounded-full mb-0.5', getPlatformBadge(p))} />
                              <span className="text-xs font-mono text-text-secondary">{formatNumber(views)}</span>
                            </div>
                          ) : (
                            <span className="text-text-muted/30 text-xs font-mono">-</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant={(v.video_performance ?? []).length > 0 ? 'secondary' : 'default'} className="text-xs h-7"
                        onClick={() => router.push(`/performance/${v.id}`)}>
                        {(v.video_performance ?? []).length > 0 ? 'Update' : '+ Input'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 sm:px-6 py-2 border-t border-border">
              <p className="text-xs text-text-muted">Menampilkan {filtered.length} video</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PerformancePage() {
  return <PerformanceView />
}

