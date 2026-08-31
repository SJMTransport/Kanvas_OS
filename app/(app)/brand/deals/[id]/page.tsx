'use client'

import { useState, useMemo } from 'react'
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
  CheckCircle2, Link as LinkIcon, Trash2, ExternalLink, Layers, Pencil, AlertTriangle, Upload, Paperclip, Eye, Download
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatRupiah } from '@/lib/utils/formatters'
import {
  getApprovalAgingText,
  getApprovalSeverity,
  isReadyToPublish,
  APPROVAL_STATUS_CONFIG,
} from '@/lib/utils/workflow'
import { cn } from '@/lib/utils'
import type { DealDeliverable, DealPayment, DealSchedule, DealBrief, DealSow } from '@/lib/types/brand'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import type { Quotation, Invoice } from '@/lib/types'
import { computeFinancialStatus, isInvoiceOverdue, FINANCIAL_STATUS_CONFIG } from '@/lib/utils/financial'
import { AddVideoSheet } from '@/app/(app)/content/add-video-sheet'

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('sow')
  const [addDeliverableOpen, setAddDeliverableOpen] = useState(false)
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)
  const [addScheduleOpen, setAddScheduleOpen] = useState(false)
  const [linkContentOpen, setLinkContentOpen] = useState(false)
  const [activeDeliverableId, setActiveDeliverableId] = useState<string | null>(null)
  const [createContentOpen, setCreateContentOpen] = useState(false)
  const [targetDeliverableForCreate, setTargetDeliverableForCreate] = useState<string | null>(null)

  // Deliverable Form (shared by create + edit)
  const [delEditingId, setDelEditingId] = useState<string | null>(null)
  const [delName, setDelName] = useState('')
  const [delPlatform, setDelPlatform] = useState('tiktok')
  const [delQty, setDelQty] = useState('1')
  const [delUnit, setDelUnit] = useState('content')
  const [delShootingDate, setDelShootingDate] = useState('')
  const [delDeadline, setDelDeadline] = useState('')
  const [delPostingDate, setDelPostingDate] = useState('')
  const [delDesc, setDelDesc] = useState('')
  const [delStatus, setDelStatus] = useState('planned')
  const [deleteDeliverableTarget, setDeleteDeliverableTarget] = useState<DealDeliverable & { contentCount: number } | null>(null)

  // Payment Form (shared by create + edit)
  const [payEditingId, setPayEditingId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payType, setPayType] = useState('dp')
  const [payDueDate, setPayDueDate] = useState('')
  const [payPaidDate, setPayPaidDate] = useState('')
  const [payStatus, setPayStatus] = useState('pending')
  const [payNotes, setPayNotes] = useState('')
  const [payInvoiceId, setPayInvoiceId] = useState('')
  const [payBy, setPayBy] = useState('')
  const [payMethod, setPayMethod] = useState('transfer')
  const [payProofUrl, setPayProofUrl] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<DealPayment | null>(null)

  // Invoice — create/edit lives on /brand/invoices/new; only delete stays here.
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState<Invoice | null>(null)
  const [deleteQuotationTarget, setDeleteQuotationTarget] = useState<{ id: string; quotation_number: string; total: number } | null>(null)

  // Inline PDF preview for Quotation/Invoice rows (Edit still goes to the
  // dedicated page — full line-item editing needs more room than a row).
  const [docPreviewOpen, setDocPreviewOpen] = useState(false)
  const [docPreviewUrl, setDocPreviewUrl] = useState('')
  const [docPreviewTitle, setDocPreviewTitle] = useState('')
  const [generatingDoc, setGeneratingDoc] = useState(false)

  // Schedule Form
  const [schedTitle, setSchedTitle] = useState('')
  const [schedDate, setSchedDate] = useState('')
  const [schedType, setSchedType] = useState('shooting')

  // Selected video to link
  const [selectedVideoId, setSelectedVideoId] = useState('')

  // Deal edit/delete
  const [editDealOpen, setEditDealOpen] = useState(false)
  const [deleteDealOpen, setDeleteDealOpen] = useState(false)
  const [dealTitleInput, setDealTitleInput] = useState('')
  const [dealCollabType, setDealCollabType] = useState('Campaign')
  const [dealTotalValue, setDealTotalValue] = useState('')
  const [dealStartDate, setDealStartDate] = useState('')
  const [dealEndDate, setDealEndDate] = useState('')
  const [dealStatusInput, setDealStatusInput] = useState('dp_pending')
  const [dealNotesInput, setDealNotesInput] = useState('')
  const [deleteDealConfirmText, setDeleteDealConfirmText] = useState('')

  // SOW edit
  const [editSowOpen, setEditSowOpen] = useState(false)
  const [deleteSowOpen, setDeleteSowOpen] = useState(false)
  const [sowName, setSowName] = useState('')
  const [sowVersion, setSowVersion] = useState('v1')
  const [sowStatus, setSowStatus] = useState('active')
  const [sowEffectiveDate, setSowEffectiveDate] = useState('')
  const [sowNotes, setSowNotes] = useState('')

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

  const { data: quotations = [] } = useQuery<Quotation[]>({
    queryKey: ['deal-quotations', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('quotations').select('*').eq('deal_id', id).order('created_at', { ascending: false })
      return (data ?? []) as Quotation[]
    },
    enabled: !!id,
  })

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['deal-invoices', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('invoices').select('*').eq('deal_id', id).order('tanggal', { ascending: false })
      return (data ?? []) as Invoice[]
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

  const shootingScheduleIds = useMemo(
    () => schedules.filter((s) => s.type === 'shooting').map((s) => s.id),
    [schedules]
  )
  const { data: shootingSessionsByScheduleId = {} } = useQuery<Record<string, { id: string }>>({
    queryKey: ['deal-schedule-shooting-links', shootingScheduleIds],
    enabled: shootingScheduleIds.length > 0,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('shooting_sessions')
        .select('id, deal_schedule_id')
        .in('deal_schedule_id', shootingScheduleIds)
      const map: Record<string, { id: string }> = {}
      for (const row of data ?? []) {
        if (row.deal_schedule_id) map[row.deal_schedule_id] = { id: row.id }
      }
      return map
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
      setBriefCampaign(brief.title || '')
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
      // `campaign` is not a real deal_briefs column (deal_briefs has `title`,
      // not `campaign` — see 032_brand_collaboration_system.sql). The
      // "Campaign / Judul Brief" field maps to `title`, the real column.
      const payload = {
        deal_id: id,
        title: briefCampaign || deal?.title || 'Brief',
        objective: briefObjective || null,
        key_message: briefKeyMessage || null,
        mandatory_message: briefMandatory || null,
        do_list: briefDoList || null,
        dont_list: briefDontList || null,
        reference_links: briefReferences || null,
        updated_at: new Date().toISOString(),
      }

      if (brief?.id) {
        const { error } = await supabase.from('deal_briefs').update(payload).eq('id', brief.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('deal_briefs').insert(payload)
        if (error) throw error
      }

      toast.success('Brief berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['deal-brief', id] })
    } catch (err) {
      console.error('Failed to save brief:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan brief')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBrief() {
    if (!brief?.id) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('deal_briefs').delete().eq('id', brief.id)
      if (error) throw error
      toast.success('Brief dihapus.')
      setBriefCampaign(''); setBriefObjective(''); setBriefKeyMessage(''); setBriefMandatory('')
      setBriefDoList(''); setBriefDontList(''); setBriefReferences('')
      queryClient.invalidateQueries({ queryKey: ['deal-brief', id] })
    } catch (err) {
      console.error('Failed to delete brief:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus brief')
    } finally {
      setSaving(false)
    }
  }

  function resetDeliverableForm() {
    setDelEditingId(null)
    setDelName('')
    setDelPlatform('tiktok')
    setDelQty('1')
    setDelUnit('content')
    setDelShootingDate('')
    setDelDeadline('')
    setDelPostingDate('')
    setDelDesc('')
    setDelStatus('planned')
  }

  function openEditDeliverable(del: DealDeliverable) {
    setDelEditingId(del.id)
    setDelName(del.name || '')
    setDelPlatform(del.platform || 'tiktok')
    setDelQty(String(del.quantity ?? 1))
    setDelUnit(del.unit || 'content')
    setDelShootingDate(del.shooting_date || '')
    setDelDeadline(del.deadline || '')
    setDelPostingDate(del.posting_date || '')
    setDelDesc(del.description || '')
    setDelStatus(del.status || 'planned')
    setAddDeliverableOpen(true)
  }

  async function handleSaveDeliverable(e: React.FormEvent) {
    e.preventDefault()
    if (!delName.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()

      if (delEditingId) {
        // deal_deliverables has `name`, not `title` — see 032.
        const { error } = await supabase.from('deal_deliverables').update({
          name: delName.trim(),
          platform: delPlatform,
          quantity: Number(delQty) || 1,
          unit: delUnit,
          shooting_date: delShootingDate || null,
          deadline: delDeadline || null,
          posting_date: delPostingDate || null,
          description: delDesc || null,
          status: delStatus,
          updated_at: new Date().toISOString(),
        }).eq('id', delEditingId)
        if (error) throw error
        toast.success('Deliverable berhasil diperbarui!')
      } else {
        // Ensure SOW exists (never create a second one — reuse if present).
        let currentSowId = sow?.id
        if (!currentSowId) {
          const { data: newSow, error: sowErr } = await supabase.from('deal_sows').insert({
            deal_id: id,
            name: `${deal?.title || 'Deal'} SOW v1`,
            version: 'v1',
          }).select().single()
          if (sowErr) {
            console.error('Failed to create SOW:', sowErr)
            throw sowErr
          }
          currentSowId = newSow?.id
        }

        const { error } = await supabase.from('deal_deliverables').insert({
          deal_id: id,
          sow_id: currentSowId || null,
          name: delName.trim(),
          platform: delPlatform,
          quantity: Number(delQty) || 1,
          unit: delUnit,
          shooting_date: delShootingDate || null,
          deadline: delDeadline || null,
          posting_date: delPostingDate || null,
          description: delDesc || null,
          status: 'planned',
        })
        if (error) throw error
        toast.success('Deliverable berhasil ditambahkan!')
      }

      queryClient.invalidateQueries({ queryKey: ['deal-deliverables', id] })
      queryClient.invalidateQueries({ queryKey: ['deal-sow', id] })
      queryClient.invalidateQueries({ queryKey: ['schedule-events'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' })
      setAddDeliverableOpen(false)
      resetDeliverableForm()
    } catch (err) {
      console.error('Failed to save deliverable:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan deliverable')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteDeliverable() {
    if (!deleteDeliverableTarget) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('deal_deliverables').delete().eq('id', deleteDeliverableTarget.id)
      if (error) throw error
      toast.success('Deliverable dihapus.')
      queryClient.invalidateQueries({ queryKey: ['deal-deliverables', id] })
      queryClient.invalidateQueries({ queryKey: ['deal-content-junctions', id] })
      queryClient.invalidateQueries({ queryKey: ['schedule-events'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' })
      setDeleteDeliverableTarget(null)
    } catch (err) {
      console.error('Failed to delete deliverable:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus deliverable')
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
      console.error('Failed to link content to deliverable:', err)
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
      console.error('Failed to unlink content:', err)
      toast.error('Gagal melepas tautan')
    }
  }

  function resetPaymentForm() {
    setPayEditingId(null)
    setPayAmount('')
    setPayType('dp')
    setPayDueDate('')
    setPayPaidDate('')
    setPayStatus('pending')
    setPayNotes('')
    setPayInvoiceId('')
    setPayBy('')
    setPayMethod('transfer')
    setPayProofUrl('')
  }

  function openEditPayment(p: DealPayment) {
    setPayEditingId(p.id)
    setPayAmount(String(p.amount ?? ''))
    setPayType(p.payment_type || 'dp')
    setPayDueDate(p.due_date || '')
    setPayPaidDate(p.paid_date || '')
    setPayStatus(p.status || 'pending')
    setPayNotes(p.notes || '')
    setPayInvoiceId(p.invoice_id || '')
    setPayBy(p.paid_by || '')
    setPayMethod(p.payment_method || 'transfer')
    setPayProofUrl(p.proof_url || '')
    setAddPaymentOpen(true)
  }

  async function handleUploadProof(file: File) {
    setUploadingProof(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `payments/${id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('content-images').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('content-images').getPublicUrl(path)
      setPayProofUrl(publicUrl)
      toast.success('Bukti pembayaran berhasil diunggah!')
    } catch (err) {
      console.error('Failed to upload payment proof:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal mengunggah bukti pembayaran')
    } finally {
      setUploadingProof(false)
    }
  }

  async function handleSavePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payAmount) return
    setSaving(true)
    try {
      const supabase = createClient()
      const isPaid = payStatus === 'paid'
      const payload = {
        amount: Number(payAmount) || 0,
        payment_type: payType as any,
        due_date: payDueDate || null,
        status: payStatus as any,
        paid_date: isPaid ? (payPaidDate || new Date().toISOString().split('T')[0]) : null,
        invoice_id: payInvoiceId || null,
        paid_by: payBy || null,
        payment_method: payMethod || null,
        proof_url: payProofUrl || null,
        notes: payNotes || null,
      }

      if (payEditingId) {
        const { error } = await supabase.from('deal_payments').update(payload).eq('id', payEditingId)
        if (error) throw error
        toast.success('Pembayaran berhasil diperbarui!')
      } else {
        const { error } = await supabase.from('deal_payments').insert({ deal_id: id, ...payload })
        if (error) throw error
        toast.success('Pembayaran berhasil ditambahkan!')
      }

      queryClient.invalidateQueries({ queryKey: ['deal-payments', id] })
      setAddPaymentOpen(false)
      resetPaymentForm()
    } catch (err) {
      console.error('Failed to save payment:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan pembayaran')
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePaymentStatus(paymentId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid'
    try {
      const supabase = createClient()
      const { error } = await supabase.from('deal_payments').update({
        status: nextStatus,
        paid_date: nextStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
      }).eq('id', paymentId)
      if (error) throw error
      toast.success(`Status pembayaran diubah ke ${nextStatus}`)
      queryClient.invalidateQueries({ queryKey: ['deal-payments', id] })
    } catch (err) {
      console.error('Failed to toggle payment status:', err)
      toast.error('Gagal mengupdate pembayaran')
    }
  }

  async function handleDeletePayment() {
    if (!deletePaymentTarget) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('deal_payments').delete().eq('id', deletePaymentTarget.id)
      if (error) throw error
      toast.success('Pembayaran dihapus.')
      queryClient.invalidateQueries({ queryKey: ['deal-payments', id] })
      setDeletePaymentTarget(null)
    } catch (err) {
      console.error('Failed to delete payment:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus pembayaran')
    } finally {
      setSaving(false)
    }
  }

  // ── Quotation ────────────────────────────────────────────────────────────
  // Creation/editing of line items reuses the existing dedicated page
  // (/brand/quotations/new) rather than rebuilding that form here — only
  // status transitions happen inline, since that's the part of the
  // quotation lifecycle that belongs to the Deal workspace.

  async function handleUpdateQuotationStatus(quotationId: string, newStatus: string) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('quotations').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', quotationId)
      if (error) throw error
      toast.success(`Quotation ditandai ${newStatus}`)
      queryClient.invalidateQueries({ queryKey: ['deal-quotations', id] })
    } catch (err) {
      console.error('Failed to update quotation status:', err)
      toast.error('Gagal mengupdate status quotation')
    }
  }

  async function handleDeleteQuotation() {
    if (!deleteQuotationTarget) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('quotations').delete().eq('id', deleteQuotationTarget.id)
      if (error) throw error
      toast.success('Quotation dihapus.')
      queryClient.invalidateQueries({ queryKey: ['deal-quotations', id] })
      setDeleteQuotationTarget(null)
    } catch (err) {
      console.error('Failed to delete quotation:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus quotation')
    } finally {
      setSaving(false)
    }
  }

  // ── Invoice ──────────────────────────────────────────────────────────────
  // Create/edit (with full flexible line items + PDF preview) happens on
  // the dedicated /brand/invoices/new page — see Part 2/11 of the Phase 3.5
  // follow-up: creating an Invoice must go through Draft -> Preview PDF ->
  // Generate, never be conflated with Payment. Only delete lives here.

  async function handleDeleteInvoice() {
    if (!deleteInvoiceTarget) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('invoices').delete().eq('id', deleteInvoiceTarget.id)
      if (error) throw error
      toast.success('Invoice dihapus.')
      queryClient.invalidateQueries({ queryKey: ['deal-invoices', id] })
      setDeleteInvoiceTarget(null)
    } catch (err) {
      console.error('Failed to delete invoice:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus invoice')
    } finally {
      setSaving(false)
    }
  }

  // ── PDF preview/download for Quotation & Invoice rows ───────────────────

  function openDocPreview(url: string, title: string) {
    setDocPreviewUrl(url)
    setDocPreviewTitle(title)
    setDocPreviewOpen(true)
  }

  async function buildQuotationPdfBlob(q: Quotation) {
    const brandName = deal?.brands?.name || deal?.brands?.nama_brand || ''
    const { QuotationPDF } = await import('@/components/pdf/QuotationPDF')
    const { pdf } = await import('@react-pdf/renderer')
    const { createElement } = await import('react')
    const element = createElement(QuotationPDF, {
      quotationNumber: q.quotation_number,
      tanggal: q.tanggal,
      expiredDate: q.expired_date || undefined,
      recipientName: brandName,
      items: (q.items || []).map((it: any) => ({ description: it.description || it.deskripsi || '', price: Number(it.price ?? it.harga ?? 0), qty: Number(it.qty ?? 1), is_bonus: Boolean(it.is_bonus) })),
      notes: q.notes || undefined,
      bankName: billing?.billing_bank_name || undefined,
      accountNumber: billing?.billing_bank_account || undefined,
      accountHolder: billing?.billing_bank_holder || undefined,
      signatoryName: currentUser?.full_name || undefined,
    })
    return pdf(element as any).toBlob()
  }

  async function buildInvoicePdfBlob(inv: Invoice) {
    const brandName = deal?.brands?.name || deal?.brands?.nama_brand || ''
    const { InvoicePDF } = await import('@/components/pdf/InvoicePDF')
    const { pdf } = await import('@react-pdf/renderer')
    const { createElement } = await import('react')
    const element = createElement(InvoicePDF, {
      invoiceNumber: inv.invoice_number,
      tanggal: inv.tanggal,
      dueDate: inv.due_date || undefined,
      recipientName: brandName,
      items: (inv.items || []).map((it: any) => ({ description: it.description || it.deskripsi || '', price: Number(it.price ?? it.harga ?? 0), qty: Number(it.qty ?? 1), is_bonus: Boolean(it.is_bonus) })),
      notes: inv.notes || undefined,
      bankName: billing?.billing_bank_name || undefined,
      accountNumber: billing?.billing_bank_account || undefined,
      accountHolder: billing?.billing_bank_holder || undefined,
      signatoryName: currentUser?.full_name || undefined,
    })
    return pdf(element as any).toBlob()
  }

  async function handlePreviewQuotation(q: Quotation) {
    setGeneratingDoc(true)
    try {
      const blob = await buildQuotationPdfBlob(q)
      openDocPreview(URL.createObjectURL(blob), `Quotation ${q.quotation_number}`)
    } catch (err) {
      console.error('Quotation PDF preview failed:', err)
      toast.error(err instanceof Error ? `Gagal generate PDF: ${err.message}` : 'Gagal generate PDF')
    } finally {
      setGeneratingDoc(false)
    }
  }

  async function handleDownloadQuotation(q: Quotation) {
    setGeneratingDoc(true)
    try {
      const blob = await buildQuotationPdfBlob(q)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `quotation-${q.quotation_number}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Quotation PDF download failed:', err)
      toast.error(err instanceof Error ? `Gagal generate PDF: ${err.message}` : 'Gagal generate PDF')
    } finally {
      setGeneratingDoc(false)
    }
  }

  async function handlePreviewInvoice(inv: Invoice) {
    setGeneratingDoc(true)
    try {
      const blob = await buildInvoicePdfBlob(inv)
      openDocPreview(URL.createObjectURL(blob), `Invoice ${inv.invoice_number}`)
    } catch (err) {
      console.error('Invoice PDF preview failed:', err)
      toast.error(err instanceof Error ? `Gagal generate PDF: ${err.message}` : 'Gagal generate PDF')
    } finally {
      setGeneratingDoc(false)
    }
  }

  async function handleDownloadInvoice(inv: Invoice) {
    setGeneratingDoc(true)
    try {
      const blob = await buildInvoicePdfBlob(inv)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `invoice-${inv.invoice_number}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Invoice PDF download failed:', err)
      toast.error(err instanceof Error ? `Gagal generate PDF: ${err.message}` : 'Gagal generate PDF')
    } finally {
      setGeneratingDoc(false)
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
      queryClient.invalidateQueries({ queryKey: ['schedule-events'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' })
      setAddScheduleOpen(false)
      setSchedTitle('')
    } catch (err) {
      console.error('Failed to create schedule:', err)
      toast.error('Gagal menambahkan jadwal')
    } finally {
      setSaving(false)
    }
  }

  // ── SOW ──────────────────────────────────────────────────────────────────

  function openEditSow() {
    if (!sow) return
    setSowName(sow.name || '')
    setSowVersion(sow.version || 'v1')
    setSowStatus(sow.status || 'active')
    setSowEffectiveDate(sow.effective_date || '')
    setSowNotes(sow.notes || '')
    setEditSowOpen(true)
  }

  async function handleSaveSow(e: React.FormEvent) {
    e.preventDefault()
    if (!sowName.trim() || !sow?.id) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('deal_sows').update({
        name: sowName.trim(),
        version: sowVersion || 'v1',
        status: sowStatus || 'active',
        effective_date: sowEffectiveDate || null,
        notes: sowNotes || null,
        updated_at: new Date().toISOString(),
      }).eq('id', sow.id)
      if (error) throw error
      toast.success('SOW berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['deal-sow', id] })
      setEditSowOpen(false)
    } catch (err) {
      console.error('Failed to save SOW:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan SOW')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSow() {
    if (!sow?.id) return
    setSaving(true)
    try {
      const supabase = createClient()
      // deal_deliverables.sow_id is ON DELETE SET NULL — deleting the SOW
      // un-links its deliverables (they remain, along with their Content),
      // it does not destroy them.
      const { error } = await supabase.from('deal_sows').delete().eq('id', sow.id)
      if (error) throw error
      toast.success('SOW dihapus. Deliverable yang ada tetap tersimpan (kini tanpa SOW).')
      queryClient.invalidateQueries({ queryKey: ['deal-sow', id] })
      queryClient.invalidateQueries({ queryKey: ['deal-deliverables', id] })
      setDeleteSowOpen(false)
    } catch (err) {
      console.error('Failed to delete SOW:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus SOW')
    } finally {
      setSaving(false)
    }
  }

  // ── Deal ─────────────────────────────────────────────────────────────────

  function openEditDeal() {
    if (!deal) return
    setDealTitleInput(deal.title || deal.nama_campaign || '')
    setDealCollabType(deal.collaboration_type || 'Campaign')
    setDealTotalValue(String(deal.total_value ?? deal.nilai_total ?? ''))
    setDealStartDate(deal.start_date || deal.tanggal_mulai || '')
    setDealEndDate(deal.end_date || deal.tanggal_selesai || '')
    setDealStatusInput(deal.status || 'dp_pending')
    setDealNotesInput(deal.notes || '')
    setEditDealOpen(true)
  }

  async function handleUpdateDeal(e: React.FormEvent) {
    e.preventDefault()
    if (!dealTitleInput.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('deals').update({
        title: dealTitleInput.trim(),
        nama_campaign: dealTitleInput.trim(),
        collaboration_type: dealCollabType,
        total_value: Number(dealTotalValue) || 0,
        nilai_total: Number(dealTotalValue) || 0,
        start_date: dealStartDate || null,
        tanggal_mulai: dealStartDate || null,
        end_date: dealEndDate || null,
        tanggal_selesai: dealEndDate || null,
        status: dealStatusInput,
        notes: dealNotesInput || null,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      if (error) throw error
      toast.success('Deal berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['deal-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['brand-deals', deal?.brand_id] })
      setEditDealOpen(false)
    } catch (err) {
      console.error('Failed to update deal:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui deal')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteDeal() {
    if (!deal) return
    setSaving(true)
    try {
      const supabase = createClient()
      // deal_briefs/deal_sows/deal_deliverables/deal_payments/deal_schedules
      // all CASCADE from deals.id (032/033). content_deliverables CASCADEs
      // from deal_deliverables.id, so linked Content rows are only unlinked,
      // never deleted — videos.deal_id is ON DELETE SET NULL, not CASCADE.
      const { error } = await supabase.from('deals').delete().eq('id', id)
      if (error) throw error
      toast.success('Deal dihapus.')
      router.push(`/brand/${deal.brand_id}`)
    } catch (err) {
      console.error('Failed to delete deal:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus deal')
      setSaving(false)
    }
  }

  // Calculate Financials — every figure below is derived from actual
  // invoice/payment records, never a separately-tracked/duplicated total.
  const totalValueNum = Number(deal?.total_value || deal?.nilai_total || 0)
  // Draft/cancelled invoices are not yet real billing — a draft being
  // edited shouldn't inflate "Invoiced" before it's actually issued.
  const invoicedTotal = invoices.filter((inv) => inv.status !== 'draft' && inv.status !== 'cancelled').reduce((sum, inv) => sum + Number(inv.total || 0), 0)
  const paidNum = payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const outstandingNum = Math.max(0, invoicedTotal - paidNum)

  // Paid-per-invoice, for the overdue check (an invoice already fully paid
  // is never overdue even if its due_date has passed).
  const paidByInvoice = new Map<string, number>()
  payments.filter((p) => p.status === 'paid' && p.invoice_id).forEach((p) => {
    paidByInvoice.set(p.invoice_id!, (paidByInvoice.get(p.invoice_id!) || 0) + Number(p.amount || 0))
  })
  const hasOverdueInvoice = invoices.some((inv) => isInvoiceOverdue(inv, paidByInvoice.get(inv.id) || 0))

  const financialStatus = computeFinancialStatus({ dealValue: totalValueNum, invoicedTotal, paidTotal: paidNum, hasOverdueInvoice })
  const paymentStatusLabel = FINANCIAL_STATUS_CONFIG[financialStatus].label

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
      <Breadcrumb
        segments={[
          { label: 'Brand', href: '/brand' },
          { label: brandName, href: `/brand/${deal.brand_id}` },
          { label: dealTitleStr, onClick: () => setActiveTab('overview') },
          ...(activeTab === 'sow'
            ? [{ label: 'SOW & Deliverables', onClick: () => setAddDeliverableOpen(false) }]
            : []),
          ...(activeTab === 'sow' && addDeliverableOpen && delEditingId
            ? [{ label: delName || 'Deliverable' }]
            : []),
        ]}
      />

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

        <div className="flex items-center gap-4">
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
            <div>
              <p className="text-[10px] uppercase font-semibold text-text-muted">Status Bayar</p>
              <Badge variant="outline" className={cn('text-[10px] font-bold uppercase mt-0.5', FINANCIAL_STATUS_CONFIG[financialStatus].badgeClass)}>
                {paymentStatusLabel}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 border-l border-border pl-4">
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5" onClick={openEditDeal}>
              <Pencil className="w-3.5 h-3.5" /> Edit Deal
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold text-error hover:text-error hover:bg-error/10" onClick={() => { setDeleteDealConfirmText(''); setDeleteDealOpen(true) }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 space-x-6 h-auto mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Overview</TabsTrigger>
          <TabsTrigger value="brief" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Brief</TabsTrigger>
          <TabsTrigger value="sow" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">SOW & Deliverables ({deliverables.length})</TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Konten Terkait ({allUniqueContent.length})</TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Schedule ({schedules.length})</TabsTrigger>
          <TabsTrigger value="payment" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none px-1 py-2.5 font-semibold text-xs text-text-muted data-[state=active]:text-accent">Financial ({quotations.length + invoices.length + payments.length})</TabsTrigger>
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
              <div className="flex items-center gap-1.5">
                {brief?.id && (
                  <Button type="button" size="sm" variant="ghost" className="h-8 text-xs font-semibold text-error hover:text-error hover:bg-error/10" onClick={handleDeleteBrief} disabled={saving}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                  </Button>
                )}
                <Button type="submit" size="sm" className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold" disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Simpan Brief
                </Button>
              </div>
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
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="font-semibold text-sm text-text-primary">{sow?.name || `${dealTitleStr} SOW v1`}</h3>
                  {sow && (
                    <>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold">{sow.version || 'v1'}</Badge>
                      <Badge variant="secondary" className="text-[9px] uppercase font-bold capitalize">{sow.status || 'active'}</Badge>
                    </>
                  )}
                </div>
                {sow?.effective_date && <p className="text-[11px] text-text-muted mt-0.5">Berlaku sejak {formatDate(sow.effective_date)}</p>}
              </div>
              <div className="flex items-center gap-1.5">
                {sow && (
                  <>
                    <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1" onClick={openEditSow}>
                      <Pencil className="w-3.5 h-3.5" /> Edit SOW
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold text-error hover:text-error hover:bg-error/10" onClick={() => setDeleteSowOpen(true)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                <Button size="sm" onClick={() => { resetDeliverableForm(); setAddDeliverableOpen(true) }} className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Deliverable</span>
                </Button>
              </div>
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
                          <p className="font-bold text-text-primary text-sm">{del.name}</p>
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
                            <span className={cn(
                              'font-mono font-bold px-2 py-0.5 rounded-full text-xs border',
                              del.contentCount >= (del.quantity || 1) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-teal-50 text-accent border-teal-200'
                            )}>
                              {del.contentCount} / {del.quantity || 1} Content
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
                          <button
                            onClick={() => openEditDeliverable(del)}
                            className="p-1.5 rounded hover:bg-subtle text-text-muted hover:text-accent transition-colors"
                            title="Edit deliverable"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteDeliverableTarget(del)}
                            className="p-1.5 rounded hover:bg-error/10 text-text-muted hover:text-error transition-colors"
                            title="Hapus deliverable"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                schedules.map((s) => {
                  const linkedSession = s.type === 'shooting' ? shootingSessionsByScheduleId[s.id] : undefined
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-subtle/40 border border-border/70 rounded-lg text-xs">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-accent" />
                        <div>
                          <p className="font-bold text-text-primary">{s.title}</p>
                          <p className="text-[11px] text-text-muted capitalize">{s.type} • {formatDate(s.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.type === 'shooting' && (
                          linkedSession ? (
                            <Badge variant="outline" className="text-[10px] font-semibold text-accent border-accent/40">
                              Terhubung ke Sesi Shooting
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] text-accent"
                              onClick={() => router.push(`/brand/shooting?dealScheduleId=${s.id}`)}
                            >
                              Buat Sesi Shooting →
                            </Button>
                          )
                        )}
                        <Badge variant={s.status === 'completed' ? 'default' : 'outline'} className="text-[10px] uppercase font-bold">
                          {s.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 6: PAYMENT */}
        <TabsContent value="payment" className="space-y-6 outline-none">
          {/* A. FINANCIAL SUMMARY */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-3 shadow-xs">
            <h3 className="font-semibold text-sm text-text-primary uppercase tracking-wider border-b border-border pb-2">Financial Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-subtle/50 rounded-lg border border-border/60">
                <p className="text-[10px] uppercase font-bold text-text-muted">Deal Value</p>
                <p className="text-sm font-bold font-mono text-text-primary mt-1">{formatRupiah(totalValueNum)}</p>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200/60">
                <p className="text-[10px] uppercase font-bold text-blue-800">Invoiced</p>
                <p className="text-sm font-bold font-mono text-blue-700 mt-1">{formatRupiah(invoicedTotal)}</p>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/60">
                <p className="text-[10px] uppercase font-bold text-emerald-800">Paid</p>
                <p className="text-sm font-bold font-mono text-emerald-700 mt-1">{formatRupiah(paidNum)}</p>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/60">
                <p className="text-[10px] uppercase font-bold text-amber-800">Outstanding</p>
                <p className="text-sm font-bold font-mono text-amber-700 mt-1">{formatRupiah(outstandingNum)}</p>
              </div>
              <div className="p-3 bg-subtle/50 rounded-lg border border-border/60 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-bold text-text-muted mb-1">Payment Status</p>
                <Badge variant="outline" className={cn('text-[10px] font-bold uppercase', FINANCIAL_STATUS_CONFIG[financialStatus].badgeClass)}>
                  {paymentStatusLabel}
                </Badge>
              </div>
            </div>
          </div>

          {/* B. QUOTATIONS */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-text-primary uppercase tracking-wider">Quotations</h3>
              <Link href={`/brand/quotations/new?dealId=${id}`}>
                <Button size="sm" className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold gap-1">
                  <Plus className="w-3.5 h-3.5" /> Buat Quotation
                </Button>
              </Link>
            </div>
            {quotations.length === 0 ? (
              <p className="py-6 text-center text-text-muted text-xs">Belum ada quotation untuk deal ini.</p>
            ) : (
              <div className="space-y-2">
                {quotations.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 bg-subtle/30 border border-border/60 rounded-lg text-xs">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-accent" />
                      <div>
                        <p className="font-mono font-bold text-text-primary">{q.quotation_number}</p>
                        <p className="text-[11px] text-text-muted">{formatDate(q.tanggal)} {q.expired_date && `• Berlaku s/d ${formatDate(q.expired_date)}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-text-primary mr-1">{formatRupiah(Number(q.total))}</span>
                      <Badge variant="outline" className={cn('text-[9px] uppercase font-bold', q.status === 'accepted' ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : q.status === 'rejected' ? 'text-rose-700 border-rose-300 bg-rose-50' : 'text-slate-700 border-slate-300 bg-slate-50')}>
                        {q.status}
                      </Badge>
                      {(q.status === 'sent' || q.status === 'negotiating' || q.status === 'draft') && (
                        <>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-emerald-700" onClick={() => handleUpdateQuotationStatus(q.id, 'accepted')}>Accept</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-rose-700" onClick={() => handleUpdateQuotationStatus(q.id, 'rejected')}>Reject</Button>
                        </>
                      )}
                      {q.status === 'accepted' && (
                        <Link href={`/brand/invoices/new?dealId=${id}&quotationId=${q.id}`}>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-accent">+ Invoice</Button>
                        </Link>
                      )}
                      <Link href={`/brand/quotations/new?editId=${q.id}`} title="Edit quotation">
                        <button className="p-1 rounded hover:bg-subtle text-text-muted hover:text-accent transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      </Link>
                      <button onClick={() => handlePreviewQuotation(q)} disabled={generatingDoc} className="p-1 rounded hover:bg-subtle text-text-muted hover:text-accent transition-colors" title="Preview PDF">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDownloadQuotation(q)} disabled={generatingDoc} className="p-1 rounded hover:bg-subtle text-text-muted hover:text-accent transition-colors" title="Download PDF">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteQuotationTarget({ id: q.id, quotation_number: q.quotation_number, total: Number(q.total) })} className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error transition-colors" title="Hapus quotation">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* C. INVOICES */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-text-primary uppercase tracking-wider">Invoices</h3>
              <Link href={`/brand/invoices/new?dealId=${id}`}>
                <Button size="sm" className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold gap-1">
                  <Plus className="w-3.5 h-3.5" /> Buat Invoice
                </Button>
              </Link>
            </div>
            {invoices.length === 0 ? (
              <p className="py-6 text-center text-text-muted text-xs">Belum ada invoice untuk deal ini.</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => {
                  const paidForInv = paidByInvoice.get(inv.id) || 0
                  const overdue = isInvoiceOverdue(inv, paidForInv)
                  const linkedQuotation = quotations.find((q) => q.id === inv.quotation_id)
                  return (
                    <div key={inv.id} className="p-3 bg-subtle/30 border border-border/60 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-4 h-4 text-accent" />
                          <div>
                            <p className="font-mono font-bold text-text-primary">{inv.invoice_number} <span className="uppercase text-[10px] text-text-muted">{inv.type}</span></p>
                            <p className="text-[11px] text-text-muted">{formatDate(inv.tanggal)} {inv.due_date && `• Jatuh tempo ${formatDate(inv.due_date)}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-text-primary mr-1">{formatRupiah(Number(inv.total))}</span>
                          <Badge variant="outline" className={cn('text-[9px] uppercase font-bold', overdue ? 'text-rose-700 border-rose-300 bg-rose-50' : inv.status === 'paid' ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : 'text-slate-700 border-slate-300 bg-slate-50')}>
                            {overdue ? 'overdue' : inv.status}
                          </Badge>
                          <Link href={`/brand/invoices/new?editId=${inv.id}`} title="Edit invoice">
                            <button className="p-1 rounded hover:bg-subtle text-text-muted hover:text-accent transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          </Link>
                          <button onClick={() => handlePreviewInvoice(inv)} disabled={generatingDoc} className="p-1 rounded hover:bg-subtle text-text-muted hover:text-accent transition-colors" title="Preview PDF">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDownloadInvoice(inv)} disabled={generatingDoc} className="p-1 rounded hover:bg-subtle text-text-muted hover:text-accent transition-colors" title="Download PDF">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteInvoiceTarget(inv)} className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error transition-colors" title="Hapus invoice">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {linkedQuotation && (
                        <p className="text-[11px] text-text-muted pl-7">Based on <span className="font-mono font-semibold text-accent">{linkedQuotation.quotation_number}</span></p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* D. PAYMENTS */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-text-primary uppercase tracking-wider">Payments</h3>
              <Button size="sm" onClick={() => { resetPaymentForm(); setAddPaymentOpen(true) }} className="bg-accent hover:bg-accent/90 h-8 text-xs font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Pembayaran
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[760px]">
                <thead className="bg-subtle/50 text-text-muted border-b border-border uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Invoice</th>
                    <th className="px-3 py-2.5">Tipe</th>
                    <th className="px-3 py-2.5 text-right">Nominal</th>
                    <th className="px-3 py-2.5 text-center">Tgl Bayar</th>
                    <th className="px-3 py-2.5">Dibayar Oleh</th>
                    <th className="px-3 py-2.5">Metode</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-center">Bukti</th>
                    <th className="px-3 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payments.length === 0 ? (
                    <tr><td colSpan={9} className="py-8 text-center text-text-muted">Belum ada record pembayaran. Klik "+ Tambah Pembayaran" di atas.</td></tr>
                  ) : (
                    payments.map((p) => {
                      const linkedInvoice = invoices.find((inv) => inv.id === p.invoice_id)
                      return (
                        <tr key={p.id}>
                          <td className="px-3 py-3 font-mono text-text-muted">
                            {linkedInvoice ? <span className="font-semibold text-accent">{linkedInvoice.invoice_number}</span> : <span className="italic">Legacy / Belum terhubung ke Invoice</span>}
                          </td>
                          <td className="px-3 py-3 uppercase font-bold text-text-primary">{p.payment_type}</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">{formatRupiah(Number(p.amount))}</td>
                          <td className="px-3 py-3 text-center text-text-muted font-mono">{p.paid_date ? formatDate(p.paid_date) : (p.due_date ? formatDate(p.due_date) : '—')}</td>
                          <td className="px-3 py-3 text-text-secondary">{p.paid_by || '—'}</td>
                          <td className="px-3 py-3 text-text-secondary capitalize">{p.payment_method || '—'}</td>
                          <td className="px-3 py-3 text-center">
                            <Badge variant={p.status === 'paid' ? 'default' : 'outline'} className={cn('text-[9px] uppercase font-bold', p.status === 'paid' ? 'bg-emerald-600 text-white' : 'text-amber-600 border-amber-300')}>
                              {p.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {p.proof_url ? (
                              <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
                                <Paperclip className="w-3 h-3" /> Lihat
                              </a>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-3 text-right space-x-1 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] px-2 text-accent"
                              onClick={() => handleTogglePaymentStatus(p.id, p.status)}
                            >
                              {p.status === 'paid' ? 'Tandai Pending' : 'Tandai Lunas'}
                            </Button>
                            <button onClick={() => openEditPayment(p)} className="p-1 rounded hover:bg-subtle text-text-muted hover:text-accent transition-colors" title="Edit pembayaran">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeletePaymentTarget(p)} className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error transition-colors" title="Hapus pembayaran">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sheet: Add/Edit Deliverable */}
      <Sheet open={addDeliverableOpen} onOpenChange={(v) => { setAddDeliverableOpen(v); if (!v) resetDeliverableForm() }}>
        <SheetContent side="right" className="w-full sm:w-[460px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">{delEditingId ? 'Edit Deliverable' : 'Tambah Deliverable SOW'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSaveDeliverable} className="px-6 py-5 space-y-4">
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

            {delEditingId && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={delStatus} onValueChange={setDelStatus}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned" className="text-xs">Planned</SelectItem>
                    <SelectItem value="in_production" className="text-xs">In Production</SelectItem>
                    <SelectItem value="submitted" className="text-xs">Submitted</SelectItem>
                    <SelectItem value="revision" className="text-xs">Revision</SelectItem>
                    <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                    <SelectItem value="published" className="text-xs">Published</SelectItem>
                    <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Shooting</Label>
                <Input type="date" value={delShootingDate} onChange={(e) => setDelShootingDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Deadline Output</Label>
                <Input type="date" value={delDeadline} onChange={(e) => setDelDeadline(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tanggal Posting</Label>
              <Input type="date" value={delPostingDate} onChange={(e) => setDelPostingDate(e.target.value)} className="h-9 text-xs" />
              <p className="text-[10px] text-text-muted">Target tanggal tayang untuk deliverable ini — jadwal aktual per platform tetap diatur di Content (tab Distribusi).</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deskripsi / Scope Output</Label>
              <Textarea value={delDesc} onChange={(e) => setDelDesc(e.target.value)} placeholder="Ruang lingkup deliverable..." rows={3} className="text-xs" />
            </div>

            <div className="pt-3 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {delEditingId ? 'Simpan Perubahan' : 'Tambah Deliverable'}
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => { setAddDeliverableOpen(false); resetDeliverableForm() }}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog: Delete Deliverable confirm */}
      <Dialog open={!!deleteDeliverableTarget} onOpenChange={(v) => { if (!v) setDeleteDeliverableTarget(null) }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-error" /> Hapus Deliverable?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm">
            <p className="text-text-secondary">
              Deliverable <strong className="text-text-primary">{deleteDeliverableTarget?.name}</strong> akan dihapus.
              {(deleteDeliverableTarget?.contentCount ?? 0) > 0 && (
                <> <strong className="text-amber-700">{deleteDeliverableTarget?.contentCount} Content</strong> yang tertaut akan dilepas tautannya (Content itu sendiri tidak akan terhapus).</>
              )}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDeliverableTarget(null)}>Batal</Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleDeleteDeliverable} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Hapus Deliverable
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Sheet: Add/Edit Payment Term */}
      <Sheet open={addPaymentOpen} onOpenChange={(v) => { setAddPaymentOpen(v); if (!v) resetPaymentForm() }}>
        <SheetContent side="right" className="w-full sm:w-[420px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">{payEditingId ? 'Edit Pembayaran' : 'Tambah Term Pembayaran'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSavePayment} className="px-6 py-5 space-y-4">
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
              <Label className="text-xs font-semibold">Invoice Terkait (Opsional)</Label>
              <Select value={payInvoiceId || '__none__'} onValueChange={(v) => setPayInvoiceId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Tidak terhubung ke invoice" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">Tidak terhubung ke invoice</SelectItem>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id} className="text-xs">{inv.invoice_number} — {formatRupiah(Number(inv.total))}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jatuh Tempo</Label>
                <Input type="date" value={payDueDate} onChange={(e) => setPayDueDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Bayar</Label>
                <Input type="date" value={payPaidDate} onChange={(e) => setPayPaidDate(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Dibayar Oleh</Label>
                <Input value={payBy} onChange={(e) => setPayBy(e.target.value)} placeholder="misal nama brand / PIC" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Metode Pembayaran</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer" className="text-xs">Transfer Bank</SelectItem>
                    <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                    <SelectItem value="qris" className="text-xs">QRIS</SelectItem>
                    <SelectItem value="other" className="text-xs">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bukti Pembayaran</Label>
              {payProofUrl ? (
                <div className="flex items-center justify-between bg-subtle/50 border border-border rounded-lg px-3 py-2 text-xs">
                  <a href={payProofUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" /> Lihat bukti
                  </a>
                  <button type="button" onClick={() => setPayProofUrl('')} className="text-text-muted hover:text-error"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-1.5 h-9 border border-dashed border-border rounded-lg text-xs text-text-muted hover:border-accent hover:text-accent cursor-pointer transition-colors">
                  {uploadingProof ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingProof ? 'Mengunggah...' : 'Unggah bukti transfer'}
                  <input type="file" accept="image/*,.pdf" className="hidden" disabled={uploadingProof} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadProof(f) }} />
                </label>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan</Label>
              <Textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Catatan pembayaran (opsional)..." rows={2} className="text-xs" />
            </div>

            <div className="pt-3 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving || uploadingProof}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {payEditingId ? 'Simpan Perubahan' : 'Simpan Pembayaran'}
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => { setAddPaymentOpen(false); resetPaymentForm() }}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog: Delete Invoice confirm */}
      <Dialog open={!!deleteInvoiceTarget} onOpenChange={(v) => { if (!v) setDeleteInvoiceTarget(null) }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-error" /> Hapus Invoice?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary pt-2">
            Invoice <strong className="text-text-primary">{deleteInvoiceTarget?.invoice_number}</strong> ({deleteInvoiceTarget ? formatRupiah(Number(deleteInvoiceTarget.total)) : ''}) akan dihapus permanen. Payment yang sudah tertaut ke invoice ini akan tetap ada namun kehilangan tautannya (tampil sebagai Legacy).
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteInvoiceTarget(null)}>Batal</Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleDeleteInvoice} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Hapus Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Quotation confirm */}
      <Dialog open={!!deleteQuotationTarget} onOpenChange={(v) => { if (!v) setDeleteQuotationTarget(null) }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-error" /> Hapus Quotation?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary pt-2">
            Quotation <strong className="text-text-primary">{deleteQuotationTarget?.quotation_number}</strong> ({deleteQuotationTarget ? formatRupiah(deleteQuotationTarget.total) : ''}) akan dihapus permanen. Invoice yang sudah dibuat dari quotation ini akan tetap ada namun kehilangan tautannya.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteQuotationTarget(null)}>Batal</Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleDeleteQuotation} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Hapus Quotation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Payment confirm */}
      <Dialog open={!!deletePaymentTarget} onOpenChange={(v) => { if (!v) setDeletePaymentTarget(null) }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-error" /> Hapus Pembayaran?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary pt-2">
            Record pembayaran <strong className="text-text-primary">{deletePaymentTarget ? formatRupiah(Number(deletePaymentTarget.amount)) : ''}</strong> ({deletePaymentTarget?.payment_type}) akan dihapus permanen. Outstanding akan dihitung ulang.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeletePaymentTarget(null)}>Batal</Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleDeletePayment} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Hapus Pembayaran
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Sheet: Edit Deal — same field geometry as the Deal creation sheet
          in /brand/[id], plus Status (not present at creation since a new
          deal has no meaningful status choice — it always starts dp_pending). */}
      <Sheet open={editDealOpen} onOpenChange={setEditDealOpen}>
        <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">Edit Deal / Kolaborasi</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleUpdateDeal} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Judul Deal / Campaign <span className="text-error">*</span></Label>
              <Input value={dealTitleInput} onChange={(e) => setDealTitleInput(e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipe Kolaborasi</Label>
                <Select value={dealCollabType} onValueChange={setDealCollabType}>
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
                <Input type="number" value={dealTotalValue} onChange={(e) => setDealTotalValue(e.target.value)} className="h-9 text-xs font-mono" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Deal</Label>
              <Select value={dealStatusInput} onValueChange={setDealStatusInput}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dp_pending" className="text-xs">DP Pending</SelectItem>
                  <SelectItem value="dp_paid" className="text-xs">DP Paid</SelectItem>
                  <SelectItem value="on_progress" className="text-xs">On Progress</SelectItem>
                  <SelectItem value="delivered" className="text-xs">Delivered</SelectItem>
                  <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Mulai</Label>
                <Input type="date" value={dealStartDate} onChange={(e) => setDealStartDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Selesai</Label>
                <Input type="date" value={dealEndDate} onChange={(e) => setDealEndDate(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan Deal</Label>
              <Textarea value={dealNotesInput} onChange={(e) => setDealNotesInput(e.target.value)} rows={3} className="text-xs" />
            </div>

            <div className="pt-3 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Simpan Perubahan
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setEditDealOpen(false)}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog: Delete Deal confirm — shows exactly what will be affected */}
      <Dialog open={deleteDealOpen} onOpenChange={(v) => { setDeleteDealOpen(v); if (!v) setDeleteDealConfirmText('') }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-error" /> Hapus Deal Ini?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm">
            <p className="text-text-secondary">
              Ini akan menghapus deal <strong className="text-text-primary">{dealTitleStr}</strong> beserta:
            </p>
            <ul className="text-xs space-y-1 bg-subtle/50 border border-border rounded-lg p-3">
              <li>• <strong>{brief ? 1 : 0}</strong> Brief {brief && <span className="text-error font-semibold">(akan dihapus permanen)</span>}</li>
              <li>• <strong>{sow ? 1 : 0}</strong> SOW {sow && <span className="text-error font-semibold">(akan dihapus permanen)</span>}</li>
              <li>• <strong>{deliverables.length}</strong> Deliverable {deliverables.length > 0 && <span className="text-error font-semibold">(akan dihapus permanen)</span>}</li>
              <li>• <strong>{payments.length}</strong> Record Pembayaran {payments.length > 0 && <span className="text-error font-semibold">(akan dihapus permanen)</span>}</li>
              <li>• <strong>{schedules.length}</strong> Milestone Jadwal {schedules.length > 0 && <span className="text-error font-semibold">(akan dihapus permanen)</span>}</li>
              <li>• <strong>{allUniqueContent.length}</strong> Content terkait <span className="text-emerald-700 font-semibold">(tidak dihapus — hanya dilepas tautannya)</span></li>
            </ul>
            {(deliverables.length > 0 || payments.length > 0) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ketik <span className="font-mono text-error">{dealTitleStr}</span> untuk konfirmasi</Label>
                <Input value={deleteDealConfirmText} onChange={(e) => setDeleteDealConfirmText(e.target.value)} className="h-9 text-xs" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDealOpen(false)}>Batal</Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteDeal}
              disabled={saving || ((deliverables.length > 0 || payments.length > 0) && deleteDealConfirmText !== dealTitleStr)}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Hapus Deal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet: Edit SOW */}
      <Sheet open={editSowOpen} onOpenChange={setEditSowOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-base font-bold">Edit SOW</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSaveSow} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama SOW <span className="text-error">*</span></Label>
              <Input value={sowName} onChange={(e) => setSowName(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Versi</Label>
                <Input value={sowVersion} onChange={(e) => setSowVersion(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={sowStatus} onValueChange={setSowStatus}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="superseded" className="text-xs">Superseded</SelectItem>
                    <SelectItem value="closed" className="text-xs">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tanggal Berlaku</Label>
              <Input type="date" value={sowEffectiveDate} onChange={(e) => setSowEffectiveDate(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan</Label>
              <Textarea value={sowNotes} onChange={(e) => setSowNotes(e.target.value)} rows={3} className="text-xs" />
            </div>
            <div className="pt-3 flex gap-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 h-9 text-xs font-semibold" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Simpan Perubahan
              </Button>
              <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setEditSowOpen(false)}>Batal</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog: Delete SOW confirm */}
      <Dialog open={deleteSowOpen} onOpenChange={setDeleteSowOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-error" /> Hapus SOW?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary pt-2">
            SOW <strong className="text-text-primary">{sow?.name}</strong> akan dihapus.
            {deliverables.length > 0 && <> <strong className="text-text-primary">{deliverables.length} Deliverable</strong> yang ada tetap tersimpan (kini tanpa SOW).</>}
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteSowOpen(false)}>Batal</Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleDeleteSow} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Hapus SOW
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Shared Quotation/Invoice PDF preview */}
      <Dialog open={docPreviewOpen} onOpenChange={(v) => { setDocPreviewOpen(v); if (!v && docPreviewUrl) { URL.revokeObjectURL(docPreviewUrl); setDocPreviewUrl('') } }}>
        <DialogContent className="sm:max-w-3xl h-[85vh] p-0">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle className="text-sm font-semibold">{docPreviewTitle}</DialogTitle>
          </DialogHeader>
          {docPreviewUrl && <iframe src={docPreviewUrl} className="w-full h-full" title="Document PDF preview" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
