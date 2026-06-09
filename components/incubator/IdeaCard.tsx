'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Play, Music, FileText, Link2, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmbedModal } from './EmbedModal'
import type { IdeaCard as IdeaCardType } from '@/lib/types/incubator'

const STATUS_COLOR: Record<string, string> = {
  raw: 'bg-gray-100 text-gray-600',
  developing: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  converted: 'bg-purple-100 text-purple-700',
  archived: 'bg-gray-100 text-gray-400',
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  scratch: <FileText className="w-3.5 h-3.5" />,
  link: <Link2 className="w-3.5 h-3.5" />,
  image: <Image className="w-3.5 h-3.5" />,
  audio: <Music className="w-3.5 h-3.5" />,
  combo: <FileText className="w-3.5 h-3.5" />,
}

interface Props {
  card: IdeaCardType
  onClick: (card: IdeaCardType) => void
}

export function IdeaCard({ card, onClick }: Props) {
  const [embedOpen, setEmbedOpen] = useState(false)
  const meta = card.link_meta
  const isEmbeddable = meta?.embed_url && !meta?.open_new_tab

  function handlePlayClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (isEmbeddable) setEmbedOpen(true)
    else if (card.link_url) window.open(card.link_url, '_blank')
  }

  return (
    <>
      <div
        className="bg-white border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow mb-3 break-inside-avoid"
        onClick={() => onClick(card)}
      >
        {/* Link card thumbnail */}
        {card.type === 'link' && meta?.image && (
          <div className="relative">
            <img src={meta.image} alt="" className="w-full object-cover max-h-44" />
            {(isEmbeddable || card.link_url) && (
              <button
                onClick={handlePlayClick}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-4 h-4 text-gray-800 ml-0.5" />
                </div>
              </button>
            )}
          </div>
        )}

        {/* Image card */}
        {card.type === 'image' && card.image_urls && card.image_urls.length > 0 && (
          <div className="grid grid-cols-2 gap-0.5">
            {card.image_urls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative aspect-square overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 3 && card.image_urls!.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">+{card.image_urls!.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Audio card */}
        {card.type === 'audio' && (
          <div className="p-4 bg-amber-50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{card.title ?? 'Audio'}</p>
              {card.audio_url && (
                <audio src={card.audio_url} controls className="w-full mt-1 h-7" />
              )}
            </div>
          </div>
        )}

        {/* Card body */}
        <div className="px-3 pt-3 pb-2.5">
          {/* Type + title row */}
          <div className="flex items-start gap-1.5 mb-1.5">
            <span className="text-text-muted mt-0.5 shrink-0">{TYPE_ICON[card.type]}</span>
            {card.title && (
              <p className="font-medium text-text-primary text-sm leading-snug line-clamp-2">{card.title}</p>
            )}
          </div>

          {/* Body text */}
          {card.body && (
            <p className="text-sm text-text-secondary line-clamp-4 mb-2 leading-relaxed">{card.body}</p>
          )}

          {/* Link domain */}
          {card.type === 'link' && card.link_url && !meta?.image && (
            <p className="text-xs text-text-muted mb-2 truncate">{new URL(card.link_url).hostname}</p>
          )}
          {card.type === 'link' && meta?.title && !card.title && (
            <p className="text-sm font-medium text-text-primary line-clamp-2 mb-1">{meta.title}</p>
          )}
          {card.type === 'link' && card.link_url && meta?.image && (
            <p className="text-xs text-text-muted mb-2">{new URL(card.link_url).hostname}</p>
          )}

          {/* Tags */}
          {card.tags && card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.tags.slice(0, 4).map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 bg-subtle text-text-secondary rounded-full">{t}</span>
              ))}
              {card.tags.length > 4 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-subtle text-text-muted rounded-full">+{card.tags.length - 4}</span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', STATUS_COLOR[card.status])}>
              {card.status}
            </span>
            <span className="text-[10px] text-text-muted">
              {formatDistanceToNow(new Date(card.created_at), { locale: localeId, addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {card.link_url && (
        <EmbedModal
          open={embedOpen}
          onOpenChange={setEmbedOpen}
          embedUrl={meta?.embed_url ?? null}
          title={meta?.title ?? card.title}
          sourceUrl={card.link_url}
        />
      )}
    </>
  )
}
