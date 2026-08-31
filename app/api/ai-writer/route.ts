import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { topic, platform, tone, format } = await req.json()
    if (!topic) {
      return NextResponse.json({ error: 'Topik wajib diisi' }, { status: 400 })
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (geminiApiKey) {
      // Prompt construction
      let prompt = `Berperanlah sebagai Copywriter media sosial yang ahli. `
      if (format === 'hook') {
        prompt += `Buatlah 5 pilihan Hook (kalimat pembuka 3 detik pertama) yang sangat menarik perhatian untuk video ${platform} dengan topik: "${topic}". Gunakan gaya bahasa/tone: ${tone}. Sertakan emoji dan visual hook suggestion (panduan visual di layar). Format outputnya rapi, kreatif, dan ramah dibaca.`
      } else if (format === 'outline') {
        prompt += `Buatlah outline (struktur kerangka naskah) video ${platform} untuk topik: "${topic}". Gunakan gaya bahasa/tone: ${tone}. Struktur outline harus terdiri dari Hook, Body (3 poin utama), dan CTA. Format output rincian per bagian.`
      } else {
        prompt += `Buatlah naskah lengkap (Full Script) video pendek ${platform} untuk topik: "${topic}". Gunakan gaya bahasa/tone: ${tone}. Naskah harus memiliki petunjuk visual/tindakan [Visual] dan teks yang diucapkan [Audio]. Struktur harus lengkap dari Hook menarik, isi yang padat, dan CTA di akhir. Format output dalam bentuk naskah dialog yang rapi.`
      }

      // Call Gemini API
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          return NextResponse.json({ result: text })
        }
      }
      console.error('Gemini API returned error status:', res.status)
    }

    // Offline creative template fallback generator
    const localResult = generateOfflineScript(topic, platform, tone, format)
    return NextResponse.json({ result: localResult })
  } catch (error: any) {
    console.error('AI Writer API Error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal' }, { status: 500 })
  }
}

function generateOfflineScript(topic: string, platform: string, tone: string, format: string): string {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const toneLabel = capitalize(tone || 'Casual')
  const platformLabel = capitalize(platform || 'TikTok')

  if (format === 'hook') {
    return `✨ [MOCK AI - Mode Fallback Offline] ✨
Gaya Bahasa: ${toneLabel} | Platform: ${platformLabel}

Berikut 5 Alternatif Hook Menarik untuk topik "${topic}":

1. 🎯 "Stop scroll! Kalau kamu masih peduli sama ${topic}, kamu wajib tahu rahasia ini..."
   🎥 [Visual]: Zoom-in wajah dramatis, tunjukkan gestur telunjuk berhenti.

2. 🤯 "Banyak yang nggak nyadar, ternyata cara paling gampang buat ngeberesin ${topic} itu cuma ini!"
   🎥 [Visual]: Tunjukkan teks besar di layar dengan transisi cepat.

3. ❌ "Jangan lakukan kesalahan ini lagi kalau kamu sedang fokus di ${topic}..."
   🎥 [Visual]: Background redup, ekspresi wajah khawatir/geleng kepala.

4. 💡 "Ini tips rahasia yang orang-orang sukses lakukan buat ngatasin ${topic}..."
   🎥 [Visual]: Pegang segelas kopi, tunjukkan ekspresi santai tapi informatif.

5. 🚀 "Dalam 30 detik ke depan, aku bakal bongkar tips terbaik tentang ${topic}!"
   🎥 [Visual]: Hitung mundur angka 3, 2, 1 berjalan di pojok layar.`
  }

  if (format === 'outline') {
    return `✨ [MOCK AI - Mode Fallback Offline] ✨
Gaya Bahasa: ${toneLabel} | Platform: ${platformLabel}

Kerangka Naskah (Outline) Video untuk topik "${topic}":

[1. HOOK - 0-5 Detik Pertama]
• Kalimat: "Kamu capek ngadepin ${topic}? Ini solusi paling cepat!"
• Tujuan: Menangkap atensi agar penonton tidak scroll.

[2. BODY - 5-25 Detik Tengah]
• Poin 1: Identifikasi akar masalah dari ${topic}.
• Poin 2: Tunjukkan langkah praktis pertama (cara yang paling mudah).
• Poin 3: Jelaskan hasil/benefit nyata jika langkah tersebut dilakukan sekarang.

[3. CTA - 25-30 Detik Akhir]
• Kalimat: "Follow akun ini buat dapet tips produktif harian lainnya tentang ${topic}!"
• Tujuan: Mengajak penonton berinteraksi.`
  }

  return `✨ [MOCK AI - Mode Fallback Offline] ✨
Gaya Bahasa: ${toneLabel} | Platform: ${platformLabel}

Naskah Lengkap (Full Script) untuk topik "${topic}":

[00:00 - 00:05] Hook
• 🎬 [Visual]: Talent menatap kamera dengan antusias, memegang HP dengan teks pop-up "Rahasia ${topic}".
• 🎙️ [Audio/Narasi]: "Siapa yang di sini masih sering bingung soal ${topic}?"

[00:05 - 00:15] Masalah & Poin 1
• 🎬 [Visual]: B-roll layar laptop atau footage kegiatan sehari-hari yang sibuk.
• 🎙️ [Audio/Narasi]: "Tenang aja, kamu gak sendirian. Langkah pertamanya itu simpel banget: fokus ke hal kecil dulu."

[00:15 - 00:25] Poin 2 & Tips Utama
• 🎬 [Visual]: Close-up talent memberikan penjelasan dengan gerakan tangan yang meyakinkan.
• 🎙️ [Audio/Narasi]: "Yang kedua, luangkan waktu 5 menit setiap hari buat ngecek progresnya. Ini bakal ngubah semuanya!"

[00:25 - 00:30] CTA
• 🎬 [Visual]: Talent tersenyum, melambaikan tangan, dan menunjuk tombol follow di bawah.
• 🎙️ [Audio/Narasi]: "Gampang kan? Jangan lupa klik tombol follow untuk tips seru berikutnya!"`
}
