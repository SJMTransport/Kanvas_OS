'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const KAMERA_OPTIONS = ['Sony FX3', 'iPhone', 'GoPro', 'DSLR']
const AUDIO_OPTIONS = ['Lav Mic', 'Shotgun', 'Wireless']
const STABILIZER_OPTIONS = ['Gimbal', 'Tripod', 'Slider']

interface EquipmentData {
  equipment_kamera: string[]
  equipment_lensa: string
  equipment_audio: string[]
  equipment_stabilizer: string[]
  equipment_lighting: string
  equipment_drone: boolean
  equipment_drone_type: string
  equipment_notes: string
}

interface Props {
  data: EquipmentData
  onChange: (field: string, value: unknown) => void
}

function CheckboxGroup({
  label, options, selected, onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (val: string[]) => void
}) {
  const [custom, setCustom] = useState('')
  const [allOptions, setAllOptions] = useState(options)

  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt])
  }

  function addCustom() {
    if (!custom.trim()) return
    const val = custom.trim()
    if (!allOptions.includes(val)) setAllOptions((p) => [...p, val])
    if (!selected.includes(val)) onChange([...selected, val])
    setCustom('')
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs text-text-muted">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border transition-colors',
              selected.includes(opt)
                ? 'bg-accent text-white border-accent'
                : 'border-border text-text-secondary hover:border-accent'
            )}
          >
            {opt}
          </button>
        ))}
        <div className="flex items-center gap-1">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="Custom..."
            className="h-7 text-xs w-24 px-2"
          />
          <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={addCustom}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function EquipmentSection({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <CheckboxGroup
        label="Kamera"
        options={KAMERA_OPTIONS}
        selected={data.equipment_kamera}
        onChange={(v) => onChange('equipment_kamera', v)}
      />

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Lensa</Label>
        <Input
          value={data.equipment_lensa}
          onChange={(e) => onChange('equipment_lensa', e.target.value)}
          placeholder="24-70mm f/2.8..."
          className="h-8 text-sm"
        />
      </div>

      <CheckboxGroup
        label="Audio"
        options={AUDIO_OPTIONS}
        selected={data.equipment_audio}
        onChange={(v) => onChange('equipment_audio', v)}
      />

      <CheckboxGroup
        label="Stabilizer"
        options={STABILIZER_OPTIONS}
        selected={data.equipment_stabilizer}
        onChange={(v) => onChange('equipment_stabilizer', v)}
      />

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Lighting</Label>
        <Input
          value={data.equipment_lighting}
          onChange={(e) => onChange('equipment_lighting', e.target.value)}
          placeholder="LED panel, Softbox..."
          className="h-8 text-sm"
        />
      </div>

      <div className="flex items-center justify-between py-1">
        <Label className="text-sm">Drone</Label>
        <Switch
          checked={data.equipment_drone}
          onCheckedChange={(v) => onChange('equipment_drone', v)}
        />
      </div>

      {data.equipment_drone && (
        <div className="space-y-1.5 ml-4">
          <Label className="text-xs text-text-muted">Tipe Drone</Label>
          <Input
            value={data.equipment_drone_type}
            onChange={(e) => onChange('equipment_drone_type', e.target.value)}
            placeholder="DJI Mavic 3..."
            className="h-8 text-sm"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Catatan Equipment</Label>
        <Input
          value={data.equipment_notes}
          onChange={(e) => onChange('equipment_notes', e.target.value)}
          placeholder="Catatan tambahan..."
          className="h-8 text-sm"
        />
      </div>
    </div>
  )
}
