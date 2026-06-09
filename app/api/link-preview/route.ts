import { NextRequest, NextResponse } from 'next/server'
import ogs from 'open-graph-scraper'

function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('tiktok.com')) return 'tiktok'
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

function getEmbedUrl(url: string, platform: string): string | null {
  if (platform === 'youtube') {
    const id = extractYouTubeId(url)
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null
  }
  return null
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  const platform = detectPlatform(url)
  const embed_url = getEmbedUrl(url, platform)
  const open_new_tab = ['instagram', 'pinterest', 'twitter', 'threads'].includes(platform)

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
