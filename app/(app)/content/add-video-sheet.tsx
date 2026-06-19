'use client'

import { useState, useRef } from 'react'
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
import { Loader2, Video, ImageIcon, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import type { ContentType } from '@/lib/types'

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
  defaultValues?: Partial<FormData>
}

export function AddVideoSheet({ open, onOpenChange, defaultValues: extraDefaults }: Props) {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [contentType, setContentType] = useState<ContentType | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'ide', is_endorsement: false, is_video_request: false, ...extraDefaults },
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
      // Assign sort_order = max + 1 so new video appears at bottom
      const { data: maxRow } = await supabase
        .from('videos')
        .select('sort_order')
        .eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()
      const nextSortOrder = ((maxRow?.sort_order ?? -1) as number) + 1

      const isVideo = contentType === 'video'
      const payload: Record<string, unknown> = {
        workspace_id: workspaceId,
        created_by: user?.id,
        judul: data.judul,
        format: isVideo ? (data.format || null) : null,
        tema: data.tema || null,
        sort_order: nextSortOrder,
        nama_alat: isVideo ? (data.nama_alat || null) : null,
        tanggal_shooting: isVideo ? (data.tanggal_shooting || null) : null,
        deadline_posting: data.deadline_posting || null,
        status: data.status,
        assigned_to: data.assigned_to || null,
        is_endorsement: data.is_endorsement,
        brand_id: data.is_endorsement ? (data.brand_id || null) : null,
        is_video_request: isVideo ? data.is_video_request : false,
        storage_bahan: isVideo ? (data.storage_bahan || null) : null,
        storage_video: isVideo ? (data.storage_video || null) : null,
        google_drive_link: data.google_drive_link || null,
        caption_default: data.caption_default || null,
      }
      if (contentType) payload.content_type = contentType
      if (!isVideo && imageUrls.length > 0) payload.image_urls = imageUrls
      const { error } = await supabase.from('videos').insert(payload as any)
      if (error) throw new Error(error.message)
      toast.success(isVideo ? 'Video berhasil ditambahkan!' : 'Foto/Carousel berhasil ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      reset()
      setContentType(null)
      setImageUrls([])
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || !workspaceId) return
    setUploading(true)
    try {
      const supabase = createClient()
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const path = `${workspaceId}/${Date.now()}-${file.name}`
        const { error: upErr } = await supabase.storage.from('content-images').upload(path, file)
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('content-images').getPublicUrl(path)
        uploaded.push(publicUrl)
      }
      setImageUrls((prev) => [...prev, ...uploaded])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal upload gambar')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeImage(idx: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  const isVideo = contentType === 'video'

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { setContentType(null); setImageUrls([]) } onOpenChange(v) }}>
      <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto p-0">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle>{contentType ? (isVideo ? 'Tambah Video' : 'Tambah Foto / Carousel') : 'Tambah Konten'}</SheetTitle>
        </SheetHeader>

        {!contentType ? (
          <div className="px-6 py-8 space-y-4">
            <p className="text-sm text-text-muted text-center mb-4">Pilih tipe konten</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setContentType('video')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-border rounded-xl hover:border-accent hover:bg-accent-light/30 transition-all"
              >
                <Video className="w-10 h-10 text-accent" />
                <span className="font-semibold text-sm text-text-primary">Video</span>
                <span className="text-xs text-text-muted text-center">Short, Long, Reels, Live</span>
              </button>
              <button
                type="button"
                onClick={() => setContentType('foto')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-border rounded-xl hover:border-accent hover:bg-accent-light/30 transition-all"
              >
                <ImageIcon className="w-10 h-10 text-accent" />
                <span className="font-semibold text-sm text-text-primary">Foto / Carousel</span>
                <span className="text-xs text-text-muted text-center">Single post atau carousel</span>
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Judul <span className="text-error">*</span></Label>
            <Input {...register('judul')} placeholder={isVideo ? 'Judul video' : 'Judul post'} />
            {errors.judul && <p className="text-xs text-error">{errors.judul.message}</p>}
          </div>

          {!isVideo && (
            <div className="space-y-1.5">
              <Label>Upload Gambar</Label>
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              <Button
                type="button"
                variant="secondary"
                className="w-full gap-1.5"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Mengupload...' : imageUrls.length > 0 ? 'Tambah gambar lagi' : 'Pilih gambar'}
              </Button>
              <p className="text-xs text-text-muted">Pilih beberapa gambar sekaligus untuk carousel</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {isVideo && (
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
            )}
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

          {isVideo && (
            <div className="space-y-1.5">
              <Label>Nama Alat</Label>
              <Input {...register('nama_alat')} placeholder="Kamera, drone, dll" />
            </div>
          )}

          <div className={isVideo ? 'grid grid-cols-2 gap-3' : ''}>
            {isVideo && (
              <div className="space-y-1.5">
                <Label>Tanggal Shooting</Label>
                <Input type="date" {...register('tanggal_shooting')} />
              </div>
            )}
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

          {isVideo && (
            <div className="flex items-center justify-between py-1">
              <Label>Video Request</Label>
              <Controller name="is_video_request" control={control} render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>
          )}

          {isVideo && (
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
          )}

          <div className="space-y-1.5">
            <Label>Google Drive</Label>
            <Input {...register('google_drive_link')} placeholder="https://drive.google.com/..." />
          </div>

          <div className="space-y-1.5">
            <Label>Caption Default</Label>
            <Textarea {...register('caption_default')} placeholder="Caption untuk semua platform..." rows={3} />
          </div>

          <div className="pt-2 pb-6 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setContentType(null)} className="text-xs">← Ubah tipe</Button>
            <div className="flex-1" />
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isVideo ? 'Simpan Video' : 'Simpan Foto'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Batal</Button>
          </div>
        </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
