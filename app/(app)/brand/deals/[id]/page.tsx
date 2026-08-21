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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  ArrowLeft, Plus, Loader2, FileText, Video, DollarSign, Calendar, 
  CheckCircle2, Link as LinkIcon, Trash2, ExternalLink, Layers
} from 'lucide-react'
import { formatDate, formatRupiah } from '@/lib/utils/formatters'
import {
  getApprovalAgingText,
  getApprovalSeverity,
  isReadyToPublish,
  APPROVAL_STATUS_CONFIG,
} from '@/lib/utils/workflow'
import { cn } from '@/lib/utils'
import type { DealDeliverable, DealPayment, DealSchedule, DealBrief, DealSow } from '@/lib/types/brand'
import { AddVideoSheet } from '@/app/(app)/content/add-video-sheet'

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [saving, setSaving] = useState(false)
  const [addDeliverableOpen, setAddDeliverableOpen] = useState(false)
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)
  const [addScheduleOpen, setAddScheduleOpen] = useState(false)
  const [linkContentOpen, setLinkContentOpen] = useState(false)
  const [activeDeliverableId, setActiveDeliverableId] = useState<string | null>(null)
  const [createContentOpen, setCreateContentOpen] = useState(false)
  const [targetDeliverableForCreate, setTargetDeliverableForCreate] = useState<string | null>(null)

  // Deliverable Form
  const [delName, setDelName] = useState('')
  const [delPlatform, setDelPlatform] = useState('tiktok')
  const [delQty, setDelQty] = useState('1')
  const [delUnit, setDelUnit] = useState('content')
  const [delDeadline, setDelDeadline] = useState('')
  const [delDesc, setDelDesc] = useState('')

  // Payment Form
  const [payAmount, setPayAmount] = useState('')
  const [payType, setPayType] = useState('dp')
  const [payDueDate, setPayDueDate] = useState('')
  const [payStatus, setPayStatus] = useState('pending')
  const [payNotes, setPayNotes] = useState('')

  // Schedule Form
  const [schedTitle, setSchedTitle] = useState('')
  const [schedDate, setSchedDate] = useState('')
  const [schedType, setSchedType] = useState('shooting')

  // Selected video to link
  const [selectedVideoId, setSelectedVideoId] = useState('')

  // Queries
  const { data: deal, isLoading: dealLoading } = useQuery({
    queryKey: ['deal-detail', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('deals')
        .select('*, brands(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const { data: brief } = useQuery<DealBrief | null>({
    queryKey: ['deal-brief', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('deal_briefs').select('*').eq('deal_id', id).maybeSingle()
      return data as DealBrief | null
    },
    enabled: !!id,
  })

  const { data: sow } = useQuery<DealSow | null>({
    queryKey: ['deal-sow', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('deal_sows').select('*').eq('deal_id', id).maybeSingle()
      return data as DealSow | null
    },
    enabled: !!id,
  })

  const { data: deliverables = [] } = useQuery<DealDeliverable[]>({
    queryKey: ['deal-deliverables', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('deal_deliverables').select('*').eq('deal_id', id).order('created_at', { ascending: true })
      return (data ?? []) as DealDeliverable[]
    },
    enabled: !!id,
  })

  const { data: contentJunctions = [] } = useQuery({
    queryKey: ['deal-content-junctions', id],
    queryFn: async () => {
      if (deliverables.length === 0) return []
      const supabase = createClient()
      const delIds = deliverables.map((d) => d.id)
      const { data } = await supabase.from('content_deliverables').select('*, videos(*)').in('deliverable_id', delIds)
      return data ?? []
    },
    enabled: deliverables.length > 0,
  })

  const { data: payments = [] } = useQuery<DealPayment[]>({
    queryKey: ['deal-payments', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('deal_payments').select('*').eq('deal_id', id).order('due_date', { ascending: true })
      return (data ?? []) as DealPayment[]
    },
    enabled: !!id,
  })

  const { data: schedules = [] } = useQuery<DealSchedule[]>({
    queryKey: ['deal-schedules', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('deal_schedules').select('*').eq('deal_id', id).order('date', { ascending: true })
      return (data ?? []) as DealSchedule[]
    },
    enabled: !!id,
  })

  // All workspace videos for linking dialog
  const { data: workspaceVideos = [] } = useQuery({
    queryKey: ['workspace-videos-for-deal', deal?.workspace_id],
    queryFn: async () => {
      if (!deal?.workspace_id) return []
      const supabase = createClient()
      const { data } = await supabase.from('videos').select('id, no_video, judul, status').eq('workspace_id', deal.workspace_id).order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!deal?.workspace_id,
  })

  // Brief Local State
  const [briefCampaign, setBriefCampaign] = useState('')
  const [briefObjective, setBriefObjective] = useState('')
  const [briefKeyMessage, setBriefKeyMessage] = useState('')
  const [briefMandatory, setBriefMandatory] = useState('')
  const [briefDoList, setBriefDoList] = useState('')
  const [briefDontList, setBriefDontList] = useState('')
  const [briefReferences, setBriefReferences] = useState('')

  // Sync brief form
  useState(() => {
    if (brief) {
      setBriefCampaign(brief.campaign || brief.title || '')
      setBriefObjective(brief.objective || '')
      setBriefKeyMessage(brief.key_message || '')
      setBriefMandatory(brief.mandatory_message || '')
      setBriefDoList(brief.do_list || '')
      setBriefDontList(brief.dont_list || '')
      setBriefReferences(brief.reference_links || '')
    }
  })

  // Handlers
  async function handleSaveBrief(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        deal_id: id,
        title: briefCampaign || deal?.title || 'Brief',
        campaign: briefCampaign || null,
        objective: briefObjective || null,
        key_message: briefKeyMessage || null,
        mandatory_message: briefMandatory || null,
        do_list: briefDoList || null,
        dont_list: briefDontList || null,
        reference_links: briefReferences || null,
        updated_at: new Date().toISOString(),
      }

      if (brief?.id) {
        await supabase.from('deal_briefs').update(payload).eq('id', brief.id)
      } else {
        await supabase.from('deal_briefs').insert(payload)
      }

      toast.success('Brief berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['deal-brief', id] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan brief')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateDeliverable(e: React.FormEvent) {
    e.preventDefault()
    if (!delName.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      // Ensure SOW exists
      let currentSowId = sow?.id
      if (!currentSowId) {
        const { data: newSow } = await supabase.from('deal_sows').insert({
          deal_id: id,
          name: `${deal?.title || 'Deal'} SOW v1`,
          version: 'v1',
        }).select().single()
        currentSowId = newSow?.id
      }

      const { error } = await supabase.from('deal_deliverables').insert({
        deal_id: id,
        sow_id: currentSowId || null,
        name: delName.trim(),
        title: delName.trim(),
        platform: delPlatform,
        quantity: Number(delQty) || 1,
        unit: delUnit,
        deadline: delDeadline || null,
        description: delDesc || null,
        status: 'planned',
      })

      if (error) throw error
      toast.success('Deliverable berhasil ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['deal-deliverables', id] })
      queryClient.invalidateQueries({ queryKey: ['deal-sow', id] })
      setAddDeliverableOpen(false)
      setDelName('')
      setDelDeadline('')
      setDelDesc('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat deliverable')
    } finally {
      setSaving(false)
    }
  }

  async function handleLinkContent(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedVideoId || !activeDeliverableId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('content_deliverables').insert({
        content_id: selectedVideoId,
        deliverable_id: activeDeliverableId,
      })

      if (error) throw error
      toast.success('Konten berhasil dihubungkan ke deliverable!')
      queryClient.invalidateQueries({ queryKey: ['deal-content-junctions', id] })
      setLinkContentOpen(false)
      setSelectedVideoId('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghubungkan konten')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlinkContent(junctionId: string) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('content_deliverables').delete().eq('id', junctionId)
      if (error) throw error
      toast.success('Tautan konten dilepas')
      queryClient.invalidateQueries({ queryKey: ['deal-content-junctions', id] })
    } catch (err) {
      toast.error('Gagal melepas tautan')
    }
  }

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payAmount) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('deal_payments').insert({
        deal_id: id,
        amount: Number(payAmount) || 0,
        payment_type: payType as any,
        due_date: payDueDate || null,
        status: payStatus as any,
        paid_date: payStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
        notes: payNotes || null,
      })

      if (error) throw error
      toast.success('Pembayaran berhasil ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['deal-payments', id] })
      setAddPaymentOpen(false)
      setPayAmount('')
      setPayNotes('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambahkan pembayaran')
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePaymentStatus(paymentId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid'
    try {
      const supabase = createClient()
      await supabase.from('deal_payments').update({
        status: nextStatus,
        paid_date: nextStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
      }).eq('id', paymentId)
      toast.success(`Status pembayaran diubah ke ${nextStatus}`)
      queryClient.invalidateQueries({ queryKey: ['deal-payments', id] })
    } catch (err) {
      toast.error('Gagal mengupdate pembayaran')
    }
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!schedTitle.trim() || !schedDate) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('deal_schedules').insert({
        deal_id: id,
        title: schedTitle.trim(),
        date: schedDate,
        type: schedType,
        status: 'pending',
      })
      if (error) throw error
      toast.success('Jadwal milestone ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['deal-schedules', id] })
      setAddScheduleOpen(false)
      setSchedTitle('')
    } catch (err) {
      toast.error('Gagal menambahkan jadwal')
    } finally {
      setSaving(false)
    }
  }

  // Calculate Financials
  const totalValueNum = Number(deal?.total_value || deal?.nilai_total || 0)
  const paidNum = payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const outstandingNum = Math.max(0, totalValueNum - paidNum)

  // Map deliverables with linked content counts
  const deliverablesWithContent = deliverables.map((del) => {
    const linkedJunctions = contentJunctions.filter((j: any) => j.deliverable_id === del.id)
    return {
      ...del,
      linkedJunctions,
      contentCount: linkedJunctions.length,
    }
  })

  // All unique content records across all deliverables in this deal
  const allUniqueContent = Array.from(
    new Map(contentJunctions.map((j: any) => [j.videos?.id, j.videos])).values()
  ).filter(Boolean)

  const publishedCount = allUniqueContent.filter((v: any) => v.publishing_status === 'published' || v.status === 'live').length
  const waitingApprovalCount = allUniqueContent.filter((v: any) => v.approval_status === 'waiting_approval').length
  const revisionRequestedCount = allUniqueContent.filter((v: any) => v.approval_status === 'revision_requested').length
  const readyToPublishCount = allUniqueContent.filter((v: any) => isReadyToPublish(v)).length

  // Items needing attention
  const attentionItems = allUniqueContent.map((v: any) => {
    const isReady = isReadyToPublish(v)
    const isWaiting = v.approval_status === 'waiting_approval'
    const isRevision = v.approval_status === 'revision_requested'

    if (isReady) {
      return { video: v, type: 'ready', label: 'Ready to Publish', icon: 'check' }
    }
    if (isRevision) {
      return { video: v, type: 'revision', label: 'Revision Requested', icon: 'warning' }
    }
    if (isWaiting) {
      const agingText = getApprovalAgingText(v.approval_waiting_since)
      const severity = getApprovalSeverity(v.approval_waiting_since)
      return { video: v, type: 'waiting', label: agingText, severity, icon: 'clock' }
    }
    return null
  }).filter(Boolean)

  if (dealLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!deal) {
    return <div className="p-8 text-center text-text-muted">Deal tidak ditemukan.</div>
  }

  const brandName = deal.brands?.name || deal.brands?.nama_brand || 'Brand'
  const dealTitleStr = deal.title || deal.nama_campaign || 'Deal Collaboration'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/brand/${deal.brand_id}`)} className="p-1.5 rounded-lg border border-border bg-white hover:bg-subtle text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-text-primary">{dealTitleStr}</h1>
              <Badge variant="outline" className="text-[10px] font-semibold text-accent border-accent/40 bg-teal-50">
                {brandName}
              </Badge>
              <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700">
                {deal.collaboration_type || 'Campaign'}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">{deal.deal_number || 'DEAL'} • Dibuat {formatDate(deal.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right font-mono">
          <div>
            <p className="text-[10px] uppercase font-semibold text-text-muted">Nilai Deal</p>
            <p className="text-sm font-bold text-emerald-700">{formatRupiah(totalValueNum)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-text-muted">Outstanding</p>
            <p className={cn('text-sm font-bold', outstandingNum > 0 ? 'text-amber-600' : 'text-text-muted')}>
              {formatRupiah(outstandingNum)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sow" className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 space-x-6 h-auto mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Overview</TabsTrigger>
          <TabsTrigger value="brief" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Brief</TabsTrigger>
          <TabsTrigger value="sow" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">SOW & Deliverables ({deliverables.length})</TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Konten Terkait ({allUniqueContent.length})</TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Schedule ({schedules.length})</TabsTrigger>
          <TabsTrigger value="payment" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Payment ({payments.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          {/* CONTENT PROGRESS Aggregation */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-semibold text-sm text-text-primary uppercase tracking-wider">Content Progress Summary</h3>
              <span className="text-xs font-mono font-bold text-accent">{allUniqueContent.length} Total Konten</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-subtle/50 rounded-lg border border-border/60">
                <p className="text-[10px] uppercase font-bold text-text-muted">Published</p>
                <p className="text-xl font-bold font-mono text-emerald-700 mt-1">{publishedCount}</p>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/60">
                <p className="text-[10px] uppercase font-bold text-amber-800">Waiting Approval</p>
                <p className="text-xl font-bold font-mono text-amber-700 mt-1">{waitingApprovalCount}</p>
              </div>
              <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-200/60">
                <p className="text-[10px] uppercase font-bold text-rose-800">Revision Requested</p>
                <p className="text-xl font-bold font-mono text-rose-700 mt-1">{revisionRequestedCount}</p>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/60">
                <p className="text-[10px] uppercase font-bold text-emerald-800">Ready to Publish</p>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-1">{readyToPublishCount}</p>
              </div>
            </div>
          </div>

          {/* NEEDS ATTENTION Section */}
          {attentionItems.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Needs Attention ({attentionItems.length})
                </h3>
                <span className="text-[10px] text-text-muted">Bottlenecks & Priority Items</span>
              </div>
              <div className="space-y-2">
                {attentionItems.map((item: any) => (
                  <div
                    key={item.video.id}
                    onClick={() => router.push(`/content/${item.video.id}`)}
                    className="p-3 rounded-lg border bg-subtle/30 hover:bg-subtle flex items-center justify-between cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="font-mono font-bold text-accent">{item.video.no_video || '—'}</span>
                      <span className="font-semibold text-text-primary truncate">{item.video.judul}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.type === 'ready' && (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">✓ Ready to Publish</Badge>
                      )}
                      {item.type === 'revision' && (
                        <Badge variant="outline" className="text-[10px] font-bold text-rose-700 border-rose-300 bg-rose-50">⚠ Revision Requested</Badge>
                      )}
                      {item.type === 'waiting' && (
                        <Badge variant="outline" className={cn('text-[10px] font-bold font-mono', item.severity === 'overdue' ? 'text-rose-700 border-rose-300 bg-rose-50' : 'text-amber-700 border-amber-300 bg-amber-50')}>
                          ⏳ {item.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-sm text-text-primary border-b border-border pb-2">Detail Parameter Deal</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-text-muted">Brand / Client:</span>
                <p className="font-semibold text-accent mt-0.5 hover:underline cursor-pointer" onClick={() => router.push(`/brand/${deal.brand_id}`)}>{brandName}</p>
              </div>
              <div>
                <span className="text-text-muted">Tipe Kolaborasi:</span>
                <p className="font-semibold text-text-primary mt-0.5">{deal.collaboration_type || 'Campaign'}</p>
              </div>
              <div>
                <span className="text-text-muted">Tanggal Mulai:</span>
                <p className="font-semibold text-text-primary mt-0.5">{deal.start_date || deal.tanggal_mulai ? formatDate(deal.start_date || deal.tanggal_mulai) : '—'}</p>
              </div>
              <div>
                <span className="text-text-muted">Tanggal Selesai:</span>
                <p className="font-semibold text-text-primary mt-0.5">{deal.end_date || deal.tanggal_selesai ? formatDate(deal.end_date || deal.tanggal_selesai) : '—'}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: BRIEF */}
        <TabsContent value="brief" className="space-y-4 outline-none">
          <form onSubmit={handleSaveBrief} className="bg-white border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-text-primary">Brief Collaboration / Campaign</h3>
              <Button type="submit" size="sm" className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Simpan Brief
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Campaign / Judul Brief</Label>
              <Input value={briefCampaign} onChange={(e) => setBriefCampaign(e.target.value)} placeholder="misal Shell Lubricants Q4 Campaign" className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Campaign Objective (Tujuan)</Label>
              <Textarea value={briefObjective} onChange={(e) => setBriefObjective(e.target.value)} placeholder="Tujuan utama campaign / kolaborasi..." rows={2} className="text-xs" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Key Message (Pesan Utama)</Label>
                <Textarea value={briefKeyMessage} onChange={(e) => setBriefKeyMessage(e.target.value)} placeholder="Pesan penting yang harus disampaikan..." rows={3} className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mandatory Message / Elements</Label>
                <Textarea value={briefMandatory} onChange={(e) => setBriefMandatory(e.target.value)} placeholder="Hal yang wajib ada (logo, hashtag, disclaimer, call-to-action)..." rows={3} className="text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Do List (Yang Harus Dilakukan)</Label>
                <Textarea value={briefDoList} onChange={(e) => setBriefDoList(e.target.value)} placeholder="Poin-poin anjuran..." rows={3} className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-error">Don't List (Yang Dilarang)</Label>
                <Textarea value={briefDontList} onChange={(e) => setBriefDontList(e.target.value)} placeholder="Poin-poin pantangan..." rows={3} className="text-xs border-error/40 focus:border-error" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reference Links / Drive Attachments</Label>
              <Input value={briefReferences} onChange={(e) => setBriefReferences(e.target.value)} placeholder="Link Google Drive, figma, moodboard, dll..." className="h-9 text-xs" />
            </div>
          </form>
        </TabsContent>

        {/* TAB 3: SOW & DELIVERABLES */}
        <TabsContent value="sow" className="space-y-4 outline-none">
          <div className="bg-white border border-border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase font-mono text-accent">Scope of Work</span>
                <h3 className="font-semibold text-sm text-text-primary mt-0.5">{sow?.name || `${dealTitleStr} SOW v1`}</h3>
              </div>
              <Button size="sm" onClick={() => setAddDeliverableOpen(true)} className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Deliverable</span>
              </Button>
            </div>

            {/* Deliverables List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-subtle/60 text-xs font-semibold text-text-muted uppercase border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5">Deliverable</th>
                    <th className="px-4 py-2.5">Platform</th>
                    <th className="px-4 py-2.5 text-center">Qty / Output</th>
                    <th className="px-4 py-2.5 text-center">Deadline</th>
                    <th className="px-4 py-2.5 text-center">Hasil Konten</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {deliverablesWithContent.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-text-muted">
                        Belum ada deliverable di SOW ini. Klik "+ Tambah Deliverable" di atas.
                      </td>
                    </tr>
                  ) : (
                    deliverablesWithContent.map((del) => (
                      <tr key={del.id} className="hover:bg-subtle/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-text-primary text-sm">{del.name || del.title}</p>
                          {del.description && <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{del.description}</p>}
                        </td>
                        <td className="px-4 py-3.5 capitalize font-medium text-text-secondary">
                          {del.platform || 'Multi'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-text-primary">
                          {del.quantity} {del.unit || 'content'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-text-muted">
                          {del.deadline ? formatDate(del.deadline) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {del.contentCount === 0 ? (
                            <Badge variant="outline" className="text-[10px] font-bold text-amber-700 border-amber-300 bg-amber-50">
                              ⚠ No Content linked
                            </Badge>
                          ) : (
                            <span className="font-mono font-bold px-2 py-0.5 rounded-full text-xs bg-teal-50 text-accent border border-teal-200">
                              {del.contentCount} Konten
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold capitalize">
                            {del.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2 text-accent border-accent/40 hover:bg-teal-50"
                            onClick={() => {
                              setActiveDeliverableId(del.id)
                              setLinkContentOpen(true)
                            }}
                          >
                            <LinkIcon className="w-3 h-3 mr-1" />
                            + Tautkan
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-[11px] px-2 bg-accent hover:bg-accent/90"
                            onClick={() => {
                              setTargetDeliverableForCreate(del.id)
                              setCreateContentOpen(true)
                            }}
                          >
                            + Buat Konten
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Render Linked Content per Deliverable preview cards */}
            {deliverablesWithContent.some((d) => d.linkedJunctions.length > 0) && (
              <div className="pt-4 border-t border-border space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Tautan Konten per Deliverable</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deliverablesWithContent.filter((d) => d.linkedJunctions.length > 0).map((del) => (
                    <div key={del.id} className="bg-subtle/40 border border-border/70 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">{del.name}</span>
                        <span className="text-[10px] text-text-muted font-mono font-semibold">{del.linkedJunctions.length} item</span>
                      </div>
                      <div className="space-y-1.5">
                        {del.linkedJunctions.map((j: any) => (
                          <div key={j.id} className="bg-white border border-border/80 rounded px-2.5 py-1.5 flex items-center justify-between text-xs hover:border-accent transition-colors">
                            <div className="flex items-center gap-2 overflow-hidden cursor-pointer" onClick={() => router.push(`/content/${j.videos?.id}`)}>
                              <span className="font-mono text-[11px] font-bold text-accent">{j.videos?.no_video || '—'}</span>
                              <span className="font-semibold text-text-primary truncate">{j.videos?.judul}</span>
                            </div>
                            <button onClick={() => handleUnlinkContent(j.id)} className="text-text-muted hover:text-error transition-colors p-1" title="Lepas tautan">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 4: CONTENT */}
        <TabsContent value="content" className="space-y-4 outline-none">
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead className="bg-subtle/70 border-b border-border text-xs font-semibold text-text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">No. Video & Judul</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3 text-center">Status Produksi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {allUniqueContent.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-text-muted">
                      Belum ada konten yang dihubungkan ke deal ini. Masuk ke tab "SOW & Deliverables" untuk menautkan atau membuat konten baru.
                    </td>
                  </tr>
                ) : (
                  allUniqueContent.map((v: any) => (
                    <tr key={v.id} onClick={() => router.push(`/content/${v.id}`)} className="hover:bg-subtle/60 cursor-pointer transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-text-muted">{v.no_video || '—'}</span>
                          <p className="font-semibold text-text-primary group-hover:text-accent transition-colors">{v.judul}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">{v.format || 'Video'}</td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant="secondary" className="text-[10px] capitalize font-semibold">{v.status}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-accent">Lihat Detail ↗</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB 5: SCHEDULE */}
        <TabsContent value="schedule" className="space-y-4 outline-none">
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-text-primary">Timeline & Milestone Deal</h3>
              <Button size="sm" onClick={() => setAddScheduleOpen(true)} className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Milestone
              </Button>
            </div>

            <div className="space-y-2">
              {schedules.length === 0 ? (
                <p className="py-8 text-center text-text-muted text-xs">Belum ada milestone jadwal. Klik "+ Tambah Milestone" di atas.</p>
              ) : (
                schedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-subtle/40 border border-border/70 rounded-lg text-xs">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-accent" />
                      <div>
                        <p className="font-bold text-text-primary">{s.title}</p>
                        <p className="text-[11px] text-text-muted capitalize">{s.type} • {formatDate(s.date)}</p>
                      </div>
                    </div>
                    <Badge variant={s.status === 'completed' ? 'default' : 'outline'} className="text-[10px] uppercase font-bold">
                      {s.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 6: PAYMENT */}
        <TabsContent value="payment" className="space-y-4 outline-none">
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-semibold text-sm text-text-primary">Jadwal & Status Pembayaran Deal</h3>
                <p className="text-xs text-text-muted mt-0.5">Total Value: {formatRupiah(totalValueNum)} • Terbayar: <strong className="text-emerald-700">{formatRupiah(paidNum)}</strong> • Outstanding: <strong className="text-amber-600">{formatRupiah(outstandingNum)}</strong></p>
              </div>
              <Button size="sm" onClick={() => setAddPaymentOpen(true)} className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Term Pembayaran
              </Button>
            </div>

            <table className="w-full text-left border-collapse text-xs min-w-[540px]">
              <thead className="bg-subtle/50 text-text-muted border-b border-border uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Term / Tipe</th>
                  <th className="px-3 py-2.5 text-right">Nominal</th>
                  <th className="px-3 py-2.5 text-center">Jatuh Tempo</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-text-muted">Belum ada record termin pembayaran. Klik "+ Tambah Term Pembayaran" di atas.</td></tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-3 uppercase font-bold text-text-primary">{p.payment_type}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">{formatRupiah(Number(p.amount))}</td>
                      <td className="px-3 py-3 text-center text-text-muted font-mono">{p.due_date ? formatDate(p.due_date) : '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={p.status === 'paid' ? 'default' : 'outline'} className={cn('text-[9px] uppercase font-bold', p.status === 'paid' ? 'bg-emerald-600 text-white' : 'text-amber-600 border-amber-300')}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] px-2 text-accent"
                          onClick={() => handleTogglePaymentStatus(p.id, p.status)}
                        >
                          {p.status === 'paid' ? 'Tandai Pending' : 'Tandai Lunas'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sheet: Add Deliverable */}
      <Sheet open={addDeliverableOpen} onOpenChange={setAddDeliverableOpen}>
        <SheetContent side="right" className="w-full sm:w-[460px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">Tambah Deliverable SOW</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreateDeliverable} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Deliverable <span className="text-error">*</span></Label>
              <Input value={delName} onChange={(e) => setDelName(e.target.value)} placeholder="misal Event Coverage, TikTok Main Video" className="h-9 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Platform</Label>
                <Select value={delPlatform} onValueChange={setDelPlatform}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok" className="text-xs">TikTok</SelectItem>
                    <SelectItem value="instagram" className="text-xs">Instagram</SelectItem>
                    <SelectItem value="youtube" className="text-xs">YouTube</SelectItem>
                    <SelectItem value="facebook" className="text-xs">Facebook</SelectItem>
                    <SelectItem value="multi" className="text-xs">Multi-Platform</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantity / Target</Label>
                <Input type="number" value={delQty} onChange={(e) => setDelQty(e.target.value)} className="h-9 text-xs font-mono" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deadline Output</Label>
              <Input type="date" value={delDeadline} onChange={(e) => setDelDeadline(e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deskripsi / Scope Output</Label>
              <Textarea value={delDesc} onChange={(e) => setDelDesc(e.target.value)} placeholder="Ruang lingkup deliverable..." rows={3} className="text-xs" />
            </div>

            <div className="pt-3 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Tambah Deliverable
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setAddDeliverableOpen(false)}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog: Link Existing Content to Deliverable */}
      <Dialog open={linkContentOpen} onOpenChange={setLinkContentOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Tautkan Konten Existing ke Deliverable</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLinkContent} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Konten dari Library</Label>
              <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih video..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {workspaceVideos.map((v: any) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.no_video ? `${v.no_video} - ` : ''}{v.judul}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setLinkContentOpen(false)}>Batal</Button>
              <Button type="submit" size="sm" className="bg-accent hover:bg-accent/90 font-semibold" disabled={saving || !selectedVideoId}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Tautkan Konten
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sheet: Create Payment Term */}
      <Sheet open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">Tambah Term Pembayaran</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreatePayment} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nominal Pembayaran (Rp) <span className="text-error">*</span></Label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="10000000" className="h-9 text-xs font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipe Pembayaran</Label>
                <Select value={payType} onValueChange={setPayType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dp" className="text-xs">DP (Down Payment)</SelectItem>
                    <SelectItem value="termin" className="text-xs">Termin</SelectItem>
                    <SelectItem value="pelunasan" className="text-xs">Pelunasan</SelectItem>
                    <SelectItem value="full" className="text-xs">Full Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={payStatus} onValueChange={setPayStatus}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="paid" className="text-xs">Paid (Lunas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Jatuh Tempo</Label>
              <Input type="date" value={payDueDate} onChange={(e) => setPayDueDate(e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="pt-3 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Simpan Pembayaran
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setAddPaymentOpen(false)}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet: Create Milestone Schedule */}
      <Sheet open={addScheduleOpen} onOpenChange={setAddScheduleOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">Tambah Milestone Jadwal</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreateSchedule} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Judul Milestone <span className="text-error">*</span></Label>
              <Input value={schedTitle} onChange={(e) => setSchedTitle(e.target.value)} placeholder="misal Shooting Day 1, Draft Submission" className="h-9 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Milestone</Label>
                <Input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipe Milestone</Label>
                <Select value={schedType} onValueChange={setSchedType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief_received" className="text-xs">Brief Received</SelectItem>
                    <SelectItem value="deal_confirmed" className="text-xs">Deal Confirmed</SelectItem>
                    <SelectItem value="shooting" className="text-xs">Shooting</SelectItem>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="revision" className="text-xs">Revision</SelectItem>
                    <SelectItem value="approval" className="text-xs">Approval</SelectItem>
                    <SelectItem value="publish" className="text-xs">Publish</SelectItem>
                    <SelectItem value="payment" className="text-xs">Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-3 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Simpan Milestone
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setAddScheduleOpen(false)}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet: Create Content pre-populated with Brand + Deal + Deliverable —
          the user is never asked to re-select context already known from
          where they clicked "+ Buat Konten". */}
      <AddVideoSheet
        open={createContentOpen}
        onOpenChange={(open) => {
          setCreateContentOpen(open)
          if (!open) {
            setTargetDeliverableForCreate(null)
            queryClient.invalidateQueries({ queryKey: ['deal-content-junctions', id] })
          }
        }}
        brandId={deal.brand_id}
        dealId={deal.id}
        deliverableId={targetDeliverableForCreate ?? undefined}
        defaultValues={{
          brand_id: deal.brand_id,
          is_endorsement: true,
        }}
      />
    </div>
  )
}
