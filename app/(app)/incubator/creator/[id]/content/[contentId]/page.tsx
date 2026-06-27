'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, ExternalLink, Save, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CreatorSavedContent, ContentAnalysis, LinkMeta } from '@/lib/types/incubator'

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter', 'threads', 'pinterest']

const ANALYSIS_ASPECTS = [
  { key: 'ide', label: 'Ide', placeholder: 'Apa ide utama konten ini?' },
  { key: 'angle', label: 'Angle', placeholder: 'Dari sudut pandang apa konten ini dibuat?' },
  { key: 'hook', label: 'Hook', placeholder: 'Bagaimana hook di awal konten?' },
  { key: 'flow', label: 'Flow', placeholder: 'Bagaimana alur cerita / pacing konten?' },
  { key: 'highlight', label: 'Highlight', placeholder: 'Apa momen paling menarik?' },
  { key: 'emotion', label: 'Emotion', placeholder: 'Emosi apa yang ditimbulkan?' },
  { key: 'takeaway', label: 'Takeaway', placeholder: 'Apa pesan utama yang dibawa penonton?' },
] as const

function getEmbedUrl(url: string, meta: LinkMeta | null): string | null {
  if (meta?.embed_url) return meta.embed_url

  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const videoId = u.hostname.includes('youtu.be')
        ? u.pathname.slice(1)
        : u.searchParams.get('v')
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
    }
    if (u.hostname.includes('tiktok.com')) {
      const match = u.pathname.match(/\/video\/(\d+)/)
      if (match) return `https://www.tiktok.com/embed/v2/${match[1]}`
    }
    if (u.hostname.includes('instagram.com')) {
      const match = u.pathname.match(/\/(p|reel)\/([^/]+)/)
      if (match) return `https://www.instagram.com/${match[1]}/${match[2]}/embed`
    }
  } catch { /* ignore */ }

  return null
}

export default function ContentAnalysisPage() {
  const { id, contentId } = useParams<{ id: string; contentId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saved, setSaved] = useState(false)

  const [platform, setPlatform] = useState('')
  const [viewCount, setViewCount] = useState('')
  const [analysis, setAnalysis] = useState<Record<string, string>>({})
  const [learnings, setLearnings] = useState('')

  const { data: content, isLoading } = useQuery<CreatorSavedContent>({
    queryKey: ['saved-content-detail', contentId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('creator_saved_content').select('*').eq('id', contentId).single()
      return data as CreatorSavedContent
    },
    enabled: !!contentId,
  })

  useEffect(() => {
    if (!content) return
    setPlatform(content.platform ?? '')
    setViewCount(content.view_count ? String(content.view_count) : '')
    const a = (content.analysis ?? {}) as Record<string, string>
    setAnalysis(a)
    setLearnings(a.learnings ?? '')
  }, [content])

  async function saveData(patch: {
    platform?: string
    view_count?: number | null
    analysis?: Record<string, string>
  }) {
    const supabase = createClient()
    const { error } = await supabase
      .from('creator_saved_content')
      .update(patch)
      .eq('id', contentId)
    if (error) { toast.error(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    queryClient.invalidateQueries({ queryKey: ['saved-content-detail', contentId] })
    queryClient.invalidateQueries({ queryKey: ['creator-content', id] })
  }

  function scheduleAutoSave(nextAnalysis: Record<string, string>, nextLearnings: string) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      saveData({ analysis: { ...nextAnalysis, learnings: nextLearnings } })
    }, 800)
  }

  function handleAspectChange(key: string, value: string) {
    const next = { ...analysis, [key]: value }
    setAnalysis(next)
    scheduleAutoSave(next, learnings)
  }

  function handleLearningsChange(value: string) {
    setLearnings(value)
    scheduleAutoSave(analysis, value)
  }

  function handlePlatformChange(value: string) {
    setPlatform(value)
    saveData({ platform: value === 'none' ? '' : value })
  }

  function handleViewCountBlur() {
    const num = viewCount ? parseInt(viewCount, 10) : null
    saveData({ view_count: num && !isNaN(num) ? num : null })
  }

  const embedUrl = content ? getEmbedUrl(content.url, content.link_meta as LinkMeta | null) : null

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="aspect-[9/16] max-h-[70vh] rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )

  if (!content) return (
    <div className="py-20 text-center">
      <p className="text-text-muted">Konten tidak ditemukan</p>
      <Button variant="ghost" size="sm" className="mt-3" onClick={() => router.back()}>Kembali</Button>
    </div>
  )

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push(`/incubator/creator/${id}`)}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Kreator
          </button>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3.5 h-3.5" /> Tersimpan
              </span>
            )}
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Buka asli <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Title */}
        <h1 className="font-bold text-lg text-text-primary mb-4 truncate">
          {content.title ?? content.url}
        </h1>

        {/* Side by side layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Embedded Player */}
          <div className="space-y-3">
            <div className="bg-black rounded-xl overflow-hidden">
              {embedUrl ? (
                <div className="relative w-full aspect-[9/16] max-h-[70vh]">
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="aspect-[9/16] max-h-[70vh] flex flex-col items-center justify-center gap-3 text-white/60">
                  <p className="text-sm">Embed tidak tersedia untuk link ini</p>
                  <a
                    href={content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-accent hover:underline"
                  >
                    Buka di tab baru <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {content.notes && (
              <div className="bg-white border border-border rounded-xl p-3">
                <p className="text-xs text-text-muted font-medium mb-1">Catatan</p>
                <p className="text-sm text-text-secondary">{content.notes}</p>
              </div>
            )}
          </div>

          {/* Right: Analysis Form */}
          <div className="bg-white border border-border rounded-xl p-4 space-y-4">
            <p className="font-semibold text-text-primary">Bedah Konten</p>

            {/* Link (read-only) */}
            <div className="space-y-1">
              <Label className="text-xs text-text-muted">Link</Label>
              <Input value={content.url} readOnly className="text-sm h-8 bg-subtle" />
            </div>

            {/* Platform + View Count */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-text-muted">Platform</Label>
                <Select value={platform || 'none'} onValueChange={handlePlatformChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-text-muted">Jumlah View</Label>
                <Input
                  type="number"
                  value={viewCount}
                  onChange={(e) => setViewCount(e.target.value)}
                  onBlur={handleViewCountBlur}
                  placeholder="0"
                  className="text-sm h-8"
                />
              </div>
            </div>

            {/* Aspek Video */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-primary uppercase tracking-wide">Aspek Video</p>
              <div className="border border-border rounded-lg divide-y divide-border">
                {ANALYSIS_ASPECTS.map((a) => (
                  <div key={a.key} className="px-3 py-2.5">
                    <Label className="text-xs font-medium text-text-muted">{a.label}</Label>
                    <Textarea
                      value={analysis[a.key] ?? ''}
                      onChange={(e) => handleAspectChange(a.key, e.target.value)}
                      placeholder={a.placeholder}
                      rows={2}
                      className="text-sm resize-none mt-1 border-0 p-0 focus-visible:ring-0 shadow-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Learnings */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-1">
              <Label className="text-sm font-medium text-amber-700">Hal yang Bisa Dipelajari & Diadaptasi</Label>
              <Textarea
                value={learnings}
                onChange={(e) => handleLearningsChange(e.target.value)}
                placeholder="Apa yang bisa dipelajari dan diterapkan dari konten ini?"
                rows={4}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
