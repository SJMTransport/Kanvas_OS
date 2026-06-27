import { NextRequest, NextResponse } from 'next/server'
import ogs from 'open-graph-scraper'

function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('tiktok.com') || url.includes('vt.tiktok') || url.includes('vm.tiktok')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('pinterest.com')) return 'pinterest'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('threads.net')) return 'threads'
  return 'web'
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
    /youtube\.com\/shorts\/([^?&#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

async function resolveShortUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) })
    return res.url || url
  } catch {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(5000) })
      return res.url || url
    } catch { /* ignore */ }
  }
  return url
}

interface TikTokOembedData {
  title?: string
  author_name?: string
  thumbnail_url?: string
  html?: string
}

async function resolveTikTok(url: string): Promise<{ id: string | null; title: string | null; thumbnail: string | null }> {
  // Try direct match first
  const directMatch = url.match(/\/(?:video|photo)\/(\d+)/)
  if (directMatch) {
    // Still call oEmbed for title
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data: TikTokOembedData = await res.json()
        return { id: directMatch[1], title: data.title ?? null, thumbnail: data.thumbnail_url ?? null }
      }
    } catch { /* ignore */ }
    return { id: directMatch[1], title: null, thumbnail: null }
  }

  // Short link — resolve redirect first
  const resolved = await resolveShortUrl(url)
  const resolvedMatch = resolved.match(/\/(?:video|photo)\/(\d+)/)

  // Also try oEmbed
  let oembedData: TikTokOembedData | null = null
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) oembedData = await res.json()
  } catch { /* ignore */ }

  let videoId = resolvedMatch?.[1] ?? null

  if (!videoId && oembedData?.html) {
    const htmlMatch = oembedData.html.match(/data-video-id="(\d+)"/) || oembedData.html.match(/cite="[^"]*\/(?:video|photo)\/(\d+)/)
    if (htmlMatch) videoId = htmlMatch[1]
  }

  if (!videoId && oembedData?.thumbnail_url) {
    const thumbMatch = oembedData.thumbnail_url.match(/\/(\d{15,})/)
    if (thumbMatch) videoId = thumbMatch[1]
  }

  return { id: videoId, title: oembedData?.title ?? null, thumbnail: oembedData?.thumbnail_url ?? null }
}

function getEmbedUrl(url: string, platform: string, resolvedId?: string | null): string | null {
  if (platform === 'youtube') {
    const id = extractYouTubeId(url)
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null
  }
  if (platform === 'tiktok' && resolvedId) {
    return `https://www.tiktok.com/embed/v2/${resolvedId}`
  }
  if (platform === 'instagram') {
    const match = url.match(/\/(p|reel|reels)\/([^/?&#]+)/)
    if (match) return `https://www.instagram.com/${match[1]}/${match[2]}/embed`
  }
  return null
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  const platform = detectPlatform(url)

  // For TikTok, resolve ID and get title via oEmbed (more reliable than OGS for short links)
  let tiktokResult: { id: string | null; title: string | null; thumbnail: string | null } | null = null
  if (platform === 'tiktok') {
    tiktokResult = await resolveTikTok(url)
  }

  const embed_url = getEmbedUrl(url, platform, tiktokResult?.id)
  const open_new_tab = !embed_url && ['instagram', 'pinterest', 'twitter', 'threads'].includes(platform)

  try {
    const { result } = await ogs({ url, timeout: 5000 })
    const image =
      (result.ogImage && result.ogImage[0]?.url) ||
      (result.twitterImage && result.twitterImage[0]?.url) ||
      null

    let title = result.ogTitle ?? result.twitterTitle ?? null
    // Override generic TikTok titles with oEmbed title
    if (platform === 'tiktok' && tiktokResult?.title && (!title || title.includes('TikTok'))) {
      title = tiktokResult.title
    }

    return NextResponse.json({
      title,
      description: result.ogDescription ?? result.twitterDescription ?? null,
      image: image ?? tiktokResult?.thumbnail ?? null,
      platform,
      embed_url,
      open_new_tab,
    })
  } catch {
    return NextResponse.json({
      title: tiktokResult?.title ?? null,
      description: null,
      image: tiktokResult?.thumbnail ?? null,
      platform,
      embed_url,
      open_new_tab,
    })
  }
}
