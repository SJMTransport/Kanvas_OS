'use client'

import { useState } from 'react'
import { ExternalLink, Play, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Platform } from '@/lib/types'

// ─── URL Parsers ─────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  // Supports: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function extractTikTokId(url: string): string | null {
  // Supports: tiktok.com/@user/video/123456, vm.tiktok.com/xxx
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  if (m) return m[1]
  // For vm.tiktok.com short links, we can't extract the ID directly — use oembed
  return null
}

function extractInstagramId(url: string): string | null {
  // Supports: instagram.com/p/ABC123/, instagram.com/reel/ABC123/
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  return null
}

function extractFacebookVideoUrl(url: string): string | null {
  // Supports: facebook.com/.../videos/123, fb.watch/xxx
  if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
    return url
  }
  return null
}

// ─── Platform Icons ──────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.75 31.75 0 0 0 0 12a31.75 31.75 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.75 31.75 0 0 0 24 12a31.75 31.75 0 0 0-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.1v-3.5a6.37 6.37 0 0 0-.82-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.3z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  youtube: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  tiktok: { bg: 'bg-zinc-50', text: 'text-zinc-800', border: 'border-zinc-200' },
  instagram: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
  facebook: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface PlatformEmbedProps {
  url: string
  platform: Platform
  className?: string
}

export function PlatformEmbed({ url, platform, className }: PlatformEmbedProps) {
  const [expanded, setExpanded] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const colors = PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.youtube
  const icon = PLATFORM_ICONS[platform]

  // Build embed URL based on platform
  let embedUrl: string | null = null
  let embedAspect = 'aspect-video' // default 16:9

  if (platform === 'youtube') {
    const vid = extractYouTubeId(url)
    if (vid) {
      embedUrl = `https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`
      // YouTube Shorts are vertical
      if (url.includes('/shorts/')) embedAspect = 'aspect-[9/16] max-w-[280px] mx-auto'
    }
  } else if (platform === 'tiktok') {
    const tid = extractTikTokId(url)
    if (tid) {
      embedUrl = `https://www.tiktok.com/player/v1/${tid}?music_info=0&description=0`
      embedAspect = 'aspect-[9/16] max-w-[280px] mx-auto'
    }
  } else if (platform === 'instagram') {
    const pid = extractInstagramId(url)
    if (pid) {
      embedUrl = `https://www.instagram.com/p/${pid}/embed/captioned/`
      embedAspect = 'aspect-[4/5] max-w-[340px] mx-auto'
    }
  } else if (platform === 'facebook') {
    const fbUrl = extractFacebookVideoUrl(url)
    if (fbUrl) {
      embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=false&width=500`
    }
  }

  // Fallback: if we can't extract an embed URL, show external link only
  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
          colors.bg, colors.border, colors.text,
          'hover:opacity-80',
          className
        )}
      >
        {icon}
        <span className="text-xs font-medium truncate flex-1">{url}</span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </a>
    )
  }

  return (
    <div className={cn('rounded-xl border overflow-hidden transition-all duration-300', colors.border, className)}>
      {/* Header bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 transition-colors',
          colors.bg,
          'hover:opacity-90'
        )}
      >
        <span className={colors.text}>{icon}</span>
        <span className={cn('text-xs font-semibold capitalize flex-1 text-left', colors.text)}>
          {expanded ? 'Sembunyikan Video' : 'Putar Video'}
        </span>
        {!expanded && <Play className={cn('w-3.5 h-3.5', colors.text)} />}
        {expanded ? (
          <ChevronUp className={cn('w-3.5 h-3.5', colors.text)} />
        ) : (
          <ChevronDown className={cn('w-3.5 h-3.5', colors.text)} />
        )}
      </button>

      {/* Iframe container — expands/collapses */}
      {expanded && (
        <div className="bg-black relative">
          {/* Loading indicator */}
          {!iframeLoaded && (
            <div className={cn('absolute inset-0 flex items-center justify-center z-10', colors.bg)}>
              <div className="flex flex-col items-center gap-2">
                <div className={cn('w-8 h-8 border-2 border-t-transparent rounded-full animate-spin', colors.border)} />
                <span className={cn('text-[10px] font-medium', colors.text)}>Memuat video...</span>
              </div>
            </div>
          )}

          <div className={cn(embedAspect, 'w-full')}>
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
        </div>
      )}

      {/* Footer — external link */}
      <div className={cn('flex items-center justify-between px-3 py-1.5 border-t', colors.border, 'bg-white')}>
        <span className="text-[9px] text-text-muted truncate max-w-[200px] font-mono">{url}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('text-[10px] font-medium flex items-center gap-1 hover:underline', colors.text)}
        >
          Buka <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
