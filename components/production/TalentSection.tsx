'use client'

import { useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GripVertical, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Talent {
  id: string
  sort_order: number
  nama: string
  role: string | null
  kontak: string | null
  catatan: string | null
}

function SortableRow({ talent, onUpdate, onDelete }: {
  talent: Talent
  onUpdate: (id: string, field: string, value: string) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: talent.id })

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
      {(['nama', 'role', 'kontak', 'catatan'] as const).map((field) => (
        <td key={field} className="px-2 py-2">
          <Input
            value={talent[field] ?? ''}
            onChange={(e) => onUpdate(talent.id, field, e.target.value)}
            className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
            placeholder={field === 'nama' ? 'Nama*' : field.charAt(0).toUpperCase() + field.slice(1)}
          />
        </td>
      ))}
      <td className="px-2 py-2 w-8">
        <button onClick={() => onDelete(talent.id)} className="text-text-muted hover:text-error transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}

export function TalentSection({ videoId, initialTalents }: { videoId: string; initialTalents: Talent[] }) {
  const [talents, setTalents] = useState<Talent[]>(initialTalents)
  const [adding, setAdding] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor))

  async function addTalent() {
    setAdding(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('talent_list')
        .insert({ video_id: videoId, nama: '', sort_order: talents.length })
        .select().single()
      if (error) throw error
      setTalents((p) => [...p, data as Talent])
    } catch { toast.error('Gagal menambah talent') } finally { setAdding(false) }
  }

  async function updateTalent(id: string, field: string, value: string) {
    setTalents((p) => p.map((t) => t.id === id ? { ...t, [field]: value } : t))
    const supabase = createClient()
    await supabase.from('talent_list').update({ [field]: value || null }).eq('id', id)
  }

  async function deleteTalent(id: string) {
    setTalents((p) => p.filter((t) => t.id !== id))
    const supabase = createClient()
    await supabase.from('talent_list').delete().eq('id', id)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = talents.findIndex((t) => t.id === active.id)
    const newIdx = talents.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(talents, oldIdx, newIdx).map((t, i) => ({ ...t, sort_order: i }))
    setTalents(reordered)
    const supabase = createClient()
    await Promise.all(reordered.map((t) => supabase.from('talent_list').update({ sort_order: t.sort_order }).eq('id', t.id)))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-8" />
            {['Nama', 'Role', 'Kontak', 'Catatan'].map((h) => (
              <th key={h} className="px-2 py-1.5 text-left text-xs text-text-muted">{h}</th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={talents.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {talents.map((talent) => (
                <SortableRow key={talent.id} talent={talent} onUpdate={updateTalent} onDelete={deleteTalent} />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
      <Button variant="ghost" size="sm" className="mt-2 text-accent" onClick={addTalent} disabled={adding}>
        {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
        Tambah Talent
      </Button>
    </div>
  )
}
