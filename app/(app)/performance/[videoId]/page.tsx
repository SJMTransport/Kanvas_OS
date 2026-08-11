'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { getPlatformBadge, getPlatformDot } from '@/lib/utils/platform'
import { formatNumber } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ArrowLeft, Download, Loader2, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Platform } from '@/lib/types'

type PlatformData = Record<string, string | number>

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']
const PLATFORM_LABELS: Record<Platform, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook' }

const TIKTOK_FIELDS = [
  { section: 'Metrik Utama', fields: [{ key: 'views', label: 'Views', required: true }, { key: 'likes', label: 'Likes' }, { key: 'comments', label: 'Comments' }, { key: 'saves', label: 'Saved' }, { key: 'shares', label: 'Shared' }] },
  { section: 'Traffic Sources (%)', fields: [{ key: 'tt_fyp_pct', label: 'For You' }, { key: 'tt_profile_pct', label: 'Personal Profile' }, { key: 'tt_search_pct', label: 'Search' }, { key: 'tt_other_pct', label: 'Other' }, { key: 'tt_following_pct', label: 'Following' }] },
  { section: 'Key Metrics', fields: [{ key: 'tt_total_viewers', label: 'Total Viewers' }, { key: 'tt_new_followers', label: 'New Followers' }, { key: 'tt_avg_watch_time', label: 'Avg Watch Time (detik)' }, { key: 'tt_total_play_time', label: 'Total Play Time' }, { key: 'tt_watched_full_pct', label: 'Watched Full (%)' }] },
  { section: 'Viewer Type (%)', fields: [{ key: 'tt_non_followers_pct', label: 'Non-followers' }, { key: 'tt_followers_pct', label: 'Followers' }, { key: 'tt_new_viewers_pct', label: 'New Viewers' }, { key: 'tt_returning_pct', label: 'Returning' }] },
  { section: 'Audience Gender (%)', fields: [{ key: 'aud_male_pct', label: 'Pria' }, { key: 'aud_female_pct', label: 'Wanita' }] },
  { section: 'Audience Age (%)', fields: [{ key: 'aud_age_1824', label: '18-24' }, { key: 'aud_age_2534', label: '25-34' }, { key: 'aud_age_35plus', label: '>35' }] },
]
const IG_FIELDS = [
  { section: 'Metrik Utama', fields: [{ key: 'views', label: 'Views', required: true }, { key: 'likes', label: 'Likes' }, { key: 'comments', label: 'Comments' }, { key: 'saves', label: 'Saved' }, { key: 'shares', label: 'Shared' }] },
  { section: 'Reach & Engagement', fields: [{ key: 'ig_reached', label: 'Reached' }, { key: 'ig_engaged', label: 'Engaged' }, { key: 'ig_reels_interactions', label: 'Reels Interactions' }, { key: 'ig_profile_activity', label: 'Profile Activity' }] },
  { section: 'Views Breakdown (%)', fields: [{ key: 'ig_views_followers_pct', label: 'Followers' }, { key: 'ig_views_nonfollowers_pct', label: 'Non-followers' }] },
  { section: 'Audience Gender (%)', fields: [{ key: 'aud_male_pct', label: 'Pria' }, { key: 'aud_female_pct', label: 'Wanita' }] },
  { section: 'Audience Age (%)', fields: [{ key: 'aud_age_1824', label: '18-24' }, { key: 'aud_age_2534', label: '25-34' }, { key: 'aud_age_35plus', label: '>35' }] },
]
const YT_FIELDS = [
  { section: 'Metrik Utama', fields: [{ key: 'views', label: 'Views', required: true }, { key: 'likes', label: 'Likes' }, { key: 'comments', label: 'Comments' }, { key: 'shares', label: 'Shared' }] },
  { section: 'Audience', fields: [{ key: 'yt_subscribers_pct', label: 'Subscribers (%)' }, { key: 'yt_nonsubs_pct', label: 'Non-subscribers (%)' }, { key: 'yt_returning_viewers', label: 'Returning Viewers' }, { key: 'yt_new_viewers', label: 'New Viewers' }] },
  { section: 'Gender (%)', fields: [{ key: 'aud_male_pct', label: 'Pria' }, { key: 'aud_female_pct', label: 'Wanita' }] },
  { section: 'Age (%)', fields: [{ key: 'aud_age_1824', label: '18-24' }, { key: 'aud_age_2534', label: '25-34' }, { key: 'aud_age_35plus', label: '>35' }] },
]
const FB_FIELDS = [
  { section: 'Metrik Utama', fields: [{ key: 'views', label: 'Views', required: true }, { key: 'likes', label: 'Likes' }, { key: 'comments', label: 'Comments' }, { key: 'shares', label: 'Shared' }, { key: 'fb_reactions', label: 'Reactions' }] },
  { section: 'Video Metrics', fields: [{ key: 'fb_three_sec_views', label: '3-second Views' }, { key: 'fb_one_min_views', label: '1-minute Views' }, { key: 'fb_watch_time', label: 'Watch Time (menit)' }, { key: 'fb_avg_watch', label: 'Avg Watch (detik)' }] },
  { section: 'Gender (%)', fields: [{ key: 'aud_male_pct', label: 'Pria' }, { key: 'aud_female_pct', label: 'Wanita' }] },
  { section: 'Age (%)', fields: [{ key: 'aud_age_1824', label: '18-24' }, { key: 'aud_age_2534', label: '25-34' }, { key: 'aud_age_35plus', label: '>35' }] },
]

const FIELDS_MAP: Record<Platform, typeof TIKTOK_FIELDS> = {
  tiktok: TIKTOK_FIELDS, instagram: IG_FIELDS, youtube: YT_FIELDS, facebook: FB_FIELDS,
}

function PlatformForm({ platform, videoId, initialData, onSaved }: { platform: Platform; videoId: string; initialData: PlatformData; onSaved: (data: PlatformData) => void }) {
  const [form, setForm] = useState<PlatformData>(initialData)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  function set(key: string, value: string) { setForm((f) => ({ ...f, [key]: value })) }

  async function save() {
    setSaving(true)
    try {
      const supabase = createClient()
      const payload: Record<string, unknown> = {
        video_id: videoId, platform,
        recorded_at: new Date().toISOString().split('T')[0],
      }
      Object.entries(form).forEach(([k, v]) => {
        if (v === '' || v === undefined) return
        payload[k] = isNaN(Number(v)) ? v : Number(v)
      })

      const { error } = await supabase.from('video_performance').upsert(payload, { onConflict: 'video_id,platform,recorded_at' })
      if (error) throw error
      toast.success(`Data ${PLATFORM_LABELS[platform]} tersimpan!`)
      onSaved(form)
      queryClient.invalidateQueries({ queryKey: ['performance', videoId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const fields = FIELDS_MAP[platform]

  return (
    <div className="space-y-6">
      {fields.map((section) => (
        <div key={section.section}>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">{section.section}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {section.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}{(f as any).required && <span className="text-error ml-0.5">*</span>}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form[f.key] as string ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="h-8 text-sm"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button onClick={save} disabled={saving} className="w-full">
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Simpan Data {PLATFORM_LABELS[platform]}
      </Button>
    </div>
  )
}

function PreviewCard({ platform, data, video }: { platform: Platform; data: PlatformData; video: any }) {
  const views = Number(data.views ?? 0)
  const likes = Number(data.likes ?? 0)
  const comments = Number(data.comments ?? 0)
  const shares = Number(data.shares ?? 0)

  return (
    <div className="border-2 border-accent/20 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="h-1 bg-accent" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', getPlatformBadge(platform))}>{PLATFORM_LABELS[platform]}</span>
          <span className="text-xs text-text-muted">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <div className="aspect-video bg-subtle rounded-lg overflow-hidden flex items-center justify-center">
          {video?.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Video className="w-8 h-8 text-border" />}
        </div>
        <p className="font-heading font-bold text-text-primary text-sm line-clamp-2">{video?.judul}</p>
        <div className="grid grid-cols-4 gap-1">
          {[{ label: 'Views', value: views }, { label: 'Likes', value: likes }, { label: 'Comments', value: comments }, { label: 'Shares', value: shares }].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="font-heading font-bold text-text-primary text-sm">{formatNumber(value)}</p>
              <p className="text-[10px] text-text-muted">{label}</p>
            </div>
          ))}
        </div>
        {(data.aud_male_pct || data.aud_female_pct) && (
          <div className="flex gap-1 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 transition-all" style={{ width: `${data.aud_male_pct ?? 50}%` }} />
            <div className="bg-pink-400 flex-1" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function PerformanceInputPage({ params }: { params: { videoId: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [platformData, setPlatformData] = useState<Record<Platform, PlatformData>>({ tiktok: {}, instagram: {}, youtube: {}, facebook: {} })
  const [activePlatform, setActivePlatform] = useState<Platform>('tiktok')
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const { data: video, isLoading: videoLoading } = useQuery({
    queryKey: ['video-perf', params.videoId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('videos').select('id, judul, thumbnail_url').eq('id', params.videoId).single()
      return data
    },
  })

  const { data: existingPerf } = useQuery({
    queryKey: ['performance', params.videoId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('video_performance').select('*').eq('video_id', params.videoId)
      return data ?? []
    },
    onSuccess: (data: any[]) => {
      const map: Record<Platform, PlatformData> = { tiktok: {}, instagram: {}, youtube: {}, facebook: {} }
      data.forEach((d) => {
        const p = d.platform as Platform
        const fd: PlatformData = {}
        Object.entries(d).forEach(([k, v]) => { if (v !== null && v !== undefined) fd[k] = v as any })
        map[p] = fd
      })
      setPlatformData(map)
    },
  } as any)

  async function handleExportAll() {
    setExporting(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { VideoReportPDF } = await import('@/components/pdf/VideoReportPDF')
      const { createElement } = await import('react')
      setExportProgress(25)

      const doc = createElement(VideoReportPDF, { video, platformData } as any)
      setExportProgress(60)
      const blob = await pdf(doc as any).toBlob()
      setExportProgress(100)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `report-${video?.judul?.slice(0, 30) ?? 'video'}.pdf`; a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF berhasil di-download!')
    } catch (err) {
      toast.error('Gagal generate PDF')
    } finally {
      setExporting(false); setExportProgress(0)
    }
  }

  async function handleDownloadPlatform(platform: Platform) {
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { VideoReportPDF } = await import('@/components/pdf/VideoReportPDF')
      const { createElement } = await import('react')
      const doc = createElement(VideoReportPDF, { video, platformData, singlePlatform: platform } as any)
      const blob = await pdf(doc as any).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `report-${platform}-${video?.judul?.slice(0, 20) ?? 'video'}.pdf`; a.click()
      URL.revokeObjectURL(url)
      toast.success(`PDF ${PLATFORM_LABELS[platform]} di-download!`)
    } catch (err) {
      toast.error('Gagal generate PDF')
    }
  }

  if (videoLoading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-subtle text-text-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-xl font-bold text-text-primary truncate">{video?.judul}</h1>
          <p className="text-sm text-text-secondary">Input data performa per platform</p>
        </div>
        <div className="flex items-center gap-2">
          {exporting && <div className="w-24"><Progress value={exportProgress} /></div>}
          <Button variant="secondary" size="sm" onClick={handleExportAll} disabled={exporting} className="gap-1.5">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export 4 Platform
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Form */}
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as Platform)}>
            <div className="border-b border-border px-4 pt-3">
              <TabsList className="w-full justify-start bg-transparent p-0 gap-1 h-auto">
                {PLATFORMS.map((p) => (
                  <TabsTrigger key={p} value={p} className="text-xs data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:bg-transparent rounded-none px-3 pb-2">
                    <span className={cn('w-2 h-2 rounded-full mr-1.5 inline-block', getPlatformDot(p))} />
                    {PLATFORM_LABELS[p]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {PLATFORMS.map((p) => (
              <TabsContent key={p} value={p} className="p-4 mt-0">
                <PlatformForm
                  platform={p}
                  videoId={params.videoId}
                  initialData={platformData[p]}
                  onSaved={(data) => {
                    setPlatformData((prev) => ({ ...prev, [p]: data }))
                  }}
                />
                <Button variant="secondary" size="sm" className="w-full mt-3 gap-1.5" onClick={() => handleDownloadPlatform(p)}>
                  <Download className="w-3.5 h-3.5" />
                  Download PDF {PLATFORM_LABELS[p]}
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Right: Preview */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Preview Card</p>
          <PreviewCard platform={activePlatform} data={platformData[activePlatform]} video={video} />
        </div>
      </div>
    </div>
  )
}
