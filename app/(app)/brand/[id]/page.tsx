'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Loader2, FileText, Handshake, Receipt, CalendarClock } from 'lucide-react'
import { formatDate, formatRupiah } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils'

const followupSchema = z.object({
  tanggal: z.string().min(1),
  catatan: z.string().min(1, 'Catatan wajib diisi'),
  next_action: z.string().optional(),
  next_date: z.string().optional(),
})
type FollowupForm = z.infer<typeof followupSchema>

function InlineField({ label, value, onSave }: { label: string; value: string | null | undefined; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onSave(val)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-text-muted">{label}</Label>
        <div className="flex gap-2">
          <Input value={val} onChange={(e) => setVal(e.target.value)} className="h-8 text-sm" autoFocus />
          <Button size="sm" className="h-8 shrink-0" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Simpan'}
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => { setVal(value ?? ''); setEditing(false) }}>Batal</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0.5 cursor-pointer group" onClick={() => setEditing(true)}>
      <span className="text-xs text-text-muted">{label}</span>
      <p className="text-sm text-text-primary group-hover:text-accent transition-colors">{value || <span className="text-text-muted italic">Belum diisi — klik untuk edit</span>}</p>
    </div>
  )
}

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [addFollowup, setAddFollowup] = useState(false)
  const [savingFollowup, setSavingFollowup] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FollowupForm>({
    resolver: zodResolver(followupSchema) as any,
    defaultValues: { tanggal: new Date().toISOString().split('T')[0] },
  })

  const { data: brand, isLoading } = useQuery({
    queryKey: ['brand', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('brands')
        .select('*')
        .eq('id', id)
        .single()
      return data as Record<string, any> | null
    },
  })

  const { data: followups } = useQuery({
    queryKey: ['brand-followups', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('brand_followups')
        .select('*')
        .eq('brand_id', id)
        .order('tanggal', { ascending: false })
      return data ?? []
    },
  })

  const { data: quotations } = useQuery({
    queryKey: ['brand-quotations', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('quotations')
        .select('id, nomor, tanggal, total, status')
        .eq('brand_id', id)
        .order('tanggal', { ascending: false })
      return (data ?? []) as { id: string; nomor: string; tanggal: string; total: number; status: string }[]
    },
  })

  const { data: deals } = useQuery({
    queryKey: ['brand-deals', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('deals')
        .select('id, deal_number, tanggal_deal, nilai_deal, status')
        .eq('brand_id', id)
        .order('tanggal_deal', { ascending: false })
      return (data ?? []) as { id: string; deal_number: string; tanggal_deal: string; nilai_deal: number; status: string }[]
    },
  })

  const { data: invoices } = useQuery({
    queryKey: ['brand-invoices', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('invoices')
        .select('id, nomor, tanggal, total, status')
        .eq('brand_id', id)
        .order('tanggal', { ascending: false })
      return (data ?? []) as { id: string; nomor: string; tanggal: string; total: number; status: string }[]
    },
  })

  async function updateField(field: string, value: string) {
    const supabase = createClient()
    const { error } = await supabase.from('brands').update({ [field]: value || null }).eq('id', id)
    if (error) toast.error('Gagal menyimpan')
    else {
      toast.success('Tersimpan')
      queryClient.invalidateQueries({ queryKey: ['brand', id] })
    }
  }

  async function onSubmitFollowup(data: FollowupForm) {
    setSavingFollowup(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('brand_followups').insert({
        brand_id: id,
        user_id: user?.id,
        tanggal: data.tanggal,
        catatan: data.catatan,
        next_action: data.next_action || null,
        next_date: data.next_date || null,
      })
      if (error) throw error

      if (data.next_date) {
        await supabase.from('brands').update({ next_followup_date: data.next_date }).eq('id', id)
      }

      toast.success('Follow-up dicatat!')
      queryClient.invalidateQueries({ queryKey: ['brand-followups', id] })
      queryClient.invalidateQueries({ queryKey: ['brand', id] })
      reset({ tanggal: new Date().toISOString().split('T')[0] })
      setAddFollowup(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSavingFollowup(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!brand) return <div className="p-8 text-text-muted">Brand tidak ditemukan.</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-text-muted hover:text-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">{brand.nama_brand}</h1>
          {brand.industri && <p className="text-xs text-text-muted">{brand.industri}</p>}
        </div>
      </div>

      <Tabs defaultValue="profil">
        <TabsList className="mb-6">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="followup">Follow-up Log</TabsTrigger>
          <TabsTrigger value="quotation">Quotation</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
        </TabsList>

        {/* Tab: Profil */}
        <TabsContent value="profil">
          <div className="bg-white border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InlineField label="Nama Brand" value={brand.nama_brand} onSave={(v) => updateField('nama_brand', v)} />
            <InlineField label="Industri" value={brand.industri} onSave={(v) => updateField('industri', v)} />
            <InlineField label="Website" value={brand.website} onSave={(v) => updateField('website', v)} />
            <InlineField label="Sosmed Brand" value={brand.sosmed_brand} onSave={(v) => updateField('sosmed_brand', v)} />
            <InlineField label="PIC Name" value={brand.pic_name} onSave={(v) => updateField('pic_name', v)} />
            <InlineField label="PIC Email" value={brand.pic_email} onSave={(v) => updateField('pic_email', v)} />
            <InlineField label="PIC WhatsApp" value={brand.pic_whatsapp} onSave={(v) => updateField('pic_whatsapp', v)} />
            <InlineField label="Status" value={brand.status} onSave={(v) => updateField('status', v)} />
            <InlineField label="First Contact" value={brand.first_contact_date} onSave={(v) => updateField('first_contact_date', v)} />
            <InlineField label="Next Follow-up" value={brand.next_followup_date} onSave={(v) => updateField('next_followup_date', v)} />
            <div className="sm:col-span-2 space-y-0.5">
              <span className="text-xs text-text-muted">Catatan</span>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{brand.catatan || <span className="text-text-muted italic">Belum ada catatan</span>}</p>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Follow-up Log */}
        <TabsContent value="followup">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAddFollowup(!addFollowup)}>
                <Plus className="w-4 h-4 mr-1" /> Catat Follow-up
              </Button>
            </div>

            {addFollowup && (
              <form onSubmit={handleSubmit(onSubmitFollowup)} className="bg-white border border-border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tanggal</Label>
                    <Input type="date" {...register('tanggal')} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Next Follow-up Date</Label>
                    <Input type="date" {...register('next_date')} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Catatan <span className="text-error">*</span></Label>
                  <Textarea {...register('catatan')} placeholder="Apa yang terjadi pada sesi follow-up ini?" rows={3} />
                  {errors.catatan && <p className="text-xs text-error">{errors.catatan.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Next Action</Label>
                  <Input {...register('next_action')} placeholder="Langkah selanjutnya..." className="h-8 text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={savingFollowup}>
                    {savingFollowup && <Loader2 className="w-3 h-3 animate-spin mr-1" />} Simpan
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAddFollowup(false)}>Batal</Button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {(followups ?? []).length === 0 ? (
                <div className="py-12 text-center text-text-muted">
                  <CalendarClock className="w-8 h-8 mx-auto mb-2 text-border" />
                  <p className="text-sm">Belum ada catatan follow-up</p>
                </div>
              ) : (followups ?? []).map((f: any) => (
                <div key={f.id} className="bg-white border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-accent">{formatDate(f.tanggal)}</span>
                  </div>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{f.catatan}</p>
                  {f.next_action && (
                    <p className="text-xs text-text-secondary mt-2 border-t border-border pt-2">
                      <span className="font-semibold">Next action:</span> {f.next_action}
                      {f.next_date && ` — ${formatDate(f.next_date)}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Quotation */}
        <TabsContent value="quotation">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => router.push(`/brand/quotations/new?brandId=${id}`)}>
                <Plus className="w-4 h-4 mr-1" /> Buat Quotation
              </Button>
            </div>
            {(quotations ?? []).length === 0 ? (
              <div className="py-12 text-center text-text-muted">
                <FileText className="w-8 h-8 mx-auto mb-2 text-border" />
                <p className="text-sm">Belum ada quotation</p>
              </div>
            ) : (quotations ?? []).map((q) => (
              <div key={q.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-text-primary">{q.nomor}</p>
                  <p className="text-xs text-text-muted">{formatDate(q.tanggal)} · {q.status}</p>
                </div>
                <p className="text-sm font-semibold text-accent">{formatRupiah(q.total)}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Deals */}
        <TabsContent value="deals">
          <div className="space-y-3">
            {(deals ?? []).length === 0 ? (
              <div className="py-12 text-center text-text-muted">
                <Handshake className="w-8 h-8 mx-auto mb-2 text-border" />
                <p className="text-sm">Belum ada deal</p>
              </div>
            ) : (deals ?? []).map((d) => (
              <div key={d.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-text-primary">{d.deal_number}</p>
                  <p className="text-xs text-text-muted">{formatDate(d.tanggal_deal)} · {d.status}</p>
                </div>
                <p className="text-sm font-semibold text-accent">{formatRupiah(d.nilai_deal)}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Invoice */}
        <TabsContent value="invoice">
          <div className="space-y-3">
            {(invoices ?? []).length === 0 ? (
              <div className="py-12 text-center text-text-muted">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-border" />
                <p className="text-sm">Belum ada invoice</p>
              </div>
            ) : (invoices ?? []).map((inv) => (
              <div key={inv.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-text-primary">{inv.nomor}</p>
                  <p className="text-xs text-text-muted">{formatDate(inv.tanggal)} · {inv.status}</p>
                </div>
                <p className="text-sm font-semibold text-accent">{formatRupiah(inv.total)}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
