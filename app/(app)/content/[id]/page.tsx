'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { VideoDetailPanel } from '../video-detail-panel'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import type { VideoWithSchedules } from '@/lib/hooks/useVideos'

export default function ContentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  const { data: video, isLoading } = useQuery<VideoWithSchedules>({
    queryKey: ['video-detail', params.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('videos')
        .select(`*, video_platform_schedules(platform, tanggal_tayang, status), brands(nama_brand), users:assigned_to(full_name, avatar_url)`)
        .eq('id', params.id)
        .single()
      if (error) throw error
      return data as unknown as VideoWithSchedules
    },
  })

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  if (!video) return (
    <div className="p-6 text-center">
      <p className="text-text-muted">Video tidak ditemukan.</p>
    </div>
  )

  return (
    <div className="h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)] overflow-hidden">
      <VideoDetailPanel video={video} onClose={() => router.back()} />
    </div>
  )
}
