'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Printer, Save, Video as VideoIcon, Search, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Platform } from '@/lib/types'
import {
  EMPTY_CAMPAIGN, newReportVideo,
  type ReportData, type ReportVideo, type ReportCampaignInfo,
} from '@/lib/types/report'
import { buildReportHTML, printReport } from '../report-html'

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' }, { key: 'instagram', label: 'IG' },
  { key: 'youtube', label: 'YT' }, { key: 'facebook', label: 'FB' },
]
const CORE_FIELDS: { key: keyof ReportVideo['tiktok']; label: string }[] = [
  { key: 'views', label: 'Views' }, { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' }, { key: 'shares', label: 'Shares' },
]

export default function ReportEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { workspaceId } = useWorkspace()

  const [campaign, setCampaign] = useState<ReportCampaignInfo>(EMPTY_CAMPAIGN)
  const [videos, setVideos] = useState<ReportVideo[]>([])
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load report
  const { data: report, isLoading } = useQuery({
    queryKey: ['performance-report', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('performance_reports').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (report && !loaded) {
      const d = (report.data ?? {}) as ReportData
      setCampaign({ ...EMPTY_CAMPAIGN, ...(d.campaign ?? {}) })
      setVideos(Array.isArray(d.videos) ? d.videos : [])
      setLoaded(true)
    }
  }, [report, loaded])

  const reportData: ReportData = useMemo(() => ({ campaign, videos }), [campaign, videos])

  const save = useCallback(async () => {
    if (!loaded) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('performance_reports')
        .update({ name: campaign.campaign || 'Laporan Baru', kol_name: campaign.kol || null, data: reportData })
        .eq('id', id)
      if (error) throw error
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }, [id, campaign, reportData, loaded])

  // Auto-save (debounced) whenever data changes
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => { save() }, 1000)
    return () => clearTimeout(t)
  }, [campaign, videos, loaded, save])

  function setC(k: keyof ReportCampaignInfo, v: string) { setCampaign((c) => ({ ...c, [k]: v })) }
  function setVideoField(i: number, pl: Platform, k: keyof ReportVideo['tiktok'], v: string) {
    setVideos((vs) => vs.map((vid, idx) => idx === i ? { ...vid, [pl]: { ...vid[pl], [k]: v } } : vid))
  }
  function togglePl(i: number, pl: Platform) {
    setVideos((vs) => vs.map((vid, idx) => idx === i ? { ...vid, enabled: { ...vid.enabled, [pl]: !(vid.enabled?.[pl] !== false) } } : vid))
  }
  function removeVideo(i: number) {
    if (!confirm('Hapus video ini dari laporan?')) return
    setVideos((vs) => vs.filter((_, idx) => idx !== i))
  }
  function moveVideo(i: number, dir: -1 | 1) {
    setVideos((vs) => {
      const j = i + dir
      if (j < 0 || j >= vs.length) return vs
      const copy = [...vs];[copy[i], copy[j]] = [copy[j], copy[i]]; return copy
    })
  }

  const previewHTML = useMemo(() => buildReportHTML(reportData), [reportData])

  if (isLoading || !loaded) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>
  }
  if (!report) {
    return <div className="p-16 text-center text-text-muted">Laporan tidak ditemukan. <button onClick={() => router.push('/performance/reports')} className="text-accent hover:underline">Kembali</button></div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border bg-white shrink-0">
        <button onClick={() => router.push('/performance/reports')} className="p-2 rounded-md hover:bg-subtle text-text-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-text-primary truncate">{campaign.campaign || 'Laporan Baru'}</h1>
          <p className="text-[11px] text-text-muted">{saving ? 'Menyimpan…' : 'Tersimpan otomatis'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={save} className="gap-1.5"><Save className="w-3.5 h-3.5" /> Simpan</Button>
        <Button size="sm" onClick={() => printReport(reportData)} className="gap-1.5"><Printer className="w-3.5 h-3.5" /> Print / PDF</Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: form */}
        <div className="w-[380px] shrink-0 border-r border-border bg-white overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Campaign info */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Info Campaign</h3>
              <div className="space-y-2">
                {([
                  ['campaign', 'Nama Campaign'], ['subtitle', 'Subtitle Laporan'], ['kol', 'Nama KOL'],
                  ['handle', 'Handle / Username'], ['date', 'Tanggal Update'], ['phone', 'No. Telepon'], ['email', 'Email'],
                ] as [keyof ReportCampaignInfo, string][]).map(([k, lbl]) => (
                  <div key={k}>
                    <Label className="text-[11px]">{lbl}</Label>
                    <Input value={campaign[k]} onChange={(e) => setC(k, e.target.value)} className="h-8 text-sm mt-0.5" />
                  </div>
                ))}
              </div>
            </div>

            {/* Videos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Video ({videos.length})</h3>
              </div>
              <div className="space-y-2">
                {videos.map((v, i) => (
                  <div key={i} className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 p-2 bg-surface cursor-pointer" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                      <span className="text-[10px] font-bold text-accent bg-accent-light px-1.5 py-0.5 rounded-full shrink-0">V{i + 1}</span>
                      <span className="text-xs font-medium text-text-primary truncate flex-1">{v.title || `Video ${i + 1}`}</span>
                      <button onClick={(e) => { e.stopPropagation(); moveVideo(i, -1) }} className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30" disabled={i === 0}><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveVideo(i, 1) }} className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30" disabled={i === videos.length - 1}><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); removeVideo(i) }} className="p-0.5 text-error hover:bg-error/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    {openIdx === i && (
                      <div className="p-2.5 space-y-3">
                        {/* Platform toggles */}
                        <div className="flex flex-wrap gap-1.5">
                          {PLATFORMS.map((p) => {
                            const on = v.enabled?.[p.key] !== false
                            return (
                              <button key={p.key} onClick={() => togglePl(i, p.key)}
                                className={cn('text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors',
                                  on ? 'bg-accent-light text-accent border-accent/30' : 'bg-surface text-text-muted border-border line-through')}>
                                {on ? '✓' : '✕'} {p.label}
                              </button>
                            )
                          })}
                        </div>
                        {/* Per-platform core metrics */}
                        {PLATFORMS.filter((p) => v.enabled?.[p.key] !== false).map((p) => (
                          <div key={p.key}>
                            <p className="text-[10px] font-bold text-text-muted uppercase mb-1">{p.label}</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {CORE_FIELDS.map((f) => {
                                const fieldKey = (p.key === 'facebook' && f.key === 'likes') ? 'reactions' as const : f.key
                                const label = (p.key === 'facebook' && f.key === 'likes') ? 'Reactions' : f.label
                                return (
                                  <div key={f.key}>
                                    <Label className="text-[10px] text-text-muted">{label}</Label>
                                    <Input value={String(v[p.key][fieldKey] ?? '')} onChange={(e) => setVideoField(i, p.key, fieldKey, e.target.value)}
                                      inputMode="numeric" className="h-7 text-xs mt-0.5" placeholder="0" />
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2 gap-1.5 border-dashed" onClick={() => setPickerOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Tambah Video dari Banking
              </Button>
            </div>
          </div>
        </div>

        {/* Right: preview */}
        <div className="flex-1 overflow-auto bg-[#555] p-5">
          {videos.length === 0 ? (
            <div className="text-center text-white/60 pt-24 text-sm">Tambahkan video untuk melihat preview laporan.</div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
          )}
        </div>
      </div>

      <VideoPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        workspaceId={workspaceId}
        existingIds={videos.map((v) => v.video_id).filter(Boolean) as string[]}
        onAdd={(added) => { setVideos((vs) => [...vs, ...added]); setPickerOpen(false) }}
      />
    </div>
  )
}

// ── Video picker: bulk-select existing videos, prefill metrics from video_performance ──
function VideoPickerDialog({ open, onClose, workspaceId, existingIds, onAdd }: {
  open: boolean; onClose: () => void; workspaceId: string | null; existingIds: string[]
  onAdd: (videos: ReportVideo[]) => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['report-video-candidates', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('videos')
        .select('id, judul, thumbnail_url')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return (data ?? []) as { id: string; judul: string; thumbnail_url: string | null }[]
    },
    enabled: !!workspaceId && open,
  })

  useEffect(() => { if (!open) { setSelected(new Set()); setSearch('') } }, [open])

  const filtered = videos.filter((v) => !existingIds.includes(v.id) && (v.judul ?? '').toLowerCase().includes(search.toLowerCase()))

  function toggle(vid: string) {
    setSelected((s) => { const n = new Set(s); n.has(vid) ? n.delete(vid) : n.add(vid); return n })
  }

  async function addSelected() {
    if (selected.size === 0) return
    setAdding(true)
    try {
      const supabase = createClient()
      const ids = Array.from(selected)
      // Prefill core metrics from the latest video_performance rows.
      const { data: perf } = await supabase
        .from('video_performance')
        .select('video_id, platform, recorded_at, views, likes, comments, shares, saves')
        .in('video_id', ids)
      const latest = new Map<string, any>() // `${video}:${platform}` -> row
      for (const row of (perf ?? []) as any[]) {
        const key = `${row.video_id}:${row.platform}`
        const prev = latest.get(key)
        if (!prev || row.recorded_at > prev.recorded_at) latest.set(key, row)
      }
      const added: ReportVideo[] = ids.map((vid) => {
        const meta = videos.find((v) => v.id === vid)
        const rv = newReportVideo(vid, meta?.judul ?? 'Video', meta?.thumbnail_url ?? null)
        ;(['tiktok', 'instagram', 'youtube', 'facebook'] as Platform[]).forEach((pl) => {
          const row = latest.get(`${vid}:${pl}`)
          if (row) {
            rv[pl].views = row.views ?? ''
            rv[pl].likes = row.likes ?? ''
            rv[pl].comments = row.comments ?? ''
            rv[pl].shares = row.shares ?? ''
            rv[pl].saved = row.saves ?? ''
            if (pl === 'facebook') rv.facebook.reactions = row.likes ?? ''
          }
        })
        return rv
      })
      onAdd(added)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menambahkan video')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Pilih Video ke Laporan</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input placeholder="Cari video..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 mt-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
          ) : filtered.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">{search ? 'Tidak ada video cocok' : 'Semua video sudah ditambahkan'}</p>
          ) : filtered.map((v) => {
            const sel = selected.has(v.id)
            return (
              <button key={v.id} onClick={() => toggle(v.id)}
                className={cn('w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors', sel ? 'border-accent bg-accent-light' : 'border-border hover:bg-surface')}>
                <div className="w-9 h-9 rounded bg-subtle overflow-hidden shrink-0 flex items-center justify-center">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <VideoIcon className="w-4 h-4 text-border" />}
                </div>
                <span className="text-sm text-text-primary truncate flex-1">{v.judul}</span>
                <span className={cn('w-5 h-5 rounded-full border flex items-center justify-center shrink-0', sel ? 'bg-accent border-accent' : 'border-border')}>
                  {sel && <Check className="w-3 h-3 text-white" />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <span className="text-xs text-text-muted">{selected.size} dipilih</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
            <Button size="sm" onClick={addSelected} disabled={selected.size === 0 || adding}>
              {adding ? 'Menambahkan…' : `Tambah ${selected.size > 0 ? `(${selected.size})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
