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

async function extractTikTokVideoId(url: string): Promise<string | null> {
  const directMatch = url.match(/\/video\/(\d+)/)
  if (directMatch) return directMatch[1]

  // Short links (vt.tiktok.com, vm.tiktok.com) — resolve via TikTok oEmbed
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json()
      const htmlMatch = data.html?.match(/data-video-id="(\d+)"/) || data.html?.match(/cite="[^"]*\/video\/(\d+)/)
      if (htmlMatch) return htmlMatch[1]
      // Fallback: thumbnail URL often contains video ID
      const thumbMatch = data.thumbnail_url?.match(/\/(\d{15,})/)
      if (thumbMatch) return thumbMatch[1]
    }
  } catch { /* ignore */ }
  return null
}

async function getEmbedUrl(url: string, platform: string): Promise<string | null> {
  if (platform === 'youtube') {
    const id = extractYouTubeId(url)
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null
  }
  if (platform === 'tiktok') {
    const id = await extractTikTokVideoId(url)
    return id ? `https://www.tiktok.com/embed/v2/${id}` : null
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
  const embed_url = await getEmbedUrl(url, platform)
  const open_new_tab = !embed_url && ['instagram', 'pinterest', 'twitter', 'threads'].includes(platform)

  try {
    const { result } = await ogs({ url, timeout: 5000 })
    const image =
      (result.ogImage && result.ogImage[0]?.url) ||
      (result.twitterImage && result.twitterImage[0]?.url) ||
      null

    return NextResponse.json({
      title: result.ogTitle ?? result.twitterTitle ?? null,
      description: result.ogDescription ?? result.twitterDescription ?? null,
      image,
      platform,
      embed_url,
      open_new_tab,
    })
  } catch {
    return NextResponse.json({
      title: null,
      description: null,
      image: null,
      platform,
      embed_url,
      open_new_tab,
    })
  }
}
