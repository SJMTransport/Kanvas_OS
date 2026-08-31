'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FolderOpen } from 'lucide-react'

// Reverse link: shows which Work(s) a video is linked into.
// Fully additive and fail-silent — on any error (e.g. migration not yet
// applied) it renders nothing and can never break the video detail page.
export function VideoWorkBadges({ videoId }: { videoId: string }) {
  const { data: works = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ['video-works', videoId],
    queryFn: async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('work_items')
          .select('work_id, works(id, title)')
          .eq('item_type', 'video')
          .eq('item_id', videoId)
        if (error) return []
        return ((data ?? []) as { works: { id: string; title: string } | { id: string; title: string }[] | null }[])
          .map((r) => (Array.isArray(r.works) ? r.works[0] : r.works))
          .filter((w): w is { id: string; title: string } => !!w)
      } catch {
        return []
      }
    },
    enabled: !!videoId,
    retry: false,
  })

  if (works.length === 0) return null

  return (
    <>
      {works.map((w) => (
        <Link
          key={w.id}
          href={`/works/${w.id}`}
          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border bg-surface text-text-secondary hover:text-accent hover:border-accent transition-colors font-medium"
        >
          <FolderOpen className="w-3 h-3" />
          {w.title}
        </Link>
      ))}
    </>
  )
}
