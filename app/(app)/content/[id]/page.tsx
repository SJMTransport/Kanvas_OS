'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Plus, Trash2, Check, ExternalLink, Loader2, FileText, Video, Upload, X, Handshake, AlertTriangle,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getPlatformDot, getPlatformBadge } from '@/lib/utils/platform'
import { formatNumber, formatDate } from '@/lib/utils/formatters'
import {
  getApprovalAgingText,
  getApprovalSeverity,
  APPROVAL_STATUS_CONFIG,
  PRODUCTION_STATUS_CONFIG,
  PUBLISHING_STATUS_CONFIG,
} from '@/lib/utils/workflow'
import {
  computeContentLifecycleStage,
  isPublishingFullyDone,
  LIFECYCLE_CONFIG,
  LIFECYCLE_ORDER,
} from '@/lib/operations/rules'
import { computeFinancialStatus, isInvoiceOverdue, FINANCIAL_STATUS_CONFIG } from '@/lib/utils/financial'
import { formatRupiah } from '@/lib/utils/formatters'
import { ScriptBlocks, type ScriptBlock } from '@/components/content/ScriptBlocks'
import { ContentIdentity } from '@/components/content/ContentIdentity'
import { LifecycleIndicator } from '@/components/content/LifecycleIndicator'
import { VideoWorkBadges } from '@/components/content/VideoWorkBadges'
import { PlatformEmbed } from '@/components/content/PlatformEmbed'
import type { Platform } from '@/lib/types'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']
const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook',
}


// ─── Suggestion Tema Select ──────────────────────────────────────────────────

function TemaSelect({ temas, onChange, workspaceId }: { temas: string[]; onChange: (v: string[]) => void; workspaceId: string | null }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)

  const { data: suggestions = [] } = useQuery<string[]>({
    queryKey: ['workspace-temas', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase.rpc('get_workspace_temas', { ws_id: workspaceId })
      return (data ?? []) as string[]
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
  })

  const filtered = suggestions.filter((s) => !temas.includes(s) && s.toLowerCase().includes(input.toLowerCase()))

  function addTema(t: string) {
    const trimmed = t.trim()
    if (!trimmed || temas.includes(trimmed)) return
    onChange([...temas, trimmed])
    setInput('')
    setOpen(false)
  }

  function removeTema(t: string) {
    onChange(temas.filter((x) => x !== t))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addTema(input) }
    if (e.key === 'Backspace' && !input && temas.length > 0) removeTema(temas[temas.length - 1])
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="relative">
      <div
        className={cn('min-h-9 flex flex-wrap gap-1.5 px-2 py-1.5 border rounded-md bg-background cursor-text', open && 'ring-1 ring-ring')}
        onClick={() => { setOpen(true); (document.getElementById('tema-input') as HTMLInputElement)?.focus() }}
      >
        {temas.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-xs rounded-full font-medium">
            {t}
            <button type="button" onClick={(e) => { e.stopPropagation(); removeTema(t) }} className="hover:text-error leading-none">&times;</button>
          </span>
        ))}
        <input
          id="tema-input"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={temas.length === 0 ? 'Tambah tema...' : ''}
          className="flex-1 min-w-[80px] outline-none text-xs bg-transparent placeholder:text-text-muted"
        />
      </div>
      {open && (filtered.length > 0 || (input.trim() && !temas.includes(input.trim()))) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
          {filtered.map((s) => (
            <button key={s} type="button" onMouseDown={() => addTema(s)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-subtle">
              {s}
            </button>
          ))}
          {input.trim() && !temas.includes(input.trim()) && !suggestions.includes(input.trim()) && (
            <button type="button" onMouseDown={() => addTema(input)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-subtle text-accent">
              + Buat &quot;{input.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Info Tab ────────────────────────────────────────────────────────────────

function InfoTab({ form, setForm, temas, setTemas, workspaceId, isFoto }: { form: any, setForm: any, temas: string[], setTemas: any, workspaceId: string | null, isFoto: boolean }) {
  function set(field: string, value: string) {
    setForm((f: any) => ({ ...f, [field]: value }))
  }

  const FORMAT_OPTIONS = ['Short Video', 'Long Video', 'Reels', 'Live']

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">No. Video</Label>
          <Input
            type="text"
            value={form.no_video}
            onChange={(e) => set('no_video', e.target.value)}
            placeholder="misal 15.1, 860, VID-001"
            className="text-xs font-mono h-9 bg-white"
          />
        </div>
        {!isFoto && (
          <div className="space-y-1.5">
            <Label className="text-xs text-text-muted">Format</Label>
            <Select value={form.format} onValueChange={(v) => set('format', v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((f) => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Judul Konten</Label>
        <Input value={form.judul} onChange={(e) => set('judul', e.target.value)} className="text-xs h-9" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Tema</Label>
        <TemaSelect temas={temas} onChange={setTemas} workspaceId={workspaceId} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Pilar Konten</Label>
        <Select value={form.pilar_konten || 'none'} onValueChange={(val) => set('pilar_konten', val === 'none' ? '' : val)}>
          <SelectTrigger className="text-xs h-9 bg-white border-border text-text-primary">
            <SelectValue placeholder="Pilih Pilar Konten" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-border">
            <SelectItem value="none">Tanpa Pilar</SelectItem>
            <SelectItem value="Edukasi">Edukasi</SelectItem>
            <SelectItem value="Hiburan">Hiburan</SelectItem>
            <SelectItem value="Promosi">Promosi</SelectItem>
            <SelectItem value="Inspirasi">Inspirasi</SelectItem>
            <SelectItem value="Behind the Scenes">Behind the Scenes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isFoto ? (
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">Tanggal Target (Deadline)</Label>
          <Input type="date" value={form.deadline_posting} onChange={(e) => set('deadline_posting', e.target.value)} className="text-xs h-9" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-text-muted">Tanggal Shooting</Label>
            <Input type="date" value={form.tanggal_shooting} onChange={(e) => set('tanggal_shooting', e.target.value)} className="text-xs h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-text-muted">Tanggal Target (Deadline)</Label>
            <Input type="date" value={form.deadline_posting} onChange={(e) => set('deadline_posting', e.target.value)} className="text-xs h-9" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Production Assets Panel (Drive Links & Caption) ─────────────────────────

function ProductionAssets({ form, setForm, isFoto }: { form: any, setForm: any, isFoto: boolean }) {
  function set(field: string, value: string) {
    setForm((f: any) => ({ ...f, [field]: value }))
  }

  return (
    <div className="space-y-4">
      {!isFoto && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-text-muted">Folder Bahan</Label>
            <Input value={form.storage_bahan} onChange={(e) => set('storage_bahan', e.target.value)} placeholder="Link folder..." className="text-xs h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-text-muted">Folder Video</Label>
            <Input value={form.storage_video} onChange={(e) => set('storage_video', e.target.value)} placeholder="Link folder..." className="text-xs h-9" />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Google Drive Link</Label>
        <Input value={form.google_drive_link} onChange={(e) => set('google_drive_link', e.target.value)} placeholder="https://drive.google.com/..." className="text-xs h-9" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Caption Default</Label>
        <Textarea value={form.caption_default} onChange={(e) => set('caption_default', e.target.value)} rows={3} className="text-xs resize-none" placeholder="Tulis caption default di sini..." />
      </div>
    </div>
  )
}

// ─── Platform Performance Inline Form ────────────────────────────────────────

function PlatformPerformanceForm({ 
  platform, 
  videoId, 
  existingRecord, 
  onSaveSuccess 
}: { 
  platform: Platform
  videoId: string
  existingRecord?: any
  onSaveSuccess: () => void 
}) {
  const [views, setViews] = useState(existingRecord?.views?.toString() ?? '')
  const [likes, setLikes] = useState(existingRecord?.likes?.toString() ?? '')
  const [comments, setComments] = useState(existingRecord?.comments?.toString() ?? '')
  const [shares, setShares] = useState(existingRecord?.shares?.toString() ?? '')
  const [saves, setSaves] = useState(existingRecord?.saves?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!views) {
      toast.error('Views wajib diisi untuk menyimpan performa')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        video_id: videoId,
        platform,
        recorded_at: new Date().toISOString().split('T')[0],
        views: Number(views) || 0,
        likes: Number(likes) || 0,
        comments: Number(comments) || 0,
        shares: Number(shares) || 0,
        saves: Number(saves) || 0,
      }
      const { error } = await supabase
        .from('video_performance')
        .upsert(payload, { onConflict: 'video_id,platform,recorded_at' })
      if (error) throw error
      toast.success('Metrik performa berhasil disimpan!')
      onSaveSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan performa')
    } finally {
      setSaving(false)
    }
  }

  const showSaves = platform === 'tiktok' || platform === 'instagram'

  return (
    <div className="mt-3 p-3 bg-accent-light/10 rounded-lg border border-accent/10 space-y-2">
      <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Update Metrik Performa</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <div className="space-y-1">
          <Label className="text-[9px] text-text-secondary">Views *</Label>
          <Input type="number" value={views} onChange={(e) => setViews(e.target.value)} className="h-7 text-xs px-2" placeholder="0" />
        </div>
        <div className="space-y-1">
          <Label className="text-[9px] text-text-secondary">Likes</Label>
          <Input type="number" value={likes} onChange={(e) => setLikes(e.target.value)} className="h-7 text-xs px-2" placeholder="0" />
        </div>
        <div className="space-y-1">
          <Label className="text-[9px] text-text-secondary">Comments</Label>
          <Input type="number" value={comments} onChange={(e) => setComments(e.target.value)} className="h-7 text-xs px-2" placeholder="0" />
        </div>
        <div className="space-y-1">
          <Label className="text-[9px] text-text-secondary">Shares</Label>
          <Input type="number" value={shares} onChange={(e) => setShares(e.target.value)} className="h-7 text-xs px-2" placeholder="0" />
        </div>
        {showSaves && (
          <div className="space-y-1">
            <Label className="text-[9px] text-text-secondary">Saves</Label>
            <Input type="number" value={saves} onChange={(e) => setSaves(e.target.value)} className="h-7 text-xs px-2" placeholder="0" />
          </div>
        )}
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs w-full bg-accent hover:bg-accent/90 mt-1">
        {saving ? 'Menyimpan...' : 'Simpan Metrik Performa'}
      </Button>
    </div>
  )
}

// ─── Distribution Tab ────────────────────────────────────────────────────────

function DistributionTab({ 
  video, 
  activePlatform, 
  setActivePlatform,
  perfRecords,
  refetchPerformance
}: { 
  video: VideoWithSchedules
  activePlatform: Platform
  setActivePlatform: (p: Platform) => void
  perfRecords: any[]
  refetchPerformance: () => void
}) {
  const queryClient = useQueryClient()

  // Phase 03B-2/03D/04 fix — Dashboard's "Jadwal Hari Ini", the Action
  // Center widget, and Calendar each read schedule-derived data under
  // their own query keys (['dashboard', workspaceId], ['action-center',
  // workspaceId], ['calendar-events', ...]). None of these were ever
  // invalidated by this tab's schedule mutations before 03B-2/03D, and
  // ['action-center'] was still missed by both those phases — a real,
  // separate gap, now closed here.
  //
  // refetchType: 'all' (not the invalidateQueries default of 'active')
  // is used deliberately: it forces these queries to refetch immediately,
  // right now, even though Dashboard/Calendar/Action Center are not
  // mounted while the user is on Content Detail. This removes any
  // dependency on "does mounting later actually trigger a refetch" —
  // fresh data is already sitting in the cache by the time the user
  // navigates there, regardless of refetchOnMount/staleTime behavior.
  function invalidateScheduleDependents() {
    queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' })
    queryClient.invalidateQueries({ queryKey: ['calendar-events'], refetchType: 'all' })
    queryClient.invalidateQueries({ queryKey: ['action-center'], refetchType: 'all' })
  }
  const { workspaceId } = useWorkspace()
  const [adding, setAdding] = useState<Platform | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ social_account_id: string; tanggal_tayang: string; jam_post: string; caption_override: string; media_url: string; is_story: boolean; cross_platforms: Platform[] }>({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '', media_url: '', is_story: false, cross_platforms: [] })
  const [urlPostInputs, setUrlPostInputs] = useState<Record<string, string>>({})
  const [mediaUploading, setMediaUploading] = useState(false)
  const [publishingId, setPublishingId] = useState<string | null>(null)

  const { data: schedules } = useQuery({
    queryKey: ['schedules-video', video.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('video_platform_schedules').select('*, social_accounts(handle, display_name, is_connected)').eq('video_id', video.id)
      return data ?? []
    },
  })

  const { data: socialAccounts } = useQuery({
    queryKey: ['social-accounts', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase.from('social_accounts').select('*').eq('workspace_id', workspaceId)
      return data ?? []
    },
    enabled: !!workspaceId,
  })

  async function handleForcePublish(scheduleId: string) {
    setPublishingId(scheduleId)
    try {
      const res = await fetch(`/api/cron/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: scheduleId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal melakukan auto-posting')
      toast.success('Konten berhasil dipublikasikan secara otomatis!')
      queryClient.invalidateQueries({ queryKey: ['schedules-video', video.id] })
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      invalidateScheduleDependents()
    } catch (err: any) {
      toast.error('Gagal auto-posting: ' + err.message)
    } finally {
      setPublishingId(null)
    }
  }

  async function handleUploadMedia(file: File) {
    setMediaUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `schedules/${video.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('content-images').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('content-images').getPublicUrl(path)
      setForm((f) => ({ ...f, media_url: publicUrl }))
      toast.success('Media berhasil diunggah!')
    } catch (err: any) {
      toast.error('Gagal mengunggah media: ' + err.message)
    } finally {
      setMediaUploading(false)
    }
  }

  async function addSchedule(platform: Platform) {
    if (!form.tanggal_tayang) { toast.error('Tanggal tayang wajib diisi'); return }
    const supabase = createClient()

    const platformsToSave = editingId
      ? [platform]
      : Array.from(new Set([platform, ...(form.cross_platforms || [])]))

    for (const p of platformsToSave) {
      const siblingAccount = socialAccounts?.find((a: any) => a.platform === p)
      const pPayload = {
        social_account_id: p === platform ? (form.social_account_id || null) : (siblingAccount ? siblingAccount.id : null),
        tanggal_tayang: form.tanggal_tayang,
        jam_post: form.jam_post || null,
        caption_override: form.caption_override || null,
        media_url: form.media_url || null,
        is_story: p === 'instagram' ? form.is_story : false,
      }

      let error
      if (editingId && p === platform) {
        ({ error } = await supabase.from('video_platform_schedules').update(pPayload).eq('id', editingId))
      } else {
        const existing = (schedules ?? []).find((s: { platform: string }) => s.platform === p)
        if (existing) {
          ({ error } = await supabase.from('video_platform_schedules').update(pPayload).eq('id', existing.id))
        } else {
          ({ error } = await supabase.from('video_platform_schedules').insert({
            video_id: video.id, platform: p, status: 'scheduled', ...pPayload,
          }))
        }
      }
      if (error) { toast.error(`Gagal menyimpan untuk ${p}: ${error.message}`); return }
    }

    if (video.status !== 'live') {
      await supabase.from('videos').update({ status: 'live' }).eq('id', video.id)
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    }

    toast.success(platformsToSave.length > 1 ? 'Jadwal disimpan untuk semua platform pilihan!' : 'Jadwal disimpan!')
    queryClient.invalidateQueries({ queryKey: ['schedules-video', video.id] })
    queryClient.invalidateQueries({ queryKey: ['schedules'] })
    invalidateScheduleDependents()
    setAdding(null)
    setEditingId(null)
    setForm({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '', media_url: '', is_story: false, cross_platforms: [] })
  }

  function startEdit(s: { id: string; platform: string; social_account_id?: string | null; tanggal_tayang: string; jam_post?: string | null; caption_override?: string | null; media_url?: string | null; is_story?: boolean | null }) {
    setForm({
      social_account_id: s.social_account_id ?? '',
      tanggal_tayang: s.tanggal_tayang,
      jam_post: s.jam_post ?? '',
      caption_override: s.caption_override ?? '',
      media_url: s.media_url ?? '',
      is_story: !!s.is_story,
      cross_platforms: [],
    })
    setEditingId(s.id)
    setAdding(s.platform as Platform)
  }

  async function deleteSchedule(id: string) {
    if (!confirm('Hapus jadwal ini?')) return
    const supabase = createClient()
    const { error } = await supabase.from('video_platform_schedules').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Jadwal dihapus')
    queryClient.invalidateQueries({ queryKey: ['schedules-video', video.id] })
    queryClient.invalidateQueries({ queryKey: ['schedules'] })
    invalidateScheduleDependents()
  }

  async function markPosted(id: string, url: string) {
    const trimmed = url.trim()
    if (!trimmed) return
    const supabase = createClient()
    const { error } = await supabase.from('video_platform_schedules').update({
      status: 'posted',
      url_post: trimmed,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) { toast.error('Gagal menyimpan: ' + error.message); return }
    queryClient.invalidateQueries({ queryKey: ['schedules-video', video.id] })
    queryClient.invalidateQueries({ queryKey: ['schedules'] })
    invalidateScheduleDependents()
    toast.success('Jadwal ditandai telah tayang!')
  }

  return (
    <div className="space-y-4">
      {PLATFORMS.map((platform) => {
        const platformSchedules = (schedules ?? []).filter((s: { platform: string }) => s.platform === platform)
        const platformAccounts = (socialAccounts ?? []).filter((a: { platform: string }) => a.platform === platform)
        const isSelected = activePlatform === platform
        const platformPerf = perfRecords.find((p) => p.platform === platform)

        return (
          <div 
            key={platform} 
            className={cn(
              "border rounded-lg overflow-hidden transition-all duration-200 cursor-pointer",
              isSelected ? "border-accent shadow-sm ring-1 ring-accent/20 bg-white" : "border-border hover:border-text-muted/45 bg-white"
            )}
            onClick={() => setActivePlatform(platform)}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
              <div className="flex items-center gap-2">
                <div className={cn('w-2.5 h-2.5 rounded-full', getPlatformDot(platform))} />
                <span className="text-xs font-semibold text-text-primary">{PLATFORM_LABELS[platform]}</span>
                {platformSchedules.length > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent-light/40 text-accent border border-accent/20">
                    {platformSchedules.length}x Tayang
                  </span>
                )}
              </div>
              <Button size="sm" variant="secondary" className="h-6 text-[10px] gap-1" onClick={(e) => {
                e.stopPropagation()
                if (platform === adding && !editingId) { setAdding(null); setEditingId(null) }
                else { setAdding(platform); setEditingId(null); setForm({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '', media_url: '', is_story: false, cross_platforms: [] }) }
              }}>
                <Plus className="w-2.5 h-2.5" /> {platformSchedules.length > 0 ? '+ Tanggal Baru' : '+ Jadwal'}
              </Button>
            </div>

            {adding === platform && (
              <div className="p-3 bg-accent-light/10 border-b border-border space-y-3" onClick={(e) => e.stopPropagation()}>
                {platformAccounts.length > 0 && (
                  <div>
                    <Label className="text-xs">Akun</Label>
                    <select
                      className="w-full mt-1 text-xs border border-border rounded px-2 py-1.5 bg-white"
                      value={form.social_account_id}
                      onChange={(e) => setForm((f) => ({ ...f, social_account_id: e.target.value }))}
                    >
                      <option value="">Pilih akun (opsional)</option>
                      {platformAccounts.map((a: { id: string; handle: string; display_name?: string }) => (
                        <option key={a.id} value={a.id}>{a.display_name ?? a.handle}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Snapgram / Story option specifically for Instagram / Facebook */}
                {(platform === 'instagram' || platform === 'facebook') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Jenis Postingan</Label>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, is_story: false }))}
                        className={cn(
                          "flex-1 py-1 px-3 text-xs font-semibold rounded-md border transition-all text-center",
                          !form.is_story 
                            ? "bg-accent border-accent text-white shadow-sm" 
                            : "bg-white border-border text-text-secondary hover:bg-subtle"
                        )}
                      >
                        Reels / Feed / Post
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, is_story: true }))}
                        className={cn(
                          "flex-1 py-1 px-3 text-xs font-semibold rounded-md border transition-all text-center",
                          form.is_story 
                            ? "bg-accent border-accent text-white shadow-sm" 
                            : "bg-white border-border text-text-secondary hover:bg-subtle"
                        )}
                      >
                        📸 Snapgram (Story)
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tanggal *</Label>
                    <Input type="date" className="h-8 text-xs mt-1" value={form.tanggal_tayang} onChange={(e) => setForm((f) => ({ ...f, tanggal_tayang: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Jam</Label>
                    <Input type="time" className="h-8 text-xs mt-1" value={form.jam_post} onChange={(e) => setForm((f) => ({ ...f, jam_post: e.target.value }))} />
                  </div>
                </div>

                {/* Media Scheduling Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Sumber Media (Gambar / Video)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <label className="flex items-center justify-center gap-1.5 py-1.5 px-3 border border-dashed border-border rounded bg-white hover:border-accent hover:bg-accent-light/5 cursor-pointer transition-colors text-xs font-semibold text-text-secondary">
                      {mediaUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      Upload dari PC
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadMedia(file)
                        }}
                        disabled={mediaUploading}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (video.google_drive_link) {
                          setForm((f) => ({ ...f, media_url: video.google_drive_link || '' }))
                          toast.success('Link Google Drive disalin sebagai media!')
                        } else {
                          toast.error('Google Drive Link belum diisi pada info konten')
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-3 border border-border rounded bg-white hover:border-accent hover:bg-accent-light/5 transition-colors text-xs font-semibold text-text-secondary"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-600 fill-current" viewBox="0 0 24 24">
                        <path d="M19.43 12.98l-6.7-11.53c-.3-.5-.8-.8-1.4-.8h.02c-.6 0-1.1.3-1.4.8L3.25 12.98c-.3.5-.3 1.1 0 1.6l3.35 5.76c.3.5.8.8 1.4.8h13.4c.6 0 1.1-.3 1.4-.8l3.35-5.76c.3-.5.3-1.1 0-1.6zm-10.4-8.98h2l5.7 9.8h-2zM8.82 17.5l-2.85-4.9 5.7-9.8 2.85 4.9zm11.36 0h-13.4l2.85-4.9h13.4z" />
                      </svg>
                      Google Drive Video
                    </button>
                  </div>

                  {form.media_url && (
                    <div className="mt-2 p-2 bg-white border border-border rounded flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {form.media_url.includes('google.com') ? (
                          <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-emerald-600 fill-current" viewBox="0 0 24 24">
                              <path d="M19.43 12.98l-6.7-11.53c-.3-.5-.8-.8-1.4-.8h.02c-.6 0-1.1.3-1.4.8L3.25 12.98c-.3.5-.3 1.1 0 1.6l3.35 5.76c.3.5.8.8 1.4.8h13.4c.6 0 1.1-.3 1.4-.8l3.35-5.76c.3-.5.3-1.1 0-1.6zm-10.4-8.98h2l5.7 9.8h-2zM8.82 17.5l-2.85-4.9 5.7-9.8 2.85 4.9zm11.36 0h-13.4l2.85-4.9h13.4z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded border border-border overflow-hidden bg-subtle shrink-0">
                            {form.media_url.endsWith('.mp4') || form.media_url.endsWith('.mov') || form.media_url.includes('video') ? (
                              <video src={form.media_url} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={form.media_url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] text-text-secondary truncate font-mono max-w-[150px]">{form.media_url}</p>
                          <p className="text-[8px] text-text-muted">Sumber: {form.media_url.includes('google.com') ? 'Google Drive' : 'PC (Supabase)'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, media_url: '' }))}
                        className="text-text-muted hover:text-error transition-colors p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Real-time Phone Mockup Preview */}
                {form.media_url && (
                  <div className="mt-2.5 p-2 bg-subtle/50 rounded-lg border border-border/60">
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-2">Live Preview Mockup</p>
                    <div className="relative w-full max-w-[160px] mx-auto aspect-[9/16] bg-zinc-950 rounded-lg overflow-hidden border border-border/80 shadow-md text-white font-sans">
                      
                      {/* Instagram Story / Snapgram Specific Mockup UI */}
                      {platform === 'instagram' && form.is_story ? (
                        <>
                          {/* Header */}
                          <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between z-10 text-[8px] drop-shadow-md">
                            <div className="flex items-center gap-1">
                              <div className="w-3.5 h-3.5 rounded-full bg-accent flex items-center justify-center font-bold text-[6px] border border-white/20">
                                SJM
                              </div>
                              <span className="font-semibold truncate max-w-[60px]">sjmtransportasi</span>
                              <span className="opacity-60">10m</span>
                            </div>
                            <div className="flex gap-0.5">
                              <div className="w-0.5 h-0.5 bg-white rounded-full" />
                              <div className="w-0.5 h-0.5 bg-white rounded-full" />
                              <div className="w-0.5 h-0.5 bg-white rounded-full" />
                            </div>
                          </div>
                          {/* Progress Line */}
                          <div className="absolute top-0.5 left-1.5 right-1.5 h-0.5 bg-white/30 rounded-full overflow-hidden z-10">
                            <div className="h-full w-2/3 bg-white" />
                          </div>
                        </>
                      ) : (
                        /* Feed / Reels Mockup Overlay */
                        <div className="absolute bottom-12 left-1.5 right-1.5 z-10 text-[8px] drop-shadow-md">
                          <p className="font-semibold">@sjmtransportasi</p>
                          <p className="opacity-90 line-clamp-1 mt-0.5 text-[7px]">{form.caption_override || video.caption_default || video.judul}</p>
                        </div>
                      )}

                      {/* Content Media Render */}
                      {form.media_url.includes('google.com') ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-zinc-900 text-center gap-1.5">
                          <svg className="w-6 h-6 text-emerald-500 fill-current" viewBox="0 0 24 24">
                            <path d="M19.43 12.98l-6.7-11.53c-.3-.5-.8-.8-1.4-.8h.02c-.6 0-1.1.3-1.4.8L3.25 12.98c-.3.5-.3 1.1 0 1.6l3.35 5.76c.3.5.8.8 1.4.8h13.4c.6 0 1.1-.3 1.4-.8l3.35-5.76c.3-.5.3-1.1 0-1.6zm-10.4-8.98h2l5.7 9.8h-2zM8.82 17.5l-2.85-4.9 5.7-9.8 2.85 4.9zm11.36 0h-13.4l2.85-4.9h13.4z" />
                          </svg>
                          <span className="text-[8px] text-zinc-300 font-medium">Link Google Drive</span>
                          <span className="text-[6px] text-zinc-400 truncate max-w-[100px] font-mono">{form.media_url}</span>
                        </div>
                      ) : form.media_url.endsWith('.mp4') || form.media_url.endsWith('.mov') || form.media_url.includes('video') ? (
                        <video src={form.media_url} className="w-full h-full object-cover animate-pulse" muted playsInline />
                      ) : (
                        <img src={form.media_url} alt="" className="w-full h-full object-cover" />
                      )}

                      {/* Footer */}
                      <div className="absolute bottom-2 left-1.5 right-1.5 flex items-center justify-between z-10 text-[7px] opacity-75">
                        <div className="border border-white/35 rounded px-1.5 py-0.5 bg-black/20 truncate max-w-[80px]">
                          {platform === 'instagram' && form.is_story ? 'Kirim pesan...' : 'Komentar...'}
                        </div>
                        <div className="flex gap-1.5">
                          <span>❤️</span>
                          <span>✈️</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Caption Override</Label>
                  <Textarea
                    className="mt-1 text-xs"
                    rows={2}
                    placeholder={video.caption_default ? `Inherit Caption Master: "${video.caption_default}"` : 'Kosongkan untuk pakai caption master'}
                    value={form.caption_override}
                    onChange={(e) => setForm((f) => ({ ...f, caption_override: e.target.value }))}
                  />
                </div>

                {/* Sebarkan juga ke platform lain (Multi-Post) */}
                {!editingId && (
                  <div className="space-y-1.5 border-t border-border/40 pt-2.5">
                    <Label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Sebarkan juga ke platform lain (Multi-Post) ⚡</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {PLATFORMS.filter(p => p !== platform).map((p) => {
                        const isCrossSelected = form.cross_platforms?.includes(p)
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setForm((f) => {
                                const current = f.cross_platforms || []
                                const next = current.includes(p) ? current.filter(x => x !== p) : [...current, p]
                                return { ...f, cross_platforms: next }
                              })
                            }}
                            className={cn(
                              "px-2.5 py-1 text-[10px] rounded-full border transition-all font-semibold flex items-center gap-1",
                              isCrossSelected
                                ? "bg-accent border-accent text-white shadow-xs"
                                : "bg-white border-border text-text-secondary hover:bg-subtle"
                            )}
                          >
                            <span>{isCrossSelected ? '✓' : '+'}</span>
                            <span>{PLATFORM_LABELS[p]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 h-8 text-xs bg-accent hover:bg-accent/90" onClick={() => addSchedule(platform)}>{editingId ? 'Update Jadwal' : 'Simpan Jadwal'}</Button>
                  <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => { setAdding(null); setEditingId(null); setForm({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '', media_url: '', is_story: false, cross_platforms: [] }) }}>Batal</Button>
                </div>
              </div>
            )}

            <div className="divide-y divide-border" onClick={(e) => e.stopPropagation()}>
              {platformSchedules.length === 0 && adding !== platform && (
                <p className="px-3 py-3 text-xs text-text-muted">Belum ada jadwal</p>
              )}
              {platformSchedules.map((s: {
                id: string; platform: string; tanggal_tayang: string; jam_post?: string; status: string
                url_post?: string; social_account_id?: string | null; caption_override?: string | null
                social_accounts?: { handle: string; is_connected?: boolean | null } | null
                is_story?: boolean | null
                media_url?: string | null
              }) => (
                <div key={s.id} className="px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-text-primary">
                      📅 {s.tanggal_tayang}{s.jam_post ? ` · 🕐 ${s.jam_post.slice(0, 5)}` : ''}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {s.is_story && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                          📸 Snapgram
                        </span>
                      )}
                      {s.social_accounts?.is_connected && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                          Auto
                        </span>
                      )}
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                        s.status === 'posted' ? 'bg-green-100 text-success' : s.status === 'failed' ? 'bg-red-100 text-error' : 'bg-accent-light text-accent')}>
                        {s.status === 'posted' ? 'Tayang' : s.status === 'failed' ? 'Gagal' : 'Terjadwal'}
                      </span>
                      {s.social_accounts?.is_connected && s.status !== 'posted' && (
                        <button
                          disabled={publishingId === s.id}
                          onClick={() => handleForcePublish(s.id)}
                          className="text-[10px] text-emerald-600 font-bold hover:underline"
                        >
                          {publishingId === s.id ? 'Posting...' : '⚡ Posting Sekarang'}
                        </button>
                      )}
                      <button onClick={() => startEdit(s)} className="text-[10px] text-accent hover:underline">Edit</button>
                      <button onClick={() => deleteSchedule(s.id)} className="text-[10px] text-error hover:underline">Hapus</button>
                    </div>
                  </div>
                  {s.social_accounts && <p className="text-[10px] text-text-muted mt-0.5">@{s.social_accounts.handle}</p>}
                  
                  {s.media_url && (
                    <div className="flex items-center gap-2 mt-1.5 p-1.5 bg-subtle rounded border border-border/30 max-w-sm">
                      <div className="w-8 h-8 rounded border border-border/20 overflow-hidden bg-white shrink-0">
                        {s.media_url.includes('google.com') ? (
                          <div className="w-full h-full flex items-center justify-center bg-emerald-50">
                            <svg className="w-3.5 h-3.5 text-emerald-600 fill-current" viewBox="0 0 24 24">
                              <path d="M19.43 12.98l-6.7-11.53c-.3-.5-.8-.8-1.4-.8h.02c-.6 0-1.1.3-1.4.8L3.25 12.98c-.3.5-.3 1.1 0 1.6l3.35 5.76c.3.5.8.8 1.4.8h13.4c.6 0 1.1-.3 1.4-.8l3.35-5.76c.3-.5.3-1.1 0-1.6zm-10.4-8.98h2l5.7 9.8h-2zM8.82 17.5l-2.85-4.9 5.7-9.8 2.85 4.9zm11.36 0h-13.4l2.85-4.9h13.4z" />
                            </svg>
                          </div>
                        ) : s.media_url.endsWith('.mp4') || s.media_url.endsWith('.mov') || s.media_url.includes('video') ? (
                          <video src={s.media_url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={s.media_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] text-text-muted">File Media Terjadwal:</p>
                        <a href={s.media_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent font-mono truncate block hover:underline">
                          {s.media_url.includes('google.com') ? 'Google Drive Link ↗' : 'Download Media ↗'}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {s.url_post ? (
                    <div className="space-y-3 mt-2">
                      <PlatformEmbed url={s.url_post} platform={platform} />
                      
                      {/* Integrated Performance Form */}
                      <PlatformPerformanceForm
                        platform={platform}
                        videoId={video.id}
                        existingRecord={platformPerf}
                        onSaveSuccess={refetchPerformance}
                      />
                    </div>
                  ) : s.status !== 'posted' && (
                    <div className="flex gap-1.5 mt-1">
                      <Input
                        type="url"
                        placeholder="URL post (setelah tayang)"
                        className="h-7 text-xs flex-1"
                        value={urlPostInputs[s.id] ?? ''}
                        onChange={(e) => setUrlPostInputs((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') markPosted(s.id, urlPostInputs[s.id] ?? '') }}
                      />
                      <Button size="sm" className="h-7 text-xs bg-accent hover:bg-accent/90" onClick={() => markPosted(s.id, urlPostInputs[s.id] ?? '')}>Tayang</Button>
                    </div>
                  )}
                </div>
              ))}
              {platformSchedules.length > 0 && adding !== platform && (
                <div className="px-3 py-2 bg-surface/50 border-t border-border flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-border bg-white hover:bg-subtle text-accent font-medium"
                    onClick={(e) => {
                      e.stopPropagation()
                      setAdding(platform)
                      setEditingId(null)
                      setForm({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '', media_url: '', is_story: false, cross_platforms: [] })
                    }}
                  >
                    <Plus className="w-3 h-3 text-accent" /> + Tambah Tanggal Tayang
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Script Tab ──────────────────────────────────────────────────────────────

function ScriptTab({ video }: { video: VideoWithSchedules }) {
  const queryClient = useQueryClient()

  async function handleSave(blocks: ScriptBlock[]) {
    const supabase = createClient()
    const { error } = await supabase
      .from('videos')
      .update({ script_blocks: blocks, updated_at: new Date().toISOString() })
      .eq('id', video.id)
    if (error) toast.error(error.message)
    else queryClient.invalidateQueries({ queryKey: ['video-detail', video.id] })
  }

  return (
    <ScriptBlocks
      videoId={video.id}
      videoTitle={video.judul}
      initialBlocks={(video as any).script_blocks ?? []}
      onSave={handleSave}
    />
  )
}

// ─── Checklist Section ────────────────────────────────────────────────────────

function ChecklistSection({ title, table, videoId }: {
  title: string
  table: 'shooting_checklists' | 'editing_checklists'
  videoId: string
}) {
  const queryClient = useQueryClient()
  const [newItem, setNewItem] = useState('')
  const [adding, setAdding] = useState(false)

  const { data: items = [] } = useQuery({
    queryKey: [table, videoId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from(table).select('*').eq('video_id', videoId).order('sort_order')
      return data ?? []
    },
  })

  async function toggle(id: string, completed: boolean) {
    const supabase = createClient()
    await supabase.from(table).update({ completed: !completed }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: [table, videoId] })
  }

  async function addItem() {
    if (!newItem.trim()) return
    setAdding(true)
    const supabase = createClient()
    await supabase.from(table).insert({ video_id: videoId, title: newItem.trim(), sort_order: items.length })
    queryClient.invalidateQueries({ queryKey: [table, videoId] })
    setNewItem('')
    setAdding(false)
  }

  async function deleteItem(id: string) {
    const supabase = createClient()
    await supabase.from(table).delete().eq('id', id)
    queryClient.invalidateQueries({ queryKey: [table, videoId] })
  }

  const done = items.filter((i: { completed: boolean }) => i.completed).length

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
        <h4 className="text-xs font-semibold text-text-primary">{title}</h4>
        <span className="text-[10px] text-text-muted font-medium">{done}/{items.length} selesai</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((item: { id: string; title: string; completed: boolean }) => (
          <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-subtle group">
            <button
              onClick={() => toggle(item.id, item.completed)}
              className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                item.completed ? 'bg-success border-success' : 'border-border hover:border-accent')}
            >
              {item.completed && <Check className="w-2.5 h-2.5 text-white" />}
            </button>
            <span className={cn('flex-1 text-xs', item.completed && 'line-through text-text-muted')}>{item.title}</span>
            <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all p-0.5">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 px-3 py-1 bg-subtle/40">
          <input
            placeholder="Tambah item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="flex-1 bg-transparent border-0 outline-none text-xs h-7 placeholder:text-text-muted/60"
          />
          <button onClick={addItem} disabled={!newItem.trim() || adding} className="h-5 w-5 rounded hover:bg-subtle flex items-center justify-center text-text-muted">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Preview Card Visualizer ──────────────────────────────────────────────────

function PreviewCard({ platform, data, video }: { platform: Platform; data: any; video: any }) {
  const views = Number(data?.views ?? 0)
  const likes = Number(data?.likes ?? 0)
  const comments = Number(data?.comments ?? 0)
  const shares = Number(data?.shares ?? 0)
  const saves = Number(data?.saves ?? 0)

  const showSaves = platform === 'tiktok' || platform === 'instagram'

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="h-1 bg-accent" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider', getPlatformBadge(platform))}>
            {PLATFORM_LABELS[platform]}
          </span>
          <span className="text-[10px] text-text-muted">Live Preview Card</span>
        </div>
        <div className="aspect-video bg-subtle rounded-lg overflow-hidden flex items-center justify-center border border-border/20">
          {video?.thumbnail_url ? (
            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Video className="w-8 h-8 text-border" />
          )}
        </div>
        <p className="font-heading font-bold text-text-primary text-xs line-clamp-2 leading-snug">{video?.judul}</p>
        <div className="grid grid-cols-4 gap-1 pt-2.5 border-t border-border/40 text-center">
          <div>
            <p className="font-heading font-bold text-text-primary text-[11px]">{formatNumber(views)}</p>
            <p className="text-[8px] text-text-muted uppercase">Views</p>
          </div>
          <div>
            <p className="font-heading font-bold text-text-primary text-[11px]">{formatNumber(likes)}</p>
            <p className="text-[8px] text-text-muted uppercase">Likes</p>
          </div>
          <div>
            <p className="font-heading font-bold text-text-primary text-[11px]">{formatNumber(comments)}</p>
            <p className="text-[8px] text-text-muted uppercase">Komentar</p>
          </div>
          <div>
            <p className="font-heading font-bold text-text-primary text-[11px]">{formatNumber(showSaves ? saves : shares)}</p>
            <p className="text-[8px] text-text-muted uppercase">{showSaves ? 'Saves' : 'Shares'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Perencanaan Tab (Unified) ────────────────────────────────────────────────

function PerencanaanTab({ video }: { video: VideoWithSchedules }) {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  const [saving, setSaving] = useState(false)
  const [temas, setTemas] = useState<string[]>(video.temas ?? (video.tema ? [video.tema] : []))
  const [form, setForm] = useState({
    no_video: video.no_video ?? '',
    judul: video.judul ?? '',
    format: video.format ?? '',
    tanggal_shooting: video.tanggal_shooting ?? '',
    deadline_posting: video.deadline_posting ?? '',
    storage_bahan: video.storage_bahan ?? '',
    storage_video: video.storage_video ?? '',
    google_drive_link: video.google_drive_link ?? '',
    caption_default: video.caption_default ?? '',
    pilar_konten: video.pilar_konten ?? '',
  })

  useEffect(() => {
    setForm({
      no_video: video.no_video ?? '',
      judul: video.judul ?? '',
      format: video.format ?? '',
      tanggal_shooting: video.tanggal_shooting ?? '',
      deadline_posting: video.deadline_posting ?? '',
      storage_bahan: video.storage_bahan ?? '',
      storage_video: video.storage_video ?? '',
      google_drive_link: video.google_drive_link ?? '',
      caption_default: video.caption_default ?? '',
      pilar_konten: video.pilar_konten ?? '',
    })
    setTemas(video.temas ?? (video.tema ? [video.tema] : []))
  }, [video])

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const payload: Record<string, unknown> = {
      no_video: form.no_video ? form.no_video.trim() : null,
      judul: form.judul || null,
      format: form.format || null,
      temas,
      tema: temas[0] ?? null,
      tanggal_shooting: form.tanggal_shooting || null,
      deadline_posting: form.deadline_posting || null,
      storage_bahan: form.storage_bahan || null,
      storage_video: form.storage_video || null,
      google_drive_link: form.google_drive_link || null,
      caption_default: form.caption_default || null,
      pilar_konten: form.pilar_konten || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('videos').update(payload).eq('id', video.id)
    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Perubahan perencanaan tersimpan!')
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['video-detail', video.id] })
    }
  }

  const isFoto = (video as any).content_type === 'foto'

  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="font-heading font-semibold text-text-primary text-sm border-b border-border pb-2.5 mb-4">Informasi Konten</h3>
          <InfoTab form={form} setForm={setForm} temas={temas} setTemas={setTemas} workspaceId={workspaceId} isFoto={isFoto} />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-text-primary text-sm border-b border-border pb-2.5 mb-4">Aset Produksi</h3>
          <ProductionAssets form={form} setForm={setForm} isFoto={isFoto} />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 h-10 text-sm font-semibold bg-accent hover:bg-accent/90">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? 'Menyimpan...' : 'Simpan Perencanaan & Aset'}
      </Button>
    </div>
  )
}

// Phase 5 refinement — the single "status utama" the user reads at a
// glance, plus the lifecycle stepper. Brand/Deal/Payment lines are shown
// only when that data actually exists — never an empty field.
function ContentLifecycleHeader({
  videoNo, judul, stage, brandName, dealTitle, paymentStatus, invoicedTotal, paidTotal,
}: {
  videoNo?: string | null
  judul: string
  stage: import('@/lib/operations/rules').ContentLifecycleStage
  brandName?: string | null
  dealTitle?: string | null
  paymentStatus?: import('@/lib/utils/financial').FinancialStatus | null
  invoicedTotal: number
  paidTotal: number
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <ContentIdentity
          videoNo={videoNo}
          judul={judul}
          className="font-heading font-bold text-lg text-text-primary"
          numberClassName="font-mono text-text-muted text-sm"
        />
        <Badge variant="outline" className={cn('text-xs font-bold px-3 py-1', LIFECYCLE_CONFIG[stage].badgeClass)}>
          {LIFECYCLE_CONFIG[stage].label}
        </Badge>
      </div>

      {(brandName || dealTitle || paymentStatus) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-border/60">
          {brandName && (
            <div className="pt-3">
              <span className="text-text-muted">Brand</span>
              <p className="font-semibold text-sm text-text-primary mt-0.5">{brandName}</p>
            </div>
          )}
          {dealTitle && (
            <div className="pt-3">
              <span className="text-text-muted">Deal</span>
              <p className="font-semibold text-sm text-text-primary mt-0.5">{dealTitle}</p>
            </div>
          )}
          {paymentStatus && (
            <div className="pt-3">
              <span className="text-text-muted">Pembayaran</span>
              <div className="mt-0.5">
                <Badge variant="outline" className={cn('text-[10px] font-bold', FINANCIAL_STATUS_CONFIG[paymentStatus].badgeClass)}>
                  {FINANCIAL_STATUS_CONFIG[paymentStatus].label}
                </Badge>
              </div>
              {invoicedTotal > 0 && (
                <p className="text-[11px] text-text-muted mt-1 font-mono">{formatRupiah(paidTotal)} / {formatRupiah(invoicedTotal)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ContentBrandTab({ video }: { video: VideoWithSchedules }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [connectOpen, setConnectOpen] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [selectedDealId, setSelectedDealId] = useState('')
  const [selectedDeliverableId, setSelectedDeliverableId] = useState('')
  const [saving, setSaving] = useState(false)

  // Approval status update form
  const [newApprovalStatus, setNewApprovalStatus] = useState(video.approval_status || 'waiting_approval')
  const [approvalNote, setApprovalNote] = useState('')
  const [updatingApproval, setUpdatingApproval] = useState(false)

  // Publishing status — Phase 5, Part B: same reasoning as Approval but
  // with no history table (none exists for this dimension, and Part O
  // forbids inventing a second status/history table). Production status
  // is edited exclusively by clicking the lifecycle stepper in the
  // always-visible header (Phase 03E, corrected) — no second write
  // surface for that field here.
  const [newPublishingStatus, setNewPublishingStatus] = useState(video.publishing_status || 'not_scheduled')
  const [updatingPublishing, setUpdatingPublishing] = useState(false)
  const [workflowDetailOpen, setWorkflowDetailOpen] = useState(false)

  // Query linked deliverables for this video
  const { data: linkedJunctions = [] } = useQuery({
    queryKey: ['content-brand-junctions', video.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('content_deliverables')
        .select('*, deal_deliverables(*, deals(*, brands(*)))')
        .eq('content_id', video.id)
      if (error) console.error('Failed to load content-deliverable junctions:', error)
      return data ?? []
    },
  })

  // Query approval history
  const { data: approvalHistory = [] } = useQuery({
    queryKey: ['approval-history', video.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('content_approval_history')
        .select('*')
        .eq('content_id', video.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  // Query direct brand if video.brand_id exists
  const { data: directBrand } = useQuery({
    queryKey: ['direct-brand', video.brand_id],
    enabled: !!video.brand_id,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('brands').select('*').eq('id', video.brand_id).single()
      return data
    },
  })

  // Query direct deal if video.deal_id exists (Phase 3, Part G: Deal -> Brand
  // is authoritative when a Deal exists, distinct from the legacy brand_id
  // shortcut and from whichever deal a linked deliverable happens to belong
  // to — none of these are reconciled by a DB constraint, so we surface any
  // disagreement rather than silently picking one).
  const { data: directDeal } = useQuery({
    queryKey: ['direct-deal', video.deal_id],
    enabled: !!video.deal_id,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('deals').select('*, brands(*)').eq('id', video.deal_id).single()
      return data
    },
  })

  // Phase 5 refinement — real publishing schedule rows for THIS video, the
  // same shared signal Calendar/Action Center use to compute lifecycle
  // (never trust videos.status='live' alone — see rules.ts).
  const { data: scheduleRows = [] } = useQuery({
    queryKey: ['content-schedule-statuses', video.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('video_platform_schedules').select('status').eq('video_id', video.id)
      if (error) { console.error('Failed to load schedule statuses:', error); return [] }
      return data ?? []
    },
  })
  const scheduleStatuses = scheduleRows.map((s: any) => s.status)
  const isFullyPublished = isPublishingFullyDone(scheduleStatuses)
  const hasActiveSchedule = scheduleStatuses.length > 0

  // Phase 5 refinement — Payment status is computed, never user-entered.
  // Same centralized financial rule Deal Detail already uses (Phase 3.5).
  const { data: dealFinancials } = useQuery({
    queryKey: ['content-deal-financials', video.deal_id],
    enabled: !!video.deal_id,
    queryFn: async () => {
      const supabase = createClient()
      const [{ data: invoices, error: invErr }, { data: payments, error: payErr }] = await Promise.all([
        supabase.from('invoices').select('id, total, due_date, status').eq('deal_id', video.deal_id),
        supabase.from('deal_payments').select('amount, status').eq('deal_id', video.deal_id),
      ])
      if (invErr) console.error('Failed to load deal invoices for payment status:', invErr)
      if (payErr) console.error('Failed to load deal payments for payment status:', payErr)
      return { invoices: invoices ?? [], payments: payments ?? [] }
    },
  })

  // Query available brands for connect dialog
  const { data: allBrands = [] } = useQuery({
    queryKey: ['all-brands-select', video.workspace_id],
    enabled: connectOpen && !!video.workspace_id,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('brands').select('id, name, nama_brand').eq('workspace_id', video.workspace_id)
      return data ?? []
    },
  })

  const { data: brandDeals = [] } = useQuery({
    queryKey: ['brand-deals-select', selectedBrandId],
    enabled: connectOpen && !!selectedBrandId,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('deals').select('id, title, nama_campaign').eq('brand_id', selectedBrandId)
      return data ?? []
    },
  })

  const { data: dealDeliverables = [] } = useQuery({
    queryKey: ['deal-deliverables-select', selectedDealId],
    enabled: connectOpen && !!selectedDealId,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('deal_deliverables').select('id, name').eq('deal_id', selectedDealId)
      return data ?? []
    },
  })

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBrandId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error: videoErr } = await supabase.from('videos').update({
        brand_id: selectedBrandId,
        deal_id: selectedDealId || null,
        is_endorsement: true,
      }).eq('id', video.id)

      if (videoErr) {
        console.error('Failed to link video to brand/deal:', videoErr)
        throw videoErr
      }

      // Deliverable link is a separate write — check it independently so a
      // failure here can never be reported as overall success.
      if (selectedDeliverableId) {
        const { error: delErr } = await supabase.from('content_deliverables').insert({
          content_id: video.id,
          deliverable_id: selectedDeliverableId,
        })
        if (delErr) {
          console.error('Failed to link content to deliverable:', delErr)
          if (delErr.code === '23505') {
            // UNIQUE(content_id, deliverable_id) — already linked, not a real failure.
            toast.success('Brand & Deal terhubung. Konten ini sudah tertaut ke deliverable tersebut sebelumnya.')
          } else {
            toast.warning('Brand & Deal terhubung, tapi gagal menghubungkan ke Deliverable. Coba lagi lewat "Hubungkan Deliverable Lain".')
          }
          queryClient.invalidateQueries({ queryKey: ['content-brand-junctions', video.id] })
          queryClient.invalidateQueries({ queryKey: ['video-detail', video.id] })
          setConnectOpen(false)
          return
        }
      }

      toast.success('Konten berhasil dihubungkan ke Brand!')
      queryClient.invalidateQueries({ queryKey: ['content-brand-junctions', video.id] })
      queryClient.invalidateQueries({ queryKey: ['video-detail', video.id] })
      setConnectOpen(false)
    } catch (err) {
      console.error('Failed to connect content to brand:', err)
      toast.error('Gagal menghubungkan brand')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlinkDeliverable(junctionId: string) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('content_deliverables').delete().eq('id', junctionId)
      if (error) throw error
      toast.success('Tautan deliverable dilepas')
      queryClient.invalidateQueries({ queryKey: ['content-brand-junctions', video.id] })
    } catch (err) {
      toast.error('Gagal melepas tautan deliverable')
    }
  }

  async function handleUpdateApprovalStatus(e: React.FormEvent) {
    e.preventDefault()
    setUpdatingApproval(true)
    try {
      const supabase = createClient()
      const isWaiting = newApprovalStatus === 'waiting_approval'
      const payload: Record<string, unknown> = {
        approval_status: newApprovalStatus,
      }
      if (isWaiting) {
        payload.approval_waiting_since = new Date().toISOString()
      }

      const { error } = await supabase.from('videos').update(payload).eq('id', video.id)
      if (error) throw error

      // Log to approval history (never overwrite past records)
      await supabase.from('content_approval_history').insert({
        content_id: video.id,
        action_status: newApprovalStatus,
        notes: approvalNote.trim() || null,
      })

      toast.success('Status persetujuan berhasil diupdate!')
      queryClient.invalidateQueries({ queryKey: ['video-detail', video.id] })
      queryClient.invalidateQueries({ queryKey: ['approval-history', video.id] })
      setApprovalNote('')
    } catch (err) {
      toast.error('Gagal mengupdate status persetujuan')
    } finally {
      setUpdatingApproval(false)
    }
  }

  async function handleUpdatePublishingStatus(next: string) {
    setNewPublishingStatus(next)
    setUpdatingPublishing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('videos').update({ publishing_status: next }).eq('id', video.id)
      if (error) {
        console.error('Failed to update publishing_status:', error)
        throw error
      }
      toast.success('Publishing status diperbarui')
      queryClient.invalidateQueries({ queryKey: ['video-detail', video.id] })
    } catch (err) {
      toast.error('Gagal mengupdate publishing status')
      setNewPublishingStatus(video.publishing_status || 'not_scheduled')
    } finally {
      setUpdatingPublishing(false)
    }
  }

  const primaryJunction = linkedJunctions[0] as any
  const deliverable = primaryJunction?.deal_deliverables
  // Deal -> Brand is authoritative when a Deal exists directly on the
  // video (Phase 3, Part G). Fall back to whichever deal a linked
  // deliverable happens to belong to only if the video has no direct deal_id.
  const deal = directDeal || deliverable?.deals
  const brand = deal?.brands || directBrand

  const isOrganic = !brand && linkedJunctions.length === 0

  // Part G: brand_id, deal_id, and whatever deal a linked deliverable
  // belongs to can all disagree — nothing in the schema reconciles them.
  // Surface it, never silently overwrite any of them.
  const authoritativeBrandId = deal?.brands?.id || directBrand?.id
  const directMismatch = Boolean(
    directBrand && directDeal && directDeal.brand_id && directBrand.id !== directDeal.brand_id
  )
  const deliverableMismatch = Boolean(
    authoritativeBrandId &&
    linkedJunctions.some((j: any) => {
      const jBrandId = j.deal_deliverables?.deals?.brand_id
      return jBrandId && jBrandId !== authoritativeBrandId
    })
  )
  const brandDealMismatch = directMismatch || deliverableMismatch

  const prodStatus = video.production_status || video.status || 'idea'
  const appStatus = video.approval_status || (isOrganic ? 'not_required' : 'not_submitted')
  const pubStatus = video.publishing_status || (video.status === 'live' ? 'published' : video.status === 'scheduled' ? 'scheduled' : 'not_scheduled')

  const agingText = getApprovalAgingText(video.approval_waiting_since)
  const severity = getApprovalSeverity(video.approval_waiting_since)

  // Phase 5 refinement — the single "where is this content" status the
  // user actually looks at. Computed, never a field the user sets directly.
  const lifecycleStage = computeContentLifecycleStage(
    { status: video.status, production_status: prodStatus, approval_status: appStatus },
    isFullyPublished,
    hasActiveSchedule
  )

  // Payment status — computed from Invoice + deal_payments, never entered
  // manually. Only meaningful when this content has a Deal at all.
  const invoicesForDeal = dealFinancials?.invoices ?? []
  const paymentsForDeal = dealFinancials?.payments ?? []
  const invoicedTotal = invoicesForDeal.filter((i: any) => i.status !== 'cancelled').reduce((sum: number, i: any) => sum + Number(i.total || 0), 0)
  const paidTotal = paymentsForDeal.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
  const hasOverdueInvoice = invoicesForDeal.some((i: any) => i.status !== 'paid' && i.status !== 'cancelled' && isInvoiceOverdue(i, 0))
  const paymentStatus = deal?.id
    ? computeFinancialStatus({ dealValue: Number(deal?.total_value || 0), invoicedTotal, paidTotal, hasOverdueInvoice })
    : null

  if (isOrganic) {
    return (
      <div className="space-y-6">
        <ContentLifecycleHeader
          videoNo={video.no_video}
          judul={video.judul}
          stage={lifecycleStage}
          brandName={null}
          dealTitle={null}
          paymentStatus={null}
          invoicedTotal={0}
          paidTotal={0}
        />
        <div className="bg-white border border-border rounded-xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
            <Handshake className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <Badge variant="outline" className="text-xs font-semibold text-slate-600 bg-slate-50">Konten Organik</Badge>
            <h3 className="font-heading font-bold text-base text-text-primary mt-2">Konten Belum Terhubung ke Brand</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">Konten ini saat ini berstatus organik (non-brand). Kamu dapat menghubungkan konten ini ke deal & deliverable brand yang aktif.</p>
          </div>
          <Button onClick={() => setConnectOpen(true)} className="bg-accent hover:bg-accent/90 text-xs font-semibold gap-1.5 h-9 px-4">
            <Plus className="w-4 h-4" />
            <span>+ Hubungkan ke Brand</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ContentLifecycleHeader
        videoNo={video.no_video}
        judul={video.judul}
        stage={lifecycleStage}
        brandName={brand?.name || brand?.nama_brand || null}
        dealTitle={deal?.title || deal?.nama_campaign || null}
        paymentStatus={paymentStatus}
        invoicedTotal={invoicedTotal}
        paidTotal={paidTotal}
      />

      {/* Part G: brand_id vs deal_id disagreement — surfaced, never auto-fixed */}
      {brandDealMismatch && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-900">Ada ketidakcocokan Brand pada konten ini</p>
            <p className="text-amber-800 mt-0.5">
              {directMismatch && (
                <>Konten ini terhubung langsung ke <strong>{directBrand?.name || directBrand?.nama_brand}</strong>, tapi Deal-nya milik <strong>{directDeal?.brands?.name || directDeal?.brands?.nama_brand}</strong>. </>
              )}
              {deliverableMismatch && (
                <>Salah satu Deliverable yang tertaut berasal dari Deal milik brand lain. </>
              )}
              Ini tidak diperbaiki otomatis — silakan tinjau lewat tombol "Hubungkan Deliverable Lain" di bawah.
            </p>
          </div>
        </div>
      )}

      {/* Derived Operational Banner: READY TO PUBLISH — same signal as the header badge */}
      {lifecycleStage === 'ready_to_publish' && (
        <div className="bg-emerald-500 text-white rounded-xl p-4 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 bg-white text-emerald-600 rounded-full p-0.5" />
            <div>
              <p className="font-bold text-sm">✓ Approved → Siap Tayang</p>
              <p className="text-xs text-emerald-100">Produksi & persetujuan brand telah selesai! Konten siap dijadwalkan / ditayangkan.</p>
            </div>
          </div>
          <Badge className="bg-white text-emerald-800 font-bold uppercase text-[10px]">Ready</Badge>
        </div>
      )}

      {/* Detail Workflow — collapsible supporting detail behind the main lifecycle status */}
      <div className="bg-white border border-border rounded-xl shadow-xs overflow-hidden">
        <button
          onClick={() => setWorkflowDetailOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface transition-colors"
        >
          <span className="text-xs font-bold text-text-primary">Detail Workflow</span>
          {workflowDetailOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
        </button>
        {workflowDetailOpen && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 pt-0">
        {/* Dimension 1: Production Status — read-only here; edited by
            clicking the lifecycle stepper in the always-visible header. */}
        <div className="bg-white border border-border rounded-xl p-4 space-y-2 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">1. Production Status</span>
          <div className="flex items-center justify-between pt-1">
            <Badge variant="outline" className={cn('text-xs font-bold capitalize', PRODUCTION_STATUS_CONFIG[prodStatus]?.badgeClass)}>
              {PRODUCTION_STATUS_CONFIG[prodStatus]?.label || prodStatus}
            </Badge>
          </div>
          <p className="text-[10px] text-text-muted">Ubah lewat kontrol status di bagian atas halaman.</p>
        </div>

        {/* Dimension 2: Approval Status */}
        <div className="bg-white border border-border rounded-xl p-4 space-y-2 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">2. Approval Status</span>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn('text-xs font-bold capitalize', APPROVAL_STATUS_CONFIG[appStatus]?.badgeClass)}>
                {APPROVAL_STATUS_CONFIG[appStatus]?.label || appStatus}
              </Badge>
            </div>
            {appStatus === 'waiting_approval' && (
              <p className={cn('text-[11px] font-mono font-semibold mt-1', severity === 'overdue' ? 'text-rose-600 font-bold' : severity === 'attention' ? 'text-amber-600' : 'text-text-muted')}>
                ⏳ {agingText}
              </p>
            )}
          </div>
        </div>

        {/* Dimension 3: Publishing Status */}
        <div className="bg-white border border-border rounded-xl p-4 space-y-2 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">3. Publishing Status</span>
          <div className="flex items-center justify-between pt-1">
            <Badge variant="outline" className={cn('text-xs font-bold capitalize', PUBLISHING_STATUS_CONFIG[pubStatus]?.badgeClass)}>
              {PUBLISHING_STATUS_CONFIG[pubStatus]?.label || pubStatus}
            </Badge>
            {video.deadline_posting && <span className="text-[10px] font-mono text-text-muted">DL: {formatDate(video.deadline_posting)}</span>}
          </div>
          <Select value={newPublishingStatus} onValueChange={handleUpdatePublishingStatus} disabled={updatingPublishing}>
            <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_scheduled" className="text-xs">Not Scheduled</SelectItem>
              <SelectItem value="scheduled" className="text-xs">Scheduled</SelectItem>
              <SelectItem value="published" className="text-xs">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
        )}
      </div>

      {/* Collaboration & Deliverable Summary Card */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-6">
        {/* Section 1: COLLABORATION */}
        <div className="space-y-2 border-b border-border pb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Section 1 — Collaboration</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
            <div>
              <span className="text-text-muted">Brand:</span>
              <p className="font-bold text-sm text-text-primary mt-0.5">{brand?.name || brand?.nama_brand || 'Brand'}</p>
            </div>
            <div>
              <span className="text-text-muted">Deal / Campaign:</span>
              <p className="font-bold text-sm text-text-primary mt-0.5">{deal?.title || deal?.nama_campaign || '—'}</p>
            </div>
            <div>
              <span className="text-text-muted">Status Deal:</span>
              <div className="mt-0.5">
                <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800">
                  {deal?.status || 'Confirmed'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: DELIVERABLE */}
        <div className="space-y-2 border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Section 2 — Deliverable {linkedJunctions.length > 1 && `(${linkedJunctions.length})`}
            </span>
          </div>
          {linkedJunctions.length === 0 ? (
            <div className="pt-1 flex items-center justify-between text-xs bg-subtle/40 border border-border/70 rounded-lg p-3">
              <span className="text-text-muted">Belum ada deliverable yang ditautkan.</span>
              <Button size="sm" variant="ghost" onClick={() => setConnectOpen(true)} className="h-7 text-xs text-accent font-semibold">
                + Hubungkan Deliverable
              </Button>
            </div>
          ) : (
            <div className="pt-1 space-y-2">
              {linkedJunctions.map((j: any) => {
                const del = j.deal_deliverables
                return (
                  <div key={j.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-subtle/30 border border-border/60 rounded-lg p-3 items-center">
                    <div className="sm:col-span-2">
                      <span className="text-text-muted">Deliverable Output:</span>
                      <p className="font-bold text-sm text-accent mt-0.5">{del?.name || 'Deliverable'}</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Target Deadline:</span>
                      <p className="font-semibold text-text-primary mt-0.5">{del?.deadline ? formatDate(del.deadline) : '—'}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold capitalize">
                        {del?.status || 'In Production'}
                      </Badge>
                      <button onClick={() => handleUnlinkDeliverable(j.id)} className="text-text-muted hover:text-error transition-colors p-1" title="Lepas tautan deliverable">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Section 3: APPROVAL UPDATE & LOG NOTES */}
        <div className="space-y-3 border-b border-border pb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Section 3 — Update Status Persetujuan & Log Notes</span>
          <form onSubmit={handleUpdateApprovalStatus} className="bg-subtle/40 border border-border/80 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ubah Status Approval</Label>
                <Select value={newApprovalStatus} onValueChange={setNewApprovalStatus}>
                  <SelectTrigger className="h-9 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_submitted" className="text-xs">Not Submitted</SelectItem>
                    <SelectItem value="waiting_approval" className="text-xs">Waiting Approval (Ajukan ke Client)</SelectItem>
                    <SelectItem value="revision_requested" className="text-xs">Revision Requested (Ada Revisi)</SelectItem>
                    <SelectItem value="revision_submitted" className="text-xs">Revision Submitted (Ajukan Revisi)</SelectItem>
                    <SelectItem value="approved" className="text-xs">Approved (Persetujuan ACC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Catatan / Poin Revisi Client</Label>
                <Textarea value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="Tuliskan feedback / arahan dari client..." rows={1} className="text-xs bg-white resize-none" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" className="bg-accent hover:bg-accent/90 text-xs font-semibold h-8" disabled={updatingApproval}>
                {updatingApproval ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Update Status Approval & Log
              </Button>
            </div>
          </form>

          {/* Approval Timeline History */}
          {approvalHistory.length > 0 && (
            <div className="pt-2 space-y-2">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Approval History Timeline</h4>
              <div className="space-y-2 divide-y divide-border/50">
                {approvalHistory.map((h: any) => (
                  <div key={h.id} className="pt-2 flex items-start justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold capitalize">
                          {APPROVAL_STATUS_CONFIG[h.action_status]?.label || h.action_status}
                        </Badge>
                        <span className="text-[10px] text-text-muted font-mono">{formatDate(h.created_at)}</span>
                      </div>
                      {h.notes && <p className="text-text-secondary italic mt-1 pl-1">"{h.notes}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: QUICK ACTIONS */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Section 4 — Quick Actions</span>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {brand?.id && (
              <Button size="sm" variant="outline" onClick={() => router.push(`/brand/${brand.id}`)} className="text-xs font-semibold h-8 gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Brand</span>
              </Button>
            )}
            {deal?.id && (
              <Button size="sm" variant="outline" onClick={() => router.push(`/brand/deals/${deal.id}`)} className="text-xs font-semibold h-8 gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Deal</span>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setConnectOpen(true)} className="text-xs text-accent font-semibold h-8">
              + Hubungkan Deliverable Lain
            </Button>
          </div>
        </div>
      </div>

      {/* Connect Dialog */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Hubungkan Konten ke Brand & Deal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConnect} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Brand <span className="text-error">*</span></Label>
              <Select value={selectedBrandId} onValueChange={(val) => { setSelectedBrandId(val); setSelectedDealId(''); setSelectedDeliverableId('') }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih brand..." /></SelectTrigger>
                <SelectContent>
                  {allBrands.map((b: any) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">{b.name || b.nama_brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBrandId && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Deal / Campaign (Opsional)</Label>
                <Select value={selectedDealId} onValueChange={(val) => { setSelectedDealId(val); setSelectedDeliverableId('') }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih deal..." /></SelectTrigger>
                  <SelectContent>
                    {brandDeals.map((d: any) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">{d.title || d.nama_campaign}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedDealId && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Deliverable Output (Opsional)</Label>
                <Select value={selectedDeliverableId} onValueChange={setSelectedDeliverableId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih deliverable..." /></SelectTrigger>
                  <SelectContent>
                    {dealDeliverables.map((del: any) => (
                      <SelectItem key={del.id} value={del.id} className="text-xs">{del.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setConnectOpen(false)}>Batal</Button>
              <Button type="submit" size="sm" className="bg-accent hover:bg-accent/90 font-semibold" disabled={saving || !selectedBrandId}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Hubungkan Brand
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main Content Detail Page ──────────────────────────────────────────────────

export default function ContentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const queryClient = useQueryClient()

  const [activePlatform, setActivePlatform] = useState<Platform>('tiktok')
  const [activeDetailTab, setActiveDetailTab] = useState('perencanaan')
  const [savingLifecycleStage, setSavingLifecycleStage] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const { data: video, isLoading } = useQuery<VideoWithSchedules>({
    queryKey: ['video-detail', id],
    enabled: !!id,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as VideoWithSchedules
    },
    staleTime: 10_000,
  })

  // Get Video Performance Records
  const { data: perfRecords = [], refetch: refetchPerformance } = useQuery({
    queryKey: ['performance', id],
    enabled: !!id,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('video_performance')
        .select('*')
        .eq('video_id', id)
        .order('recorded_at', { ascending: false })
      return data ?? []
    },
  })

  const platformData = useMemo<Record<Platform, any>>(() => {
    const map: Record<Platform, any> = { tiktok: {}, instagram: {}, youtube: {}, facebook: {} }
    if (perfRecords) {
      perfRecords.forEach((d: any) => {
        const p = d.platform as Platform
        map[p] = d
      })
    }
    return map
  }, [perfRecords])

  // Same shared schedule-completion signal used across Calendar/Action
  // Center/Content Detail (isPublishingFullyDone) — never derived from
  // legacy videos.status. Shares its query key with ContentBrandTab's own
  // fetch, so react-query dedupes the network call.
  const { data: headerScheduleRows = [] } = useQuery({
    queryKey: ['content-schedule-statuses', id],
    enabled: !!id,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('video_platform_schedules').select('status').eq('video_id', id)
      if (error) { console.error('Failed to load schedule statuses:', error); return [] }
      return data ?? []
    },
  })

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

  if (isLoading) return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  if (!video) return (
    <div className="max-w-6xl mx-auto px-6 py-6 text-center">
      <p className="text-text-muted">Video tidak ditemukan.</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={() => router.back()}>
        ← Kembali
      </Button>
    </div>
  )

  const lifecycleStage = computeContentLifecycleStage(
    { status: video.status, production_status: video.production_status, approval_status: video.approval_status },
    isPublishingFullyDone(headerScheduleRows.map((s: any) => s.status)),
    headerScheduleRows.length > 0
  )

  // Phase 03E UI correction — the lifecycle stepper IS the control; there
  // is no separate status row anymore. Clicking a stage writes the one
  // canonical field (production_status) it maps to.
  async function handleSelectLifecycleStage(_stage: any, productionStatus: string) {
    if (!video) return
    const videoId = video.id
    setSavingLifecycleStage(true)
    try {
      const supabase = createClient()
      // .select('id') is required here — the videos_update RLS policy
      // (get_member_role IN ('owner','manager') OR assigned_to = auth.uid())
      // makes an update that matches zero rows a SILENT no-op: Supabase
      // returns no error at all, it just updates 0 rows. Without checking
      // the returned rows, this looked like a successful mutation (toast +
      // no thrown error) while the database was untouched — exactly the
      // "click reacts, status doesn't actually change" bug. Checking the
      // returned row count turns that silent denial into an honest,
      // reported failure instead of a false success.
      const { data, error } = await supabase
        .from('videos')
        .update({ production_status: productionStatus })
        .eq('id', videoId)
        .select('id')
      if (error) {
        console.error('Failed to update production_status:', error)
        throw error
      }
      if (!data || data.length === 0) {
        console.error('production_status update matched 0 rows — likely blocked by RLS (videos_update requires owner/manager role or assignment to this content) for video', videoId)
        toast.error('Gagal mengubah status: kamu tidak memiliki izin untuk mengubah konten ini.')
        return
      }
      toast.success('Status konten diperbarui')
      queryClient.invalidateQueries({ queryKey: ['video-detail', videoId] })
      queryClient.invalidateQueries({ queryKey: ['videos'], refetchType: 'all' })
    } catch {
      toast.error('Gagal mengubah status konten')
    } finally {
      setSavingLifecycleStage(false)
    }
  }

  const totalViews = Object.values(platformData).reduce((sum, d: any) => sum + (Number(d?.views) || 0), 0)
  const totalLikes = Object.values(platformData).reduce((sum, d: any) => sum + (Number(d?.likes) || 0), 0)
  const totalComments = Object.values(platformData).reduce((sum, d: any) => sum + (Number(d?.comments) || 0), 0)

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
        <div className="flex-1 space-y-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Daftar Konten
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-bold text-2xl text-text-primary leading-tight">
              <ContentIdentity videoNo={video.no_video} judul={video.judul} emptyPlaceholder="Ketik judul..." />
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {video.format && (
              <span className="text-[10px] text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border font-medium">
                {video.format}
              </span>
            )}
            <VideoWorkBadges videoId={video.id} />
          </div>
          <div className="pt-2 max-w-2xl">
            <LifecycleIndicator stage={lifecycleStage} onSelectStage={handleSelectLifecycleStage} disabled={savingLifecycleStage} />
          </div>
        </div>

        {/* Dashboard KPI Mini Summary Card */}
        {totalViews > 0 && (
          <div className="flex items-center gap-4 bg-emerald-50/70 border border-emerald-100 rounded-xl px-5 py-3 shadow-sm shrink-0 self-start">
            <div className="text-center">
              <p className="font-heading font-bold text-emerald-800 text-base">{formatNumber(totalViews)}</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Views</p>
            </div>
            <div className="w-px h-8 bg-emerald-200/60" />
            <div className="text-center">
              <p className="font-heading font-bold text-emerald-800 text-base">{formatNumber(totalLikes)}</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Likes</p>
            </div>
            <div className="w-px h-8 bg-emerald-200/60" />
            <div className="text-center">
              <p className="font-heading font-bold text-emerald-800 text-base">{formatNumber(totalComments)}</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Comments</p>
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 space-x-6 h-auto mb-6 overflow-x-auto">
          <TabsTrigger value="perencanaan" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:shadow-none rounded-none px-1 py-2.5 font-semibold text-text-muted data-[state=active]:text-accent">Perencanaan</TabsTrigger>
          <TabsTrigger value="brand" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:shadow-none rounded-none px-1 py-2.5 font-semibold text-text-muted data-[state=active]:text-accent">Brand</TabsTrigger>
          <TabsTrigger value="script" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:shadow-none rounded-none px-1 py-2.5 font-semibold text-text-muted data-[state=active]:text-accent">Script</TabsTrigger>
          <TabsTrigger value="distribusi" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:shadow-none rounded-none px-1 py-2.5 font-semibold text-text-muted data-[state=active]:text-accent">Distribusi</TabsTrigger>
          <TabsTrigger value="checklist" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:shadow-none rounded-none px-1 py-2.5 font-semibold text-text-muted data-[state=active]:text-accent">Checklist</TabsTrigger>
          <TabsTrigger value="performa" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:shadow-none rounded-none px-1 py-2.5 font-semibold text-text-muted data-[state=active]:text-accent">Performa</TabsTrigger>
        </TabsList>

        <TabsContent value="perencanaan" className="outline-none">
          <PerencanaanTab video={video} />
        </TabsContent>

        <TabsContent value="brand" className="outline-none">
          <ContentBrandTab video={video} />
        </TabsContent>

        <TabsContent value="script" className="outline-none">
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
            <ScriptTab video={video} />
          </div>
        </TabsContent>

        <TabsContent value="distribusi" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-heading font-semibold text-text-primary text-sm border-b border-border pb-2.5 mb-4">Saluran Distribusi (Platform)</h3>
              <DistributionTab 
                video={video} 
                activePlatform={activePlatform} 
                setActivePlatform={setActivePlatform} 
                perfRecords={perfRecords}
                refetchPerformance={refetchPerformance}
              />
            </div>
            <div className="space-y-4">
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <h3 className="font-heading font-semibold text-text-primary text-sm border-b border-border pb-2.5 mb-4 flex items-center gap-1.5">
                  <span>Preview:</span>
                  <span className="text-accent capitalize">{activePlatform}</span>
                </h3>
                <PreviewCard platform={activePlatform} data={platformData[activePlatform] ?? {}} video={video} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="checklist" className="outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
              <ChecklistSection title="Shooting Checklist" table="shooting_checklists" videoId={video.id} />
            </div>
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
              <ChecklistSection title="Editing Checklist" table="editing_checklists" videoId={video.id} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performa" className="outline-none space-y-6">
          <div className="flex items-center justify-between bg-white border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-heading font-semibold text-text-primary text-sm">Laporan Video & Performa Keseluruhan</h3>
            <Button variant="secondary" className="gap-2 h-9 text-xs font-semibold" onClick={handleExportAll} disabled={exporting}>
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Unduh Laporan 4 Platform (PDF)
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLATFORMS.map(platform => (
              <div key={platform} className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-4">
                <PreviewCard platform={platform} data={platformData[platform]} video={video} />
                <PlatformPerformanceForm 
                  platform={platform} 
                  videoId={video.id} 
                  existingRecord={platformData[platform]} 
                  onSaveSuccess={refetchPerformance} 
                />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
