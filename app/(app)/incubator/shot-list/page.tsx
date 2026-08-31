'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, X, Plus, Loader2, Trash2, Pencil, Clapperboard, Play, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/page-header'
import { PageToolbar, SearchInput } from '@/components/layout/page-toolbar'
import { Badge } from '@/components/ui/badge'
import { WorkspaceTableRow, WorkspaceTableCell, WorkspaceTableHeaderCell } from '@/components/ui/table-row'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { KATEGORI_SHOT, TIPE_SHOT, type ShotListReference, type KategoriShot, type TipeShot } from '@/lib/types/incubator'

const KATEGORI_COLORS: Record<string, string> = {
  Opening: 'bg-blue-50 text-blue-700 border-blue-200',
  'B-roll': 'bg-purple-50 text-purple-700 border-purple-200',
  PTC: 'bg-rose-50 text-rose-700 border-rose-200',
  Detail: 'bg-teal-50 text-teal-700 border-teal-200',
  Reaction: 'bg-pink-50 text-pink-700 border-pink-200',
  Transisi: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Closing: 'bg-slate-50 text-slate-700 border-slate-200',
  'Halal Food': 'bg-green-50 text-green-700 border-green-200',
}

const TIPE_COLORS: Record<string, string> = {
  Wide: 'bg-amber-50 text-amber-700 border-amber-200',
  Medium: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Close: 'bg-orange-50 text-orange-700 border-orange-200',
  Detail: 'bg-lime-50 text-lime-700 border-lime-200',
  Drone: 'bg-sky-50 text-sky-700 border-sky-200',
  POV: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
}

function extractDriveFileId(link: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ]
  for (const re of patterns) {
    const m = link.match(re)
    if (m) return m[1]
  }
  return null
}

function driveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
}

function driveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`
}

function previewTransformStyle(zoom: number, offsetY: number): React.CSSProperties {
  return {
    transform: `scale(${zoom}) translateY(${offsetY}%)`,
    transformOrigin: 'center center',
  }
}

export default function ShotListPage() {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [kategoriFilter, setKategoriFilter] = useState<string | null>(null)
  const [tipeFilter, setTipeFilter] = useState<string | null>(null)
  const [feedIndex, setFeedIndex] = useState<number | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ShotListReference | null>(null)
  const [saving, setSaving] = useState(false)
  const [driveLink, setDriveLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [kategoriShot, setKategoriShot] = useState<KategoriShot>('B-roll')
  const [tipeShot, setTipeShot] = useState<TipeShot>('Wide')
  const [deskripsi, setDeskripsi] = useState('')
  const [sumber, setSumber] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [catatan, setCatatan] = useState('')
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewOffsetY, setPreviewOffsetY] = useState(0)

  const { data: items = [], isLoading } = useQuery<ShotListReference[]>({
    queryKey: ['shot-list', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('shot_list_references')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
      return (data ?? []) as ShotListReference[]
    },
    enabled: !!workspaceId,
  })

  const filtered = items.filter((item) => {
    if (search) {
      const q = search.toLowerCase()
      const inDeskripsi = item.deskripsi.toLowerCase().includes(q)
      const inTags = (item.tags ?? []).some((t) => t.toLowerCase().includes(q))
      if (!inDeskripsi && !inTags) return false
    }
    if (kategoriFilter && item.kategori_shot !== kategoriFilter) return false
    if (tipeFilter && item.tipe_shot !== tipeFilter) return false
    return true
  })

  const feedItem = feedIndex != null ? filtered[feedIndex] ?? null : null

  function openFeed(index: number) {
    setFeedIndex(index)
  }

  function closeFeed() {
    setFeedIndex(null)
  }

  function feedNav(dir: 1 | -1) {
    setFeedIndex((i) => (i == null ? null : Math.max(0, Math.min(filtered.length - 1, i + dir))))
  }

  useEffect(() => {
    if (feedIndex == null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); feedNav(1) }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); feedNav(-1) }
      if (e.key === 'Escape') closeFeed()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedIndex, filtered.length])

  function resetForm() {
    setEditing(null)
    setDriveLink('')
    setLinkError('')
    setKategoriShot('B-roll')
    setTipeShot('Wide')
    setDeskripsi('')
    setSumber('')
    setTagsInput('')
    setCatatan('')
    setPreviewZoom(1)
    setPreviewOffsetY(0)
  }

  function openAdd() {
    resetForm()
    setFormOpen(true)
  }

  function openEdit(item: ShotListReference) {
    setEditing(item)
    setDriveLink(item.drive_link)
    setLinkError('')
    setKategoriShot(item.kategori_shot)
    setTipeShot(item.tipe_shot)
    setDeskripsi(item.deskripsi)
    setSumber(item.sumber ?? '')
    setTagsInput((item.tags ?? []).join(', '))
    setCatatan(item.catatan ?? '')
    setPreviewZoom(item.preview_zoom ?? 1)
    setPreviewOffsetY(item.preview_offset_y ?? 0)
    setFormOpen(true)
  }

  async function handleSubmit() {
    setLinkError('')
    if (!deskripsi.trim()) {
      toast.error('Deskripsi wajib diisi')
      return
    }
    const fileId = extractDriveFileId(driveLink.trim())
    if (!fileId) {
      setLinkError('Link Google Drive tidak valid. Gunakan format: drive.google.com/file/d/FILE_ID/view')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        workspace_id: workspaceId,
        drive_link: driveLink.trim(),
        drive_file_id: fileId,
        deskripsi: deskripsi.trim(),
        kategori_shot: kategoriShot,
        tipe_shot: tipeShot,
        sumber: sumber.trim() || null,
        tags: tagsInput.trim() ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [],
        catatan: catatan.trim() || null,
        preview_zoom: previewZoom,
        preview_offset_y: previewOffsetY,
      }

      if (editing) {
        const { error } = await supabase.from('shot_list_references').update(payload).eq('id', editing.id)
        if (error) throw new Error(error.message)
        toast.success('Referensi diperbarui')
      } else {
        const { error } = await supabase.from('shot_list_references').insert(payload)
        if (error) throw new Error(error.message)
        toast.success('Referensi ditambahkan')
      }

      queryClient.invalidateQueries({ queryKey: ['shot-list', workspaceId] })
      setFormOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, item: ShotListReference) {
    e.stopPropagation()
    if (!confirm(`Hapus referensi "${item.deskripsi}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('shot_list_references').delete().eq('id', item.id)
    if (error) { toast.error('Gagal menghapus: ' + error.message); return }
    toast.success('Referensi dihapus')
    queryClient.invalidateQueries({ queryKey: ['shot-list', workspaceId] })
  }

  return (
    <PageContainer className="flex flex-col h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)] min-h-0 space-y-4">
      <PageHeader
        title="Shot List"
        subtitle="Pustaka referensi shot untuk produksi"
        className="mb-0"
      />

      {/* Toolbar — search & filters */}
      <PageToolbar
        left={
          <div className="flex items-center gap-2 flex-nowrap min-w-0 overflow-x-auto no-scrollbar whitespace-nowrap">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari deskripsi, tags..."
            />

            <Select value={kategoriFilter ?? 'all'} onValueChange={(v) => setKategoriFilter(v === 'all' ? null : v)}>
              <SelectTrigger className="h-10 text-sm w-40 rounded-[12px] border-[#E8EEEC] bg-white whitespace-nowrap">
                <SelectValue placeholder="Kategori Shot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {KATEGORI_SHOT.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tipeFilter ?? 'all'} onValueChange={(v) => setTipeFilter(v === 'all' ? null : v)}>
              <SelectTrigger className="h-10 text-sm w-36 rounded-[12px] border-[#E8EEEC] bg-white whitespace-nowrap">
                <SelectValue placeholder="Tipe Shot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {TIPE_SHOT.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        right={
          <Button size="lg" className="h-10 gap-1.5 text-sm font-semibold rounded-[12px] bg-[#4C9998] hover:bg-[#287978] text-white" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Shot
          </Button>
        }
      />

      {/* Data Table */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full rounded-[12px]" />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0 bg-white">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#F7FAF9] border-b border-[#E8EEEC] z-10">
                <tr>
                  <WorkspaceTableHeaderCell>Thumbnail</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Shot</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Category</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Shot Type</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Source</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell align="right">Actions</WorkspaceTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Clapperboard className="w-10 h-10 text-[#4C9998]/40 mx-auto mb-2" />
                      <p className="text-text-muted text-sm font-medium">
                        {items.length === 0 ? 'Belum ada referensi shot list' : 'Tidak ada referensi sesuai filter'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, index) => (
                    <WorkspaceTableRow
                      key={item.id}
                      onClick={() => openFeed(index)}
                    >
                      <WorkspaceTableCell className="w-[50px]">
                        <div className="relative w-9 h-9 rounded-md overflow-hidden bg-black shrink-0 border border-border/60">
                          <img
                            src={driveThumbnailUrl(item.drive_file_id)}
                            alt={item.deskripsi}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/35 transition-colors">
                            <Play className="w-3 h-3 text-white fill-current" />
                          </div>
                        </div>
                      </WorkspaceTableCell>

                    <WorkspaceTableCell className="max-w-[320px]">
                      <p className="font-semibold text-text-primary text-sm line-clamp-2">{item.deskripsi}</p>
                    </WorkspaceTableCell>

                    <WorkspaceTableCell>
                      <Badge variant="outline" className={cn('h-6 rounded-full px-2.5 text-xs font-medium', KATEGORI_COLORS[item.kategori_shot])}>
                        {item.kategori_shot}
                      </Badge>
                    </WorkspaceTableCell>

                    <WorkspaceTableCell>
                      <Badge variant="outline" className={cn('h-6 rounded-full px-2.5 text-xs font-medium', TIPE_COLORS[item.tipe_shot])}>
                        {item.tipe_shot}
                      </Badge>
                    </WorkspaceTableCell>

                    <WorkspaceTableCell className="text-xs text-text-secondary max-w-[140px] truncate">
                      {item.sumber || '—'}
                    </WorkspaceTableCell>

                    <WorkspaceTableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1 rounded-[8px] hover:bg-subtle text-text-secondary hover:text-text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, item)}
                          className="p-1 rounded-[8px] hover:bg-subtle text-text-muted hover:text-error transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </WorkspaceTableCell>
                    </WorkspaceTableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fullscreen preview with prev/next navigation */}
      {feedItem && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 gap-4">
          <button
            onClick={closeFeed}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 flex-1 min-h-0 w-full justify-center">
            <button
              onClick={() => feedNav(-1)}
              disabled={feedIndex === 0}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl h-[75vh] max-h-[75vh] aspect-[9/16]">
              <iframe
                key={feedItem.id}
                src={driveEmbedUrl(feedItem.drive_file_id)}
                className="absolute inset-0 w-full h-full"
                style={previewTransformStyle(feedItem.preview_zoom ?? 1, feedItem.preview_offset_y ?? 0)}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>

            <button
              onClick={() => feedNav(1)}
              disabled={feedIndex === filtered.length - 1}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full max-w-md text-center space-y-1.5 shrink-0">
            <p className="text-white text-sm font-medium">{feedItem.deskripsi}</p>
            <div className="flex flex-wrap justify-center gap-1">
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', KATEGORI_COLORS[feedItem.kategori_shot])}>
                {feedItem.kategori_shot}
              </span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', TIPE_COLORS[feedItem.tipe_shot])}>
                {feedItem.tipe_shot}
              </span>
              {(feedItem.tags ?? []).map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">#{t}</span>
              ))}
            </div>
            {feedItem.sumber && <p className="text-white/50 text-xs">{feedItem.sumber}</p>}
            <p className="text-white/40 text-[11px] tabular-nums">{(feedIndex ?? 0) + 1} / {filtered.length}</p>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Referensi' : 'Tambah Referensi'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Link Google Drive</Label>
              <Input
                value={driveLink}
                onChange={(e) => { setDriveLink(e.target.value); setLinkError('') }}
                placeholder="https://drive.google.com/file/d/FILE_ID/view"
                className="h-8 text-sm"
              />
              {linkError && <p className="text-[11px] text-error">{linkError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori Shot</Label>
                <Select value={kategoriShot} onValueChange={(v) => setKategoriShot(v as KategoriShot)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KATEGORI_SHOT.map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipe Shot</Label>
                <Select value={tipeShot} onValueChange={(v) => setTipeShot(v as TipeShot)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPE_SHOT.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi</Label>
              <Textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Deskripsi teknik shot..." rows={2} className="text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Sumber</Label>
              <Input value={sumber} onChange={(e) => setSumber(e.target.value)} placeholder="Nama sumber / referensi" className="h-8 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tags</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="cinematic, slow-motion, golden-hour" className="h-8 text-sm" />
              <p className="text-[10px] text-text-muted">Pisahkan dengan koma</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Catatan (opsional)</Label>
              <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan..." rows={2} className="text-sm" />
            </div>

            {(() => {
              const previewFileId = extractDriveFileId(driveLink.trim())
              if (!previewFileId) return null
              return (
                <div className="space-y-2 border-t border-border pt-3">
                  <Label className="text-xs">Sesuaikan Framing Preview</Label>
                  <p className="text-[10px] text-text-muted -mt-1">
                    Kalau video sumbernya berisi UI/chrome ekstra (mis. rekaman layar), atur zoom &amp; geser supaya subjek utama terlihat center.
                  </p>
                  <div className="relative w-24 mx-auto aspect-[9/16] bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={driveEmbedUrl(previewFileId)}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={previewTransformStyle(previewZoom, previewOffsetY)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] text-text-muted">Zoom</Label>
                      <span className="text-[11px] text-text-muted tabular-nums">{previewZoom.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={previewZoom}
                      onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] text-text-muted">Geser Vertikal</Label>
                      <span className="text-[11px] text-text-muted tabular-nums">{previewOffsetY}%</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={previewOffsetY}
                      onChange={(e) => setPreviewOffsetY(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                  {(previewZoom !== 1 || previewOffsetY !== 0) && (
                    <button
                      type="button"
                      onClick={() => { setPreviewZoom(1); setPreviewOffsetY(0) }}
                      className="text-[11px] text-amber-600 hover:underline"
                    >
                      Reset ke default
                    </button>
                  )}
                </div>
              )
            })()}

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSubmit} disabled={saving || !deskripsi.trim() || !driveLink.trim()} className="h-8 text-xs">
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Menyimpan...</> : editing ? 'Simpan Perubahan' : 'Tambah'}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setFormOpen(false)}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
