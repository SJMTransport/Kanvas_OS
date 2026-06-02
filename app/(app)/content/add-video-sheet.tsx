'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const schema = z.object({
  judul: z.string().min(1, 'Judul wajib diisi'),
  format: z.string().optional(),
  tema: z.string().optional(),
  nama_alat: z.string().optional(),
  tanggal_shooting: z.string().optional(),
  deadline_posting: z.string().optional(),
  status: z.string().default('ide'),
  assigned_to: z.string().optional(),
  is_endorsement: z.boolean().default(false),
  brand_id: z.string().optional(),
  is_video_request: z.boolean().default(false),
  storage_bahan: z.string().optional(),
  storage_video: z.string().optional(),
  google_drive_link: z.string().optional(),
  caption_default: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function AddVideoSheet({ open, onOpenChange }: Props) {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'ide', is_endorsement: false, is_video_request: false },
  })

  const isEndorsement = watch('is_endorsement')

  const { data: members } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('workspace_members')
        .select('user_id, users(full_name, email)')
        .eq('workspace_id', workspaceId)
        .not('accepted_at', 'is', null)
      return (data ?? []) as unknown as { user_id: string; users: { full_name: string | null; email: string } }[]
    },
    enabled: !!workspaceId,
  })

  const { data: brands } = useQuery({
    queryKey: ['brands-list', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase.from('brands').select('id, nama_brand').eq('workspace_id', workspaceId).limit(100)
      return data ?? []
    },
    enabled: !!workspaceId && isEndorsement,
  })

  async function onSubmit(data: any) {
    if (!workspaceId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        workspace_id: workspaceId,
        created_by: user?.id,
        judul: data.judul,
        format: data.format || null,
        tema: data.tema || null,
        nama_alat: data.nama_alat || null,
        tanggal_shooting: data.tanggal_shooting || null,
        deadline_posting: data.deadline_posting || null,
        status: data.status,
        assigned_to: data.assigned_to || null,
        is_endorsement: data.is_endorsement,
        brand_id: data.is_endorsement ? (data.brand_id || null) : null,
        is_video_request: data.is_video_request,
        storage_bahan: data.storage_bahan || null,
        storage_video: data.storage_video || null,
        google_drive_link: data.google_drive_link || null,
        caption_default: data.caption_default || null,
      }
      const { error } = await supabase.from('videos').insert(payload)
      if (error) throw error
      toast.success('Video berhasil ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto p-0">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle>Tambah Video</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Judul <span className="text-error">*</span></Label>
            <Input {...register('judul')} placeholder="Judul video" />
            {errors.judul && <p className="text-xs text-error">{errors.judul.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Controller name="format" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {['Short Video', 'Long Video', 'Reels', 'Live'].map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller name="status" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['ide', 'scripting', 'produksi', 'editing', 'scheduled', 'live'].map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tema</Label>
            <Input {...register('tema')} placeholder="Tema konten" />
          </div>

          <div className="space-y-1.5">
            <Label>Nama Alat</Label>
            <Input {...register('nama_alat')} placeholder="Kamera, drone, dll" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tanggal Shooting</Label>
              <Input type="date" {...register('tanggal_shooting')} />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline Posting</Label>
              <Input type="date" {...register('deadline_posting')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Assigned To</Label>
            <Controller name="assigned_to" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
                <SelectContent>
                  {(members ?? []).map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.users?.full_name ?? m.users?.email ?? m.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label>Endorsement</Label>
            <Controller name="is_endorsement" control={control} render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )} />
          </div>

          {isEndorsement && (
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Controller name="brand_id" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih brand" /></SelectTrigger>
                  <SelectContent>
                    {(brands ?? []).map((b: { id: string; nama_brand: string }) => (
                      <SelectItem key={b.id} value={b.id}>{b.nama_brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          )}

          <div className="flex items-center justify-between py-1">
            <Label>Video Request</Label>
            <Controller name="is_video_request" control={control} render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Storage Bahan</Label>
              <Input {...register('storage_bahan')} placeholder="HDD/folder" />
            </div>
            <div className="space-y-1.5">
              <Label>Storage Video</Label>
              <Input {...register('storage_video')} placeholder="HDD/folder" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Google Drive</Label>
            <Input {...register('google_drive_link')} placeholder="https://drive.google.com/..." />
          </div>

          <div className="space-y-1.5">
            <Label>Caption Default</Label>
            <Textarea {...register('caption_default')} placeholder="Caption untuk semua platform..." rows={3} />
          </div>

          <div className="pt-2 pb-6 flex gap-2">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Simpan Video
            </Button>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Batal</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
