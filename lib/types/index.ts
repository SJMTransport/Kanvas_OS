export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook'
export type WorkspaceRole = 'owner' | 'manager' | 'editor'
export type VideoStatus = 'ide' | 'scripting' | 'produksi' | 'editing' | 'scheduled' | 'live' | 'archived'
export type BrandStatus = 'prospect' | 'approach' | 'negosiasi' | 'deal' | 'aktif' | 'selesai' | 'cold'
export type QuotationStatus = 'draft' | 'sent' | 'negotiating' | 'accepted' | 'rejected'
export type DealStatus = 'dp_pending' | 'dp_paid' | 'on_progress' | 'delivered' | 'completed'
export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled'
export type InvoiceType = 'dp' | 'pelunasan' | 'full'
export type ScheduleStatus = 'scheduled' | 'posted' | 'failed'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string
  logo_url: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  invited_at: string
  accepted_at: string | null
}

export interface SocialAccount {
  id: string
  workspace_id: string
  platform: Platform
  handle: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Video {
  id: string
  workspace_id: string
  created_by: string | null
  assigned_to: string | null
  no_upload: number | null
  no_video: string | null
  judul: string
  format: string | null
  tema: string | null
  nama_alat: string | null
  storage_bahan: string | null
  storage_video: string | null
  tanggal_shooting: string | null
  deadline_posting: string | null
  is_endorsement: boolean
  brand_id: string | null
  is_video_request: boolean
  google_drive_link: string | null
  caption_default: string | null
  thumbnail_url: string | null
  status: VideoStatus
  created_at: string
  updated_at: string
}

export interface VideoPlatformSchedule {
  id: string
  video_id: string
  social_account_id: string | null
  platform: Platform
  tanggal_tayang: string
  jam_post: string | null
  status: ScheduleStatus
  url_post: string | null
  caption_override: string | null
  created_at: string
  updated_at: string
}

export interface Script {
  id: string
  video_id: string
  hook: string | null
  body: string | null
  cta: string | null
  insight: string | null
  estimated_duration: number | null
  updated_at: string
}

export interface ChecklistItem {
  id: string
  video_id: string
  title: string
  completed: boolean
  sort_order: number
  created_at: string
}

export interface VideoPerformance {
  id: string
  video_id: string
  platform: Platform
  recorded_at: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  [key: string]: unknown
}

export interface Idea {
  id: string
  workspace_id: string
  created_by: string | null
  title: string
  source_type: 'manual' | 'link' | 'audio'
  content: string | null
  linked_video_id: string | null
  created_at: string
}

export interface BrollCatalog {
  id: string
  workspace_id: string
  file_name: string
  folder_path: string | null
  hdd_id: string | null
  mood_tags: string[]
  created_at: string
}

export interface TrendAudio {
  id: string
  workspace_id: string
  title: string
  artist: string | null
  mood_tags: string[]
  link: string | null
  transcript: string | null
  analysis_result: Record<string, unknown> | null
  created_at: string
}

export interface ResearchCompetitor {
  id: string
  workspace_id: string
  account_name: string
  platform: string | null
  followers: string | null
  engagement_rate: string | null
  notes: string | null
  created_at: string
}

export interface AudienceQuestion {
  id: string
  workspace_id: string
  question_text: string
  author: string | null
  converted: boolean
  linked_video_id: string | null
  created_at: string
}

export interface Brand {
  id: string
  workspace_id: string
  nama_brand: string
  industri: string | null
  website: string | null
  pic_name: string | null
  pic_email: string | null
  pic_whatsapp: string | null
  sosmed_brand: string | null
  status: BrandStatus
  first_contact_date: string | null
  last_followup_date: string | null
  next_followup_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BrandFollowup {
  id: string
  brand_id: string
  created_by: string | null
  tanggal: string
  catatan: string
  next_action: string | null
  next_date: string | null
  created_at: string
}

export interface QuotationItem {
  description: string
  qty: number
  unit: string
  unit_price: number
  total: number
}

export interface Quotation {
  id: string
  workspace_id: string
  brand_id: string
  quotation_number: string
  tanggal: string
  expired_date: string | null
  status: QuotationStatus
  items: QuotationItem[]
  subtotal: number
  diskon: number
  tax_pct: number
  tax_amount: number
  total: number
  payment_terms: string | null
  notes: string | null
  validity_days: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  workspace_id: string
  brand_id: string
  quotation_id: string | null
  deal_number: string
  nama_campaign: string
  tanggal_mulai: string | null
  tanggal_selesai: string | null
  nilai_total: number | null
  status: DealStatus
  deliverables: Record<string, unknown>[]
  file_kontrak_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  workspace_id: string
  brand_id: string
  deal_id: string | null
  invoice_number: string
  type: InvoiceType
  tanggal: string
  due_date: string | null
  items: QuotationItem[]
  subtotal: number
  tax_pct: number
  tax_amount: number
  total: number
  status: InvoiceStatus
  payment_date: string | null
  payment_method: string | null
  bukti_bayar_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
