'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { X, Plus, Trash2, GripVertical, Check, ExternalLink, Loader2, FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getStatusBadgeClass, STATUS_CONFIG } from '@/lib/utils/status'
import { getPlatformBadge, getPlatformDot } from '@/lib/utils/platform'
import { formatNumber } from '@/lib/utils/formatters'
import type { VideoStatus, Platform } from '@/lib/types'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']
const PLATFORM_LABELS: Record<Platform, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook' }

// ─── Info Tab ───────────────────────────────────────────────────────────────

function InlineField({ label, value, onSave, type = 'text', options }: {
  label: string; value: string | null | undefined; onSave: (v: string) => void
  type?: 'text' | 'date' | 'select' | 'textarea'; options?: { value: string; label: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')

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
          : <div className="text-sm text-text-primary min-h-[2rem] px-2 py-1.5 rounded-md hover:bg-subtle cursor-pointer whitespace-pre-wrap" onClick={() => setEditing(true)}>{val || <span className="text-text-muted">Klik untuk edit</span>}</div>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-text-muted">{label}</Label>
      {editing
        ? <Input type={type} value={val} onChange={(e) => setVal(e.target.value)} onBlur={handleBlur} autoFocus className="h-8 text-sm" />
        : <div className="text-sm text-text-primary min-h-[2rem] px-2 py-1.5 rounded-md hover:bg-subtle cursor-pointer" onClick={() => setEditing(true)}>{val || <span className="text-text-muted">Klik untuk edit</span>}</div>}
    </div>
  )
}

function InfoTab({ video }: { video: VideoWithSchedules }) {
  const queryClient = useQueryClient()

  async function save(field: string, value: string) {
    const supabase = createClient()
    const parsed: Record<string, unknown> = {}
    if (field === 'no_video') parsed[field] = value ? `VID-${value.replace(/\D/g, '').padStart(3, '0')}` : null
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
    <div className="space-y-4 p-4">
      <InlineField label="Judul" value={video.judul} onSave={(v) => save('judul', v)} />
      <div className="grid grid-cols-2 gap-3">
        <InlineField label="Status" value={video.status} type="select" options={STATUS_OPTIONS} onSave={(v) => save('status', v)} />
        <InlineField label="Format" value={video.format} type="select" options={FORMAT_OPTIONS} onSave={(v) => save('format', v)} />
      </div>
      <InlineField label="Tema" value={video.tema} onSave={(v) => save('tema', v)} />
      <InlineField label="Nama Alat" value={video.nama_alat} onSave={(v) => save('nama_alat', v)} />
      <div className="grid grid-cols-2 gap-3">
        <InlineField label="Tanggal Shooting" value={video.tanggal_shooting} type="date" onSave={(v) => save('tanggal_shooting', v)} />
        <InlineField label="Deadline Posting" value={video.deadline_posting} type="date" onSave={(v) => save('deadline_posting', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InlineField label="Storage Bahan" value={video.storage_bahan} onSave={(v) => save('storage_bahan', v)} />
        <InlineField label="Storage Video" value={video.storage_video} onSave={(v) => save('storage_video', v)} />
      </div>
      <InlineField label="Google Drive" value={video.google_drive_link} onSave={(v) => save('google_drive_link', v)} />
      <InlineField label="Caption Default" value={video.caption_default} type="textarea" onSave={(v) => save('caption_default', v)} />
    </div>
  )
}

// ─── Schedule Tab ────────────────────────────────────────────────────────────

function ScheduleTab({ video }: { video: VideoWithSchedules }) {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  const [adding, setAdding] = useState<Platform | null>(null)
  const [form, setForm] = useState({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '', media_url: '', is_story: false })
  const [mediaUploading, setMediaUploading] = useState(false)

  const { data: schedules, isLoading } = useQuery({
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
    const { error } = await supabase.from('video_platform_schedules').insert({
      video_id: video.id, platform,
      social_account_id: form.social_account_id || null,
      tanggal_tayang: form.tanggal_tayang,
      jam_post: form.jam_post || null,
      caption_override: form.caption_override || null,
      media_url: form.media_url || null,
      is_story: form.is_story,
      status: 'scheduled',
    })
    if (error) { toast.error(error.message); return }
    toast.success('Jadwal ditambahkan!')
    queryClient.invalidateQueries({ queryKey: ['schedules-video', video.id] })
    queryClient.invalidateQueries({ queryKey: ['schedules'] })
    setAdding(null)
    setForm({ social_account_id: '', tanggal_tayang: '', jam_post: '', caption_override: '', media_url: '', is_story: false })
  }

  async function markPosted(id: string, url: string) {
    const supabase = createClient()
    await supabase.from('video_platform_schedules').update({ status: 'posted', url_post: url }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['schedules-video', video.id] })
    toast.success('Status diupdate!')
  }

  return (
    <div className="p-4 space-y-4">
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
              <div className="p-3 bg-accent-light/30 border-b border-border space-y-3">
                {platformAccounts.length > 0 && (
                  <div>
                    <Label className="text-xs">Akun</Label>
                    <select className="w-full mt-1 text-xs border border-border rounded px-2 py-1.5 bg-white" value={form.social_account_id} onChange={(e) => setForm((f) => ({ ...f, social_account_id: e.target.value }))}>
                      <option value="">Pilih akun (opsional)</option>
                      {platformAccounts.map((a: { id: string; handle: string; display_name?: string }) => <option key={a.id} value={a.id}>{a.display_name ?? a.handle}</option>)}
                    </select>
                  </div>
                )}

                {/* Snapgram Toggle for Instagram/Facebook */}
                {(platform === 'instagram' || platform === 'facebook') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Jenis Postingan</Label>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, is_story: false }))}
                        className={cn(
                          "flex-1 py-1 px-2.5 text-xs font-semibold rounded border transition-all text-center",
                          !form.is_story 
                            ? "bg-accent border-accent text-white shadow-xs" 
                            : "bg-white border-border text-text-secondary hover:bg-subtle"
                        )}
                      >
                        Post / Reels
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, is_story: true }))}
                        className={cn(
                          "flex-1 py-1 px-2.5 text-xs font-semibold rounded border transition-all text-center",
                          form.is_story 
                            ? "bg-accent border-accent text-white shadow-xs" 
                            : "bg-white border-border text-text-secondary hover:bg-subtle"
                        )}
                      >
                        📸 Snapgram
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

                {/* Media upload option */}
                <div className="space-y-1">
                  <Label className="text-xs">Sumber Media</Label>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <label className="flex items-center justify-center gap-1 py-1 px-2 border border-dashed border-border rounded bg-white hover:border-accent hover:bg-accent-light/5 cursor-pointer transition-colors text-[10px] font-bold text-text-secondary">
                      {mediaUploading ? <Loader2 className="w-3 h-3 animate-spin text-accent" /> : <Upload className="w-3 h-3" />}
                      PC File
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
                          toast.success('Link Google Drive disalin!')
                        } else {
                          toast.error('Google Drive Link belum diisi')
                        }
                      }}
                      className="flex items-center justify-center gap-1 py-1 px-2 border border-border rounded bg-white hover:border-accent hover:bg-accent-light/5 transition-colors text-[10px] font-bold text-text-secondary"
                    >
                      Drive Link
                    </button>
                  </div>
                  {form.media_url && (
                    <p className="text-[9px] text-emerald-600 truncate mt-1">✓ Media siap: {form.media_url}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Caption Override</Label>
                  <Textarea className="mt-1 text-xs" rows={2} placeholder="Kosongkan untuk pakai caption default" value={form.caption_override} onChange={(e) => setForm((f) => ({ ...f, caption_override: e.target.value }))} />
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 h-8 text-xs bg-accent hover:bg-accent/90" onClick={() => addSchedule(platform)}>Simpan</Button>
                  <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => setAdding(null)}>Batal</Button>
                </div>
              </div>
            )}

            <div className="divide-y divide-border">
              {platformSchedules.length === 0 && adding !== platform && (
                <p className="px-3 py-3 text-xs text-text-muted">Belum ada jadwal</p>
              )}
              {platformSchedules.map((s: { id: string; tanggal_tayang: string; jam_post?: string; status: string; url_post?: string; social_accounts?: { handle: string } | null; is_story?: boolean | null; media_url?: string | null }) => (
                <div key={s.id} className="px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text-primary">
                      📅 {s.tanggal_tayang}{s.jam_post ? ` · 🕐 ${s.jam_post.slice(0, 5)}` : ''}
                    </p>
                    <div className="flex items-center gap-1">
                      {s.is_story && (
                        <span className="text-[8px] px-1 bg-purple-100 text-purple-700 rounded font-bold">
                          Story
                        </span>
                      )}
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        s.status === 'posted' ? 'bg-green-100 text-success' : s.status === 'failed' ? 'bg-red-100 text-error' : 'bg-accent-light text-accent')}>
                        {s.status === 'posted' ? 'Tayang' : s.status === 'failed' ? 'Gagal' : 'Terjadwal'}
                      </span>
                    </div>
                  </div>
                  {s.social_accounts && <p className="text-[11px] text-text-muted">@{s.social_accounts.handle}</p>}
                  
                  {s.media_url && (
                    <a href={s.media_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-accent hover:underline block truncate max-w-xs">
                      📁 Media: {s.media_url.includes('google.com') ? 'Google Drive' : 'PC File'}
                    </a>
                  )}

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

// ─── Script Tab ───────────────────────────────────────────────────────────────

function ScriptTab({ video }: { video: VideoWithSchedules }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ hook: '', body: '', cta: '', insight: '', estimated_duration: '' })
  const [scriptId, setScriptId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { isLoading } = useQuery({
    queryKey: ['script', video.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('scripts').select('*').eq('video_id', video.id).maybeSingle()
      if (data) {
        setScriptId(data.id)
        setForm({ hook: data.hook ?? '', body: data.body ?? '', cta: data.cta ?? '', insight: data.insight ?? '', estimated_duration: data.estimated_duration ? String(data.estimated_duration) : '' })
      }
      return data
    },
  })

  const save = useCallback(async (field: string, value: string) => {
    setSaving(true)
    const supabase = createClient()
    const payload = { [field]: value || null, ...(field === 'estimated_duration' ? { estimated_duration: value ? Number(value) : null } : {}) }
    try {
      if (scriptId) {
        await supabase.from('scripts').update(payload).eq('id', scriptId)
      } else {
        const { data } = await supabase.from('scripts').insert({ video_id: video.id, ...payload }).select('id').single()
        if (data) setScriptId(data.id)
      }
    } finally {
      setSaving(false)
    }
  }, [scriptId, video.id])

  if (isLoading) return <div className="p-4"><Skeleton className="h-32 w-full" /></div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">Auto-save saat pindah field</p>
        {saving && <div className="flex items-center gap-1 text-xs text-text-muted"><Loader2 className="w-3 h-3 animate-spin" />Menyimpan...</div>}
      </div>
      {[
        { field: 'hook', label: 'Hook', placeholder: 'Kalimat pertama yang langsung menarik perhatian...' },
        { field: 'body', label: 'Body', placeholder: 'Isi konten utama...' },
        { field: 'cta', label: 'CTA', placeholder: 'Call to action untuk penonton...' },
        { field: 'insight', label: 'Insight untuk Editor', placeholder: 'Catatan khusus untuk proses editing...' },
      ].map(({ field, label, placeholder }) => (
        <div key={field} className="space-y-1.5">
          <Label>{label}</Label>
          <Textarea
            placeholder={placeholder}
            value={form[field as keyof typeof form]}
            onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
            onBlur={(e) => save(field, e.target.value)}
            rows={field === 'body' ? 4 : 2}
          />
        </div>
      ))}
      <div className="space-y-1.5">
        <Label>Estimasi Durasi (detik)</Label>
        <Input
          type="number"
          placeholder="60"
          value={form.estimated_duration}
          onChange={(e) => setForm((f) => ({ ...f, estimated_duration: e.target.value }))}
          onBlur={(e) => save('estimated_duration', e.target.value)}
          className="w-32"
        />
      </div>
    </div>
  )
}

// ─── Checklist Tab ────────────────────────────────────────────────────────────

function ChecklistSection({ title, table, videoId }: { title: string; table: 'shooting_checklists' | 'editing_checklists'; videoId: string }) {
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

function ChecklistTab({ video }: { video: VideoWithSchedules }) {
  return (
    <div className="p-4 space-y-6">
      <ChecklistSection title="Shooting Checklist" table="shooting_checklists" videoId={video.id} />
      <ChecklistSection title="Editing Checklist" table="editing_checklists" videoId={video.id} />
    </div>
  )
}

// ─── Performance Tab ─────────────────────────────────────────────────────────

function PerformanceTab({ video }: { video: VideoWithSchedules }) {
  const { data: perf, isLoading } = useQuery({
    queryKey: ['performance', video.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('video_performance').select('*').eq('video_id', video.id).order('recorded_at', { ascending: false })
      return data ?? []
    },
  })

  if (isLoading) return <div className="p-4"><Skeleton className="h-32 w-full" /></div>
  if (!perf || perf.length === 0) {
    return (
      <div className="p-4 text-center py-12">
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
    <div className="p-4 space-y-4">
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

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface Props {
  video: VideoWithSchedules | null
  onClose: () => void
}

export function VideoDetailPanel({ video, onClose }: Props) {
  if (!video) return null

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-text-primary text-sm leading-snug line-clamp-2">{video.judul}</p>
          <span className={cn('inline-flex mt-1 text-xs px-2 py-0.5 rounded-full border font-medium', getStatusBadgeClass(video.status as VideoStatus))}>
            {STATUS_CONFIG[video.status as VideoStatus]?.label ?? video.status}
          </span>
        </div>
        <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary rounded shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 shrink-0 w-auto justify-start overflow-x-auto rounded-lg">
          <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
          <TabsTrigger value="jadwal" className="text-xs">Jadwal</TabsTrigger>
          <TabsTrigger value="script" className="text-xs">Script</TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs">Checklist</TabsTrigger>
          <TabsTrigger value="performa" className="text-xs">Performa</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-0">
          <TabsContent value="info" className="mt-0"><InfoTab video={video} /></TabsContent>
          <TabsContent value="jadwal" className="mt-0"><ScheduleTab video={video} /></TabsContent>
          <TabsContent value="script" className="mt-0"><ScriptTab video={video} /></TabsContent>
          <TabsContent value="checklist" className="mt-0"><ChecklistTab video={video} /></TabsContent>
          <TabsContent value="performa" className="mt-0"><PerformanceTab video={video} /></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
