'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Plus, Loader2, AlertCircle, Eye } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { formatDate } from '@/lib/utils/formatters'

const PIPELINE_STATUSES = ['prospect', 'approach', 'negosiasi', 'deal', 'aktif', 'selesai'] as const
type BrandStatus = typeof PIPELINE_STATUSES[number]

const STATUS_LABELS: Record<BrandStatus, string> = {
  prospect: 'Prospect', approach: 'Approach', negosiasi: 'Negosiasi',
  deal: 'Deal', aktif: 'Aktif', selesai: 'Selesai',
}

const STATUS_COLORS: Record<BrandStatus, string> = {
  prospect: 'border-t-gray-400', approach: 'border-t-blue-400', negosiasi: 'border-t-yellow-400',
  deal: 'border-t-green-400', aktif: 'border-t-amber-500', selesai: 'border-t-purple-400',
}

const schema = z.object({
  nama_brand: z.string().min(1, 'Nama brand wajib diisi'),
  industri: z.string().optional(),
  website: z.string().optional(),
  pic_name: z.string().optional(),
  pic_email: z.string().optional(),
  pic_whatsapp: z.string().optional(),
  sosmed_brand: z.string().optional(),
  status: z.string().default('prospect'),
  first_contact_date: z.string().optional(),
  next_followup_date: z.string().optional(),
  catatan: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function BrandPage() {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'prospect' },
  })

  const { data: brands, isLoading } = useQuery({
    queryKey: ['brands', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('brands')
        .select('id, nama_brand, industri, pic_name, next_followup_date, status')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
      return (data ?? []) as { id: string; nama_brand: string; industri: string | null; pic_name: string | null; next_followup_date: string | null; status: string }[]
    },
    enabled: !!workspaceId,
  })

  async function onSubmit(data: any) {
    if (!workspaceId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('brands').insert({
        workspace_id: workspaceId,
        nama_brand: data.nama_brand,
        industri: data.industri || null,
        website: data.website || null,
        pic_name: data.pic_name || null,
        pic_email: data.pic_email || null,
        pic_whatsapp: data.pic_whatsapp || null,
        sosmed_brand: data.sosmed_brand || null,
        status: data.status,
        first_contact_date: data.first_contact_date || null,
        next_followup_date: data.next_followup_date || null,
        catatan: data.catatan || null,
      })
      if (error) throw error
      toast.success('Brand berhasil ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      reset()
      setSheetOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleDrop(brandId: string, newStatus: BrandStatus) {
    const supabase = createClient()
    const { error } = await supabase.from('brands').update({ status: newStatus }).eq('id', brandId)
    if (error) toast.error('Gagal update status')
    else queryClient.invalidateQueries({ queryKey: ['brands'] })
    setDragging(null)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-border shrink-0">
        <PageHeader
          title="Brand"
          subtitle="Pipeline manajemen brand & klien"
          className="mb-0"
          action={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="w-4 h-4 mr-1" /> Brand Baru</Button>}
        />
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        {isLoading ? (
          <div className="flex gap-4">
            {PIPELINE_STATUSES.map((s) => (
              <div key={s} className="w-64 shrink-0 space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 min-w-max">
            {PIPELINE_STATUSES.map((status) => {
              const columnBrands = (brands ?? []).filter((b) => b.status === status)
              return (
                <div
                  key={status}
                  className="w-64 shrink-0 flex flex-col gap-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('brandId')
                    if (id) handleDrop(id, status)
                  }}
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{STATUS_LABELS[status]}</span>
                    <span className="text-xs text-text-muted bg-subtle rounded-full w-5 h-5 flex items-center justify-center font-mono">{columnBrands.length}</span>
                  </div>
                  <div className="min-h-[120px] space-y-2 rounded-xl bg-subtle/50 p-2">
                    {columnBrands.map((brand) => {
                      const isOverdue = brand.next_followup_date && brand.next_followup_date < today
                      return (
                        <div
                          key={brand.id}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('brandId', brand.id); setDragging(brand.id) }}
                          onDragEnd={() => setDragging(null)}
                          className={cn(
                            'bg-white border rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all border-t-4',
                            STATUS_COLORS[status],
                            isOverdue && 'ring-1 ring-error',
                            dragging === brand.id && 'opacity-50',
                          )}
                        >
                          <p className="font-semibold text-sm text-text-primary">{brand.nama_brand}</p>
                          {brand.industri && <p className="text-xs text-text-muted mt-0.5">{brand.industri}</p>}
                          {brand.pic_name && <p className="text-xs text-text-secondary mt-1">PIC: {brand.pic_name}</p>}
                          {brand.next_followup_date && (
                            <div className={cn('flex items-center gap-1 mt-1.5', isOverdue ? 'text-error' : 'text-text-muted')}>
                              {isOverdue && <AlertCircle className="w-3 h-3" />}
                              <span className="text-[10px]">{isOverdue ? 'Overdue: ' : 'Follow-up: '}{formatDate(brand.next_followup_date)}</span>
                            </div>
                          )}
                          <button
                            onClick={() => router.push(`/brand/${brand.id}`)}
                            className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-text-muted hover:text-accent transition-colors border border-border rounded-lg py-1"
                          >
                            <Eye className="w-3 h-3" /> Lihat Detail
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle>Brand Baru</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Brand <span className="text-error">*</span></Label>
              <Input {...register('nama_brand')} placeholder="Nama brand atau klien" />
              {errors.nama_brand && <p className="text-xs text-error">{errors.nama_brand.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Industri</Label>
                <Input {...register('industri')} placeholder="F&B, Fashion, dll" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller name="status" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input {...register('website')} placeholder="https://brand.com" />
            </div>

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">PIC (Person in Charge)</p>
              <div className="space-y-2">
                <Input {...register('pic_name')} placeholder="Nama kontak" />
                <Input {...register('pic_email')} placeholder="Email" type="email" />
                <Input {...register('pic_whatsapp')} placeholder="Nomor WhatsApp" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sosmed Brand</Label>
              <Input {...register('sosmed_brand')} placeholder="@handle atau URL" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Contact</Label>
                <Input type="date" {...register('first_contact_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Follow-up</Label>
                <Input type="date" {...register('next_followup_date')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea {...register('catatan')} placeholder="Catatan awal..." rows={3} />
            </div>

            <div className="pt-2 pb-6 flex gap-2">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Simpan Brand
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSheetOpen(false)}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
