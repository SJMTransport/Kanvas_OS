'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, ExternalLink, Plus, Star, Sparkles, Lightbulb, Play } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { CreatorProfile, CreatorSavedContent, LinkMeta } from '@/lib/types/incubator'

const ANALYSIS_FIELDS = [
  { key: 'format', label: 'Format konten', type: 'text' },
  { key: 'avg_duration', label: 'Durasi rata-rata', type: 'text' },
  { key: 'content_type', label: 'Tipe konten', type: 'text' },
  { key: 'posting_frequency', label: 'Frekuensi posting', type: 'text' },
  { key: 'hook_style', label: 'Style hook', type: 'textarea' },
  { key: 'hook_examples', label: 'Contoh hook terbaik', type: 'textarea' },
  { key: 'edit_pace', label: 'Pace editing', type: 'text' },
  { key: 'music_style', label: 'Style musik', type: 'text' },
  { key: 'onscreen_text', label: 'On-screen text', type: 'text' },
  { key: 'engagement_approach', label: 'Cara reply komentar', type: 'textarea' },
  { key: 'cta_style', label: 'CTA yang dipakai', type: 'textarea' },
  { key: 'community_notes', label: 'Catatan komunitas', type: 'textarea' },
  { key: 'key_learnings', label: 'Pelajaran untuk Saya', type: 'textarea', prominent: true },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: '○ Belum', cls: 'border-gray-300 text-gray-500' },
  { value: 'in_progress', label: '◑ Proses', cls: 'border-amber-400 text-amber-600 bg-amber-50' },
  { value: 'done', label: '● Done', cls: 'border-green-400 text-green-600 bg-green-50' },
]

export default function CreatorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const [analysis, setAnalysis] = useState<Record<string, string>>({})
  const [addContentOpen, setAddContentOpen] = useState(false)
  const [contentUrl, setContentUrl] = useState('')
  const [contentNotes, setContentNotes] = useState('')
  const [addingContent, setAddingContent] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: creator, isLoading } = useQuery<CreatorProfile>({
    queryKey: ['creator-detail', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('creator_profiles').select('*').eq('id', id).single()
      return data as CreatorProfile
    },
    enabled: !!id,
  })

  const { data: savedContent = [] } = useQuery<CreatorSavedContent[]>({
    queryKey: ['creator-content', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('creator_saved_content').select('*').eq('creator_id', id).order('created_at', { ascending: false })
      return (data ?? []) as CreatorSavedContent[]
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (creator) {
      const a = creator.analysis ?? {}
      const flat: Record<string, string> = {}
      for (const [k, v] of Object.entries(a)) {
        flat[k] = Array.isArray(v) ? v.join('\n') : String(v ?? '')
      }
      setAnalysis(flat)
    }
  }, [creator])

  async function saveAnalysis(patch: Record<string, string>) {
    const supabase = createClient()
    const { error } = await supabase.from('creator_profiles').update({ analysis: patch }).eq('id', id)
    if (error) toast.error(error.message)
    else queryClient.invalidateQueries({ queryKey: ['creator-detail', id] })
  }

  function handleFieldChange(key: string, value: string) {
    const next = { ...analysis, [key]: value }
    setAnalysis(next)
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => saveAnalysis(next), 600)
  }

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('creator_profiles').update({ analysis_status: status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator-detail', id] }),
    onError: (e: Error) => toast.error(e.message),
  })

  async function handleConvertToIdea() {
    if (!workspaceId || !creator) return
    const learnings = analysis.key_learnings?.trim()
    if (!learnings) { toast.error('Isi dulu pelajaran untuk saya'); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('idea_cards').insert({
      workspace_id: workspaceId,
      created_by: user?.id,
      type: 'scratch',
      title: `Pelajaran dari @${creator.username}`,
      body: learnings,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Dibuat sebagai Idea Card!')
    queryClient.invalidateQueries({ queryKey: ['idea-cards', workspaceId] })
  }

  async function handleAddContent() {
    if (!contentUrl.trim()) return
    setAddingContent(true)
    try {
      let meta: LinkMeta | null = null
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(contentUrl)}`)
        if (res.ok) meta = await res.json()
      } catch { /* ignore */ }

      const supabase = createClient()
      const { error } = await supabase.from('creator_saved_content').insert({
        creator_id: id,
        url: contentUrl,
        title: meta?.title ?? null,
        thumbnail_url: meta?.image ?? null,
        link_meta: meta,
        notes: contentNotes || null,
      })
      if (error) throw error
      toast.success('Konten disimpan!')
      queryClient.invalidateQueries({ queryKey: ['creator-content', id] })
      setContentUrl('')
      setContentNotes('')
      setAddContentOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setAddingContent(false)
    }
  }

  function openContentAnalysis(content: CreatorSavedContent) {
    router.push(`/incubator/creator/${id}/content/${content.id}`)
  }

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )

  if (!creator) return (
    <div className="py-20 text-center">
      <p className="text-text-muted">Kreator tidak ditemukan</p>
      <Button variant="ghost" size="sm" className="mt-3" onClick={() => router.back()}>Kembali</Button>
    </div>
  )

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Profile + Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Profile card */}
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={creator.avatar_url ?? ''} />
                  <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">
                    {creator.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-bold text-text-primary">@{creator.username}</p>
                  {creator.display_name && <p className="text-sm text-text-muted">{creator.display_name}</p>}
                  <span className="inline-block text-xs px-2 py-0.5 bg-gray-100 rounded-full mt-1 capitalize">{creator.platform}</span>
                </div>
                {creator.profile_url && (
                  <a href={creator.profile_url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {(creator.niche || creator.followers_count) && (
                <p className="text-sm text-text-secondary mb-2">
                  {[creator.niche, creator.followers_count].filter(Boolean).join(' · ')}
                </p>
              )}

              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('w-4 h-4', i < creator.rating ? 'fill-amber-400 text-amber-400' : 'text-border')} />
                ))}
              </div>

              {creator.why_saved && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-text-muted mb-1 font-medium">Kenapa disimpan:</p>
                  <p className="text-sm text-text-secondary">{creator.why_saved}</p>
                </div>
              )}
            </div>

            {/* Saved content */}
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm text-text-primary">Konten Disimpan</p>
                <div className="flex items-center gap-2">
                  <Link href={`/incubator/saved?creator=${encodeURIComponent(creator.username)}`} className="text-xs text-accent hover:underline">
                    Lihat di Referensi
                  </Link>
                  <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => setAddContentOpen(true)}>
                    <Plus className="w-3 h-3" /> Simpan
                  </Button>
                </div>
              </div>

              {addContentOpen && (
                <div className="mb-3 p-3 bg-subtle rounded-lg space-y-2">
                  <Input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="URL konten..." className="h-8 text-sm" />
                  <Textarea value={contentNotes} onChange={(e) => setContentNotes(e.target.value)} placeholder="Catatan (opsional)..." rows={2} className="text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddContent} disabled={addingContent || !contentUrl.trim()} className="flex-1 h-7 text-xs">
                      {addingContent ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddContentOpen(false)}>Batal</Button>
                  </div>
                </div>
              )}

              {savedContent.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">Belum ada konten tersimpan</p>
              ) : (
                <div className="space-y-1">
                  {savedContent.map((c) => {
                    const hook = (c.analysis as Record<string, string> | null)?.hook
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border cursor-pointer hover:bg-subtle transition-colors"
                        onClick={() => openContentAnalysis(c)}
                      >
                        <Play className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{hook || c.title || c.url}</p>
                          {hook && c.title && <p className="text-[10px] text-text-muted truncate">{c.title}</p>}
                        </div>
                        {c.platform && <span className="text-[10px] text-text-muted capitalize shrink-0">{c.platform}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Analysis */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-text-primary">Analisis Kreator</p>
                <div className="flex gap-1">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => updateStatus.mutate(s.value)}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-full border transition-colors',
                        creator.analysis_status === s.value ? s.cls : 'border-border text-text-muted hover:bg-subtle'
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {ANALYSIS_FIELDS.map((f) => (
                  <div key={f.key} className={cn('space-y-1', f.prominent && 'p-3 bg-amber-50 rounded-xl border border-amber-100')}>
                    <Label className={cn('text-xs font-medium', f.prominent ? 'text-amber-700 text-sm' : 'text-text-muted')}>
                      {f.prominent && '⭐ '}{f.label}
                    </Label>
                    {f.type === 'textarea' ? (
                      <Textarea
                        value={analysis[f.key] ?? ''}
                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                        rows={f.prominent ? 4 : 2}
                        className="text-sm resize-none"
                        placeholder={`Tulis ${f.label.toLowerCase()}...`}
                      />
                    ) : (
                      <Input
                        value={analysis[f.key] ?? ''}
                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                        className="text-sm h-8"
                        placeholder={f.label}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* AI Tools placeholder */}
              <div className="mt-4 border border-dashed border-border rounded-xl p-3">
                <p className="text-xs text-text-muted mb-2 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Tools
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Auto-Analisis dari Link', 'Rangkum Pelajaran'].map((t) => (
                    <button key={t} disabled className="px-2.5 py-1 text-xs rounded-md bg-subtle text-text-muted cursor-not-allowed border border-dashed border-border">
                      🤖 {t} <span className="text-[10px]">(soon)</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button variant="secondary" className="w-full mt-4 gap-2 text-sm" onClick={handleConvertToIdea}>
                <Lightbulb className="w-4 h-4 text-amber-500" /> Convert ke Idea
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
