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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Loader2, Download } from 'lucide-react'
import { formatRupiah } from '@/lib/utils/formatters'

interface LineItem {
  id: string
  deskripsi: string
  platform: string
  format: string
  qty: number
  harga: number
}

function newItem(): LineItem {
  return { id: Math.random().toString(36).slice(2), deskripsi: '', platform: '', format: '', qty: 1, harga: 0 }
}

export default function QuotationNewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()

  const brandIdParam = searchParams.get('brandId') ?? ''
  const dealIdParam = searchParams.get('dealId') ?? ''

  const [brandId, setBrandId] = useState(brandIdParam)

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
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [berlakuHingga, setBerlakuHingga] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]
  })
  const [items, setItems] = useState<LineItem[]>([newItem()])
  const [diskon, setDiskon] = useState(0)
  const [pajak, setPajak] = useState(0)
  const [paymentTerms, setPaymentTerms] = useState('')
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)
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

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.harga, 0)
  const pajakAmount = Math.round(subtotal * pajak / 100)
  const total = subtotal - diskon + pajakAmount

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it))
  }

  async function save(status: 'draft' | 'sent') {
    if (!workspaceId || !brandId) { toast.error('Pilih brand terlebih dahulu'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      // generate_doc_number(ws_id, doc_type) — see 007_functions.sql.
      // Column names below match quotations' actual schema (005_brand.sql):
      // quotation_number/expired_date/tax_pct/notes, not nomor/berlaku_hingga/
      // pajak/catatan — those never existed, which silently broke every save
      // this page ever attempted (confirmed during the Phase 3.5 audit).
      const { data: numData, error: numErr } = await supabase.rpc('generate_doc_number', { ws_id: workspaceId, doc_type: 'QUO' })
      if (numErr) console.error('Failed to generate quotation number:', numErr)
      const quotationNumber = numData ?? `QUO-${Date.now()}`

      const payload = {
        workspace_id: workspaceId,
        brand_id: brandId,
        deal_id: dealIdParam || null,
        quotation_number: quotationNumber,
        tanggal,
        expired_date: berlakuHingga,
        items: items.map(({ id: _id, ...rest }) => rest),
        subtotal,
        diskon,
        tax_pct: pajak,
        total,
        payment_terms: paymentTerms || null,
        notes: catatan || null,
        status,
      }
      const { error } = await supabase.from('quotations').insert(payload)
      if (error) {
        console.error('Failed to save quotation:', error)
        throw error
      }
      toast.success(status === 'draft' ? 'Draft tersimpan!' : 'Quotation terkirim!')
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

  async function downloadPDF() {
    if (!brandId) { toast.error('Pilih brand terlebih dahulu'); return }
    setGenerating(true)
    try {
      const brand = brands?.find((b) => b.id === brandId)
      const { QuotationPDF } = await import('@/components/pdf/QuotationPDF')
      const { pdf } = await import('@react-pdf/renderer')
      const { createElement } = await import('react')
      const element = createElement(QuotationPDF as any, {
        nomor: `QUO-PREVIEW-${Date.now()}`,
        tanggal, berlakuHingga,
        brandNama: brand?.nama_brand ?? '',
        items, subtotal, diskon, pajak, pajakAmount, total,
        paymentTerms, catatan,
      })
      const blob = await pdf(element as any).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `quotation-preview.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Gagal generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-text-muted hover:text-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Buat Quotation</h1>
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

        {/* Line items */}
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="font-semibold text-sm text-text-primary">Item Penawaran</p>
          </div>
          <div className="p-5 space-y-3">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_80px_120px_36px] gap-2 text-xs font-semibold text-text-muted uppercase">
              <span>Deskripsi</span><span>Platform</span><span>Format</span><span>Qty</span><span>Harga</span><span />
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_80px_120px_36px] gap-2 items-center">
                <Input value={item.deskripsi} onChange={(e) => updateItem(item.id, 'deskripsi', e.target.value)} placeholder="Deskripsi jasa" className="h-8 text-sm" />
                <Select value={item.platform} onValueChange={(v) => updateItem(item.id, 'platform', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>
                    {['TikTok', 'Instagram', 'YouTube', 'Facebook'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={item.format} onValueChange={(v) => updateItem(item.id, 'format', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Format" /></SelectTrigger>
                  <SelectContent>
                    {['Short Video', 'Long Video', 'Reels', 'Live', 'Story', 'Post'].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min={1} value={item.qty} onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)} className="h-8 text-sm text-center" />
                <Input type="number" min={0} value={item.harga} onChange={(e) => updateItem(item.id, 'harga', parseFloat(e.target.value) || 0)} className="h-8 text-sm" placeholder="0" />
                <button onClick={() => setItems((p) => p.filter((x) => x.id !== item.id))} className="text-error hover:text-error/80 flex items-center justify-center" disabled={items.length === 1}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={() => setItems((p) => [...p, newItem()])} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors font-semibold">
              <Plus className="w-4 h-4" /> Tambah Item
            </button>
          </div>

          {/* Totals */}
          <div className="border-t border-border px-5 py-4 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal</span>
                <span className="font-mono">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-text-secondary shrink-0">Diskon</span>
                <Input type="number" min={0} value={diskon} onChange={(e) => setDiskon(parseFloat(e.target.value) || 0)} className="h-7 text-xs w-28 text-right" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-text-secondary shrink-0">Pajak (%)</span>
                <Input type="number" min={0} max={100} value={pajak} onChange={(e) => setPajak(parseFloat(e.target.value) || 0)} className="h-7 text-xs w-28 text-right" />
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Total</span>
                <span className="text-accent font-mono">{formatRupiah(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Payment Terms</Label>
            <Textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Contoh: DP 50% di awal, sisanya setelah konten selesai" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan..." rows={2} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => save('draft')} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan Draft
          </Button>
          <Button onClick={() => save('sent')} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Tandai Terkirim
          </Button>
          <Button variant="outline" onClick={downloadPDF} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Generate PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
