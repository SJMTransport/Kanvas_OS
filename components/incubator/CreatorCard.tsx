'use client'

import { Star } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { CreatorProfile } from '@/lib/types/incubator'

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-black text-white',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  youtube: 'bg-red-600 text-white',
  facebook: 'bg-blue-600 text-white',
  pinterest: 'bg-red-500 text-white',
  twitter: 'bg-sky-500 text-white',
  threads: 'bg-gray-800 text-white',
}

const ANALYSIS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Belum dianalisis', cls: 'bg-gray-100 text-gray-500' },
  in_progress: { label: 'Sedang dipelajari', cls: 'bg-amber-100 text-amber-700' },
  done: { label: 'Selesai', cls: 'bg-green-100 text-green-700' },
}

interface Props {
  creator: CreatorProfile & { saved_content_count?: number }
  onClick: (c: CreatorProfile) => void
}

export function CreatorCard({ creator, onClick }: Props) {
  const badge = ANALYSIS_BADGE[creator.analysis_status] ?? ANALYSIS_BADGE.pending

  return (
    <div
      className="bg-white border border-border/80 rounded-[16px] p-5 cursor-pointer hover:border-[#4C9998] hover:shadow-subtle transition-all flex flex-col gap-3"
      onClick={() => onClick(creator)}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12 shrink-0">
          <AvatarImage src={creator.avatar_url ?? ''} />
          <AvatarFallback className="bg-amber-100 text-amber-700 text-sm font-semibold">
            {creator.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary truncate">@{creator.username}</p>
          {creator.display_name && (
            <p className="text-xs text-text-muted truncate">{creator.display_name}</p>
          )}
          <span className={cn('inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1', PLATFORM_COLORS[creator.platform])}>
            {creator.platform}
          </span>
        </div>
      </div>

      {(creator.niche || creator.followers_count) && (
        <p className="text-xs text-text-secondary">
          {[creator.niche, creator.followers_count ? `${creator.followers_count} followers` : null].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Star rating */}
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn('w-3.5 h-3.5', i < creator.rating ? 'fill-amber-400 text-amber-400' : 'text-border')} />
        ))}
      </div>

      {creator.why_saved && (
        <p className="text-xs text-text-secondary line-clamp-2 border-t border-border pt-2">
          &ldquo;{creator.why_saved}&rdquo;
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', badge.cls)}>{badge.label}</span>
        {(creator.saved_content_count ?? 0) > 0 && (
          <span className="text-[10px] text-text-muted">{creator.saved_content_count} konten</span>
        )}
      </div>
    </div>
  )
}
