'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Plus, Trash2, Check, ExternalLink, Loader2, FileText, Copy, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getStatusBadgeClass, STATUS_CONFIG } from '@/lib/utils/status'
import { getPlatformDot } from '@/lib/utils/platform'
import { formatNumber } from '@/lib/utils/formatters'
import type { VideoStatus, Platform } from '@/lib/types'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']
const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook',
}

// ─── InlineField ─────────────────────────────────────────────────────────────

function InlineField({ label, value, onSave, type = 'text', options }: {
  label: string
  value: string | null | undefined
  onSave: (v: string) => void
  type?: 'text' | 'date' | 'select' | 'textarea'
  options?: { value: string; label: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')

  useEffect(() => { setVal(value ?? '') }, [value])

  function handleBlur() {
    setEditing(false)
    if (val !== (value ?? '')) onSave(val)
  }

  if (type === 'select' && options) {
    return (
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-text-muted">{label}</Label>
        <Select value={val} onValueChange={(v) => { setVal(v); onSave(v) }}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-text-muted">{label}</Label>
        {editing
          ? <Textarea value={val} onChange={(e) => setVal(e.target.value)} onBlur={handleBlur} autoFocus rows={3} className="text-sm" />
          : (
            <div
              className="text-sm text-text-primary min-h-[2rem] px-2 py-1.5 rounded-md hover:bg-subtle cursor-pointer whitespace-pre-wrap"
              onClick={() => setEditing(true)}
            >
              {val || <span className="text-text-muted">Klik untuk edit</span>}
            </div>
          )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-text-muted">{label}</Label>
      {editing
        ? <Input type={type} value={val} onChange={(e) => setVal(e.target.value)} onBlur={handleBlur} autoFocus className="h-8 text-sm" />
        : (
          <div
            className="text-sm text-text-primary min-h-[2rem] px-2 py-1.5 rounded-md hover:bg-subtle cursor-pointer"
            onClick={() => setEditing(true)}
          >
            {val || <span className="text-text-muted">Klik untuk edit</span>}
          </div>
        )}
    </div>
  )
}

// ─── Info Tab ─────────────────────────────────────────────────────────────────

function InfoTab({ video }: { video: VideoWithSchedules }) {
  const queryClient = useQueryClient()

  async function save(field: string, value: string) {
    const supabase = createClient()
    const parsed: Record<string, unknown> = {}
    if (field === 'no_upload') parsed[field] = value ? Number(value) : null
    else if (field === 'is_endorsement' || field === 'is_video_request') parsed[field] = value === 'true'
    else parsed[field] = value || null

    const { error } = await supabase.from('videos').update(parsed).eq('id', video.id)
    if (error) toast.error(error.message)
    else queryClient.invalidateQueries({ queryKey: ['videos'] })
  }

  const STATUS_OPTIONS = ['ide', 'scripting', 'produksi', 'editing', 'scheduled', 'live', 'archived'].map((s) => ({
    value: s, label: STATUS_CONFIG[s as VideoStatus]?.label ?? s,
  }))
  const FORMAT_OPTIONS = ['Short Video', 'Long Video', 'Reels', 'Live'].map((f) => ({ value: f, label: f }))

  return (
    <div className="space-y-4">
      <InlineField label="Judul" value={video.judul} onSave={(v) => save('judul', v)} />
      <div className="grid grid-cols-2 gap-4">
        <InlineField label="Status" value={video.status} type="select" options={STATUS_OPTIONS} onSave={(v) => save('status', v)} />
        <InlineField label="Format" value={video.format} type="select" options={FORMAT_OPTIONS} onSave={(v) => save('format', v)} />
      </div>
      <InlineField label="Tema" value={video.tema} onSave={(v) => save('tema', v)} />
      <div className="grid grid-cols-2 gap-4">
        <InlineField label="Tanggal Shooting" value={video.tanggal_shooting} type="date" onSave={(v) => save('tanggal_shooting', v)} />
        <InlineField label="Deadline Posting" value={video.deadline_posting} type="date" onSave={(v) => save('deadline_posting', v)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InlineField label="Storage Bahan" value={video.storage_bahan} onSave={(v) => save('storage_bahan', v)} />
        <InlineField label="Storage Video" value={video.storage_video} onSave={(v) => save('storage_video', v)} />
      </div>
      <InlineField label="Google Drive" value={video.google_drive_link} onSave={(v) => save('google_drive_link', v)} />
      <InlineField label="Caption Default" value={video.caption_default} type="textarea" onSave={(v) => save('caption_default', v)} />
    </div>
  )
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ video }: { video: VideoWithSchedules }) {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  const [adding, setAdding] = useState<Platform | null>(null)
  const [form, setForm] = useState({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '' })

  const { data: schedules } = useQuery({
    queryKey: ['schedules-video', video.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('video_platform_schedules').select('*, social_accounts(handle, display_name)').eq('video_id', video.id)
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

  async function addSchedule(platform: Platform) {
    if (!form.tanggal_tayang) { toast.error('Tanggal tayang wajib diisi'); return }
    const supabase = createClient()
    const { error } = await supabase.from('video_platform_schedules').insert({
      video_id: video.id, platform,
      social_account_id: form.social_account_id || null,
      tanggal_tayang: form.tanggal_tayang,
      jam_post: form.jam_post || null,
      caption_override: form.caption_override || null,
      status: 'scheduled',
    })
    if (error) { toast.error(error.message); return }
    toast.success('Jadwal ditambahkan!')
    queryClient.invalidateQueries({ queryKey: ['schedules-video', video.id] })
    queryClient.invalidateQueries({ queryKey: ['schedules'] })
    setAdding(null)
    setForm({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '' })
  }

  async function markPosted(id: string, url: string) {
    const supabase = createClient()
    await supabase.from('video_platform_schedules').update({ status: 'posted', url_post: url }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['schedules-video', video.id] })
    toast.success('Status diupdate!')
  }

  return (
    <div className="space-y-4">
      {PLATFORMS.map((platform) => {
        const platformSchedules = (schedules ?? []).filter((s: { platform: string }) => s.platform === platform)
        const platformAccounts = (socialAccounts ?? []).filter((a: { platform: string }) => a.platform === platform)

        return (
          <div key={platform} className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
              <div className="flex items-center gap-2">
                <div className={cn('w-2.5 h-2.5 rounded-full', getPlatformDot(platform))} />
                <span className="text-sm font-semibold text-text-primary">{PLATFORM_LABELS[platform]}</span>
              </div>
              <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setAdding(platform === adding ? null : platform)}>
                <Plus className="w-3 h-3" /> Jadwal
              </Button>
            </div>

            {adding === platform && (
              <div className="p-3 bg-accent-light/30 border-b border-border space-y-2">
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
                <div>
                  <Label className="text-xs">Caption Override</Label>
                  <Textarea className="mt-1 text-xs" rows={2} placeholder="Kosongkan untuk pakai caption default" value={form.caption_override} onChange={(e) => setForm((f) => ({ ...f, caption_override: e.target.value }))} />
                </div>
                <Button size="sm" className="w-full h-8 text-xs" onClick={() => addSchedule(platform)}>Simpan Jadwal</Button>
              </div>
            )}

            <div className="divide-y divide-border">
              {platformSchedules.length === 0 && adding !== platform && (
                <p className="px-3 py-3 text-xs text-text-muted">Belum ada jadwal</p>
              )}
              {platformSchedules.map((s: {
                id: string; tanggal_tayang: string; jam_post?: string; status: string
                url_post?: string; social_accounts?: { handle: string } | null
              }) => (
                <div key={s.id} className="px-3 py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text-primary">
                      📅 {s.tanggal_tayang}{s.jam_post ? ` · 🕐 ${s.jam_post.slice(0, 5)}` : ''}
                    </p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                      s.status === 'posted' ? 'bg-green-100 text-success' : s.status === 'failed' ? 'bg-red-100 text-error' : 'bg-accent-light text-accent')}>
                      {s.status === 'posted' ? 'Tayang' : s.status === 'failed' ? 'Gagal' : 'Terjadwal'}
                    </span>
                  </div>
                  {s.social_accounts && <p className="text-[11px] text-text-muted">@{s.social_accounts.handle}</p>}
                  {s.url_post
                    ? <a href={s.url_post} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent flex items-center gap-1"><ExternalLink className="w-3 h-3" />Lihat postingan</a>
                    : s.status !== 'posted' && (
                      <div className="flex gap-1.5 mt-1">
                        <Input placeholder="URL post (setelah tayang)" className="h-7 text-xs flex-1" onKeyDown={(e) => { if (e.key === 'Enter') markPosted(s.id, (e.target as HTMLInputElement).value) }} />
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Script Segment Editor ────────────────────────────────────────────────────

type SegmentType = 'HOOK' | 'ISI' | 'CTA' | 'CATATAN'

interface Segment {
  id: string
  type: SegmentType
  sub_type: string
  broll: string
  narasi: string
}

const SEGMENT_BADGE: Record<SegmentType, string> = {
  HOOK: 'bg-amber-100 text-amber-800',
  ISI: 'bg-blue-100 text-blue-800',
  CTA: 'bg-green-100 text-green-800',
  CATATAN: 'bg-gray-100 text-gray-700',
}

const NARASI_PLACEHOLDER: Record<SegmentType, string> = {
  HOOK: 'Kalimat pertama yang langsung menarik perhatian...',
  ISI: 'Isi konten utama...',
  CTA: 'Call to action untuk penonton...',
  CATATAN: 'Catatan untuk editor atau kru...',
}

const ISI_SUB_TYPES = ['Context', 'Discovery', 'Problem', 'Solution']

function ScriptSegmentEditor({ video }: { video: VideoWithSchedules }) {
  const [segments, setSegments] = useState<Segment[]>([])
  const [scriptId, setScriptId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'segments' | 'full'>('segments')
  const [loaded, setLoaded] = useState(false)

  const { isLoading } = useQuery({
    queryKey: ['script-segments', video.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('scripts').select('*').eq('video_id', video.id).maybeSingle()
      if (data) {
        setScriptId(data.id)
        // Migrate from old columns if segments is empty/null
        const segs: Segment[] = data.segments && Array.isArray(data.segments) && data.segments.length > 0
          ? data.segments as Segment[]
          : (() => {
              const migrated: Segment[] = []
              if (data.hook) migrated.push({ id: crypto.randomUUID(), type: 'HOOK', sub_type: '', broll: '', narasi: data.hook })
              if (data.body) migrated.push({ id: crypto.randomUUID(), type: 'ISI', sub_type: 'Context', broll: '', narasi: data.body })
              if (data.cta) migrated.push({ id: crypto.randomUUID(), type: 'CTA', sub_type: '', broll: '', narasi: data.cta })
              return migrated
            })()
        setSegments(segs)
      }
      setLoaded(true)
      return data
    },
  })

  const saveSegments = useCallback(async (segs: Segment[]) => {
    setSaving(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('scripts')
        .upsert({ video_id: video.id, segments: segs }, { onConflict: 'video_id' })
        .select('id')
        .single()
      if (!error && data && !scriptId) setScriptId(data.id)
    } finally {
      setSaving(false)
    }
  }, [scriptId, video.id])

  function addSegment(type: SegmentType) {
    const seg: Segment = {
      id: crypto.randomUUID(),
      type,
      sub_type: type === 'ISI' ? 'Context' : '',
      broll: '',
      narasi: '',
    }
    const updated = [...segments, seg]
    setSegments(updated)
  }

  function updateSegment(id: string, field: keyof Segment, value: string) {
    setSegments((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }

  function deleteSegment(id: string) {
    const updated = segments.filter((s) => s.id !== id)
    setSegments(updated)
    saveSegments(updated)
  }

  function handleBlur() {
    saveSegments(segments)
  }

  const fullScript = segments.map((s) => {
    const label = s.type === 'ISI' && s.sub_type ? `[ISI - ${s.sub_type}]` : `[${s.type}]`
    return `${label}\n${s.narasi}`
  }).join('\n\n')

  if (isLoading || !loaded) return <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>

  return (
    <div className="space-y-4">
      {/* View toggle + saving indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button
            className={cn('px-3 py-1.5 text-xs font-medium transition-colors', view === 'segments' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle')}
            onClick={() => setView('segments')}
          >
            Per Segmen
          </button>
          <button
            className={cn('px-3 py-1.5 text-xs font-medium transition-colors', view === 'full' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle')}
            onClick={() => setView('full')}
          >
            Script Utuh
          </button>
        </div>
        {saving && (
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Loader2 className="w-3 h-3 animate-spin" />Menyimpan...
          </div>
        )}
      </div>

      {view === 'segments' ? (
        <>
          {/* Add segment buttons */}
          <div className="flex flex-wrap gap-2">
            {(['HOOK', 'ISI', 'CTA', 'CATATAN'] as SegmentType[]).map((type) => (
              <Button key={type} size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => addSegment(type)}>
                <Plus className="w-3 h-3" />+ {type === 'ISI' ? 'Isi' : type === 'CATATAN' ? 'Catatan' : type}
              </Button>
            ))}
          </div>

          {/* Segment cards */}
          <div className="space-y-3">
            {segments.length === 0 && (
              <div className="text-center py-8 text-text-muted text-sm border-2 border-dashed border-border rounded-lg">
                Belum ada segmen. Klik tombol di atas untuk menambah.
              </div>
            )}
            {segments.map((seg) => (
              <div key={seg.id} className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
                {/* Card header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-border">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', SEGMENT_BADGE[seg.type])}>
                    {seg.type}
                  </span>
                  {seg.type === 'ISI' && (
                    <select
                      className="text-xs border border-border rounded px-1.5 py-0.5 bg-white"
                      value={seg.sub_type}
                      onChange={(e) => updateSegment(seg.id, 'sub_type', e.target.value)}
                      onBlur={handleBlur}
                    >
                      <option value="">-- sub type --</option>
                      {ISI_SUB_TYPES.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => deleteSegment(seg.id)}
                    className="text-text-muted hover:text-error transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card body */}
                <div className="p-3 space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-text-muted">B-Roll</Label>
                    <Textarea
                      rows={2}
                      placeholder="Deskripsi visual yang perlu diambil..."
                      value={seg.broll}
                      onChange={(e) => updateSegment(seg.id, 'broll', e.target.value)}
                      onBlur={handleBlur}
                      className="text-xs resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-text-muted">Narasi</Label>
                    <Textarea
                      rows={3}
                      placeholder={NARASI_PLACEHOLDER[seg.type]}
                      value={seg.narasi}
                      onChange={(e) => updateSegment(seg.id, 'narasi', e.target.value)}
                      onBlur={handleBlur}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Full script view */
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(fullScript)
                toast.success('Script disalin!')
              }}
            >
              <Copy className="w-3.5 h-3.5" />Salin Script
            </Button>
          </div>
          <div className="border border-border rounded-lg p-4 bg-surface">
            <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
              {fullScript || <span className="text-text-muted">Belum ada script.</span>}
            </pre>
          </div>
        </div>
      )}
    </div>
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        <span className="text-xs text-text-muted">{done}/{items.length}</span>
      </div>
      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
        {items.map((item: { id: string; title: string; completed: boolean }) => (
          <div key={item.id} className="flex items-center gap-2 px-3 py-2 hover:bg-surface group">
            <button
              onClick={() => toggle(item.id, item.completed)}
              className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                item.completed ? 'bg-success border-success' : 'border-border hover:border-accent')}
            >
              {item.completed && <Check className="w-2.5 h-2.5 text-white" />}
            </button>
            <span className={cn('flex-1 text-sm', item.completed && 'line-through text-text-muted')}>{item.title}</span>
            <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 px-3 py-2">
          <Input
            placeholder="Tambah item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="h-7 text-sm border-0 shadow-none px-0 focus:ring-0"
          />
          <Button size="sm" variant="ghost" onClick={addItem} disabled={!newItem.trim() || adding} className="h-7 w-7 p-0">
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Performance Tab ──────────────────────────────────────────────────────────

function PerformanceTab({ video }: { video: VideoWithSchedules }) {
  const { data: perf, isLoading } = useQuery({
    queryKey: ['performance', video.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('video_performance').select('*').eq('video_id', video.id).order('recorded_at', { ascending: false })
      return data ?? []
    },
  })

  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (!perf || perf.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted text-sm">Belum ada data performa.</p>
        <p className="text-xs text-text-muted mt-1">Input data di halaman Performa →</p>
        <Button variant="secondary" size="sm" className="mt-4" disabled>Generate PDF Report</Button>
      </div>
    )
  }

  const byPlatform = PLATFORMS.map((p) => ({
    platform: p,
    data: perf.filter((d: { platform: string }) => d.platform === p)[0] ?? null,
  }))

  return (
    <div className="space-y-4">
      {byPlatform.filter((bp) => bp.data).map(({ platform, data: d }) => (
        <div key={platform} className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-border">
            <div className={cn('w-2.5 h-2.5 rounded-full', getPlatformDot(platform))} />
            <span className="text-sm font-semibold">{PLATFORM_LABELS[platform]}</span>
            {d && <span className="text-xs text-text-muted ml-auto">{d.recorded_at}</span>}
          </div>
          {d && (
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: 'Views', value: d.views },
                { label: 'Likes', value: d.likes },
                { label: 'Comments', value: d.comments },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 text-center">
                  <p className="font-heading text-lg font-bold text-text-primary">{formatNumber(value ?? 0)}</p>
                  <p className="text-[11px] text-text-muted">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <Button variant="secondary" className="w-full" disabled>
        <FileText className="w-4 h-4 mr-2" />
        Generate PDF Report (Sesi berikutnya)
      </Button>
    </div>
  )
}

// ─── Production Sheet Tab ─────────────────────────────────────────────────────

function ProductionSheetTab({ videoId }: { videoId: string }) {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <FileText className="w-10 h-10 text-text-muted" />
      <p className="text-sm text-text-muted">Buka Production Sheet lengkap untuk video ini.</p>
      <Button onClick={() => router.push(`/content/${videoId}/production`)} className="gap-1.5">
        Buka Production Sheet
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  const { data: video, isLoading } = useQuery<VideoWithSchedules>({
    queryKey: ['video-detail', params.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', params.id)
        .single()
      if (error) throw error
      return data as unknown as VideoWithSchedules
    },
  })

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  if (!video) return (
    <div className="max-w-4xl mx-auto px-6 py-6 text-center">
      <p className="text-text-muted">Video tidak ditemukan.</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={() => router.back()}>
        ← Kembali
      </Button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-2xl text-text-primary leading-snug">{video.judul}</h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex text-xs px-2.5 py-0.5 rounded-full border font-medium', getStatusBadgeClass(video.status as VideoStatus))}>
                {STATUS_CONFIG[video.status as VideoStatus]?.label ?? video.status}
              </span>
              {video.format && (
                <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
                  {video.format}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="w-full justify-start overflow-x-auto rounded-lg mb-6">
          <TabsTrigger value="info" className="text-sm">Info</TabsTrigger>
          <TabsTrigger value="script" className="text-sm">Script</TabsTrigger>
          <TabsTrigger value="jadwal" className="text-sm">Jadwal</TabsTrigger>
          <TabsTrigger value="checklist" className="text-sm">Checklist</TabsTrigger>
          <TabsTrigger value="performa" className="text-sm">Performa</TabsTrigger>
          <TabsTrigger value="production" className="text-sm">Production Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-0">
          <InfoTab video={video} />
        </TabsContent>
        <TabsContent value="script" className="mt-0">
          <ScriptSegmentEditor video={video} />
        </TabsContent>
        <TabsContent value="jadwal" className="mt-0">
          <ScheduleTab video={video} />
        </TabsContent>
        <TabsContent value="checklist" className="mt-0">
          <div className="space-y-6">
            <ChecklistSection title="Shooting Checklist" table="shooting_checklists" videoId={video.id} />
            <ChecklistSection title="Editing Checklist" table="editing_checklists" videoId={video.id} />
          </div>
        </TabsContent>
        <TabsContent value="performa" className="mt-0">
          <PerformanceTab video={video} />
        </TabsContent>
        <TabsContent value="production" className="mt-0">
          <ProductionSheetTab videoId={video.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
