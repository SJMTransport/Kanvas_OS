'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { PageContainer, PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format, parseISO, isToday, isFuture } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Plus, Clock, MapPin, Video, Pencil, Trash2, Loader2, AlertTriangle, Search } from 'lucide-react'
import { ContentIdentity } from '@/components/content/ContentIdentity'
import { formatDate } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils'

// Phase: Shooting Session. A session is a real-world production time slot;
// it references EXISTING videos rows via videos.shooting_session_id (a
// direct, nullable FK — one video can be in at most one session, by
// schema, never a copy). Assigning a video here updates that ONE video
// row; it never creates a second "shooting content" record. Deleting a
// session (ON DELETE SET NULL) only clears the link — Content, Deliverable
// and Brand rows are never touched by that cascade.

interface ShootingSession {
  id: string
  session_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  notes: string | null
  deal_schedule_id: string | null
}

interface ShootingMilestone {
  id: string
  deal_id: string
  title: string
  date: string
  deals?: { title: string | null; nama_campaign: string | null; brands?: { name: string | null; nama_brand: string | null } | null } | null
}

interface SessionVideo {
  id: string
  no_video: string | null
  judul: string
  deal_id: string | null
  brand_id: string | null
  shooting_session_id: string | null
  deals?: { title: string | null; nama_campaign: string | null; brands?: { name: string | null; nama_brand: string | null } | null } | null
}

export default function ShootingSchedulePage() {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<ShootingSession | null>(null)
  const [sessionDate, setSessionDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set())
  const [contentSearch, setContentSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ShootingSession | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Optional link to an existing SOW/Deal "Shooting" milestone — a Shooting
  // Session and the SOW's planned shooting date must not silently become
  // two unrelated dates for the same production activity. Selecting a deal
  // here only narrows which milestone/content to offer; nothing is written
  // until Save.
  const [selectedDealId, setSelectedDealId] = useState<string>('')
  const [linkedScheduleId, setLinkedScheduleId] = useState<string>('') // '' = manual date

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<ShootingSession[]>({
    queryKey: ['shooting-sessions', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('shooting_sessions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('session_date', { ascending: true })
      if (error) { console.error('Failed to load shooting sessions:', error); return [] }
      return data ?? []
    },
  })

  // All content, per session (for display) and unassigned/organic content
  // (for the picker) — workspace-scoped.
  const { data: allVideos = [] } = useQuery<SessionVideo[]>({
    queryKey: ['shooting-videos', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('videos')
        .select('id, no_video, judul, deal_id, brand_id, shooting_session_id, deals(title, nama_campaign, brands(name, nama_brand))')
        .eq('workspace_id', workspaceId)
        .not('status', 'eq', 'archived')
        .order('no_video', { ascending: false })
      if (error) { console.error('Failed to load videos for shooting picker:', error); return [] }
      return (data ?? []) as any
    },
  })

  // Existing SOW "Shooting" milestones (deal_schedules where type='shooting'),
  // workspace-scoped via the deal relation — the same rows shown on the Deal
  // detail page's Schedule tab. Never duplicated; only referenced.
  const { data: shootingMilestones = [] } = useQuery<ShootingMilestone[]>({
    queryKey: ['shooting-milestones', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('deal_schedules')
        .select('id, deal_id, title, date, deals!inner(workspace_id, title, nama_campaign, brands(name, nama_brand))')
        .eq('type', 'shooting')
        .eq('deals.workspace_id', workspaceId)
        .order('date', { ascending: true })
      if (error) { console.error('Failed to load SOW shooting milestones:', error); return [] }
      return (data ?? []) as any
    },
  })

  const { data: deals = [] } = useQuery({
    queryKey: ['deals-for-shooting-picker', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('deals')
        .select('id, title, nama_campaign, brands(name, nama_brand)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
      if (error) { console.error('Failed to load deals for shooting picker:', error); return [] }
      return (data ?? []) as any[]
    },
  })

  const milestonesForSelectedDeal = useMemo(
    () => shootingMilestones.filter((m) => m.deal_id === selectedDealId),
    [shootingMilestones, selectedDealId]
  )

  const videosBySession = useMemo(() => {
    const map: Record<string, SessionVideo[]> = {}
    for (const v of allVideos) {
      if (v.shooting_session_id) (map[v.shooting_session_id] ??= []).push(v)
    }
    return map
  }, [allVideos])

  const filteredPickerVideos = allVideos
    .filter((v) => (selectedDealId ? v.deal_id === selectedDealId : true))
    .filter((v) => {
      if (!contentSearch.trim()) return true
      const q = contentSearch.toLowerCase()
      return v.judul?.toLowerCase().includes(q) || v.no_video?.toLowerCase().includes(q)
    })

  function openCreate() {
    setEditingSession(null)
    setSessionDate(format(new Date(), 'yyyy-MM-dd'))
    setStartTime('')
    setEndTime('')
    setLocation('')
    setNotes('')
    setSelectedContentIds(new Set())
    setContentSearch('')
    setSelectedDealId('')
    setLinkedScheduleId('')
    setSheetOpen(true)
  }

  function openEdit(s: ShootingSession) {
    setEditingSession(s)
    setSessionDate(s.session_date)
    setStartTime(s.start_time?.slice(0, 5) || '')
    setEndTime(s.end_time?.slice(0, 5) || '')
    setLocation(s.location || '')
    setNotes(s.notes || '')
    setSelectedContentIds(new Set((videosBySession[s.id] ?? []).map((v) => v.id)))
    setContentSearch('')
    const linkedMilestone = s.deal_schedule_id ? shootingMilestones.find((m) => m.id === s.deal_schedule_id) : undefined
    setSelectedDealId(linkedMilestone?.deal_id || '')
    setLinkedScheduleId(s.deal_schedule_id || '')
    setSheetOpen(true)
  }

  function selectMilestoneSource(scheduleId: string) {
    setLinkedScheduleId(scheduleId)
    if (scheduleId) {
      const m = shootingMilestones.find((mm) => mm.id === scheduleId)
      if (m) setSessionDate(m.date)
    }
  }

  // Arriving from a Deal's Schedule tab ("Buat Sesi Shooting →") — prefill
  // the create sheet from that specific existing milestone, once milestones
  // have loaded.
  useEffect(() => {
    const dealScheduleId = searchParams.get('dealScheduleId')
    if (!dealScheduleId || sheetOpen || shootingMilestones.length === 0) return
    const m = shootingMilestones.find((mm) => mm.id === dealScheduleId)
    if (!m) return
    openCreate()
    setSelectedDealId(m.deal_id)
    setLinkedScheduleId(m.id)
    setSessionDate(m.date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, shootingMilestones])

  function toggleContent(id: string) {
    setSelectedContentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!workspaceId || !sessionDate) return
    setSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        workspace_id: workspaceId,
        session_date: sessionDate,
        start_time: startTime || null,
        end_time: endTime || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        deal_schedule_id: linkedScheduleId || null,
      }

      let sessionId = editingSession?.id
      if (editingSession) {
        const { error } = await supabase.from('shooting_sessions').update(payload).eq('id', editingSession.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('shooting_sessions').insert(payload).select('id').single()
        if (error) throw error
        sessionId = data.id
      }

      // Reconcile content links: assign newly-selected videos to this
      // session (updating the SAME row, never inserting a new one), and
      // release videos that were previously linked here but got
      // unchecked. tanggal_shooting is synced FROM the session so
      // Calendar's existing shooting-event logic (which reads that column
      // directly, unchanged) reflects the session date automatically.
      const previouslyLinked = editingSession ? (videosBySession[editingSession.id] ?? []).map((v) => v.id) : []
      const toLink = Array.from(selectedContentIds)
      const toUnlink = previouslyLinked.filter((id) => !selectedContentIds.has(id))

      if (toLink.length > 0) {
        const { error } = await supabase
          .from('videos')
          .update({ shooting_session_id: sessionId, tanggal_shooting: sessionDate })
          .in('id', toLink)
        if (error) throw error
      }
      if (toUnlink.length > 0) {
        const { error } = await supabase.from('videos').update({ shooting_session_id: null }).in('id', toUnlink)
        if (error) throw error
      }

      toast.success(editingSession ? 'Sesi shooting diperbarui!' : 'Sesi shooting dibuat!')
      queryClient.invalidateQueries({ queryKey: ['shooting-sessions'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['shooting-videos'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['videos'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['deal-schedule-shooting-links'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['brand-schedule'], refetchType: 'all' })
      setSheetOpen(false)
    } catch (err) {
      console.error('Failed to save shooting session:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan sesi shooting')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const supabase = createClient()
      // ON DELETE SET NULL on videos.shooting_session_id — Content,
      // Deliverable, and Brand rows are never touched by this delete.
      const { error } = await supabase.from('shooting_sessions').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Sesi shooting dihapus. Content terkait tidak dihapus.')
      queryClient.invalidateQueries({ queryKey: ['shooting-sessions'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['shooting-videos'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['deal-schedule-shooting-links'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['brand-schedule'], refetchType: 'all' })
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus sesi')
    } finally {
      setDeleting(false)
    }
  }

  const upcoming = sessions.filter((s) => isToday(parseISO(s.session_date)) || isFuture(parseISO(s.session_date)))
  const past = sessions.filter((s) => !isToday(parseISO(s.session_date)) && !isFuture(parseISO(s.session_date)))

  function SessionCard({ s }: { s: ShootingSession }) {
    const linked = videosBySession[s.id] ?? []
    const brandName = linked[0]?.deals?.brands?.name || linked[0]?.deals?.brands?.nama_brand
    const sowMilestone = s.deal_schedule_id ? shootingMilestones.find((m) => m.id === s.deal_schedule_id) : undefined
    return (
      <div className="bg-white border border-border rounded-xl p-4 space-y-2.5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-heading font-bold text-sm text-text-primary">
              {format(parseISO(s.session_date), 'EEEE, d MMMM yyyy', { locale: localeId })}
            </p>
            {(s.start_time || s.end_time) && (
              <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> {s.start_time?.slice(0, 5)}{s.end_time && `–${s.end_time.slice(0, 5)}`}
              </p>
            )}
            {s.location && (
              <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {s.location}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {brandName && <Badge variant="outline" className="text-[10px] font-semibold">{brandName}</Badge>}
            <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-subtle text-text-muted hover:text-accent" title="Edit sesi"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded hover:bg-error/10 text-text-muted hover:text-error" title="Hapus sesi"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {sowMilestone && (
          <p className="text-[11px] text-accent font-medium flex items-center gap-1">
            ⛓ Terhubung ke SOW Milestone: {sowMilestone.title}
          </p>
        )}
        {s.notes && <p className="text-xs text-text-secondary italic">{s.notes}</p>}
        <div className="pt-2 border-t border-border/60 space-y-1">
          <p className="text-[10px] font-bold uppercase text-text-muted tracking-wide">{linked.length} Content</p>
          {linked.length === 0 ? (
            <p className="text-xs text-text-muted italic">Belum ada Content yang ditautkan.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {linked.map((v) => (
                <button
                  key={v.id}
                  onClick={() => router.push(`/content/${v.id}`)}
                  className="text-[11px] bg-subtle hover:bg-accent-light hover:text-accent px-2 py-1 rounded-md font-medium text-text-primary transition-colors"
                >
                  <ContentIdentity videoNo={v.no_video} judul={v.judul} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Jadwal Shooting" subtitle="Kelola sesi produksi dan lihat waktu yang tersedia" className="mb-0" />

      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate} className="bg-accent hover:bg-accent/90 gap-1.5 font-semibold">
          <Plus className="w-4 h-4" /> Buat Sesi Shooting
        </Button>
      </div>

      {sessionsLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-text-muted">
          <Video className="w-10 h-10 mx-auto mb-2 text-border" />
          <p className="text-sm font-semibold">Belum ada sesi shooting</p>
          <p className="text-xs mt-1">Klik "Buat Sesi Shooting" untuk menjadwalkan produksi.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted mb-2">Akan Datang</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-text-muted italic bg-white border border-border rounded-xl p-4">Tidak ada jadwal shooting mendatang — waktu kosong.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcoming.map((s) => <SessionCard key={s.id} s={s} />)}
              </div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted mb-2">Sudah Lewat</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
                {past.map((s) => <SessionCard key={s.id} s={s} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Session */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[520px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">{editingSession ? 'Edit Sesi Shooting' : 'Buat Sesi Shooting'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deal (opsional)</Label>
              <select
                value={selectedDealId}
                onChange={(e) => { setSelectedDealId(e.target.value); setLinkedScheduleId('') }}
                className="w-full h-9 text-xs border border-border rounded-md px-2 bg-white"
              >
                <option value="">— Tidak terkait Deal tertentu —</option>
                {deals.map((d: any) => {
                  const brandName = d.brands?.name || d.brands?.nama_brand
                  const dealTitle = d.title || d.nama_campaign || 'Deal'
                  return (
                    <option key={d.id} value={d.id}>
                      {brandName ? `${brandName} — ${dealTitle}` : dealTitle}
                    </option>
                  )
                })}
              </select>
              <p className="text-[10px] text-text-muted">Memilih Deal akan menyaring pilihan Content di bawah ke Content milik Deal tersebut.</p>
            </div>

            {selectedDealId && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sumber Tanggal</Label>
                <select
                  value={linkedScheduleId}
                  onChange={(e) => selectMilestoneSource(e.target.value)}
                  className="w-full h-9 text-xs border border-border rounded-md px-2 bg-white"
                >
                  <option value="">Tanggal manual</option>
                  {milestonesForSelectedDeal.map((m) => (
                    <option key={m.id} value={m.id}>
                      Existing SOW Shooting — {formatDate(m.date)}
                    </option>
                  ))}
                </select>
                {linkedScheduleId && (
                  <p className="text-[10px] text-accent">
                    Tanggal sesi ini mengikuti tanggal SOW Milestone terkait — ubah tanggalnya lewat tab Schedule di Deal jika perlu.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs font-semibold">Tanggal <span className="text-error">*</span></Label>
                <Input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                  disabled={!!linkedScheduleId}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mulai</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Selesai</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lokasi</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="misal Studio A / Lokasi client" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <Label className="text-xs font-semibold">Content yang akan diproduksi ({selectedContentIds.size} dipilih)</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-muted" />
                <Input value={contentSearch} onChange={(e) => setContentSearch(e.target.value)} placeholder="Cari judul atau No. Video..." className="h-8 text-xs pl-8" />
              </div>
              <div className="max-h-64 overflow-y-auto border border-border rounded-lg divide-y divide-border/60">
                {filteredPickerVideos.length === 0 ? (
                  <p className="text-xs text-text-muted p-3 text-center">Tidak ada content.</p>
                ) : (
                  filteredPickerVideos.map((v) => {
                    const isSelected = selectedContentIds.has(v.id)
                    const assignedElsewhere = v.shooting_session_id && v.shooting_session_id !== editingSession?.id
                    return (
                      <label key={v.id} className={cn('flex items-center gap-2.5 p-2.5 text-xs cursor-pointer hover:bg-subtle', isSelected && 'bg-accent-light/40')}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleContent(v.id)} className="accent-accent" />
                        <span className="flex-1 min-w-0">
                          <ContentIdentity videoNo={v.no_video} judul={v.judul} />
                          {assignedElsewhere && (
                            <span className="block text-[10px] text-amber-600 mt-0.5">⚠ Sudah ada di sesi lain — memilih akan memindahkannya ke sini</span>
                          )}
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            <div className="pt-4 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Simpan Sesi
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setSheetOpen(false)}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 text-error" />
            </div>
            <DialogTitle className="text-base text-text-primary">Hapus sesi shooting ini?</DialogTitle>
            <DialogDescription className="text-xs text-text-secondary pt-1">
              Sesi akan dihapus, tapi Content yang tertaut TIDAK akan dihapus — hanya tautannya ke sesi ini yang dilepas.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>Batal</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="bg-error hover:bg-error/90 text-white font-semibold">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Ya, Hapus Sesi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
