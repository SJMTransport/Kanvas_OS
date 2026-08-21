'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

// Phase 03E — the ONE canonical, always-visible control for moving Content
// through its workflow. Writes only videos.production_status — the single
// dimension that actually drives the computed lifecycle's Idea/Scripting/
// Produksi/Editing/Siap Tayang stages (per computeContentLifecycleStage in
// lib/operations/rules.ts). It never writes videos.status (legacy) and
// never invents a combined/derived status field.
//
// Approval and Publishing are deliberately NOT edited here:
// - Approval already has a richer, correct UI (with notes + audit
//   history) on Content Detail's Brand tab — duplicating a second,
//   notes-less approval editor here would create two write surfaces for
//   the same field. Not done.
// - "Terjadwal"/"Live" are earned by real actions (creating a schedule,
//   marking it posted in the Distribution tab) — publishing_status itself
//   is a separate manual field that computeContentLifecycleStage does not
//   even read; surfacing it as a primary lifecycle control would mislead
//   users into thinking it moves the visual stepper, when only a real
//   schedule does. Not done, to avoid inventing a false transition.

interface ContentLifecycleControlProps {
  videoId: string
  productionStatus?: string | null
  onGoToBrandTab?: () => void
  onGoToDistributionTab?: () => void
}

const PRODUCTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'scripting', label: 'Scripting' },
  { value: 'production', label: 'Produksi' },
  { value: 'editing', label: 'Editing' },
  { value: 'ready', label: 'Siap Tayang (Produksi Selesai)' },
]

export function ContentLifecycleControl({ videoId, productionStatus, onGoToBrandTab, onGoToDistributionTab }: ContentLifecycleControlProps) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(productionStatus || 'idea')
  const [saving, setSaving] = useState(false)

  async function handleChange(next: string) {
    const previous = value
    setValue(next)
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('videos').update({ production_status: next }).eq('id', videoId)
      if (error) {
        console.error('Failed to update production_status:', error)
        throw error
      }
      toast.success('Status produksi diperbarui')
      queryClient.invalidateQueries({ queryKey: ['video-detail', videoId] })
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    } catch (err) {
      toast.error('Gagal mengubah status produksi')
      setValue(previous)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={value} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-8 w-[220px] text-xs bg-white">
          {saving ? (
            <span className="flex items-center gap-1.5 text-text-muted"><Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...</span>
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent>
          {PRODUCTION_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-[11px] text-text-muted">
        Approval →{' '}
        <button type="button" onClick={onGoToBrandTab} className="text-accent hover:underline font-medium">tab Brand</button>
        {' · '}Jadwal →{' '}
        <button type="button" onClick={onGoToDistributionTab} className="text-accent hover:underline font-medium">tab Distribusi</button>
      </span>
    </div>
  )
}
