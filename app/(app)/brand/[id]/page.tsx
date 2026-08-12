'use client'

import { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  ArrowLeft, Plus, Loader2, FileText, Handshake, Receipt, CalendarClock, 
  Video, DollarSign, Layers, Activity, CheckCircle2, TrendingUp, FolderOpen, ExternalLink 
} from 'lucide-react'
import { formatDate, formatRupiah } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils'
import { AddVideoSheet } from '@/app/(app)/content/add-video-sheet'
import { LinkVideoDialog } from '@/app/(app)/brand/link-video-dialog'

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
    <div className="space-y-0.5 cursor-pointer group p-2.5 hover:bg-subtle/50 rounded-lg transition-colors border border-transparent hover:border-border/40" onClick={() => setEditing(true)}>
      <span className="text-xs text-text-muted font-medium">{label}</span>
      <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
        {value || <span className="text-text-muted italic font-normal">Belum diisi — klik untuk edit</span>}
      </p>
    </div>
  )
}

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [addFollowup, setAddFollowup] = useState(false)
  const [savingFollowup, setSavingFollowup] = useState(false)
  const [addVideoOpen, setAddVideoOpen] = useState(false)
  const [linkVideoOpen, setLinkVideoOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FollowupForm>({
    resolver: zodResolver(followupSchema) as any,
    defaultValues: { tanggal: new Date().toISOString().split('T')[0] },
  })

  // Queries
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

  const [catatanText, setCatatanText] = useState('')
  useEffect(() => {
    if (brand?.catatan) setCatatanText(brand.catatan)
  }, [brand])

  const { data: videos } = useQuery({
    queryKey: ['brand-videos', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('brand_id', id)
        .order('created_at', { ascending: false })
      return data ?? []
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

  // Mutations/Updates
  async function updateField(field: string, value: string) {
    const supabase = createClient()
    const { error } = await supabase.from('brands').update({ [field]: value || null }).eq('id', id)
    if (error) toast.error('Gagal menyimpan')
    else {
      toast.success('Perubahan disimpan')
      queryClient.invalidateQueries({ queryKey: ['brand', id] })
    }
  }

  async function handleUpdateVideoStatus(videoId: string, newStatus: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('videos')
      .update({ status: newStatus })
      .eq('id', videoId)
    if (error) {
      toast.error('Gagal memperbarui status video: ' + error.message)
    } else {
      toast.success('Status video berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['brand-videos', id] })
    }
  }

  async function handleCatatanBlur() {
    if (catatanText !== (brand?.catatan ?? '')) {
      await updateField('catatan', catatanText)
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

  // Financial calculations
  const totalDeals = (deals ?? []).reduce((acc: number, d: any) => acc + (d.nilai_deal || 0), 0)
  const totalInvoiced = (invoices ?? []).reduce((acc: number, inv: any) => acc + (inv.total || 0), 0)
  const totalUnpaid = (invoices ?? [])
    .filter((inv: any) => inv.status !== 'lunas' && inv.status !== 'paid')
    .reduce((acc: number, inv: any) => acc + (inv.total || 0), 0)

  // Pipeline calculations
  const totalVideosCount = (videos ?? []).length
  const statusCounts = {
    ide: (videos ?? []).filter((v: any) => v.status === 'ide').length,
    scripting: (videos ?? []).filter((v: any) => v.status === 'scripting').length,
    produksi: (videos ?? []).filter((v: any) => v.status === 'produksi').length,
    editing: (videos ?? []).filter((v: any) => v.status === 'editing').length,
    scheduled: (videos ?? []).filter((v: any) => v.status === 'scheduled').length,
    live: (videos ?? []).filter((v: any) => v.status === 'live').length,
  }

  // Estimate progress based on status helper
  function getProgressPercent(status: string) {
    switch (status) {
      case 'ide': return 15
      case 'scripting': return 40
      case 'produksi': return 60
      case 'editing': return 80
      case 'scheduled': return 90
      case 'live': return 100
      default: return 0
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!brand) return <div className="p-8 text-text-muted">Brand tidak ditemukan.</div>

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-muted hover:text-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-[10px] uppercase font-bold text-accent tracking-wider font-mono">Work / Campaign Workspace</span>
          <h1 className="font-heading text-2xl font-bold text-text-primary leading-tight mt-0.5">{brand.nama_brand}</h1>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 bg-slate-100 p-1 rounded-xl w-full sm:w-auto grid grid-cols-4">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold px-4 py-2">Mission Control</TabsTrigger>
          <TabsTrigger value="videos" className="rounded-lg text-xs font-semibold px-4 py-2">Videos ({totalVideosCount})</TabsTrigger>
          <TabsTrigger value="finance" className="rounded-lg text-xs font-semibold px-4 py-2">Billing & CRM</TabsTrigger>
          <TabsTrigger value="followup" className="rounded-lg text-xs font-semibold px-4 py-2 font-mono">Logs</TabsTrigger>
        </TabsList>

        {/* TAB 1: MISSION CONTROL OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          
          {/* Mission Control Widgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Widget 1: Video Pipeline Funnel */}
            <div className="bg-white border border-border/60 shadow-sm rounded-xl overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-accent" /> Pipeline Video
                  </span>
                  <span className="text-xs bg-subtle px-1.5 py-0.5 rounded font-bold text-text-primary">{totalVideosCount} Total</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] text-text-secondary">
                    <span>Ide: <strong>{statusCounts.ide}</strong></span>
                    <span>Script: <strong>{statusCounts.scripting}</strong></span>
                    <span>Prod: <strong>{statusCounts.produksi}</strong></span>
                    <span>Edit: <strong>{statusCounts.editing}</strong></span>
                    <span>Live: <strong>{statusCounts.live}</strong></span>
                  </div>
                  {/* Funnel pipeline visual bar */}
                  <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
                    <div className="bg-slate-400" style={{ width: `${(statusCounts.ide / (totalVideosCount || 1)) * 100}%` }} title="Ide" />
                    <div className="bg-blue-500" style={{ width: `${(statusCounts.scripting / (totalVideosCount || 1)) * 100}%` }} title="Scripting" />
                    <div className="bg-yellow-500" style={{ width: `${(statusCounts.produksi / (totalVideosCount || 1)) * 100}%` }} title="Produksi" />
                    <div className="bg-orange-500" style={{ width: `${(statusCounts.editing / (totalVideosCount || 1)) * 100}%` }} title="Editing" />
                    <div className="bg-green-500" style={{ width: `${((statusCounts.scheduled + statusCounts.live) / (totalVideosCount || 1)) * 100}%` }} title="Live/Scheduled" />
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 2: Financial Health */}
            <div className="bg-white border border-border/60 shadow-sm rounded-xl overflow-hidden">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-green-600" /> Kesehatan Finansial
                  </span>
                  <span className="text-[10px] font-mono font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Active</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-bold text-text-muted">Total Deal</p>
                    <p className="text-xs font-bold text-text-primary truncate">{formatRupiah(totalDeals)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-bold text-text-muted">Invoiced</p>
                    <p className="text-xs font-bold text-text-secondary truncate">{formatRupiah(totalInvoiced)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-bold text-text-muted">Belum Lunas</p>
                    <p className="text-xs font-bold text-error truncate">{formatRupiah(totalUnpaid)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 3: Next Follow-up & Active Target */}
            <div className="bg-white border border-border/60 shadow-sm rounded-xl overflow-hidden">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-amber-500" /> Follow-up Terdekat
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-text-muted font-bold">
                    {brand.next_followup_date ? `Jadwal: ${formatDate(brand.next_followup_date)}` : 'Tidak ada jadwal follow-up terdekat'}
                  </p>
                  <p className="text-xs text-text-secondary font-medium line-clamp-2 italic">
                    {followups?.[0]?.catatan || 'Belum ada log aktivitas.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Profil Brand & General Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            
            {/* Column 1 & 2: Brand Profile Information */}
            <div className="md:col-span-2 bg-white border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-text-primary border-b border-border/40 pb-2">Detail Informasi Brand</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <InlineField label="Nama Brand" value={brand.nama_brand} onSave={(v) => updateField('nama_brand', v)} />
                <InlineField label="Industri" value={brand.industri} onSave={(v) => updateField('industri', v)} />
                <InlineField label="Website Client" value={brand.website} onSave={(v) => updateField('website', v)} />
                <InlineField label="Sosmed Brand" value={brand.sosmed_brand} onSave={(v) => updateField('sosmed_brand', v)} />
                <InlineField label="Nama PIC" value={brand.pic_name} onSave={(v) => updateField('pic_name', v)} />
                <InlineField label="Email PIC" value={brand.pic_email} onSave={(v) => updateField('pic_email', v)} />
                <InlineField label="WhatsApp PIC" value={brand.pic_whatsapp} onSave={(v) => updateField('pic_whatsapp', v)} />
                <InlineField label="Status Pipeline" value={brand.status} onSave={(v) => updateField('status', v)} />
              </div>
            </div>

            {/* Column 3: Catatan Umum (Autosaving) */}
            <div className="bg-white border border-border rounded-xl p-5 space-y-3 flex flex-col">
              <h3 className="font-bold text-sm text-text-primary border-b border-border/40 pb-2 shrink-0">Catatan Internal</h3>
              <div className="flex-1 min-h-[160px] flex flex-col">
                <Textarea
                  value={catatanText}
                  onChange={(e) => setCatatanText(e.target.value)}
                  onBlur={handleCatatanBlur}
                  placeholder="Tuliskan catatan internal, preferensi brand, target audience, atau arahan visual penting di sini..."
                  className="flex-1 text-xs resize-none p-3 border border-border/80 focus-visible:ring-1 focus-visible:ring-accent leading-relaxed"
                />
              </div>
              <p className="text-[10px] text-text-muted text-right italic font-mono shrink-0">Autosaved on blur</p>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: INTEGRATED VIDEOS LIST */}
        <TabsContent value="videos" className="space-y-4 mt-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-primary">Daftar Konten Video</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setLinkVideoOpen(true)}
                className="h-8 text-xs gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" /> Tautkan dari Library
              </Button>
              <Button size="sm" onClick={() => setAddVideoOpen(true)} className="h-8 text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Buat Baru
              </Button>
            </div>
          </div>

          {(videos ?? []).length === 0 ? (
            <div className="py-16 text-center text-text-muted bg-white border border-border rounded-xl">
              <Video className="w-10 h-10 mx-auto mb-2 text-border" />
              <p className="text-sm font-semibold">Belum Ada Video untuk Brand Ini</p>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">Mulai daftarkan target video endorsement atau konten promosi untuk brand ini dengan mengklik tombol di atas.</p>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl overflow-hidden divide-y divide-border">
              {/* Row Header */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                <div className="col-span-5 sm:col-span-6">Judul Video</div>
                <div className="col-span-3 sm:col-span-2 text-center">Format</div>
                <div className="col-span-4 sm:col-span-2 text-center">Status Produksi</div>
                <div className="col-span-2 hidden sm:block text-right">Progres</div>
              </div>

              {/* Rows */}
              {videos.map((vid: any, index: number) => {
                const progress = getProgressPercent(vid.status)
                return (
                  <div key={vid.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-slate-50/50 transition-colors">
                    
                    {/* Title */}
                    <div className="col-span-5 sm:col-span-6 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-text-muted">#{index + 1}</span>
                        <p className="font-semibold text-xs text-text-primary line-clamp-1">{vid.judul || 'Tanpa Judul'}</p>
                      </div>
                      <p className="text-[10px] text-text-muted">
                        {vid.deadline_posting ? `DL: ${formatDate(vid.deadline_posting)}` : 'No deadline'}
                      </p>
                    </div>

                    {/* Format / Platform */}
                    <div className="col-span-3 sm:col-span-2 text-center">
                      <span className="inline-block text-[9px] font-bold font-sans bg-slate-100 border border-border/80 px-2 py-0.5 rounded-full text-text-secondary">
                        {vid.format || 'Video'}
                      </span>
                    </div>

                    {/* Status Changer Dropdown */}
                    <div className="col-span-4 sm:col-span-2 flex justify-center">
                      <Select 
                        value={vid.status || 'ide'} 
                        onValueChange={(val) => handleUpdateVideoStatus(vid.id, val)}
                      >
                        <SelectTrigger className="h-7 text-[10px] font-bold w-full max-w-[100px] border border-border bg-white capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['ide', 'scripting', 'produksi', 'editing', 'scheduled', 'live'].map((s) => (
                            <SelectItem key={s} value={s} className="text-[11px] capitalize font-semibold">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Progress Bar */}
                    <div className="col-span-2 hidden sm:block">
                      <div className="space-y-1 text-right">
                        <span className="text-[10px] font-mono font-bold text-text-secondary">{progress}%</span>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              progress === 100 ? "bg-green-500" : progress >= 75 ? "bg-blue-500" : "bg-amber-500"
                            )}
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: BILLING & CRM SUB-TABS */}
        <TabsContent value="finance" className="mt-0">
          <Tabs defaultValue="quotations" className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <TabsList className="bg-transparent border-0 p-0 gap-4">
                <TabsTrigger value="quotations" className="text-xs font-semibold border-b-2 border-transparent data-[state=active]:border-accent rounded-none bg-transparent shadow-none px-0 py-1">Quotations ({quotations?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="deals" className="text-xs font-semibold border-b-2 border-transparent data-[state=active]:border-accent rounded-none bg-transparent shadow-none px-0 py-1">Deals ({deals?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="invoices" className="text-xs font-semibold border-b-2 border-transparent data-[state=active]:border-accent rounded-none bg-transparent shadow-none px-0 py-1">Invoices ({invoices?.length ?? 0})</TabsTrigger>
              </TabsList>
            </div>

            {/* Quotations Sub-tab */}
            <TabsContent value="quotations" className="space-y-3 mt-0">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => router.push(`/brand/quotations/new?brandId=${id}`)} className="h-7 text-[11px] gap-1">
                  <Plus className="w-3.5 h-3.5" /> Buat Quotation
                </Button>
              </div>
              {(quotations ?? []).length === 0 ? (
                <div className="py-12 text-center text-text-muted bg-white border border-border rounded-xl">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-border" />
                  <p className="text-sm">Belum ada quotation</p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {(quotations ?? []).map((q) => (
                    <div key={q.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-text-primary">{q.nomor}</p>
                        <p className="text-xs text-text-muted">{formatDate(q.tanggal)} · <span className="font-semibold text-text-secondary capitalize">{q.status}</span></p>
                      </div>
                      <p className="text-sm font-semibold text-accent">{formatRupiah(q.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Deals Sub-tab */}
            <TabsContent value="deals" className="space-y-3 mt-0">
              {(deals ?? []).length === 0 ? (
                <div className="py-12 text-center text-text-muted bg-white border border-border rounded-xl">
                  <Handshake className="w-8 h-8 mx-auto mb-2 text-border" />
                  <p className="text-sm">Belum ada deal</p>
                  <p className="text-xs text-text-muted/70 mt-1">Pembuatan deal dari app segera hadir. Untuk sekarang, mulai dari Quotation.</p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {(deals ?? []).map((d) => (
                    <div key={d.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-text-primary">{d.deal_number}</p>
                        <p className="text-xs text-text-muted">{formatDate(d.tanggal_deal)} · <span className="font-semibold text-text-secondary capitalize">{d.status}</span></p>
                      </div>
                      <p className="text-sm font-semibold text-accent">{formatRupiah(d.nilai_deal)}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Invoices Sub-tab */}
            <TabsContent value="invoices" className="space-y-3 mt-0">
              {(invoices ?? []).length === 0 ? (
                <div className="py-12 text-center text-text-muted bg-white border border-border rounded-xl">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-border" />
                  <p className="text-sm">Belum ada invoice</p>
                  <p className="text-xs text-text-muted/70 mt-1">Pembuatan invoice dari app segera hadir.</p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {(invoices ?? []).map((inv) => (
                    <div key={inv.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-text-primary">{inv.nomor}</p>
                        <p className="text-xs text-text-muted">{formatDate(inv.tanggal)} · <span className="font-semibold text-text-secondary capitalize">{inv.status}</span></p>
                      </div>
                      <p className="text-sm font-semibold text-accent">{formatRupiah(inv.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* TAB 4: FOLLOW-UP LOG */}
        <TabsContent value="followup" className="space-y-4 mt-0">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-text-primary">Log Riwayat Follow-up</h2>
            <Button size="sm" onClick={() => setAddFollowup(!addFollowup)} className="h-8 text-xs gap-1">
              <Plus className="w-3.5 h-3.5" /> Catat Follow-up
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
              <div className="py-12 text-center text-text-muted bg-white border border-border rounded-xl">
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
        </TabsContent>
      </Tabs>

      {/* Sheet to create a brand new video pre-filled with brand_id */}
      <AddVideoSheet 
        open={addVideoOpen} 
        onOpenChange={(open) => {
          setAddVideoOpen(open)
          if (!open) queryClient.invalidateQueries({ queryKey: ['brand-videos', id] })
        }} 
        defaultValues={{ 
          brand_id: id as string,
          is_endorsement: true
        }} 
      />

      {/* Dialog to link an existing video from the library */}
      <LinkVideoDialog
        open={linkVideoOpen}
        onOpenChange={setLinkVideoOpen}
        brandId={id as string}
        brandName={brand?.nama_brand}
        onLinked={() => queryClient.invalidateQueries({ queryKey: ['brand-videos', id] })}
      />

    </div>
  )
}
