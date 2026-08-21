'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
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

export default function InvoiceNewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  const dealIdParam = searchParams.get('dealId') ?? ''
  const quotationIdParam = searchParams.get('quotationId') ?? ''
  const editId = searchParams.get('editId') ?? ''

  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [type, setType] = useState<'dp' | 'pelunasan' | 'full'>('dp')
  const [status, setStatus] = useState<'draft' | 'sent' | 'paid' | 'cancelled'>('draft')
  const [quotationId, setQuotationId] = useState(quotationIdParam)
  const [items, setItems] = useState<LineItem[]>([newItem()])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [generating, setGenerating] = useState(false)

  const { data: deal } = useQuery({
    queryKey: ['invoice-source-deal', dealIdParam],
    enabled: !!dealIdParam,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('deals').select('*, brands(*)').eq('id', dealIdParam).single()
      if (error) throw error
      return data
    },
  })

  const { data: quotations = [] } = useQuery({
    queryKey: ['deal-quotations-for-invoice', dealIdParam],
    enabled: !!dealIdParam,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('quotations').select('id, quotation_number, status, items, total').eq('deal_id', dealIdParam).order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: billing } = useQuery({
    queryKey: ['workspace-billing', deal?.workspace_id],
    enabled: !!deal?.workspace_id,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('workspaces').select('billing_bank_name, billing_bank_account, billing_bank_holder').eq('id', deal.workspace_id).single()
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

  // Prefill line items from the selected Quotation — "Create Invoice from
  // Quotation" — but only ever a one-time copy on selection, never a live
  // sync (the two documents diverge on purpose after this point).
  function applyQuotation(qId: string) {
    setQuotationId(qId)
    const q = quotations.find((x: any) => x.id === qId)
    if (q && Array.isArray(q.items) && q.items.length > 0) {
      setItems(q.items.map((it: any) => ({
        id: Math.random().toString(36).slice(2),
        description: it.description || it.deskripsi || '',
        price: Number(it.price ?? it.harga ?? 0),
        qty: Number(it.qty ?? 1),
        is_bonus: Boolean(it.is_bonus),
      })))
    }
  }

  // Edit mode — load the existing invoice.
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['invoice-edit', editId],
    enabled: !!editId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('invoices').select('*').eq('id', editId).single()
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (!existing) return
    setTanggal(existing.tanggal)
    setDueDate(existing.due_date || '')
    setType(existing.type)
    setStatus(existing.status)
    setQuotationId(existing.quotation_id || '')
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

  async function save() {
    if (!deal && !editId) { toast.error('Deal tidak ditemukan'); return }
    if (items.every((it) => !it.description.trim())) { toast.error('Isi minimal satu item invoice'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const itemsPayload = items.filter((it) => it.description.trim()).map(({ id: _id, ...rest }) => rest)

      if (editId) {
        const { error } = await supabase.from('invoices').update({
          type, tanggal, due_date: dueDate || null,
          items: itemsPayload, subtotal: total, total,
          status, quotation_id: quotationId || null, notes: notes || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editId)
        if (error) { console.error('Failed to update invoice:', error); throw error }
        toast.success('Invoice berhasil diperbarui!')
      } else {
        const { data: numData, error: numErr } = await supabase.rpc('generate_doc_number', { ws_id: deal.workspace_id, doc_type: 'INV' })
        if (numErr) console.error('Failed to generate invoice number:', numErr)
        const invoiceNumber = numData ?? `INV-${Date.now()}`

        const { error } = await supabase.from('invoices').insert({
          workspace_id: deal.workspace_id,
          brand_id: deal.brand_id,
          deal_id: dealIdParam,
          quotation_id: quotationId || null,
          invoice_number: invoiceNumber,
          type, tanggal, due_date: dueDate || null,
          items: itemsPayload, subtotal: total, total,
          status, notes: notes || null,
        })
        if (error) { console.error('Failed to save invoice:', error); throw error }
        toast.success('Invoice draft tersimpan!')
      }

      queryClient.invalidateQueries({ queryKey: ['deal-invoices', dealIdParam] })
      router.push(`/brand/deals/${dealIdParam}`)
    } catch (err) {
      console.error('Invoice save failed:', err)
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function buildPdfBlob() {
    const brandName = deal?.brands?.name || deal?.brands?.nama_brand || ''
    const { InvoicePDF } = await import('@/components/pdf/InvoicePDF')
    const { pdf } = await import('@react-pdf/renderer')
    const { createElement } = await import('react')
    const element = createElement(InvoicePDF, {
      invoiceNumber: editId ? (existing?.invoice_number ?? 'DRAFT') : `DRAFT-${Date.now()}`,
      tanggal,
      dueDate: dueDate || undefined,
      recipientName: brandName,
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
    setGenerating(true)
    try {
      const blob = await buildPdfBlob()
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewOpen(true)
    } catch (err) {
      console.error('Invoice PDF preview failed:', err)
      toast.error(err instanceof Error ? `Gagal generate PDF: ${err.message}` : 'Gagal generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  async function downloadPDF() {
    setGenerating(true)
    try {
      const blob = await buildPdfBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `invoice-${editId ? existing?.invoice_number : 'preview'}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Invoice PDF download failed:', err)
      toast.error(err instanceof Error ? `Gagal generate PDF: ${err.message}` : 'Gagal generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  if ((editId && loadingExisting) || (!editId && dealIdParam && !deal)) {
    return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full rounded-xl" /></div>
  }

  const brandName = deal?.brands?.name || deal?.brands?.nama_brand || ''
  const dealTitle = deal?.title || deal?.nama_campaign || ''

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-text-muted hover:text-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">{editId ? 'Edit Invoice' : 'Buat Invoice'}</h1>
          {dealTitle && (
            <p className="text-xs text-text-muted mt-0.5">
              Untuk Deal: <strong className="text-accent">{dealTitle}</strong> {brandName && `(${brandName})`}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Tipe Invoice</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dp">DP (Down Payment)</SelectItem>
                <SelectItem value="pelunasan">Pelunasan</SelectItem>
                <SelectItem value="full">Full Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal Invoice</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Jatuh Tempo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {quotations.length > 0 && (
            <div className="space-y-1.5 sm:col-span-4">
              <Label>Berdasarkan Quotation (Opsional)</Label>
              <Select value={quotationId || '__none__'} onValueChange={(v) => v === '__none__' ? setQuotationId('') : applyQuotation(v)}>
                <SelectTrigger><SelectValue placeholder="Tidak berdasarkan quotation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tidak berdasarkan quotation</SelectItem>
                  {quotations.map((q: any) => (
                    <SelectItem key={q.id} value={q.id}>{q.quotation_number} ({q.status}) — {formatRupiah(Number(q.total))}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-text-muted">Memilih quotation akan menyalin item-nya ke invoice ini (satu kali, tidak tersinkron otomatis setelahnya).</p>
            </div>
          )}
        </div>

        {/* Line items — same free-form model as Quotation. */}
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="font-semibold text-sm text-text-primary">Item Tagihan</p>
            <p className="text-xs text-text-muted mt-0.5">Deskripsi bebas, boleh multi-baris. Tandai Bonus untuk item tanpa biaya.</p>
          </div>
          <div className="p-5 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border border-border/70 rounded-lg p-3 space-y-2">
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  placeholder={'Deskripsi item, boleh multi-baris. Contoh:\nEndorsement Video:\nVideo 1: Pra event I - non visit\nVideo 2: Pra event II - non visit + same day edit\n\nUpload di reels Instagram, 1x Instagram story, Youtube Short'}
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

        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Ket / Catatan</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Down payment (DP) 50%, Pelunasan 50%" rows={2} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan
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
            <DialogTitle className="text-sm font-semibold">Preview Invoice</DialogTitle>
          </DialogHeader>
          {previewUrl && <iframe src={previewUrl} className="w-full h-full" title="Invoice PDF preview" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
