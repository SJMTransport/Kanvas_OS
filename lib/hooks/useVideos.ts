'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from './useWorkspace'
import type { VideoStatus, Video } from '@/lib/types'

export interface VideoWithSchedules extends Video {
  video_platform_schedules: { platform: string; tanggal_tayang: string; status: string }[]
  brands?: { nama_brand: string } | null
  users?: { full_name: string | null; avatar_url: string | null } | null
}

const VIDEO_LIST_COLUMNS = `
  id, judul, status, format, tema, temas, no_upload, no_video,
  deadline_posting, thumbnail_url, assigned_to, brand_id,
  is_endorsement, updated_at, sort_order,
  video_platform_schedules(platform, tanggal_tayang, status)
`

interface UseVideosOptions {
  status?: VideoStatus | VideoStatus[] | null
  search?: string
  tema?: string | null
  monthCurrent?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export function useVideos(opts: UseVideosOptions = {}) {
  const { workspaceId } = useWorkspace()
  const { status, search, tema, monthCurrent, sortBy = 'sort_order', sortDir = 'asc', page = 0, pageSize = 25 } = opts

  return useQuery<VideoWithSchedules[]>({
    queryKey: ['videos', workspaceId, status, search, tema, monthCurrent, sortBy, sortDir, page],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      let q = supabase
        .from('videos')
        .select(VIDEO_LIST_COLUMNS)
        .eq('workspace_id', workspaceId)

      if (status) {
        if (Array.isArray(status)) q = q.in('status', status)
        else q = q.eq('status', status)
      }
      if (search) q = q.ilike('judul', `%${search}%`)
      if (tema) q = q.contains('temas', [tema])
      if (monthCurrent) {
        const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
        q = q.gte('updated_at', startOfMonth.toISOString())
      }

      q = q.order(sortBy, { ascending: sortDir === 'asc' })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      const { data } = await q
      return (data ?? []) as unknown as VideoWithSchedules[]
    },
    enabled: !!workspaceId,
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
