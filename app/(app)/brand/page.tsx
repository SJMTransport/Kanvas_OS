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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Plus, Loader2, Handshake, ExternalLink, ArrowRight, Building2, User, Phone, Mail, Layers, CalendarClock } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/page-header'
import { PageToolbar, SearchInput } from '@/components/layout/page-toolbar'
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs'
import { ContentIdentity } from '@/components/content/ContentIdentity'
import { formatRupiah, formatDate } from '@/lib/utils/formatters'
import type { BrandType } from '@/lib/types/brand'

// Brand.status values that represent "not yet an active client relationship"
// (per the CHECK constraint in supabase/migrations/005_brand.sql). Reused
// as-is — no new Prospect concept/table, just a filter over the existing
// brands.status column, per the audit finding that this already
// represents exactly the "future follow-up" distinction requested.
const PROSPECT_STATUSES = new Set(['prospect', 'approach', 'negosiasi', 'cold'])

type BrandViewTab = 'active' | 'prospect' | 'deliverables'

const schema = z.object({
  name: z.string().min(1, 'Nama brand wajib diisi'),
  brand_type: z.enum(['direct', 'agency', 'other']).default('direct'),
  industry: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  // Contact
  pic_name: z.string().optional(),
  pic_role: z.string().optional(),
  pic_email: z.string().optional(),
  pic_phone: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface BrandRow {
  id: string
  name: string
  brand_type: string
  industry: string | null
  website: string | null
  status: string
  created_at: string
  active_deals_count: number
  active_content_count: number
  outstanding_payment: number
}

export default function BrandPage() {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [viewTab, setViewTab] = useState<BrandViewTab>('active')

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { brand_type: 'direct' },
  })

  const { data: brands = [], isLoading } = useQuery<BrandRow[]>({
    queryKey: ['brands-list', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()

      // Fetch brands
      const { data: rawBrands, error } = await supabase
        .from('brands')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!rawBrands || rawBrands.length === 0) return []

      // Fetch deals summaries
      const { data: rawDeals } = await supabase
        .from('deals')
        .select('id, brand_id, status, nilai_total, total_value')
        .eq('workspace_id', workspaceId)

      // Fetch payments for outstanding calc
      const dealIds = (rawDeals ?? []).map((d: any) => d.id)
      let paymentsByDeal: Record<string, number> = {}
      if (dealIds.length > 0) {
        const { data: rawPayments } = await supabase
          .from('deal_payments')
          .select('deal_id, amount, status')
          .in('deal_id', dealIds)
          .eq('status', 'paid')

        ;(rawPayments ?? []).forEach((p: any) => {
          paymentsByDeal[p.deal_id] = (paymentsByDeal[p.deal_id] || 0) + Number(p.amount || 0)
        })
      }

      // Fetch videos count
      const { data: rawVideos } = await supabase
        .from('videos')
        .select('id, brand_id')
        .eq('workspace_id', workspaceId)
        .not('brand_id', 'is', null)

      const videosByBrand: Record<string, number> = {}
      ;(rawVideos ?? []).forEach((v: any) => {
        if (v.brand_id) videosByBrand[v.brand_id] = (videosByBrand[v.brand_id] || 0) + 1
      })

      return rawBrands.map((b: any) => {
        const brandDeals = (rawDeals ?? []).filter((d: any) => d.brand_id === b.id)
        const activeDealsCount = brandDeals.filter((d: any) => d.status !== 'completed' && d.status !== 'cancelled' && d.status !== 'selesai').length
        
        let outstanding = 0
        brandDeals.forEach((d: any) => {
          const total = Number(d.total_value || d.nilai_total || 0)
          const paid = paymentsByDeal[d.id] || 0
          if (total > paid) outstanding += (total - paid)
        })

        return {
          id: b.id,
          name: b.name || b.nama_brand || 'Unnamed Brand',
          brand_type: b.brand_type || b.type || 'direct',
          industry: b.industry || b.industri || null,
          website: b.website || null,
          status: b.status || 'aktif',
          created_at: b.created_at,
          active_deals_count: activeDealsCount,
          active_content_count: videosByBrand[b.id] || 0,
          outstanding_payment: outstanding,
        }
      })
    },
    enabled: !!workspaceId,
  })

  // "Semua Deliverable" — a read-only overview over the EXISTING
  // deal_deliverables records (Brand -> Deal -> Deliverable), never a copy.
  // Workspace-scoped via deals!inner(workspace_id) — deal_deliverables has
  // no workspace_id column of its own, so this join is the only correct
  // scoping path (never filter client-side over an unscoped query).
  const { data: allDeliverables = [], isLoading: deliverablesLoading } = useQuery({
    queryKey: ['brand-all-deliverables', workspaceId],
    enabled: !!workspaceId && viewTab === 'deliverables',
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('deal_deliverables')
        .select('id, name, platform, quantity, unit, deadline, status, deal_id, deals!inner(id, title, nama_campaign, workspace_id, brand_id, brands(name, nama_brand)), content_deliverables(videos(id, no_video, judul, tanggal_shooting))')
        .eq('deals.workspace_id', workspaceId)
        .order('deadline', { ascending: true, nullsFirst: false })
      if (error) { console.error('Failed to load deliverables overview:', error); return [] }
      return data ?? []
    },
  })

  const activeBrands = brands.filter((b) => !PROSPECT_STATUSES.has(b.status))
  const prospectBrands = brands.filter((b) => PROSPECT_STATUSES.has(b.status))

  async function onSubmit(data: FormData) {
    if (!workspaceId) return
    setSaving(true)
    try {
      const supabase = createClient()
      // Insert brand. Column names must match the actual schema (005_brand.sql
      // + 032_brand_collaboration_system.sql) exactly — `brand_type` and
      // `catatan` are NOT real columns on `brands` (that was the root cause
      // of every brand creation failing; see git history for the bug this
      // fixed). `type`/`name`/`industry` are the 032 additions; `nama_brand`/
      // `industri`/`notes` are the original Indonesian-named columns kept
      // for backward compatibility with older reads.
      const { data: newBrand, error } = await supabase
        .from('brands')
        .insert({
          workspace_id: workspaceId,
          name: data.name.trim(),
          nama_brand: data.name.trim(),
          type: data.brand_type,
          industry: data.industry?.trim() || null,
          industri: data.industry?.trim() || null,
          website: data.website?.trim() || null,
          notes: data.notes?.trim() || null,
          status: 'aktif',
        })
        .select()
        .single()

      if (error) {
        console.error('Brand insert failed:', error)
        throw error
      }

      // Insert primary contact if provided. Failure here must not be
      // silent — the brand row already exists at this point, so we tell
      // the user their PIC specifically didn't save rather than reporting
      // a blanket success.
      let contactError: unknown = null
      if (newBrand?.id && data.pic_name?.trim()) {
        const { error: contactErr } = await supabase.from('brand_contacts').insert({
          brand_id: newBrand.id,
          name: data.pic_name.trim(),
          role: data.pic_role?.trim() || 'PIC',
          email: data.pic_email?.trim() || null,
          phone: data.pic_phone?.trim() || null,
          is_primary: true,
        })
        if (contactErr) {
          console.error('Brand contact insert failed:', contactErr)
          contactError = contactErr
        }
      }

      if (contactError) {
        toast.warning('Brand dibuat, tapi kontak PIC gagal disimpan. Tambahkan lagi dari halaman detail brand.')
      } else {
        toast.success('Brand berhasil ditambahkan!')
      }
      queryClient.invalidateQueries({ queryKey: ['brands-list'] })
      reset()
      setSheetOpen(false)
      if (newBrand?.id) router.push(`/brand/${newBrand.id}`)
    } catch (err) {
      console.error('Brand creation failed:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal membuat brand')
    } finally {
      setSaving(false)
    }
  }

  const tabBrands = viewTab === 'prospect' ? prospectBrands : activeBrands
  const filteredBrands = tabBrands.filter((b) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return b.name.toLowerCase().includes(q) || (b.industry && b.industry.toLowerCase().includes(q))
  })

  const viewOptions: TabOption<BrandViewTab>[] = [
    { value: 'active', label: `Brand Aktif (${activeBrands.length})` },
    { value: 'prospect', label: `Prospek (${prospectBrands.length})` },
    { value: 'deliverables', label: 'Semua Deliverable' },
  ]

  return (
    <PageContainer className="h-full flex flex-col space-y-4">
      <PageHeader
        title="Brand"
        subtitle="Manajemen kolaborasi, deal, & deliverable brand"
        className="mb-0"
      />

      <PageToolbar
        left={
          <div className="flex items-center gap-3">
            <SegmentedTabs options={viewOptions} value={viewTab} onChange={setViewTab} />
            {viewTab !== 'deliverables' && (
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama brand, industri..." />
            )}
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push('/brand/shooting')} className="gap-1.5 font-semibold">
              <CalendarClock className="w-4 h-4" />
              <span>Jadwal Shooting</span>
            </Button>
            <Button size="sm" onClick={() => setSheetOpen(true)} className="bg-accent hover:bg-accent/90 gap-1.5 font-semibold">
              <Plus className="w-4 h-4" />
              <span>Tambah Brand</span>
            </Button>
          </div>
        }
      />

      {viewTab === 'deliverables' ? (
        <div className="flex-1 bg-white border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead className="sticky top-0 bg-subtle/70 border-b border-border z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Brand</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Deal</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Deliverable</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Content</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Platform</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Qty</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Deadline</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Shooting</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {deliverablesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                  ))
                ) : allDeliverables.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-text-muted">
                      <Layers className="w-10 h-10 mx-auto mb-2 text-border" />
                      <p className="text-sm font-semibold">Belum Ada Deliverable</p>
                      <p className="text-xs text-text-muted mt-1">Deliverable dibuat dari tab "SOW & Deliverables" pada Deal Detail.</p>
                    </td>
                  </tr>
                ) : (
                  allDeliverables.map((d: any) => {
                    const linkedContent = (d.content_deliverables ?? []).map((j: any) => j.videos).filter(Boolean)
                    const shootingDates = linkedContent.map((v: any) => v.tanggal_shooting).filter(Boolean)
                    return (
                    <tr
                      key={d.id}
                      onClick={() => router.push(`/brand/deals/${d.deal_id}`)}
                      className="hover:bg-subtle/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5 text-xs font-semibold text-text-primary">{d.deals?.brands?.name || d.deals?.brands?.nama_brand || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-text-secondary">{d.deals?.title || d.deals?.nama_campaign || '—'}</td>
                      <td className="px-4 py-3.5 text-xs font-medium text-text-primary">{d.name}</td>
                      <td className="px-4 py-3.5 text-xs text-text-secondary">
                        {linkedContent.length === 0 ? (
                          <span className="italic text-text-muted">Belum ada</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {linkedContent.map((v: any) => (
                              <span key={v.id} onClick={(e) => { e.stopPropagation(); router.push(`/content/${v.id}`) }} className="hover:text-accent hover:underline">
                                <ContentIdentity videoNo={v.no_video} judul={v.judul} />
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-secondary capitalize">{d.platform || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-center font-mono">{d.quantity ?? 1}</td>
                      <td className="px-4 py-3.5 text-xs text-text-secondary">{d.deadline ? formatDate(d.deadline) : '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-text-secondary">
                        {shootingDates.length === 0 ? <span className="text-text-muted">—</span> : shootingDates.map((sd: string) => formatDate(sd)).join(', ')}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <Badge variant="outline" className="text-[10px] capitalize font-semibold">{d.status || 'planned'}</Badge>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      /* Main Brands Table */
      <div className="flex-1 bg-white border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="sticky top-0 bg-subtle/70 border-b border-border z-10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Nama Brand</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Tipe</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Industri</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Active Deals</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Konten Terkait</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Outstanding Payment</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Status</th>
                <th className="w-12 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-text-muted">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-border" />
                    <p className="text-sm font-semibold">Belum Ada Brand Terdaftar</p>
                    <p className="text-xs text-text-muted mt-1">Klik "+ Tambah Brand" untuk mendaftarkan brand/klien baru.</p>
                  </td>
                </tr>
              ) : (
                filteredBrands.map((brand) => (
                  <tr
                    key={brand.id}
                    onClick={() => router.push(`/brand/${brand.id}`)}
                    className="hover:bg-subtle/60 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200/60 flex items-center justify-center text-accent font-bold text-xs uppercase shrink-0">
                          {brand.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-text-primary group-hover:text-accent transition-colors">
                            {brand.name}
                          </p>
                          {brand.website && (
                            <a
                              href={brand.website.startsWith('http') ? brand.website : `https://${brand.website}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-text-muted hover:text-accent flex items-center gap-1 mt-0.5 truncate max-w-[200px]"
                            >
                              <span>{brand.website.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-text-secondary capitalize">
                      <Badge variant="outline" className="text-[10px] font-normal capitalize">
                        {brand.brand_type === 'direct' ? 'Direct Brand' : brand.brand_type === 'agency' ? 'Agency' : 'Other'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-text-secondary">
                      {brand.industry || <span className="text-text-muted italic">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', brand.active_deals_count > 0 ? 'bg-emerald-50 text-emerald-700 font-mono' : 'text-text-muted')}>
                        {brand.active_deals_count} Deal
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', brand.active_content_count > 0 ? 'bg-blue-50 text-blue-700 font-mono' : 'text-text-muted')}>
                        {brand.active_content_count} Konten
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold">
                      {brand.outstanding_payment > 0 ? (
                        <span className="text-amber-600">{formatRupiah(brand.outstanding_payment)}</span>
                      ) : (
                        <span className="text-text-muted">Rp0</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] uppercase font-bold tracking-wider',
                          brand.status === 'aktif' || brand.status === 'active' || brand.status === 'deal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {brand.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all inline-block" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Sheet Registration Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">Registrasi Brand Baru</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Brand / Client <span className="text-error">*</span></Label>
              <Input {...register('name')} placeholder="misal Shell Lubricants, Samsung, SANY" className="h-9 text-xs" />
              {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipe Brand</Label>
                <Controller
                  name="brand_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct" className="text-xs">Direct Brand</SelectItem>
                        <SelectItem value="agency" className="text-xs">Agency</SelectItem>
                        <SelectItem value="other" className="text-xs">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Industri</Label>
                <Input {...register('industry')} placeholder="misal F&B, Oil & Gas, Tech" className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Website</Label>
              <Input {...register('website')} placeholder="https://brand.com" className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan / Overview Brand</Label>
              <Textarea {...register('notes')} placeholder="Overview singkat mengenai brand atau arahan khusus..." rows={2} className="text-xs" />
            </div>

            {/* Optional Primary Contact Section */}
            <div className="border-t border-border pt-4 mt-2 space-y-3">
              <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent" />
                <span>Kontak Utama (PIC Brand)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-text-muted">Nama PIC</Label>
                  <Input {...register('pic_name')} placeholder="misal Budi Santoso" className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-text-muted">Jabatan / Role</Label>
                  <Input {...register('pic_role')} placeholder="misal Brand Manager" className="h-8 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-text-muted">Email</Label>
                  <Input type="email" {...register('pic_email')} placeholder="budi@brand.com" className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-text-muted">No. Phone / WA</Label>
                  <Input {...register('pic_phone')} placeholder="08123456789" className="h-8 text-xs" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Simpan Brand Baru
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setSheetOpen(false)}>
                Batal
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </PageContainer>
  )
}
