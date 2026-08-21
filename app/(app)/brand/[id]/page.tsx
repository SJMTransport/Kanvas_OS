'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Loader2, Handshake, Video, DollarSign, Layers,
  User, Phone, Mail, CheckCircle2, ArrowRight, ExternalLink, Calendar,
  Pencil, Trash2, AlertTriangle,
} from 'lucide-react'
import { formatDate, formatRupiah } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils'
import type { BrandContact } from '@/lib/types/brand'

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [createDealOpen, setCreateDealOpen] = useState(false)
  const [createContactOpen, setCreateContactOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Brand edit/delete
  const [editBrandOpen, setEditBrandOpen] = useState(false)
  const [editBrandName, setEditBrandName] = useState('')
  const [editBrandType, setEditBrandType] = useState('direct')
  const [editBrandIndustry, setEditBrandIndustry] = useState('')
  const [editBrandWebsite, setEditBrandWebsite] = useState('')
  const [editBrandNotes, setEditBrandNotes] = useState('')
  const [savingBrandEdit, setSavingBrandEdit] = useState(false)
  const [deleteBrandOpen, setDeleteBrandOpen] = useState(false)
  const [deletingBrand, setDeletingBrand] = useState(false)

  // Contact edit/delete
  const [editContactId, setEditContactId] = useState<string | null>(null)
  const [editContactName, setEditContactName] = useState('')
  const [editContactRole, setEditContactRole] = useState('')
  const [editContactEmail, setEditContactEmail] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [savingContactEdit, setSavingContactEdit] = useState(false)
  const [deleteContactTarget, setDeleteContactTarget] = useState<{ id: string; name: string } | null>(null)

  // Deal Form
  const [dealTitle, setDealTitle] = useState('')
  const [collaborationType, setCollaborationType] = useState('Campaign')
  const [totalValue, setTotalValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dealNotes, setDealNotes] = useState('')

  // Contact Form
  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Queries
  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ['brand-detail', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('brands').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
  })

  const { data: contacts = [] } = useQuery<BrandContact[]>({
    queryKey: ['brand-contacts', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('brand_contacts').select('*').eq('brand_id', id).order('is_primary', { ascending: false })
      return (data ?? []) as BrandContact[]
    },
    enabled: !!id,
  })

  const { data: deals = [] } = useQuery({
    queryKey: ['brand-deals', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('deals').select('*').eq('brand_id', id).order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!id,
  })

  const { data: brandVideos = [] } = useQuery({
    queryKey: ['brand-videos', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('videos').select('*').eq('brand_id', id).order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!id,
  })

  // Deliverable + linked-content progress per deal (Part F: "Deliverable
  // progress" / "Content progress" columns), mirroring the same pattern
  // already used on the Deal Detail page.
  const { data: dealDeliverables = [] } = useQuery({
    queryKey: ['brand-deal-deliverables', id],
    queryFn: async () => {
      if (deals.length === 0) return []
      const supabase = createClient()
      const dealIds = deals.map((d: any) => d.id)
      const { data } = await supabase.from('deal_deliverables').select('id, deal_id, status').in('deal_id', dealIds)
      return data ?? []
    },
    enabled: deals.length > 0,
  })

  const { data: dealContentJunctions = [] } = useQuery({
    queryKey: ['brand-deal-content-junctions', id],
    queryFn: async () => {
      if (dealDeliverables.length === 0) return []
      const supabase = createClient()
      const delIds = dealDeliverables.map((d: any) => d.id)
      const { data } = await supabase.from('content_deliverables').select('deliverable_id').in('deliverable_id', delIds)
      return data ?? []
    },
    enabled: dealDeliverables.length > 0,
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['brand-payments', id],
    queryFn: async () => {
      if (deals.length === 0) return []
      const supabase = createClient()
      const dealIds = deals.map((d: any) => d.id)
      const { data } = await supabase.from('deal_payments').select('*, deals(title, nama_campaign)').in('deal_id', dealIds).order('due_date', { ascending: true })
      return data ?? []
    },
    enabled: deals.length > 0,
  })

  // Handlers
  async function handleCreateDeal(e: React.FormEvent) {
    e.preventDefault()
    if (!dealTitle.trim() || !brand) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('deals').insert({
        workspace_id: brand.workspace_id,
        brand_id: id,
        title: dealTitle.trim(),
        nama_campaign: dealTitle.trim(),
        deal_number: `DEAL-${Date.now().toString().slice(-5)}`,
        collaboration_type: collaborationType,
        total_value: Number(totalValue) || 0,
        nilai_total: Number(totalValue) || 0,
        start_date: startDate || null,
        tanggal_mulai: startDate || null,
        end_date: endDate || null,
        tanggal_selesai: endDate || null,
        notes: dealNotes || null,
        // 'confirmed' is not a valid deals.status value — the CHECK constraint
        // (005_brand.sql, unchanged since) only allows dp_pending/dp_paid/
        // on_progress/delivered/completed, matching the deal's payment
        // lifecycle. A brand-new deal has no payment recorded yet, so
        // dp_pending (also the column's own DB default) is correct here.
        status: 'dp_pending',
      }).select().single()

      if (error) throw error
      toast.success('Deal berhasil dibuat!')
      queryClient.invalidateQueries({ queryKey: ['brand-deals', id] })
      setCreateDealOpen(false)
      setDealTitle('')
      setTotalValue('')
      if (data?.id) router.push(`/brand/deals/${data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat deal')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateContact(e: React.FormEvent) {
    e.preventDefault()
    if (!contactName.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('brand_contacts').insert({
        brand_id: id,
        name: contactName.trim(),
        role: contactRole.trim() || null,
        email: contactEmail.trim() || null,
        phone: contactPhone.trim() || null,
        is_primary: contacts.length === 0,
      })
      if (error) throw error
      toast.success('Kontak PIC berhasil ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['brand-contacts', id] })
      setCreateContactOpen(false)
      setContactName('')
      setContactRole('')
      setContactEmail('')
      setContactPhone('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat kontak')
    } finally {
      setSaving(false)
    }
  }

  function openEditBrand() {
    if (!brand) return
    setEditBrandName(brand.name || brand.nama_brand || '')
    setEditBrandType(brand.type || brand.brand_type || 'direct')
    setEditBrandIndustry(brand.industry || brand.industri || '')
    setEditBrandWebsite(brand.website || '')
    setEditBrandNotes(brand.notes || brand.catatan || '')
    setEditBrandOpen(true)
  }

  async function handleSaveBrandEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editBrandName.trim()) return
    setSavingBrandEdit(true)
    try {
      const supabase = createClient()
      // Both the Indonesian legacy columns and the newer English ones are
      // kept in sync on write — other screens in the app still read
      // nama_brand/industri as a fallback (see brand/page.tsx), so editing
      // only the new columns would silently desync them.
      const { data, error } = await supabase
        .from('brands')
        .update({
          name: editBrandName.trim(),
          nama_brand: editBrandName.trim(),
          type: editBrandType,
          industry: editBrandIndustry.trim() || null,
          industri: editBrandIndustry.trim() || null,
          website: editBrandWebsite.trim() || null,
          notes: editBrandNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        toast.error('Gagal menyimpan: kamu tidak memiliki izin untuk mengubah brand ini.')
        return
      }
      toast.success('Data brand berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['brand-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['brands-list'] })
      setEditBrandOpen(false)
    } catch (err) {
      console.error('Failed to update brand:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui brand')
    } finally {
      setSavingBrandEdit(false)
    }
  }

  // Brand deletion is blocked (not silently cascaded) whenever real
  // commercial records still depend on it — deals/quotations/invoices all
  // CASCADE-delete from brands at the DB level, so an unconditional delete
  // here would silently wipe a brand's entire deal/financial history.
  const brandDeleteBlockers: string[] = []
  if (deals.length > 0) brandDeleteBlockers.push(`${deals.length} Deal`)
  if (brandVideos.length > 0) brandDeleteBlockers.push(`${brandVideos.length} Konten terkait`)

  async function handleDeleteBrand() {
    if (brandDeleteBlockers.length > 0) return
    setDeletingBrand(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('brands').delete().eq('id', id)
      if (error) throw error
      toast.success('Brand berhasil dihapus.')
      queryClient.invalidateQueries({ queryKey: ['brands-list'] })
      router.push('/brand')
    } catch (err) {
      console.error('Failed to delete brand:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus brand')
    } finally {
      setDeletingBrand(false)
    }
  }

  function openEditContact(c: BrandContact) {
    setEditContactId(c.id)
    setEditContactName(c.name || '')
    setEditContactRole(c.role || '')
    setEditContactEmail(c.email || '')
    setEditContactPhone(c.phone || '')
  }

  async function handleSaveContactEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editContactId || !editContactName.trim()) return
    setSavingContactEdit(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('brand_contacts')
        .update({
          name: editContactName.trim(),
          role: editContactRole.trim() || null,
          email: editContactEmail.trim() || null,
          phone: editContactPhone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editContactId)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        toast.error('Gagal menyimpan: kamu tidak memiliki izin untuk mengubah kontak ini.')
        return
      }
      toast.success('Kontak berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['brand-contacts', id] })
      setEditContactId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui kontak')
    } finally {
      setSavingContactEdit(false)
    }
  }

  async function handleDeleteContact() {
    if (!deleteContactTarget) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('brand_contacts').delete().eq('id', deleteContactTarget.id)
      if (error) throw error
      toast.success('Kontak dihapus.')
      queryClient.invalidateQueries({ queryKey: ['brand-contacts', id] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus kontak')
    } finally {
      setDeleteContactTarget(null)
    }
  }

  // Financial aggregates
  const totalDealValue = deals.reduce((acc: number, d: any) => acc + Number(d.total_value || d.nilai_total || 0), 0)
  const totalPaid = payments.filter((p: any) => p.status === 'paid').reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0)
  const outstandingPayment = Math.max(0, totalDealValue - totalPaid)
  const activeDealsCount = deals.filter((d: any) => d.status !== 'completed' && d.status !== 'cancelled').length

  // Per-deal deliverable/content progress for the Deals tab table.
  const dealProgress = new Map<string, { deliverableTotal: number; deliverablesDone: number; contentCount: number }>(
    deals.map((d: any) => {
      const delsForDeal = dealDeliverables.filter((dd: any) => dd.deal_id === d.id)
      const delIdsForDeal = new Set(delsForDeal.map((dd: any) => dd.id))
      const linkedContentCount = dealContentJunctions.filter((j: any) => delIdsForDeal.has(j.deliverable_id)).length
      const deliverablesDone = delsForDeal.filter((dd: any) => dd.status === 'completed' || dd.status === 'done').length
      return [d.id, { deliverableTotal: delsForDeal.length, deliverablesDone, contentCount: linkedContentCount }]
    })
  )

  if (brandLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!brand) {
    return <div className="p-8 text-center text-text-muted">Brand tidak ditemukan.</div>
  }

  const brandName = brand.name || brand.nama_brand || 'Unnamed Brand'
  const brandIndustry = brand.industry || brand.industri || 'Umum'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/brand')} className="p-1.5 rounded-lg border border-border bg-white hover:bg-subtle text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-text-primary">{brandName}</h1>
              <Badge variant="outline" className="text-[10px] font-normal capitalize">
                {brand.type || brand.brand_type || 'Direct Brand'}
              </Badge>
              <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800">
                {brand.status || 'Aktif'}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">{brandIndustry} {brand.website && `• ${brand.website}`}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openEditBrand} className="gap-1.5 font-semibold text-xs h-9">
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Brand</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDeleteBrandOpen(true)} className="gap-1.5 font-semibold text-xs h-9 text-error border-error/30 hover:bg-error/5">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={() => setCreateDealOpen(true)} className="bg-accent hover:bg-accent/90 gap-1.5 font-semibold text-xs h-9">
            <Plus className="w-4 h-4" />
            <span>+ Buat Deal / Collaboration</span>
          </Button>
        </div>
      </div>

      {/* Operational Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-border rounded-xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Active Deals</p>
          <p className="text-xl font-bold text-text-primary font-mono">{activeDealsCount} <span className="text-xs font-normal text-text-muted">/ {deals.length} total</span></p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Content</p>
          <p className="text-xl font-bold text-text-primary font-mono">{brandVideos.length}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Nilai Deal</p>
          <p className="text-lg font-bold text-emerald-700 font-mono">{formatRupiah(totalDealValue)}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Outstanding Payment</p>
          <p className={cn('text-lg font-bold font-mono', outstandingPayment > 0 ? 'text-amber-600' : 'text-text-muted')}>
            {formatRupiah(outstandingPayment)}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 space-x-6 h-auto mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Overview</TabsTrigger>
          <TabsTrigger value="deals" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Konten Terkait ({brandVideos.length})</TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Payments</TabsTrigger>
        </TabsList>

        {/* TAB: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-text-primary border-b border-border pb-2">Informasi Client</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-text-muted">Nama Brand:</span>
                  <p className="font-semibold text-text-primary mt-0.5">{brandName}</p>
                </div>
                <div>
                  <span className="text-text-muted">Tipe Brand:</span>
                  <p className="font-semibold text-text-primary capitalize mt-0.5">{brand.type || brand.brand_type || 'Direct Brand'}</p>
                </div>
                <div>
                  <span className="text-text-muted">Industri:</span>
                  <p className="font-semibold text-text-primary mt-0.5">{brandIndustry}</p>
                </div>
                <div>
                  <span className="text-text-muted">Website:</span>
                  <p className="font-semibold text-text-primary mt-0.5">{brand.website || '—'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-text-primary border-b border-border pb-2">Catatan Internal</h3>
              <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                {brand.notes || brand.catatan || <span className="italic text-text-muted">Belum ada catatan internal untuk brand ini.</span>}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* TAB: DEALS */}
        <TabsContent value="deals" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-text-primary">Daftar Deal & Kolaborasi</h3>
            <Button size="sm" onClick={() => setCreateDealOpen(true)} className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold">
              <Plus className="w-3.5 h-3.5 mr-1" /> Deal Baru
            </Button>
          </div>

          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead className="bg-subtle/70 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Judul Deal</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Tipe</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Deliverable</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Konten</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Nilai Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Status</th>
                  <th className="w-12 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {deals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted text-xs">
                      Belum ada deal untuk brand ini. Klik "+ Buat Deal" di atas.
                    </td>
                  </tr>
                ) : (
                  deals.map((d: any) => {
                    const progress = dealProgress.get(d.id) || { deliverableTotal: 0, deliverablesDone: 0, contentCount: 0 }
                    return (
                    <tr key={d.id} onClick={() => router.push(`/brand/deals/${d.id}`)} className="hover:bg-subtle/60 cursor-pointer transition-colors group">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-sm text-text-primary group-hover:text-accent transition-colors">{d.title || d.nama_campaign}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{d.deal_number || 'DEAL'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-secondary capitalize">
                        {d.collaboration_type || 'Campaign'}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-xs">
                        {progress.deliverableTotal === 0 ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <span className="font-semibold text-text-primary">{progress.deliverablesDone} / {progress.deliverableTotal}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-xs">
                        {progress.contentCount === 0 ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <span className="font-semibold text-accent">{progress.contentCount}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-emerald-700">
                        {formatRupiah(Number(d.total_value || d.nilai_total || 0))}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider capitalize">
                          {d.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all inline-block" />
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB: CONTENT */}
        <TabsContent value="content" className="space-y-4 outline-none">
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead className="bg-subtle/70 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">No. Video & Judul</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Format</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Status Produksi</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {brandVideos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-text-muted text-xs">
                      Belum ada konten terkait untuk brand ini.
                    </td>
                  </tr>
                ) : (
                  brandVideos.map((v: any) => (
                    <tr key={v.id} onClick={() => router.push(`/content/${v.id}`)} className="hover:bg-subtle/60 cursor-pointer transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-text-muted">{v.no_video || '—'}</span>
                          <p className="font-semibold text-xs text-text-primary group-hover:text-accent transition-colors">{v.judul}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-secondary">{v.format || 'Video'}</td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant="secondary" className="text-[10px] capitalize font-semibold">{v.status}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs font-mono text-text-muted">
                        {v.deadline_posting ? formatDate(v.deadline_posting) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB: CONTACTS */}
        <TabsContent value="contacts" className="space-y-4 outline-none">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-text-primary">Kontak Person (PIC)</h3>
            <Button size="sm" onClick={() => setCreateContactOpen(true)} className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold">
              <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Kontak PIC
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {contacts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-text-muted text-xs bg-white border border-border rounded-xl">
                Belum ada kontak PIC tersimpan. Klik "+ Tambah Kontak PIC" untuk menambahkan.
              </div>
            ) : (
              contacts.map((c) => (
                <div key={c.id} className="bg-white border border-border rounded-xl p-4 space-y-2 relative group">
                  {c.is_primary && (
                    <Badge className="absolute top-3 right-3 text-[9px] bg-teal-100 text-teal-800 font-bold uppercase">Primary PIC</Badge>
                  )}
                  <p className="font-bold text-sm text-text-primary">{c.name}</p>
                  {c.role && <p className="text-xs text-accent font-medium">{c.role}</p>}
                  <div className="space-y-1 pt-1 text-xs text-text-secondary border-t border-border/50">
                    {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-text-muted" /><span>{c.email}</span></div>}
                    {c.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-text-muted" /><span>{c.phone}</span></div>}
                  </div>
                  <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditContact(c)} className="p-1 rounded hover:bg-subtle text-text-muted hover:text-accent" title="Edit kontak">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteContactTarget({ id: c.id, name: c.name })} className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error" title="Hapus kontak">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* TAB: PAYMENTS */}
        <TabsContent value="payments" className="space-y-4 outline-none">
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-text-primary">Ringkasan Pembayaran Brand</h3>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span>Dibayar: <strong className="text-emerald-700">{formatRupiah(totalPaid)}</strong></span>
                <span>Outstanding: <strong className="text-amber-600">{formatRupiah(outstandingPayment)}</strong></span>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs min-w-[500px]">
              <thead className="bg-subtle/50 text-text-muted border-b border-border">
                <tr>
                  <th className="px-3 py-2">Deal</th>
                  <th className="px-3 py-2">Tipe Pembayaran</th>
                  <th className="px-3 py-2 text-right">Jumlah</th>
                  <th className="px-3 py-2 text-center">Jatuh Tempo</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-text-muted">Belum ada record pembayaran. Pembayaran dicatat pada level masing-masing Deal.</td></tr>
                ) : (
                  payments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2.5 font-medium text-text-primary">{p.deals?.title || p.deals?.nama_campaign || 'Deal'}</td>
                      <td className="px-3 py-2.5 uppercase text-[10px] font-bold text-text-muted">{p.payment_type}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-text-primary">{formatRupiah(Number(p.amount || 0))}</td>
                      <td className="px-3 py-2.5 text-center text-text-muted">{p.due_date ? formatDate(p.due_date) : '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant={p.status === 'paid' ? 'default' : 'outline'} className={cn('text-[9px] uppercase font-bold', p.status === 'paid' ? 'bg-emerald-600 text-white' : 'text-amber-600 border-amber-300')}>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sheet: Create Deal */}
      <Sheet open={createDealOpen} onOpenChange={setCreateDealOpen}>
        <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">Buat Deal / Kolaborasi Baru</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreateDeal} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Judul Deal / Campaign <span className="text-error">*</span></Label>
              <Input value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} placeholder="misal Shell Lubricants Campaign Q4" className="h-9 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipe Kolaborasi</Label>
                <Select value={collaborationType} onValueChange={setCollaborationType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Campaign" className="text-xs">Campaign</SelectItem>
                    <SelectItem value="Event" className="text-xs">Event</SelectItem>
                    <SelectItem value="Product Review" className="text-xs">Product Review</SelectItem>
                    <SelectItem value="Content Partnership" className="text-xs">Content Partnership</SelectItem>
                    <SelectItem value="Retainer" className="text-xs">Retainer</SelectItem>
                    <SelectItem value="One-off Collaboration" className="text-xs">One-off Collaboration</SelectItem>
                    <SelectItem value="Barter" className="text-xs">Barter</SelectItem>
                    <SelectItem value="Other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nilai Total Deal (Rp)</Label>
                <Input type="number" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} placeholder="20000000" className="h-9 text-xs font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Mulai</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Selesai</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan Deal</Label>
              <Textarea value={dealNotes} onChange={(e) => setDealNotes(e.target.value)} placeholder="Catatan kesepakatan atau poin penting..." rows={3} className="text-xs" />
            </div>

            <div className="pt-3 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Buat Deal
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setCreateDealOpen(false)}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet: Create Contact */}
      <Sheet open={createContactOpen} onOpenChange={setCreateContactOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">Tambah Kontak PIC</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreateContact} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Kontak <span className="text-error">*</span></Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="misal Budi Santoso" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Jabatan / Role</Label>
              <Input value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="misal Marketing Manager" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="budi@brand.com" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">No. Telepon / WA</Label>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="08123456789" className="h-9 text-xs" />
            </div>

            <div className="pt-3 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Simpan Kontak
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setCreateContactOpen(false)}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Brand */}
      <Sheet open={editBrandOpen} onOpenChange={setEditBrandOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">Edit Brand</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSaveBrandEdit} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Brand / Client <span className="text-error">*</span></Label>
              <Input value={editBrandName} onChange={(e) => setEditBrandName(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipe Brand</Label>
                <Select value={editBrandType} onValueChange={setEditBrandType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct" className="text-xs">Direct Brand</SelectItem>
                    <SelectItem value="agency" className="text-xs">Agency</SelectItem>
                    <SelectItem value="other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Industri</Label>
                <Input value={editBrandIndustry} onChange={(e) => setEditBrandIndustry(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Website</Label>
              <Input value={editBrandWebsite} onChange={(e) => setEditBrandWebsite(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan / Overview Brand</Label>
              <Textarea value={editBrandNotes} onChange={(e) => setEditBrandNotes(e.target.value)} rows={3} className="text-xs" />
            </div>
            <div className="pt-4 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={savingBrandEdit}>
                {savingBrandEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Simpan Perubahan
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setEditBrandOpen(false)}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Brand — blocked while real dependent records exist, per the
          CASCADE relationships in the schema (deals/quotations/invoices all
          CASCADE-delete from brands) */}
      <Dialog open={deleteBrandOpen} onOpenChange={setDeleteBrandOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 text-error" />
            </div>
            <DialogTitle className="text-base text-text-primary">Hapus Brand "{brandName}"?</DialogTitle>
            {brandDeleteBlockers.length > 0 ? (
              <DialogDescription className="text-xs text-text-secondary leading-relaxed pt-1">
                Brand ini masih memiliki <strong>{brandDeleteBlockers.join(' dan ')}</strong> yang terhubung. Menghapus brand akan ikut menghapus seluruh data Deal/Quotation/Invoice terkait secara permanen. Hapus atau pindahkan data tersebut terlebih dahulu sebelum menghapus brand ini.
              </DialogDescription>
            ) : (
              <DialogDescription className="text-xs text-text-secondary leading-relaxed pt-1">
                Brand ini tidak memiliki Deal atau Konten terkait. Tindakan ini akan menghapus data brand secara permanen dan tidak dapat dibatalkan.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="mt-4 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteBrandOpen(false)} disabled={deletingBrand}>Batal</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteBrand}
              disabled={deletingBrand || brandDeleteBlockers.length > 0}
              className="gap-1.5 bg-error hover:bg-error/90 text-white font-semibold"
            >
              {deletingBrand ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Ya, Hapus Brand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact */}
      <Dialog open={!!editContactId} onOpenChange={(open) => !open && setEditContactId(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base text-text-primary">Edit Kontak</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveContactEdit} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-text-muted">Nama</Label>
                <Input value={editContactName} onChange={(e) => setEditContactName(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-text-muted">Jabatan / Role</Label>
                <Input value={editContactRole} onChange={(e) => setEditContactRole(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-text-muted">Email</Label>
                <Input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-text-muted">No. Phone / WA</Label>
                <Input value={editContactPhone} onChange={(e) => setEditContactPhone(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="pt-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditContactId(null)}>Batal</Button>
              <Button type="submit" size="sm" className="bg-accent hover:bg-accent/90 font-semibold" disabled={savingContactEdit}>
                {savingContactEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Contact */}
      <Dialog open={!!deleteContactTarget} onOpenChange={(open) => !open && setDeleteContactTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base text-text-primary">Hapus kontak "{deleteContactTarget?.name}"?</DialogTitle>
            <DialogDescription className="text-xs text-text-secondary pt-1">Tindakan ini tidak dapat dibatalkan.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteContactTarget(null)}>Batal</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteContact} className="bg-error hover:bg-error/90 text-white font-semibold">
              Ya, Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
