'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Video, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ContentType } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultValues?: {
    judul?: string
    brand_id?: string
    is_endorsement?: boolean
    tema?: string
    caption_default?: string
  }
  workId?: string
  brandId?: string
  // Context inheritance from Deal/Deliverable (Phase 3, Part D/E): when
  // creating Content from inside a Deal or Deliverable, both are set so the
  // new video automatically inherits brand + deal + deliverable without
  // asking the user to re-select anything already known from context.
  dealId?: string
  deliverableId?: string
}

export function AddVideoSheet({ open, onOpenChange, defaultValues, workId, brandId, dealId, deliverableId }: Props) {
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const [judul, setJudul] = useState('')
  const [contentType, setContentType] = useState<ContentType>('video')
  const [saving, setSaving] = useState(false)

  const effectiveBrandId = brandId || defaultValues?.brand_id
  const effectiveIsEndorsement = Boolean(brandId || defaultValues?.is_endorsement || dealId)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!workspaceId || !judul.trim()) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Calculate next sort order
      const { data: minRow } = await supabase
        .from('videos')
        .select('sort_order')
        .eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single()
      const nextSortOrder = ((minRow?.sort_order ?? 0) as number) - 1

      // Payload contains only essential fields; format is left null
      const payload: Record<string, unknown> = {
        workspace_id: workspaceId,
        created_by: user?.id ?? null,
        judul: judul.trim(),
        content_type: contentType,
        status: 'ide',
        sort_order: nextSortOrder,
        is_endorsement: effectiveIsEndorsement,
        brand_id: effectiveBrandId || null,
        deal_id: dealId || null,
        tema: defaultValues?.tema || null,
      }

      const { data: newVideo, error } = await supabase
        .from('videos')
        .insert(payload as any)
        .select('id')
        .single()

      if (error) throw new Error(error.message)

      // Context Inheritance: Auto-attach to Work if created inside /works/[id]
      if (workId && newVideo?.id) {
        const { error: workErr } = await supabase
          .from('work_items')
          .insert({
            work_id: workId,
            item_type: 'video',
            item_id: newVideo.id,
            sort_order: 0,
          })
        if (workErr) console.error('Failed to link video to work:', workErr)
      }

      // Context Inheritance: link to the Deliverable it was created from, so
      // this Content counts against that Deliverable immediately — the
      // entire point of creating from inside a Deliverable row.
      if (deliverableId && newVideo?.id) {
        const { error: delErr } = await supabase
          .from('content_deliverables')
          .insert({ content_id: newVideo.id, deliverable_id: deliverableId })
        if (delErr) console.error('Failed to link video to deliverable:', delErr)
      }

      toast.success(contentType === 'video' ? 'Konten video dibuat!' : 'Konten foto/carousel dibuat!')
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['work-items', workId] })
      queryClient.invalidateQueries({ queryKey: ['brand-videos', effectiveBrandId] })
      queryClient.invalidateQueries({ queryKey: ['deal-content-junctions', dealId] })

      setJudul('')
      onOpenChange(false)

      // Instantly open Content Detail for progressive disclosure
      if (newVideo?.id) {
        router.push(`/content/${newVideo.id}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat konten')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) setJudul(''); onOpenChange(v) }}>
      <SheetContent side="right" className="w-full sm:w-[420px] p-0">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle>Tambah Konten</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleCreate} className="px-6 py-6 space-y-6">
          {/* 1. Content Type Switcher */}
          <div className="space-y-2">
            <Label className="text-xs text-text-muted">Tipe Konten</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setContentType('video')}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all',
                  contentType === 'video'
                    ? 'border-accent bg-accent-light text-accent'
                    : 'border-border bg-white text-text-secondary hover:bg-subtle'
                )}
              >
                <Video className="w-4 h-4" />
                <span>Video</span>
              </button>
              <button
                type="button"
                onClick={() => setContentType('foto')}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all',
                  contentType === 'foto'
                    ? 'border-accent bg-accent-light text-accent'
                    : 'border-border bg-white text-text-secondary hover:bg-subtle'
                )}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Foto / Carousel</span>
              </button>
            </div>
          </div>

          {/* 2. Judul (1 Required Field) */}
          <div className="space-y-2">
            <Label htmlFor="judul" className="text-sm font-semibold">Judul Konten <span className="text-error">*</span></Label>
            <Input
              id="judul"
              placeholder={contentType === 'video' ? 'Contoh: QRIS di China...' : 'Contoh: Photo Dump Japan...'}
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              autoFocus
              className="text-sm"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
              Batal
            </Button>
            <Button type="submit" disabled={!judul.trim() || saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {saving ? 'Membuat...' : 'Buat Konten'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
