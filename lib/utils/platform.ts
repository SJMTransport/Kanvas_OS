import type { Platform } from '@/lib/types'

export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; bg: string; border: string; dot: string }> = {
  tiktok: {
    label: 'TikTok',
    color: 'text-white',
    bg: 'bg-black',
    border: 'border-black',
    dot: 'bg-black',
  },
  instagram: {
    label: 'Instagram',
    color: 'text-white',
    bg: 'bg-instagram',
    border: 'border-instagram',
    dot: 'bg-instagram',
  },
  youtube: {
    label: 'YouTube',
    color: 'text-white',
    bg: 'bg-youtube',
    border: 'border-youtube',
    dot: 'bg-youtube',
  },
  facebook: {
    label: 'Facebook',
    color: 'text-white',
    bg: 'bg-facebook',
    border: 'border-facebook',
    dot: 'bg-facebook',
  },
}

export function getPlatformChipClass(platform: Platform): string {
  const map: Record<Platform, string> = {
    tiktok: 'border-l-2 border-black bg-black/10 text-black',
    instagram: 'border-l-2 border-instagram bg-instagram/10 text-instagram',
    youtube: 'border-l-2 border-youtube bg-youtube/10 text-youtube',
    facebook: 'border-l-2 border-facebook bg-facebook/10 text-facebook',
  }
  return map[platform]
}

export function getPlatformDot(platform: Platform): string {
  const map: Record<Platform, string> = {
    tiktok: 'bg-black',
    instagram: 'bg-instagram',
    youtube: 'bg-youtube',
    facebook: 'bg-facebook',
  }
  return map[platform]
}

export function getPlatformBadge(platform: Platform): string {
  const map: Record<Platform, string> = {
    tiktok: 'bg-black text-white',
    instagram: 'bg-instagram text-white',
    youtube: 'bg-youtube text-white',
    facebook: 'bg-facebook text-white',
  }
  return map[platform]
}
