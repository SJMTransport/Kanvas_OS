'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Platform } from '@/lib/types'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook']

interface Props {
  defaultDate: string
  onSuccess: () => void
  onCancel: () => void
}

export function QuickAdd({ defaultDate, onSuccess, onCancel }: Props) {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const [videoId, setVideoId] = useState('')
  const [platform, setPlatform] = useState<Platform>('tiktok')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('09:00')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const { data: videos } = useQuery({
    queryKey: ['videos-search', workspaceId, search],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      let q = supabase.from('videos').select('id, judul, status').eq('workspace_id', workspaceId).limit(20)
      if (search) q = q.ilike('judul', `%${search}%`)
      const { data } = await q
      return data ?? []
    },
    enabled: !!workspaceId,
  })

  async function handleSave() {
    if (!videoId || !platform || !date) {
      toast.error('Pilih video, platform, dan tanggal terlebih dahulu.')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('video_platform_schedules').insert({
        video_id: videoId,
        platform,
        tanggal_tayang: date,
        jam_post: time || null,
        status: 'scheduled',
      })
      if (error) throw error

      // Update video status to scheduled
      await supabase.from('videos').update({ status: 'scheduled' }).eq('id', videoId)

      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Jadwal berhasil ditambahkan!')
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Cari Video</Label>
        <Input
          placeholder="Ketik judul video..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVideoId('') }}
        />
        {videos && videos.length > 0 && !videoId && (
          <div className="border border-border rounded-md bg-white shadow-sm max-h-40 overflow-y-auto">
            {videos.map((v) => (
              <button
                key={v.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-subtle transition-colors"
                onClick={() => { setVideoId(v.id); setSearch(v.judul) }}
              >
                <span className="font-medium">{v.judul}</span>
                <span className="text-text-muted ml-2 text-xs">{v.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Platform</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Jam Tayang</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Tanggal</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button className="flex-1" onClick={handleSave} disabled={saving || !videoId}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Simpan Jadwal
        </Button>
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
      </div>
    </div>
  )
}
