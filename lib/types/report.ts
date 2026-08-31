// Performance Report (Laporan) domain types.
// The report payload is stored as one JSONB document per report.

import type { Platform } from '@/lib/types'

export interface ReportCampaignInfo {
  subtitle: string
  campaign: string
  kol: string
  handle: string
  date: string
  phone: string
  email: string
}

// Per-platform metrics for a video inside a report. Core metrics are pre-filled
// from video_performance; the rest can be entered in the report editor.
export interface ReportPlatformData {
  date?: string
  url?: string
  views?: string | number
  likes?: string | number
  comments?: string | number
  saved?: string | number
  shares?: string | number
  reactions?: string | number
}

export interface ReportVideo {
  // Reference to the source video in Video Banking (judul already exists there).
  video_id: string | null
  title: string
  thumbnail_url: string | null
  enabled: Record<Platform, boolean>
  tiktok: ReportPlatformData
  instagram: ReportPlatformData
  youtube: ReportPlatformData
  facebook: ReportPlatformData
}

export interface ReportData {
  campaign: ReportCampaignInfo
  videos: ReportVideo[]
}

export interface PerformanceReport {
  id: string
  workspace_id: string
  created_by: string | null
  name: string
  kol_name: string | null
  data: ReportData
  created_at: string
  updated_at: string
}

export const EMPTY_CAMPAIGN: ReportCampaignInfo = {
  subtitle: 'Report Campaign Sosial Media',
  campaign: '',
  kol: '',
  handle: '',
  date: '',
  phone: '',
  email: '',
}

export function emptyPlatform(): ReportPlatformData {
  return { date: '', url: '', views: '', likes: '', comments: '', saved: '', shares: '', reactions: '' }
}

export function newReportVideo(video_id: string | null, title: string, thumbnail_url: string | null): ReportVideo {
  return {
    video_id,
    title,
    thumbnail_url,
    enabled: { tiktok: true, instagram: true, youtube: true, facebook: true },
    tiktok: emptyPlatform(),
    instagram: emptyPlatform(),
    youtube: emptyPlatform(),
    facebook: emptyPlatform(),
  }
}
