'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ExternalLink } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  embedUrl: string | null
  title: string | null
  sourceUrl: string
}

export function EmbedModal({ open, onOpenChange, embedUrl, title, sourceUrl }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        {embedUrl && (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-text-primary line-clamp-1">{title ?? 'Video'}</p>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-accent hover:underline shrink-0 ml-3"
          >
            Buka asli <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
