'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from './useWorkspace'
import type { VideoStatus, ContentType, Video, Platform } from '@/lib/types'

export interface VideoWithSchedules extends Video {
  video_platform_schedules: { platform: string; tanggal_tayang: string; status: string }[]
  video_performance?: { platform: string; views: number; likes: number; comments: number; recorded_at: string }[]
  brands?: { nama_brand: string } | null
  users?: { full_name: string | null; avatar_url: string | null } | null
}

const VIDEO_LIST_COLUMNS = `
  *,
  video_platform_schedules(platform, tanggal_tayang, status),
  video_performance(platform, views, likes, comments, recorded_at)
`

interface UseVideosOptions {
  status?: VideoStatus[] | null
  contentType?: ContentType[] | null
  platform?: Platform[] | null
  search?: string
  tema?: string[] | null
  monthCurrent?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  pilarKonten?: string[] | null
  enabled?: boolean
}

export function useVideos(opts: UseVideosOptions = {}) {
  const { workspaceId } = useWorkspace()
  const { status, contentType, platform, search, tema, monthCurrent, sortBy = 'sort_order', sortDir = 'asc', page = 0, pageSize = 25, pilarKonten, enabled = true } = opts

  return useQuery<VideoWithSchedules[]>({
    queryKey: ['videos', workspaceId, status, contentType, platform, search, tema, monthCurrent, sortBy, sortDir, page, pilarKonten],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      
      let selectCols = VIDEO_LIST_COLUMNS
      if (platform && platform.length > 0) {
        selectCols = `
          *,
          video_platform_schedules!inner(platform, tanggal_tayang, status)
        `
      }

      let q = supabase
        .from('videos')
        .select(selectCols)
        .eq('workspace_id', workspaceId)

      if (status && status.length > 0) {
        q = q.in('status', status)
      }
      if (contentType && contentType.length > 0) {
        q = q.in('content_type', contentType)
      }
      if (platform && platform.length > 0) {
        q = q.in('video_platform_schedules.platform', platform)
      }
      if (search) q = q.ilike('judul', `%${search}%`)
      if (tema && tema.length > 0) {
        q = q.ov('temas', tema)
      }
      if (pilarKonten && pilarKonten.length > 0) {
        q = q.in('pilar_konten', pilarKonten)
      }
      if (monthCurrent) {
        const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
        q = q.gte('updated_at', startOfMonth.toISOString())
      }

      q = q.order(sortBy, { ascending: sortDir === 'asc' })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      const { data } = await q
      return (data ?? []) as unknown as VideoWithSchedules[]
    },
    // Rely on the cache instead of the old staleTime:0/refetchOnMount:'always'.
    // Mutations invalidate ['videos'] so data stays correct without refetching
    // the full join-heavy list on every mount.
    enabled: !!workspaceId && enabled !== false,
    staleTime: 30_000,
  })
}

export function useUpdateVideoStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VideoStatus }) => {
      const supabase = createClient()
      const { error } = await supabase.from('videos').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}
