export type IdeaCardType = 'scratch' | 'link' | 'image' | 'audio' | 'combo'
export type IdeaStatus = 'raw' | 'developing' | 'ready' | 'converted' | 'archived'
export type IdeaPriority = 'low' | 'medium' | 'high'

export interface LinkMeta {
  title?: string | null
  description?: string | null
  image?: string | null
  platform?: string | null
  embed_url?: string | null
  open_new_tab?: boolean
}

export interface IdeaCard {
  id: string
  workspace_id: string
  created_by: string | null
  type: IdeaCardType
  title: string | null
  body: string | null
  link_url: string | null
  link_meta: LinkMeta | null
  image_urls: string[] | null
  audio_url: string | null
  audio_notes: string | null
  tags: string[] | null
  board_ids: string[] | null
  status: IdeaStatus
  priority: IdeaPriority
  deadline: string | null
  converted_video_id: string | null
  ai_tags: string[] | null
  ai_hooks: string[] | null
  ai_caption: Record<string, string> | null
  ai_summary: string | null
  ai_outline: unknown
  created_at: string
  updated_at: string
}

export interface IdeaBoard {
  id: string
  workspace_id: string
  name: string
  cover_image_url: string | null
  description: string | null
  sort_order: number
  created_at: string
}

export type AnalysisStatus = 'pending' | 'in_progress' | 'done'

export interface CreatorProfile {
  id: string
  workspace_id: string
  created_by: string | null
  username: string
  display_name: string | null
  platform: string
  profile_url: string | null
  avatar_url: string | null
  niche: string | null
  followers_count: string | null
  why_saved: string | null
  rating: number
  analysis: Record<string, string | string[]>
  analysis_status: AnalysisStatus
  ai_analysis: string | null
  ai_learnings: string | null
  created_at: string
  updated_at: string
}

export interface ContentAnalysis {
  ide: string
  angle: string
  hook: string
  flow: string
  highlight: string
  emotion: string
  takeaway: string
  learnings: string
}

export interface CreatorSavedContent {
  id: string
  creator_id: string
  url: string
  title: string | null
  thumbnail_url: string | null
  link_meta: LinkMeta | null
  notes: string | null
  platform: string | null
  view_count: number | null
  analysis: ContentAnalysis | null
  created_at: string
  updated_at: string
}
