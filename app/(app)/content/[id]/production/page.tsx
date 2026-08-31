'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ShotListSection } from '@/components/production/ShotListSection'
import { TalentSection } from '@/components/production/TalentSection'
import { EquipmentSection } from '@/components/production/EquipmentSection'
import { CaptionSection } from '@/components/production/CaptionSection'
import { MoodboardSection } from '@/components/production/MoodboardSection'
import { toast } from 'sonner'
import { ArrowLeft, Download, Loader2, Video } from 'lucide-react'
import { getStatusBadgeClass, STATUS_CONFIG } from '@/lib/utils/status'
import { cn } from '@/lib/utils'
import type { VideoStatus } from '@/lib/types'

const EDITING_ITEMS = [
  'Rough cut', 'Color grading', 'Sound mixing',
  'Subtitle / Caption', 'Thumbnail', 'Review owner', 'Final export',
]

const SOFTWARE_OPTIONS = ['Premiere Pro', 'CapCut', 'DaVinci Resolve', 'Final Cut', 'Lainnya']

type PS = Record<string, any>

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="font-heading font-semibold text-sm text-accent uppercase tracking-wide whitespace-nowrap">{title}</h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function AutoSaveTextarea({ psKey, value, label, placeholder, rows = 3, onSave }: {
  psKey: string; value: string; label: string; placeholder?: string; rows?: number
  onSave: (key: string, val: string) => Promise<void>
}) {
  const [local, setLocal] = useState(value)
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-text-muted">{label}</Label>
      <Textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onSave(psKey, local) }}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  )
}

function AutoSaveInput({ psKey, value, label, placeholder, type = 'text', suffix, onSave }: {
  psKey: string; value: string; label: string; placeholder?: string; type?: string; suffix?: string
  onSave: (key: string, val: string) => Promise<void>
}) {
  const [local, setLocal] = useState(value)
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-text-muted">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type={type}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => { if (local !== value) onSave(psKey, local) }}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
        {suffix && <span className="text-sm text-text-muted shrink-0">{suffix}</span>}
      </div>
    </div>
  )
}

export default function ProductionSheetPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const [exporting, setExporting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['production', id],
    queryFn: async () => {
      const supabase = createClient()
      const [
        { data: video },
        { data: ps },
        { data: shots },
        { data: talents },
        { data: moodboard },
        { data: editingChecklist },
      ] = await Promise.all([
        supabase.from('videos').select('id, judul, format, tema, status, thumbnail_url').eq('id', id).single(),
        supabase.from('production_sheets').select('*').eq('video_id', id).maybeSingle(),
        supabase.from('shot_list').select('*').eq('video_id', id).order('sort_order'),
        supabase.from('talent_list').select('*').eq('video_id', id).order('sort_order'),
        supabase.from('moodboard').select('*').eq('video_id', id).order('sort_order'),
        supabase.from('editing_checklists').select('*').eq('video_id', id),
      ])
      return { video, ps: ps ?? {}, shots: shots ?? [], talents: talents ?? [], moodboard: moodboard ?? [], editingChecklist: editingChecklist ?? [] }
    },
  })

  const [psState, setPsState] = useState<PS>({})
  const [editingChecks, setEditingChecks] = useState<Record<string, boolean>>({})

  // Merge query data into local state once loaded
  const initialized = useState(false)
  if (data && !initialized[0]) {
    initialized[1](true)
    setPsState(data.ps ?? {})
    const checks: Record<string, boolean> = {}
    ;(data.editingChecklist ?? []).forEach((c: any) => { checks[c.item] = c.is_done })
    setEditingChecks(checks)
  }

  const saveField = useCallback(async (key: string, value: unknown) => {
    setPsState((p) => ({ ...p, [key]: value }))
    try {
      const supabase = createClient()
      await supabase.from('production_sheets').upsert(
        { video_id: id, [key]: value },
        { onConflict: 'video_id' }
      )
    } catch { toast.error('Gagal menyimpan') }
  }, [id])

  async function toggleEditingCheck(item: string) {
    const newVal = !editingChecks[item]
    setEditingChecks((p) => ({ ...p, [item]: newVal }))
    const supabase = createClient()
    await supabase.from('editing_checklists').upsert(
      { video_id: id, item, is_done: newVal },
      { onConflict: 'video_id,item' }
    )
  }

  async function exportPDF() {
    setExporting(true)
    try {
      const { ProductionPDF } = await import('@/components/production/ProductionPDF')
      const { pdf } = await import('@react-pdf/renderer')
      const { createElement } = await import('react')
      const blob = await (pdf as any)(createElement(ProductionPDF as any, {
        video: data!.video!,
        ps: psState,
        shots: data!.shots,
        talents: data!.talents,
        workspaceName: 'Kanvas OS',
      })).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `production-sheet-${data!.video!.judul.slice(0, 30)}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Gagal export PDF') } finally { setExporting(false) }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    )
  }

  const video = data?.video
  if (!video) return <div className="p-8 text-text-muted">Video tidak ditemukan.</div>

  const durMin = psState.estimasi_durasi ? Math.floor(psState.estimasi_durasi / 60) : 0
  const durSec = psState.estimasi_durasi ? psState.estimasi_durasi % 60 : 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-12">
      {/* Top nav */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/content')} className="text-text-muted hover:text-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-text-muted text-sm">Video Banking</span>
      </div>

      {/* Header card */}
      <div className="bg-white border border-border rounded-xl p-4 flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-subtle shrink-0 flex items-center justify-center">
          {video.thumbnail_url
            ? <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
            : <Video className="w-5 h-5 text-border" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-lg font-bold text-text-primary">{video.judul}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {video.format && <span className="text-xs text-text-muted">{video.format}</span>}
            {video.tema && <span className="text-xs text-text-muted">· {video.tema}</span>}
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', getStatusBadgeClass(video.status as VideoStatus))}>
              {STATUS_CONFIG[video.status as VideoStatus]?.label ?? video.status}
            </span>
          </div>
        </div>
        <Button onClick={exportPDF} disabled={exporting} variant="outline" size="sm" className="shrink-0">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
          Export PDF
        </Button>
      </div>

      <div className="space-y-10">
        {/* Section 1 — Overview */}
        <section>
          <SectionHeading title="1. Overview" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AutoSaveInput psKey="lokasi_shooting" value={psState.lokasi_shooting ?? ''} label="Lokasi Shooting" placeholder="Studio, outdoor, lokasi A..." onSave={saveField} />
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">Estimasi Durasi</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={durMin} placeholder="0"
                  onChange={(e) => { const m = parseInt(e.target.value) || 0; setPsState((p) => ({ ...p, estimasi_durasi: m * 60 + durSec })) }}
                  onBlur={() => saveField('estimasi_durasi', psState.estimasi_durasi ?? 0)}
                  className="h-8 text-sm w-20"
                />
                <span className="text-sm text-text-muted">menit</span>
                <Input type="number" min={0} max={59} value={durSec} placeholder="0"
                  onChange={(e) => { const s = parseInt(e.target.value) || 0; setPsState((p) => ({ ...p, estimasi_durasi: durMin * 60 + s })) }}
                  onBlur={() => saveField('estimasi_durasi', psState.estimasi_durasi ?? 0)}
                  className="h-8 text-sm w-20"
                />
                <span className="text-sm text-text-muted">detik</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — Script */}
        <section>
          <SectionHeading title="2. Script" />
          <div className="space-y-4">
            <AutoSaveTextarea psKey="hook" value={psState.hook ?? ''} label="Hook" placeholder="Kalimat pembuka yang menarik perhatian..." rows={2} onSave={saveField} />
            <AutoSaveTextarea psKey="body" value={psState.body ?? ''} label="Body" placeholder="Isi konten utama..." rows={5} onSave={saveField} />
            <AutoSaveTextarea psKey="cta" value={psState.cta ?? ''} label="CTA (Call to Action)" placeholder="Ajakan di akhir video..." rows={2} onSave={saveField} />
            <AutoSaveTextarea psKey="insight" value={psState.insight ?? ''} label="Insight / Director's Note" placeholder="Catatan khusus untuk tim produksi..." rows={2} onSave={saveField} />
            <AutoSaveTextarea psKey="on_screen_text" value={psState.on_screen_text ?? ''} label="On-Screen Text" placeholder="Teks yang muncul di layar (satu per baris)..." rows={3} onSave={saveField} />
          </div>
        </section>

        {/* Section 3 — Shot List */}
        <section>
          <SectionHeading title="3. Shot List" />
          <ShotListSection videoId={id} initialShots={data?.shots ?? []} />
        </section>

        {/* Section 4 — Equipment */}
        <section>
          <SectionHeading title="4. Equipment" />
          <EquipmentSection
            data={{
              equipment_kamera: psState.equipment_kamera ?? [],
              equipment_lensa: psState.equipment_lensa ?? '',
              equipment_audio: psState.equipment_audio ?? [],
              equipment_stabilizer: psState.equipment_stabilizer ?? [],
              equipment_lighting: psState.equipment_lighting ?? '',
              equipment_drone: psState.equipment_drone ?? false,
              equipment_drone_type: psState.equipment_drone_type ?? '',
              equipment_notes: psState.equipment_notes ?? '',
            }}
            onChange={(field, value) => saveField(field, value)}
          />
        </section>

        {/* Section 5 — Talent */}
        <section>
          <SectionHeading title="5. Talent & Narasumber" />
          <TalentSection videoId={id} initialTalents={data?.talents ?? []} />
        </section>

        {/* Section 6 — Audio & Music */}
        <section>
          <SectionHeading title="6. Audio & Music" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AutoSaveInput psKey="background_music" value={psState.background_music ?? ''} label="Background Music" placeholder="Judul / artis..." onSave={saveField} />
            <AutoSaveInput psKey="background_music_link" value={psState.background_music_link ?? ''} label="Link Referensi" placeholder="https://..." onSave={saveField} />
            <AutoSaveInput psKey="sound_effect" value={psState.sound_effect ?? ''} label="Sound Effect" placeholder="Deskripsi SFX..." onSave={saveField} />
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">Voice Over</Label>
              <Switch
                checked={psState.voice_over ?? false}
                onCheckedChange={(v) => saveField('voice_over', v)}
              />
            </div>
          </div>
        </section>

        {/* Section 7 — Caption & Distribution */}
        <section>
          <SectionHeading title="7. Caption & Distribution" />
          <CaptionSection
            data={{
              caption_default: psState.caption_default ?? '',
              hashtags: psState.hashtags ?? [],
              caption_tiktok: psState.caption_tiktok ?? '',
              caption_instagram: psState.caption_instagram ?? '',
              caption_youtube: psState.caption_youtube ?? '',
              caption_facebook: psState.caption_facebook ?? '',
            }}
            onChange={(field, value) => saveField(field, value)}
          />
        </section>

        {/* Section 8 — Referensi Visual */}
        <section>
          <SectionHeading title="8. Referensi Visual" />
          <MoodboardSection
            videoId={id}
            initialItems={data?.moodboard ?? []}
            refUrls={psState.referensi_video_urls ?? []}
            onRefUrlsChange={(urls) => saveField('referensi_video_urls', urls)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <AutoSaveInput psKey="color_palette" value={psState.color_palette ?? ''} label="Color Palette" placeholder="Earth tone, Navy + Gold..." onSave={saveField} />
            <AutoSaveTextarea psKey="style_note" value={psState.style_note ?? ''} label="Style Note" placeholder="Catatan gaya visual..." rows={2} onSave={saveField} />
          </div>
        </section>

        {/* Section 9 — Editing Notes */}
        <section>
          <SectionHeading title="9. Editing Notes" />
          <div className="space-y-5">
            <div>
              <Label className="text-xs text-text-muted mb-3 block">Checklist Editing</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EDITING_ITEMS.map((item) => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={editingChecks[item] ?? false}
                      onChange={() => toggleEditingCheck(item)}
                      className="w-4 h-4 accent-accent rounded"
                    />
                    <span className={cn('text-sm transition-colors', editingChecks[item] ? 'text-text-primary line-through text-text-muted' : 'text-text-secondary')}>
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <AutoSaveTextarea psKey="catatan_editor" value={psState.catatan_editor ?? ''} label="Catatan untuk Editor" placeholder="Arahan khusus editing..." rows={3} onSave={saveField} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-text-muted">Software Editing</Label>
                <Select
                  value={psState.software_editing ?? ''}
                  onValueChange={(v) => saveField('software_editing', v)}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih software" /></SelectTrigger>
                  <SelectContent>
                    {SOFTWARE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <AutoSaveInput psKey="preset_warna" value={psState.preset_warna ?? ''} label="Preset Warna" placeholder="Nama preset..." onSave={saveField} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
