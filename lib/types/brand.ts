import type { Video } from './index'

export type BrandType = 'direct' | 'agency' | 'other'

export type ProductionStatus = 'idea' | 'scripting' | 'production' | 'editing' | 'ready'

export type ApprovalStatus = 
  | 'not_required'
  | 'not_submitted'
  | 'waiting_approval'
  | 'revision_requested'
  | 'revision_submitted'
  | 'approved'

export type PublishingStatus = 'not_scheduled' | 'scheduled' | 'published'

export interface ContentApprovalHistory {
  id: string
  content_id: string
  action_status: string
  notes?: string | null
  created_by?: string | null
  created_at: string
}
// Matches brands.status CHECK constraint (005_brand.sql, unchanged since).
// 'active'/'inactive' were never real DB values — removed; nothing wrote them.
export type BrandStatus = 'prospect' | 'approach' | 'negosiasi' | 'deal' | 'aktif' | 'selesai' | 'cold'

export type CollaborationType = 
  | 'Campaign'
  | 'Event'
  | 'Product Review'
  | 'Content Partnership'
  | 'Retainer'
  | 'One-off Collaboration'
  | 'Barter'
  | 'Other'

// Matches deals.status CHECK constraint (005_brand.sql, unchanged since).
// negotiation/confirmed/production/approval/cancelled were never real DB
// values — removed after the Deal-creation bug they caused was fixed.
export type DealStatus =
  | 'dp_pending'
  | 'dp_paid'
  | 'on_progress'
  | 'delivered'
  | 'completed'

export type DeliverableStatus = 
  | 'planned'
  | 'in_production'
  | 'submitted'
  | 'revision'
  | 'approved'
  | 'published'
  | 'completed'

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type PaymentType = 'dp' | 'termin' | 'pelunasan' | 'full' | 'other'

export interface BrandContact {
  id: string
  brand_id: string
  name: string
  role?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  workspace_id: string
  name: string
  nama_brand?: string
  // No `brand_type` column exists on brands — `type` is the real column
  // (added by 032). No `catatan` column exists either — `notes` is real.
  type?: BrandType | string
  industry?: string | null
  industri?: string | null
  website?: string | null
  notes?: string | null
  status: BrandStatus
  pic_name?: string | null
  pic_email?: string | null
  pic_whatsapp?: string | null
  created_at: string
  updated_at: string
}

export interface DealBrief {
  id: string
  deal_id: string
  // No `campaign` column exists on deal_briefs — the "campaign name" concept
  // maps to `title`, the real column.
  title?: string | null
  brief_content?: string | null
  objective?: string | null
  key_message?: string | null
  mandatory_message?: string | null
  do_list?: string | null
  dont_list?: string | null
  reference_links?: string | null
  attachment_url?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface DealSow {
  id: string
  deal_id: string
  name: string
  version?: string | null
  status?: string | null
  effective_date?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface DealDeliverable {
  id: string
  deal_id: string
  sow_id?: string | null
  // No `title` column exists on deal_deliverables — `name` is the only
  // real column for this; do not reintroduce `title` here.
  name: string
  description?: string | null
  platform?: string | null
  quantity: number
  unit?: string | null
  value?: number | null
  deadline?: string | null
  status: DeliverableStatus
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface ContentDeliverable {
  id: string
  content_id: string
  deliverable_id: string
  created_at: string
  video?: Video
  deliverable?: DealDeliverable
}

export interface DealPayment {
  id: string
  deal_id: string
  invoice_id?: string | null
  amount: number
  payment_type: PaymentType
  due_date?: string | null
  paid_date?: string | null
  status: PaymentStatus
  payment_method?: string | null
  proof_url?: string | null
  paid_by?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

// Quotation and Invoice already have canonical definitions in
// lib/types/index.ts (extended there for Phase 3.5 with deal_id/
// quotation_id) — intentionally not redefined here to avoid two competing
// financial-entity type models.

export interface DealSchedule {
  id: string
  deal_id: string
  title: string
  date: string
  type: string
  status: string
  notes?: string | null
  created_at: string
}

export interface Deal {
  id: string
  workspace_id: string
  brand_id: string
  title?: string
  nama_campaign?: string
  deal_number?: string
  collaboration_type?: CollaborationType | string
  status: DealStatus
  start_date?: string | null
  tanggal_mulai?: string | null
  end_date?: string | null
  tanggal_selesai?: string | null
  total_value?: number | null
  nilai_total?: number | null
  primary_contact_id?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  brand?: Brand
  primary_contact?: BrandContact
  brief?: DealBrief
  sows?: DealSow[]
  deliverables?: DealDeliverable[]
  payments?: DealPayment[]
  schedules?: DealSchedule[]
}
