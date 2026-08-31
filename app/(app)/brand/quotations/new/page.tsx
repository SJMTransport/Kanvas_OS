'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Loader2, Download, Eye } from 'lucide-react'
import { formatRupiah } from '@/lib/utils/formatters'
import { terbilangRupiah } from '@/lib/utils/terbilang'

interface LineItem {
  id: string
  description: string
  price: number
  qty: number
  is_bonus: boolean
}

function newItem(): LineItem {
  return { id: Math.random().toString(36).slice(2), description: '', price: 0, qty: 1, is_bonus: false }
}

export default function QuotationNewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()

  const brandIdParam = searchParams.get('brandId') ?? ''
  const dealIdParam = searchParams.get('dealId') ?? ''
  const editId = searchParams.get('editId') ?? ''

  const [brandId, setBrandId] = useState(brandIdParam)
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [berlakuHingga, setBerlakuHingga] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]
  })
  const [items, setItems] = useState<LineItem[]>([newItem()])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [generating, setGenerating] = useState(false)

  const { data: brands } = useQuery({
    queryKey: ['brands-list', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase.from('brands').select('id, nama_brand').eq('workspace_id', workspaceId).limit(100)
      return (data ?? []) as { id: string; nama_brand: string }[]
    },
    enabled: !!workspaceId,
  })

  // Workspace billing/bank details — already exist (008_billing.sql +
  // Settings page), reused here rather than hardcoding into the PDF.
  const { data: billing } = useQuery({
    queryKey: ['workspace-billing', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('workspaces').select('billing_bank_name, billing_bank_account, billing_bank_holder').eq('id', workspaceId).single()
      return data
    },
  })

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-name'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('users').select('full_name').eq('id', user.id).single()
      return data
    },
  })

  // If created from a Deal, lock the Brand to that Deal's brand — the
  // context is already known, no need to ask the user to re-select it.
  const { data: linkedDeal } = useQuery({
    queryKey: ['quotation-source-deal', dealIdParam],
    enabled: !!dealIdParam,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('deals').select('id, brand_id, title, nama_campaign').eq('id', dealIdParam).single()
      return data
    },
  })

  useEffect(() => {
    if (linkedDeal?.brand_id) setBrandId(linkedDeal.brand_id)
  }, [linkedDeal])

  // Edit mode — load the existing quotation.
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['quotation-edit', editId],
    enabled: !!editId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('quotations').select('*').eq('id', editId).single()
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (!existing) return
    setBrandId(existing.brand_id)
    setTanggal(existing.tanggal)
    setBerlakuHingga(existing.expired_date || '')
    setNotes(existing.notes || '')
    const loadedItems = Array.isArray(existing.items) && existing.items.length > 0
      ? existing.items.map((it: any) => ({
          id: Math.random().toString(36).slice(2),
          description: it.description || it.deskripsi || '',
          price: Number(it.price ?? it.harga ?? 0),
          qty: Number(it.qty ?? 1),
          is_bonus: Boolean(it.is_bonus),
        }))
      : [newItem()]
    setItems(loadedItems)
  }, [existing])

  const total = items.filter((it) => !it.is_bonus).reduce((sum, it) => sum + it.qty * it.price, 0)

  function updateItem(id: string, field: keyof LineItem, value: string | number | boolean) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it))
  }

  async function save(status: 'draft' | 'sent') {
    if (!workspaceId || !brandId) { toast.error('Pilih brand terlebih dahulu'); return }
    if (items.every((it) => !it.description.trim())) { toast.error('Isi minimal satu item quotation'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const itemsPayload = items.filter((it) => it.description.trim()).map(({ id: _id, ...rest }) => rest)

      if (editId) {
        const { error } = await supabase.from('quotations').update({
          brand_id: brandId,
          tanggal,
          expired_date: berlakuHingga || null,
          items: itemsPayload,
          subtotal: total,
          total,
          notes: notes || null,
          status,
          updated_at: new Date().toISOString(),
        }).eq('id', editId)
        if (error) { console.error('Failed to update quotation:', error); throw error }
        toast.success('Quotation berhasil diperbarui!')
      } else {
        // generate_doc_number(ws_id, doc_type) — see 007_functions.sql.
        // Column names below match quotations' actual schema (005_brand.sql):
        // quotation_number/expired_date/notes — not nomor/berlaku_hingga/
        // catatan, which never existed and silently broke every save this
        // page ever attempted before this fix.
        const { data: numData, error: numErr } = await supabase.rpc('generate_doc_number', { ws_id: workspaceId, doc_type: 'QUO' })
        if (numErr) console.error('Failed to generate quotation number:', numErr)
        const quotationNumber = numData ?? `QUO-${Date.now()}`

        const payload = {
          workspace_id: workspaceId,
          brand_id: brandId,
          deal_id: dealIdParam || null,
          quotation_number: quotationNumber,
          tanggal,
          expired_date: berlakuHingga || null,
          items: itemsPayload,
          subtotal: total,
          total,
          notes: notes || null,
          status,
        }
        const { error } = await supabase.from('quotations').insert(payload)
        if (error) { console.error('Failed to save quotation:', error); throw error }
        toast.success(status === 'draft' ? 'Draft tersimpan!' : 'Quotation terkirim!')
      }

      queryClient.invalidateQueries({ queryKey: ['brand-quotations', brandId] })
      queryClient.invalidateQueries({ queryKey: ['deal-quotations', dealIdParam] })
      router.push(dealIdParam ? `/brand/deals/${dealIdParam}` : brandId ? `/brand/${brandId}` : '/brand')
    } catch (err) {
      console.error('Quotation save failed:', err)
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function buildPdfBlob() {
    const brand = brands?.find((b) => b.id === brandId)
    const { QuotationPDF } = await import('@/components/pdf/QuotationPDF')
    const { pdf } = await import('@react-pdf/renderer')
    const { createElement } = await import('react')
    const element = createElement(QuotationPDF, {
      quotationNumber: editId ? (existing?.quotation_number ?? 'DRAFT') : `DRAFT-${Date.now()}`,
      tanggal,
      expiredDate: berlakuHingga || undefined,
      recipientName: brand?.nama_brand ?? '',
      items: items.filter((it) => it.description.trim()).map(({ description, price, qty, is_bonus }) => ({ description, price, qty, is_bonus })),
      notes: notes || undefined,
      bankName: billing?.billing_bank_name || undefined,
      accountNumber: billing?.billing_bank_account || undefined,
      accountHolder: billing?.billing_bank_holder || undefined,
      signatoryName: currentUser?.full_name || undefined,
    })
    return pdf(element as any).toBlob()
  }

  async function previewPDF() {
    if (!brandId) { toast.error('Pilih brand terlebih dahulu'); return }
    setGenerating(true)
    try {
      const blob = await buildPdfBlob()
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewOpen(true)
    } catch (err) {
      console.error('Quotation PDF preview failed:', err)
      toast.error(err instanceof Error ? `Gagal generate PDF: ${err.message}` : 'Gagal generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  async function downloadPDF() {
    if (!brandId) { toast.error('Pilih brand terlebih dahulu'); return }
    setGenerating(true)
    try {
      const blob = await buildPdfBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `quotation-${editId ? existing?.quotation_number : 'preview'}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Quotation PDF download failed:', err)
      toast.error(err instanceof Error ? `Gagal generate PDF: ${err.message}` : 'Gagal generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  if (editId && loadingExisting) {
    return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full rounded-xl" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-text-muted hover:text-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">{editId ? 'Edit Quotation' : 'Buat Quotation'}</h1>
          {linkedDeal && (
            <p className="text-xs text-text-muted mt-0.5">
              Untuk Deal: <strong className="text-accent">{linkedDeal.title || linkedDeal.nama_campaign}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Brand <span className="text-error">*</span></Label>
            <Select value={brandId} onValueChange={setBrandId} disabled={!!dealIdParam}>
              <SelectTrigger><SelectValue placeholder="Pilih brand" /></SelectTrigger>
              <SelectContent>
                {(brands ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.nama_brand}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Berlaku Hingga</Label>
            <Input type="date" value={berlakuHingga} onChange={(e) => setBerlakuHingga(e.target.value)} />
          </div>
        </div>

        {/* Line items — free-form: multiline description, price, qty/label,
            optional Bonus flag. No forced Product/SKU/Tax/Discount columns. */}
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="font-semibold text-sm text-text-primary">Item Penawaran</p>
            <p className="text-xs text-text-muted mt-0.5">Deskripsi bebas, boleh multi-baris. Tandai Bonus untuk item tanpa biaya.</p>
          </div>
          <div className="p-5 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border border-border/70 rounded-lg p-3 space-y-2">
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  placeholder={'Deskripsi item, boleh multi-baris. Contoh:\nEndorsement Video:\nVideo 1: Pra event I - non visit\nVideo 2: Pra event II - non visit + same day edit\n\nUpload di akun TikTok @namaakun'}
                  rows={4}
                  className="text-sm"
                />
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[11px] text-text-muted">Harga (Rp)</Label>
                    <Input type="number" min={0} value={item.price} onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} className="h-8 text-sm" disabled={item.is_bonus} />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-[11px] text-text-muted">Jumlah</Label>
                    <Input type="number" min={1} value={item.qty} onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)} className="h-8 text-sm text-center" />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-[11px] text-text-muted">Total</Label>
                    <p className="h-8 flex items-center text-sm font-mono font-semibold">{item.is_bonus ? 'Bonus' : formatRupiah(item.price * item.qty)}</p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-text-secondary shrink-0 pt-4">
                    <Switch checked={item.is_bonus} onCheckedChange={(v) => updateItem(item.id, 'is_bonus', v)} />
                    Bonus
                  </label>
                  <button onClick={() => setItems((p) => p.filter((x) => x.id !== item.id))} className="text-error hover:text-error/80 pt-4" disabled={items.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setItems((p) => [...p, newItem()])} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors font-semibold">
              <Plus className="w-4 h-4" /> Tambah Item
            </button>
          </div>

          {/* Totals */}
          <div className="border-t border-border px-5 py-4 flex justify-end">
            <div className="w-72 space-y-1 text-sm text-right">
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span>Total</span>
                <span className="text-accent font-mono">{formatRupiah(total)}</span>
              </div>
              <p className="text-[11px] text-text-muted italic">Terbilang: {terbilangRupiah(total)}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Ket / Catatan</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: DP 50% di awal, sisanya setelah konten selesai" rows={2} />
          </div>
        </div>

        {/* Actions — draft/send are explicit saves; PDF preview/download are
            separate explicit actions, never triggered automatically on save. */}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => save('draft')} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan Draft
          </Button>
          <Button onClick={() => save('sent')} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Tandai Terkirim
          </Button>
          <Button variant="outline" onClick={previewPDF} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            Preview PDF
          </Button>
          <Button variant="outline" onClick={downloadPDF} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Download PDF
          </Button>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={(v) => { setPreviewOpen(v); if (!v && previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl('') } }}>
        <DialogContent className="sm:max-w-3xl h-[85vh] p-0">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle className="text-sm font-semibold">Preview Quotation</DialogTitle>
          </DialogHeader>
          {previewUrl && <iframe src={previewUrl} className="w-full h-full" title="Quotation PDF preview" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
