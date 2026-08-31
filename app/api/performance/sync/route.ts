import { NextRequest, NextResponse } from 'next/server'

// Phase 1 (manual metrics) intentionally does NOT auto-sync.
//
// The previous implementation fabricated metrics with Math.random() and wrote
// them into video_performance, which polluted real data. That has been removed.
// Real platform integration (TikTok / Meta / YouTube official APIs via OAuth) is
// planned for Phase 2; until then, metrics are entered manually per platform on
// the video performance page.
async function handleSync(_req: NextRequest) {
  return NextResponse.json({
    success: false,
    message:
      'Sinkronisasi otomatis belum tersedia. Untuk saat ini, masukkan metrik secara manual per platform. Integrasi API resmi akan hadir di Fase 2.',
    logs: [],
  })
}

export async function POST(req: NextRequest) {
  return handleSync(req)
}

export async function GET(req: NextRequest) {
  return handleSync(req)
}
