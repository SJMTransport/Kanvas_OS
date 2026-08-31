import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  return handlePublish(req)
}

export async function POST(req: NextRequest) {
  return handlePublish(req)
}

async function handlePublish(req: NextRequest) {
  const logs: string[] = []
  try {
    const supabase = await createClient()

    // Parse schedule_id filter if provided
    let scheduleIdFilter: string | null = null
    try {
      if (req.method === 'POST') {
        const body = await req.json()
        scheduleIdFilter = body.schedule_id || null
      } else {
        const { searchParams } = new URL(req.url)
        scheduleIdFilter = searchParams.get('schedule_id') || null
      }
    } catch (e) {}

    // 1. Fetch scheduled platform posts
    let query = supabase
      .from('video_platform_schedules')
      .select('*, social_accounts(*), videos(judul, caption_default)')
      .eq('status', 'scheduled')

    if (scheduleIdFilter) {
      query = query.eq('id', scheduleIdFilter)
    }

    const { data: schedules, error: fetchErr } = await query

    if (fetchErr) throw fetchErr

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: 'Tidak ada postingan terjadwal saat ini.', logs })
    }

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0] // YYYY-MM-DD
    const curTimeStr = now.toTimeString().slice(0, 5) // HH:MM

    let publishedCount = 0
    let failedCount = 0

    for (const s of schedules) {
      // Compare scheduling date and time (bypass check if force-publishing via scheduleIdFilter)
      const isReady = scheduleIdFilter || s.tanggal_tayang < todayStr || 
        (s.tanggal_tayang === todayStr && (!s.jam_post || s.jam_post.slice(0, 5) <= curTimeStr))

      if (!isReady) {
        logs.push(`Post ID ${s.id} (${s.platform}) dijadwalkan nanti pada ${s.tanggal_tayang} pukul ${s.jam_post || '00:00'}. Lewati.`)
        continue
      }

      // Check if account is connected via OAuth
      if (!s.social_accounts || !s.social_accounts.is_connected) {
        failedCount++
        const errMsg = 'FAILED: Akun sosial media belum terhubung via OAuth.'
        await supabase
          .from('video_platform_schedules')
          .update({ status: 'failed', url_post: errMsg, updated_at: new Date().toISOString() })
          .eq('id', s.id)
        logs.push(`Gagal memposting ID ${s.id} (${s.platform}): Akun belum terhubung via OAuth.`)
        continue
      }

      // Check if media asset exists
      if (!s.media_url) {
        failedCount++
        const errMsg = 'FAILED: File media kosong. Harap unggah media untuk auto-publish.'
        await supabase
          .from('video_platform_schedules')
          .update({ status: 'failed', url_post: errMsg, updated_at: new Date().toISOString() })
          .eq('id', s.id)
        logs.push(`Gagal memposting ID ${s.id} (${s.platform}): File media tidak tersedia.`)
        continue
      }

      // Simulate official API payload request logic
      const targetPlatform = s.platform
      const handle = s.social_accounts.username
      const caption = s.caption_override || s.videos?.caption_default || s.videos?.judul || ''

      logs.push(`[SIMULASI API ${targetPlatform.toUpperCase()}] Mengunggah media ${s.media_url} dengan caption: "${caption}"`)

      // Generate random mock post URL based on platform
      let mockUrl = `https://instagram.com/p/ig_mock_${crypto.randomUUID().slice(0, 8)}`
      if (targetPlatform === 'tiktok') {
        mockUrl = `https://tiktok.com/@${handle}/video/tt_mock_${crypto.randomUUID().slice(0, 8)}`
      } else if (targetPlatform === 'youtube') {
        mockUrl = `https://youtube.com/shorts/yt_mock_${crypto.randomUUID().slice(0, 8)}`
      } else if (targetPlatform === 'facebook') {
        mockUrl = `https://facebook.com/${handle}/posts/fb_mock_${crypto.randomUUID().slice(0, 8)}`
      }

      // Successfully posted
      publishedCount++
      await supabase
        .from('video_platform_schedules')
        .update({
          status: 'posted',
          url_post: mockUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', s.id)

      // Optionally register seed metrics record for views tracking
      const recordedAt = new Date().toISOString()
      await supabase.from('video_performance').insert({
        video_id: s.video_id,
        platform: s.platform,
        views: Math.floor(Math.random() * 150) + 10,
        likes: Math.floor(Math.random() * 30),
        comments: Math.floor(Math.random() * 5),
        recorded_at: recordedAt,
      })

      logs.push(`Berhasil memposting ID ${s.id} (${s.platform}) sebagai ${s.is_story ? 'Story' : 'Post/Reels'}. URL: ${mockUrl}`)
    }

    return NextResponse.json({
      message: `Publishing job selesai. Sukses: ${publishedCount}, Gagal: ${failedCount}`,
      logs
    })
  } catch (error: any) {
    console.error('Auto-Publish Engine Error:', error)
    return NextResponse.json({ error: error.message || 'Kesalahan internal auto-publisher' }, { status: 500 })
  }
}
