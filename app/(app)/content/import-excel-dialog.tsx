'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, FileSpreadsheet, Check, X, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Column mapping: Excel header → DB field
const COLUMN_MAP: Record<string, string> = {
  'no': 'no_video',
  'no.': 'no_video',
  'nomor': 'no_video',
  'no video': 'no_video',
  'no. video': 'no_video',
  'no_video': 'no_video',
  'judul': 'judul',
  'format': 'format',
  'tema': 'tema',
  'pilar': 'pilar_konten',
  'pilar konten': 'pilar_konten',
  'nama alat': 'nama_alat',
  'storage bahan': 'storage_bahan',
  'storage video': 'storage_video',
  'tanggal shooting': 'tanggal_shooting',
  'endorsment': 'is_endorsement',
  'endorsement': 'is_endorsement',
  'deadline posting': 'deadline_posting',
  'video request': 'is_video_request',
  // 1st Upload Dates
  'tiktok': 'platform_tiktok',
  'tiktok 1': 'platform_tiktok',
  'tiktok1': 'platform_tiktok',
  'instagram': 'platform_instagram',
  'instagram 1': 'platform_instagram',
  'instagram1': 'platform_instagram',
  'ig': 'platform_instagram',
  'ig 1': 'platform_instagram',
  'ig1': 'platform_instagram',
  'yt': 'platform_youtube',
  'yt 1': 'platform_youtube',
  'yt1': 'platform_youtube',
  'youtube': 'platform_youtube',
  'youtube 1': 'platform_youtube',
  'youtube1': 'platform_youtube',
  'yt short': 'platform_youtube',
  'fb': 'platform_facebook',
  'fb 1': 'platform_facebook',
  'fb1': 'platform_facebook',
  'facebook': 'platform_facebook',
  'facebook 1': 'platform_facebook',
  'facebook1': 'platform_facebook',
  // 2nd Upload Dates
  'tiktok 2': 'platform_tiktok_2',
  'tiktok2': 'platform_tiktok_2',
  'tt 2': 'platform_tiktok_2',
  'tt2': 'platform_tiktok_2',
  'instagram 2': 'platform_instagram_2',
  'instagram2': 'platform_instagram_2',
  'ig 2': 'platform_instagram_2',
  'ig2': 'platform_instagram_2',
  'yt 2': 'platform_youtube_2',
  'yt2': 'platform_youtube_2',
  'youtube 2': 'platform_youtube_2',
  'youtube2': 'platform_youtube_2',
  'yt short 2': 'platform_youtube_2',
  'fb 2': 'platform_facebook_2',
  'fb2': 'platform_facebook_2',
  'facebook 2': 'platform_facebook_2',
  'facebook2': 'platform_facebook_2',
  // Link & Caption
  'google drive': 'google_drive_link',
  'caption': 'caption_default',
}

function parseExcelDate(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date((val - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  return null
}

function parseBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val !== 0
  if (typeof val === 'string') return ['y', 'yes', 'ya', '1', 'true', 'v'].includes(val.toLowerCase())
  return false
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function ImportExcelDialog({ open, onOpenChange }: Props) {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [dragging, setDragging] = useState(false)

  async function parseFile(f: File) {
    const XLSX = await import('xlsx')
    const buffer = await f.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: '' })
    if (!data.length) { toast.error('File kosong atau format tidak valid.'); return }

    const hdrs = Object.keys(data[0])
    setHeaders(hdrs)
    setRows(data)

    // Auto-map
    const autoMap: Record<string, string> = {}
    hdrs.forEach((h) => {
      const lower = h.toLowerCase().trim()
      if (COLUMN_MAP[lower]) autoMap[h] = COLUMN_MAP[lower]
    })
    setMapping(autoMap)
    setStep(2)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); parseFile(f) }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setFile(f); parseFile(f) }
  }

  async function handleImport() {
    if (!workspaceId || !rows.length) return
    setImporting(true)
    setStep(3)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const BATCH = 50
    let success = 0; let failed = 0; const errors: string[] = []

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const records = batch.map((row, idx) => {
        const hasPublishDate = Object.entries(mapping).some(([col, field]) => {
          if (field.startsWith('platform_')) {
            const val = row[col]
            const dateStr = parseExcelDate(val)
            return !!dateStr
          }
          return false
        })

        const rec: Record<string, unknown> = {
          workspace_id: workspaceId,
          created_by: user?.id,
          status: hasPublishDate ? 'live' : 'ide',
        }
        Object.entries(mapping).forEach(([col, field]) => {
          if (!field) return
          const val = row[col]
          if (field === 'no_video') {
            const strVal = val ? String(val).trim() : ''
            if (strVal) {
              if (strVal.toUpperCase().startsWith('VID-')) {
                rec.no_video = strVal.toUpperCase()
              } else if (strVal.includes('.')) {
                const parts = strVal.replace(/^VID-/i, '').split('.')
                const mainDigits = parts[0].replace(/\D/g, '')
                rec.no_video = mainDigits ? `VID-${mainDigits.padStart(3, '0')}.${parts[1].trim()}` : strVal
              } else {
                const digits = strVal.replace(/\D/g, '')
                rec.no_video = digits ? `VID-${digits.padStart(3, '0')}` : strVal
              }
            } else {
              rec.no_video = null
            }
          }
          else if (field === 'is_endorsement') rec.is_endorsement = parseBool(val)
          else if (field === 'is_video_request') rec.is_video_request = parseBool(val)
          else if (field === 'tanggal_shooting' || field === 'deadline_posting') rec[field] = parseExcelDate(val)
          else if (field === 'pilar_konten') rec.pilar_konten = val ? String(val).trim() : null
          else if (!field.startsWith('platform_')) rec[field] = val || null
        })
        return rec
      }).filter((r) => r.judul)

      // Validate
      const invalid = batch.filter((_, j) => !records[j]?.judul)
      failed += invalid.length

      if (records.length) {
        const { error, data: inserted } = await supabase.from('videos').insert(records).select('id')
        if (error) { failed += records.length; errors.push(`Batch ${i / BATCH + 1}: ${error.message}`) }
        else {
          success += (inserted ?? []).length
          // Handle platform schedules (both 1st and 2nd upload dates)
          const scheduleInserts: object[] = []
          batch.forEach((row, idx) => {
            const videoId = (inserted ?? [])[idx]?.id
            if (!videoId) return
            const platforms = ['tiktok', 'instagram', 'youtube', 'facebook'] as const
            platforms.forEach((p) => {
              // 1st schedule date
              const col1 = Object.entries(mapping).find(([, f]) => f === `platform_${p}`)?.[0]
              if (col1) {
                const dateStr1 = parseExcelDate(row[col1])
                if (dateStr1) scheduleInserts.push({ video_id: videoId, platform: p, tanggal_tayang: dateStr1, status: 'scheduled' })
              }

              // 2nd schedule date (e.g. Instagram2, FB 2, Yt 2, TikTok 2)
              const col2 = Object.entries(mapping).find(([, f]) => f === `platform_${p}_2`)?.[0]
              if (col2) {
                const dateStr2 = parseExcelDate(row[col2])
                if (dateStr2) scheduleInserts.push({ video_id: videoId, platform: p, tanggal_tayang: dateStr2, status: 'scheduled' })
              }
            })
          })
          if (scheduleInserts.length) await supabase.from('video_platform_schedules').insert(scheduleInserts)
        }
      }
      setProgress(Math.round(((i + BATCH) / rows.length) * 100))
    }

    setResult({ success, failed, errors })
    setImporting(false)
    if (success > 0) queryClient.invalidateQueries({ queryKey: ['videos'] })
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(() => { setStep(1); setFile(null); setRows([]); setHeaders([]); setMapping({}); setResult(null); setProgress(0) }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Excel</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                s < step ? 'bg-success text-white' : s === step ? 'bg-accent text-white' : 'bg-border text-text-muted')}>
                {s < step ? <Check className="w-3 h-3" /> : s}
              </div>
              <span className="text-xs text-text-muted hidden sm:block">
                {s === 1 ? 'Upload' : s === 2 ? 'Mapping' : 'Import'}
              </span>
              {s < 3 && <div className={cn('h-px flex-1', s < step ? 'bg-success' : 'bg-border')} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Upload */}
        {step === 1 && (
          <div
            className={cn('border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer', dragging ? 'border-accent bg-accent-light' : 'border-border hover:border-accent')}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('excel-input')?.click()}
          >
            <FileSpreadsheet className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="font-medium text-text-primary">Drag & drop file Excel di sini</p>
            <p className="text-sm text-text-muted mt-1">atau klik untuk pilih file (.xlsx, .csv)</p>
            <input id="excel-input" type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleFileInput} />
          </div>
        )}

        {/* Step 2 — Preview & Mapping */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="font-medium">{file?.name}</span>
              <span>— {rows.length} baris</span>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-surface px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-text-muted uppercase">Mapping Kolom</p>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-border">
                {headers.map((h) => (
                  <div key={h} className="flex items-center gap-3 px-3 py-2">
                    <span className="text-sm text-text-primary w-40 truncate font-mono text-xs">{h}</span>
                    <span className="text-text-muted">→</span>
                    <select
                      value={mapping[h] ?? ''}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                      className="flex-1 text-xs border border-border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="">[Abaikan]</option>
                      {Object.entries({
                        no_video: 'No Video', judul: 'Judul', format: 'Format',
                        tema: 'Tema', pilar_konten: 'Pilar Konten', nama_alat: 'Nama Alat', storage_bahan: 'Storage Bahan',
                        storage_video: 'Storage Video', tanggal_shooting: 'Tanggal Shooting',
                        is_endorsement: 'Endorsement', deadline_posting: 'Deadline Posting',
                        is_video_request: 'Video Request',
                        platform_tiktok: 'Jadwal TikTok (Upload 1)',
                        platform_tiktok_2: 'Jadwal TikTok (Upload 2)',
                        platform_instagram: 'Jadwal Instagram (Upload 1)',
                        platform_instagram_2: 'Jadwal Instagram (Upload 2)',
                        platform_youtube: 'Jadwal YouTube (Upload 1)',
                        platform_youtube_2: 'Jadwal YouTube (Upload 2)',
                        platform_facebook: 'Jadwal Facebook (Upload 1)',
                        platform_facebook_2: 'Jadwal Facebook (Upload 2)',
                        google_drive_link: 'Google Drive',
                        caption_default: 'Caption',
                      }).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    {mapping[h] ? <Check className="w-4 h-4 text-success shrink-0" /> : <span className="w-4" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview 5 rows */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase mb-2">Preview (5 baris pertama)</p>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="text-xs w-full">
                  <thead className="bg-surface">
                    <tr>{headers.slice(0, 6).map((h) => <th key={h} className="px-2 py-1.5 text-left font-semibold text-text-muted truncate max-w-[100px]">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-surface">
                        {headers.slice(0, 6).map((h) => (
                          <td key={h} className="px-2 py-1.5 text-text-secondary truncate max-w-[100px]">
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleImport}>
                Import {rows.length} Video →
              </Button>
              <Button variant="secondary" onClick={() => setStep(1)}>Kembali</Button>
            </div>
          </div>
        )}

        {/* Step 3 — Progress / Result */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            {importing ? (
              <>
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  <p className="text-sm font-medium text-text-primary">Mengimpor data...</p>
                </div>
                <Progress value={progress} />
                <p className="text-xs text-text-muted">{progress}% selesai</p>
              </>
            ) : result && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success" />
                  <p className="font-heading font-semibold text-text-primary">Import selesai</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-success">{result.success}</p>
                    <p className="text-xs text-success">Berhasil</p>
                  </div>
                  <div className={cn('border rounded-lg p-3 text-center', result.failed > 0 ? 'bg-red-50 border-red-200' : 'bg-surface border-border')}>
                    <p className={cn('text-2xl font-bold', result.failed > 0 ? 'text-error' : 'text-text-muted')}>{result.failed}</p>
                    <p className={cn('text-xs', result.failed > 0 ? 'text-error' : 'text-text-muted')}>Gagal</p>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                    {result.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-error mt-0.5 shrink-0" />
                        <p className="text-xs text-error">{e}</p>
                      </div>
                    ))}
                  </div>
                )}
                <Button className="w-full" onClick={handleClose}>Selesai</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
