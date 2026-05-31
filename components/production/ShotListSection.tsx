'use client'

import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GripVertical, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Shot {
  id: string
  sort_order: number
  deskripsi: string
  durasi_detik: number | null
  angle: string | null
  keterangan: string | null
}

function SortableRow({ shot, onUpdate, onDelete }: {
  shot: Shot
  onUpdate: (id: string, field: string, value: string) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shot.id })

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('border-b border-border', isDragging && 'opacity-50 bg-accent-light')}
    >
      <td className="px-2 py-2 w-8">
        <button {...attributes} {...listeners} className="text-text-muted hover:text-accent cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-2 py-2 w-8 text-xs text-text-muted font-mono">{shot.sort_order + 1}</td>
      <td className="px-2 py-2">
        <Input
          value={shot.deskripsi}
          onChange={(e) => onUpdate(shot.id, 'deskripsi', e.target.value)}
          className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-accent rounded-none"
          placeholder="Deskripsi shot..."
        />
      </td>
      <td className="px-2 py-2 w-20">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={shot.durasi_detik ?? ''}
            onChange={(e) => onUpdate(shot.id, 'durasi_detik', e.target.value)}
            className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 w-12 text-center"
            placeholder="0"
          />
          <span className="text-xs text-text-muted">s</span>
        </div>
      </td>
      <td className="px-2 py-2 w-28">
        <Input
          value={shot.angle ?? ''}
          onChange={(e) => onUpdate(shot.id, 'angle', e.target.value)}
          className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
          placeholder="Wide, CU..."
        />
      </td>
      <td className="px-2 py-2">
        <Input
          value={shot.keterangan ?? ''}
          onChange={(e) => onUpdate(shot.id, 'keterangan', e.target.value)}
          className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
          placeholder="Catatan..."
        />
      </td>
      <td className="px-2 py-2 w-8">
        <button onClick={() => onDelete(shot.id)} className="text-text-muted hover:text-error transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}

export function ShotListSection({ videoId, initialShots }: { videoId: string; initialShots: Shot[] }) {
  const [shots, setShots] = useState<Shot[]>(initialShots)
  const [adding, setAdding] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor))

  async function addShot() {
    setAdding(true)
    try {
      const supabase = createClient()
      const newOrder = shots.length
      const { data, error } = await supabase
        .from('shot_list')
        .insert({ video_id: videoId, deskripsi: '', sort_order: newOrder })
        .select()
        .single()
      if (error) throw error
      setShots((p) => [...p, data as Shot])
    } catch { toast.error('Gagal menambah shot') } finally { setAdding(false) }
  }

  async function updateShot(id: string, field: string, value: string) {
    setShots((p) => p.map((s) => s.id === id ? { ...s, [field]: field === 'durasi_detik' ? (parseInt(value) || null) : value } : s))
    const supabase = createClient()
    await supabase.from('shot_list').update({ [field]: field === 'durasi_detik' ? (parseInt(value) || null) : (value || null) }).eq('id', id)
  }

  async function deleteShot(id: string) {
    setShots((p) => p.filter((s) => s.id !== id))
    const supabase = createClient()
    await supabase.from('shot_list').delete().eq('id', id)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = shots.findIndex((s) => s.id === active.id)
    const newIdx = shots.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(shots, oldIdx, newIdx).map((s, i) => ({ ...s, sort_order: i }))
    setShots(reordered)
    const supabase = createClient()
    await Promise.all(reordered.map((s) => supabase.from('shot_list').update({ sort_order: s.sort_order }).eq('id', s.id)))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-8" />
            <th className="px-2 py-1.5 text-left text-xs text-text-muted w-8">#</th>
            <th className="px-2 py-1.5 text-left text-xs text-text-muted">Deskripsi Shot</th>
            <th className="px-2 py-1.5 text-left text-xs text-text-muted w-20">Durasi</th>
            <th className="px-2 py-1.5 text-left text-xs text-text-muted w-28">Angle</th>
            <th className="px-2 py-1.5 text-left text-xs text-text-muted">Keterangan</th>
            <th className="w-8" />
          </tr>
        </thead>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={shots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {shots.map((shot) => (
                <SortableRow key={shot.id} shot={shot} onUpdate={updateShot} onDelete={deleteShot} />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
      <Button variant="ghost" size="sm" className="mt-2 text-accent" onClick={addShot} disabled={adding}>
        {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
        Tambah Shot
      </Button>
    </div>
  )
}
