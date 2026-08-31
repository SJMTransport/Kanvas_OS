'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { formatNumber } from '@/lib/utils/formatters'
import { getPlatformBadge, getPlatformDot } from '@/lib/utils/platform'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Heart, MessageCircle, Share2, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Platform } from '@/lib/types'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']
const PLATFORM_LABELS: Record<Platform, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook' }

interface PerfRow {
  video_id: string
  platform: Platform
  recorded_at: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  judul: string
}

// Aggregate: keep only the latest recorded_at per (video, platform) so time-series
// history isn't double-counted, then sum everything up.
function aggregate(rows: PerfRow[]) {
  const latest = new Map<string, PerfRow>()
  for (const r of rows) {
    const key = `${r.video_id}:${r.platform}`
    const prev = latest.get(key)
    if (!prev || r.recorded_at > prev.recorded_at) latest.set(key, r)
  }
  const kept = Array.from(latest.values())

  const totals = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
  const perPlatform: Record<Platform, number> = { tiktok: 0, instagram: 0, youtube: 0, facebook: 0 }
  const perVideo = new Map<string, { judul: string; views: number }>()

  for (const r of kept) {
    totals.views += Number(r.views) || 0
    totals.likes += Number(r.likes) || 0
    totals.comments += Number(r.comments) || 0
    totals.shares += Number(r.shares) || 0
    totals.saves += Number(r.saves) || 0
    perPlatform[r.platform] += Number(r.views) || 0
    const pv = perVideo.get(r.video_id) ?? { judul: r.judul, views: 0 }
    pv.views += Number(r.views) || 0
    perVideo.set(r.video_id, pv)
  }

  const engagementRate = totals.views > 0
    ? ((totals.likes + totals.comments + totals.shares + totals.saves) / totals.views) * 100
    : 0

  const topVideos = Array.from(perVideo.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  const maxPlatformViews = Math.max(1, ...PLATFORMS.map((p) => perPlatform[p]))

  return { totals, perPlatform, topVideos, engagementRate, maxPlatformViews, hasData: kept.length > 0 }
}

export function PerformanceSummary() {
  const { workspaceId } = useWorkspace()

  const { data, isLoading } = useQuery({
    queryKey: ['performance-summary', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null
      const supabase = createClient()
      const { data, error } = await supabase
        .from('video_performance')
        .select('video_id, platform, recorded_at, views, likes, comments, shares, saves, videos!inner(judul, workspace_id)')
        .eq('videos.workspace_id', workspaceId)
      if (error) throw error
      const rows: PerfRow[] = (data ?? []).map((r: any) => ({
        video_id: r.video_id,
        platform: r.platform,
        recorded_at: r.recorded_at,
        views: r.views, likes: r.likes, comments: r.comments, shares: r.shares, saves: r.saves,
        judul: r.videos?.judul ?? 'Tanpa judul',
      }))
      return aggregate(rows)
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  if (!data || !data.hasData) return null

  const stats = [
    { label: 'Total Views', value: data.totals.views, icon: Eye },
    { label: 'Total Likes', value: data.totals.likes, icon: Heart },
    { label: 'Comments', value: data.totals.comments, icon: MessageCircle },
    { label: 'Shares', value: data.totals.shares, icon: Share2 },
  ]

  return (
    <div className="space-y-4 mb-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white border border-border rounded-xl p-4">
              <Icon className="w-4 h-4 text-text-muted mb-2" />
              <p className="font-heading text-2xl font-bold text-text-primary">{formatNumber(s.value)}</p>
              <p className="text-xs text-text-secondary mt-0.5">{s.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Per-platform views */}
        <div className="bg-white border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-sm text-text-primary">Views per Platform</h3>
            <span className="text-[11px] text-text-muted">Engagement {data.engagementRate.toFixed(1)}%</span>
          </div>
          <div className="space-y-2.5">
            {PLATFORMS.map((p) => {
              const views = data.perPlatform[p]
              const pct = (views / data.maxPlatformViews) * 100
              return (
                <div key={p} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-20 shrink-0">
                    <span className={cn('w-2 h-2 rounded-full', getPlatformDot(p))} />
                    <span className="text-xs text-text-secondary">{PLATFORM_LABELS[p]}</span>
                  </div>
                  <div className="flex-1 h-2 bg-subtle rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', getPlatformDot(p))} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono text-text-muted w-14 text-right shrink-0">{formatNumber(views)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top performers */}
        <div className="bg-white border border-border rounded-xl p-4">
          <h3 className="font-heading font-semibold text-sm text-text-primary mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-accent" /> Top Performer
          </h3>
          {data.topVideos.length === 0 ? (
            <p className="text-xs text-text-muted">Belum ada data.</p>
          ) : (
            <div className="space-y-2">
              {data.topVideos.map((v, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accent-light text-accent text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="text-xs text-text-primary truncate flex-1">{v.judul}</p>
                  <span className="text-xs font-mono text-text-muted shrink-0">{formatNumber(v.views)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
