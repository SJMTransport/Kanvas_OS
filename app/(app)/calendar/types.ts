import type { Platform } from '@/lib/types'

export interface ScheduleEvent {
  id: string
  video_id: string
  platform: Platform
  tanggal_tayang: string
  jam_post: string | null
  status: 'scheduled' | 'posted' | 'failed'
  url_post: string | null
  caption_override: string | null
  social_account_id: string | null
  videos: {
    id: string
    judul: string
    thumbnail_url: string | null
    status: string
  } | null
}

export type ViewMode = 'month' | 'week' | 'list'
