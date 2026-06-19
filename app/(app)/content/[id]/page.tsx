'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useRouter, useParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Plus, Trash2, Check, ExternalLink, Loader2, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getStatusBadgeClass, STATUS_CONFIG } from '@/lib/utils/status'
import { getPlatformDot } from '@/lib/utils/platform'
import { formatNumber } from '@/lib/utils/formatters'
import { ScriptBlocks, type ScriptBlock } from '@/components/content/ScriptBlocks'
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
          className="flex-1 min-w-[80px] outline-none text-sm bg-transparent placeholder:text-text-muted"
        />
      </div>
      {open && (filtered.length > 0 || (input.trim() && !temas.includes(input.trim()))) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
          {filtered.map((s) => (
            <button key={s} type="button" onMouseDown={() => addTema(s)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-subtle">
              {s}
            </button>
          ))}
          {input.trim() && !temas.includes(input.trim()) && !suggestions.includes(input.trim()) && (
            <button type="button" onMouseDown={() => addTema(input)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-subtle text-accent">
              + Buat &quot;{input.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function InfoTab({ video }: { video: VideoWithSchedules }) {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  const [saving, setSaving] = useState(false)
  const [temas, setTemas] = useState<string[]>(video.temas ?? (video.tema ? [video.tema] : []))
  const [form, setForm] = useState({
    no_upload: video.no_upload != null ? String(video.no_upload) : '',
    no_video: video.no_video ?? '',
    judul: video.judul ?? '',
    status: video.status ?? '',
    format: video.format ?? '',
    tanggal_shooting: video.tanggal_shooting ?? '',
    deadline_posting: video.deadline_posting ?? '',
    storage_bahan: video.storage_bahan ?? '',
    storage_video: video.storage_video ?? '',
    google_drive_link: video.google_drive_link ?? '',
    caption_default: video.caption_default ?? '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const payload: Record<string, unknown> = {
      no_upload: form.no_upload ? Number(form.no_upload) : null,
      no_video: form.no_video || null,
      judul: form.judul || null,
      status: form.status || null,
      format: form.format || null,
      temas,
      tema: temas[0] ?? null,
      tanggal_shooting: form.tanggal_shooting || null,
      deadline_posting: form.deadline_posting || null,
      storage_bahan: form.storage_bahan || null,
      storage_video: form.storage_video || null,
      google_drive_link: form.google_drive_link || null,
      caption_default: form.caption_default || null,
    }
    const { error } = await supabase.from('videos').update(payload).eq('id', video.id)
    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Perubahan tersimpan!')
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['video-detail', video.id] })
    }
  }

  const STATUS_OPTIONS = ['ide', 'scripting', 'produksi', 'editing', 'scheduled', 'live', 'archived']
  const FORMAT_OPTIONS = ['Short Video', 'Long Video', 'Reels', 'Live']

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">No. Upload (#)</Label>
          <Input
            type="number"
            value={form.no_upload}
            onChange={(e) => set('no_upload', e.target.value)}
            placeholder="1, 2, 3..."
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">No. Video</Label>
          <Input
            value={form.no_video}
            onChange={(e) => set('no_video', e.target.value)}
            placeholder="VID-001..."
            className="text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Judul</Label>
        <Input value={form.judul} onChange={(e) => set('judul', e.target.value)} className="text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">Status</Label>
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s as VideoStatus]?.label ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">Format</Label>
          <Select value={form.format} onValueChange={(v) => set('format', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Tema</Label>
        <TemaSelect temas={temas} onChange={setTemas} workspaceId={workspaceId} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">Tanggal Shooting</Label>
          <Input type="date" value={form.tanggal_shooting} onChange={(e) => set('tanggal_shooting', e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">Deadline Posting</Label>
          <Input type="date" value={form.deadline_posting} onChange={(e) => set('deadline_posting', e.target.value)} className="text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">Storage Bahan</Label>
          <Input value={form.storage_bahan} onChange={(e) => set('storage_bahan', e.target.value)} placeholder="Link folder..." className="text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">Storage Video</Label>
          <Input value={form.storage_video} onChange={(e) => set('storage_video', e.target.value)} placeholder="Link folder..." className="text-sm" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Google Drive</Label>
        <Input value={form.google_drive_link} onChange={(e) => set('google_drive_link', e.target.value)} placeholder="https://drive.google.com/..." className="text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Caption Default</Label>
        <Textarea value={form.caption_default} onChange={(e) => set('caption_default', e.target.value)} rows={3} className="text-sm" />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </Button>
    </div>
  )
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ video }: { video: VideoWithSchedules }) {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  const [adding, setAdding] = useState<Platform | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
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
    const payload = {
      social_account_id: form.social_account_id || null,
      tanggal_tayang: form.tanggal_tayang,
      jam_post: form.jam_post || null,
      caption_override: form.caption_override || null,
    }

    let error
    if (editingId) {
      ({ error } = await supabase.from('video_platform_schedules').update(payload).eq('id', editingId))
    } else {
      const existing = (schedules ?? []).find((s: { platform: string }) => s.platform === platform)
      if (existing) {
        ({ error } = await supabase.from('video_platform_schedules').update(payload).eq('id', existing.id))
      } else {
        ({ error } = await supabase.from('video_platform_schedules').insert({
          video_id: video.id, platform, status: 'scheduled', ...payload,
        }))
      }
    }
    if (error) { toast.error(error.message); return }
    toast.success('Jadwal disimpan!')
    queryClient.invalidateQueries({ queryKey: ['schedules-video', video.id] })
    queryClient.invalidateQueries({ queryKey: ['schedules'] })
    setAdding(null)
    setEditingId(null)
    setForm({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '' })
  }

  function startEdit(s: { id: string; platform: string; social_account_id?: string | null; tanggal_tayang: string; jam_post?: string | null; caption_override?: string | null }) {
    setForm({
      social_account_id: s.social_account_id ?? '',
      tanggal_tayang: s.tanggal_tayang,
      jam_post: s.jam_post ?? '',
      caption_override: s.caption_override ?? '',
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
  }

  const [urlPostInputs, setUrlPostInputs] = useState<Record<string, string>>({})

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
              {platformSchedules.length === 0 && (
                <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => {
                  if (platform === adding) { setAdding(null); setEditingId(null) }
                  else { setAdding(platform); setEditingId(null); setForm({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '' }) }
                }}>
                  <Plus className="w-3 h-3" /> Jadwal
                </Button>
              )}
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
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => addSchedule(platform)}>{editingId ? 'Update Jadwal' : 'Simpan Jadwal'}</Button>
                  <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => { setAdding(null); setEditingId(null); setForm({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '' }) }}>Batal</Button>
                </div>
              </div>
            )}

            <div className="divide-y divide-border">
              {platformSchedules.length === 0 && adding !== platform && (
                <p className="px-3 py-3 text-xs text-text-muted">Belum ada jadwal</p>
              )}
              {platformSchedules.map((s: {
                id: string; platform: string; tanggal_tayang: string; jam_post?: string; status: string
                url_post?: string; social_account_id?: string | null; caption_override?: string | null
                social_accounts?: { handle: string } | null
              }) => (
                <div key={s.id} className="px-3 py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text-primary">
                      📅 {s.tanggal_tayang}{s.jam_post ? ` · 🕐 ${s.jam_post.slice(0, 5)}` : ''}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        s.status === 'posted' ? 'bg-green-100 text-success' : s.status === 'failed' ? 'bg-red-100 text-error' : 'bg-accent-light text-accent')}>
                        {s.status === 'posted' ? 'Tayang' : s.status === 'failed' ? 'Gagal' : 'Terjadwal'}
                      </span>
                      <button onClick={() => startEdit(s)} className="text-[11px] text-accent hover:underline">Edit</button>
                      <button onClick={() => deleteSchedule(s.id)} className="text-[11px] text-error hover:underline">Hapus</button>
                    </div>
                  </div>
                  {s.social_accounts && <p className="text-[11px] text-text-muted">@{s.social_accounts.handle}</p>}
                  {s.url_post
                    ? <a href={s.url_post} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent flex items-center gap-1"><ExternalLink className="w-3 h-3" />Lihat postingan</a>
                    : s.status !== 'posted' && (
                      <div className="flex gap-1.5 mt-1">
                        <Input
                          type="url"
                          placeholder="URL post (setelah tayang)"
                          className="h-7 text-xs flex-1"
                          value={urlPostInputs[s.id] ?? ''}
                          onChange={(e) => setUrlPostInputs((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') markPosted(s.id, urlPostInputs[s.id] ?? '') }}
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={() => markPosted(s.id, urlPostInputs[s.id] ?? '')}>Simpan</Button>
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
    else queryClient.invalidateQueries({ queryKey: ['video', video.id] })
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

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
          <TabsTrigger value="jadwal" className="text-sm">Jadwal Platform</TabsTrigger>
          <TabsTrigger value="script" className="text-sm">Script</TabsTrigger>
          <TabsTrigger value="checklist" className="text-sm">Checklist</TabsTrigger>
          <TabsTrigger value="performa" className="text-sm">Performa</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-0">
          <InfoTab video={video} />
        </TabsContent>
        <TabsContent value="jadwal" className="mt-0">
          <ScheduleTab video={video} />
        </TabsContent>
        <TabsContent value="script" className="mt-0">
          <ScriptTab video={video} />
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
      </Tabs>
    </div>
  )
}
