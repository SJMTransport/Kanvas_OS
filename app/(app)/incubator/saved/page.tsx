'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, X, Play, Bookmark, Plus, Loader2, Trash2, Hash, Tv2, List, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/page-header'
import { PageToolbar, SearchInput } from '@/components/layout/page-toolbar'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter', 'threads', 'pinterest']

interface SavedContentRow {
  id: string
  creator_id: string | null
  url: string
  title: string | null
  thumbnail_url: string | null
  platform: string | null
  view_count: number | null
  analysis: Record<string, string> | null
  notes: string | null
  hashtags: string[] | null
  creator_username: string | null
  creator_platform: string | null
  created_at: string
  creator_profiles: { id: string; username: string; platform: string; avatar_url: string | null } | null
}

export default function SavedContentPage() {
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [creatorFilter, setCreatorFilter] = useState<string | null>(searchParams.get('creator'))
  const [platformFilter, setPlatformFilter] = useState<string | null>(null)
  const [analysisFilter, setAnalysisFilter] = useState<'all' | 'analyzed' | 'not_analyzed'>('all')

  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null)
  const [feedMode, setFeedMode] = useState(false)
  const [feedIndex, setFeedIndex] = useState(0)

  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [addCreatorMode, setAddCreatorMode] = useState<'existing' | 'manual'>('manual')
  const [addCreatorId, setAddCreatorId] = useState('')
  const [addNewUsername, setAddNewUsername] = useState('')
  const [addNewPlatform, setAddNewPlatform] = useState('tiktok')
  const [addHashtags, setAddHashtags] = useState('')
  const [addSelectedTags, setAddSelectedTags] = useState<string[]>([])

  function toggleAddSuggestedTag(tag: string) {
    setAddSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const { data: creators = [] } = useQuery<{ id: string; username: string; platform: string }[]>({
    queryKey: ['creators-list', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('creator_profiles')
        .select('id, username, platform')
        .eq('workspace_id', workspaceId)
        .order('username')
      return (data ?? []) as { id: string; username: string; platform: string }[]
    },
    enabled: !!workspaceId,
  })

  const { data: items = [], isLoading } = useQuery<SavedContentRow[]>({
    queryKey: ['all-saved-content', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      // Fetch content with linked creators (inner join) + standalone content (no creator)
      const { data: linked } = await supabase
        .from('creator_saved_content')
        .select('*, creator_profiles!inner(id, username, platform, avatar_url)')
        .eq('creator_profiles.workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      const { data: standalone } = await supabase
        .from('creator_saved_content')
        .select('*')
        .is('creator_id', null)
        .order('created_at', { ascending: false })

      const all = [
        ...((linked ?? []) as unknown as SavedContentRow[]),
        ...((standalone ?? []).map((s: any) => ({ ...s, creator_profiles: null })) as SavedContentRow[]),
      ]
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      return all
    },
    enabled: !!workspaceId,
  })

  const allHashtags = [...new Set(items.flatMap((i) => i.hashtags ?? []))].sort()
  const itemCreator = (item: SavedContentRow) => item.creator_profiles?.username ?? item.creator_username ?? null
  const allCreators = [...new Set(items.map(itemCreator).filter(Boolean) as string[])].sort()

  const filtered = items.filter((item) => {
    if (creatorFilter && itemCreator(item) !== creatorFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const hook = item.analysis?.hook ?? ''
      const title = item.title ?? ''
      const creator = item.creator_profiles?.username ?? item.creator_username ?? ''
      if (!hook.toLowerCase().includes(q) && !title.toLowerCase().includes(q) && !creator.toLowerCase().includes(q)) return false
    }
    if (platformFilter && item.platform !== platformFilter) return false
    if (hashtagFilter && !(item.hashtags ?? []).includes(hashtagFilter)) return false
    if (analysisFilter === 'analyzed') {
      const a = item.analysis
      if (!a || !Object.values(a).some((v) => v && v.trim())) return false
    }
    if (analysisFilter === 'not_analyzed') {
      const a = item.analysis
      if (a && Object.values(a).some((v) => v && v.trim())) return false
    }
    return true
  })

  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({})

  function getEmbedUrl(item: SavedContentRow, isActive: boolean): string | null {
    const meta = item as any
    let base = meta.link_meta?.embed_url ?? null
    if (!base) {
      try {
        const u = new URL(item.url)
        if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
          const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v')
          if (id) base = `https://www.youtube.com/embed/${id}`
        } else if (u.hostname.includes('tiktok.com')) {
          const m = u.pathname.match(/\/(?:video|photo)\/(\d+)/)
          if (m) base = `https://www.tiktok.com/embed/v2/${m[1]}`
        } else if (u.hostname.includes('instagram.com')) {
          const m = u.pathname.match(/\/(p|reel|reels)\/([^/?&#]+)/)
          if (m) base = `https://www.instagram.com/${m[1]}/${m[2]}/embed`
        }
      } catch { /* ignore */ }
    }
    if (!base) return null
    if (base.includes('youtube.com/embed')) {
      // Always include enablejsapi so we can postMessage play/pause without reload
      const sep = base.includes('?') ? '&' : '?'
      return base + sep + 'enablejsapi=1' + (isActive ? '&autoplay=1' : '')
    }
    if (base.includes('tiktok.com/embed')) {
      if (!isActive) return base
      const sep = base.includes('?') ? '&' : '?'
      return base + sep + 'autoplay=1&mute=0&music_info=1&description=1'
    }
    return base
  }

  // When feedIndex changes: pause all YouTube iframes via postMessage, play current
  useEffect(() => {
    if (!feedMode) return
    filtered.forEach((item, idx) => {
      const iframe = iframeRefs.current[item.id]
      if (!iframe?.contentWindow) return
      const embedUrl = getEmbedUrl(item, false)
      if (!embedUrl?.includes('youtube.com/embed')) return
      if (idx === feedIndex) {
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
      } else {
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedIndex, feedMode])

  const feedItem = filtered[feedIndex] ?? null

  function feedNav(dir: 1 | -1) {
    setFeedIndex((i) => Math.max(0, Math.min(filtered.length - 1, i + dir)))
  }

  function enterFeed(startIndex = 0) {
    setFeedIndex(startIndex)
    setFeedMode(true)
  }

  useEffect(() => {
    if (!feedMode) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); feedNav(1) }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); feedNav(-1) }
      if (e.key === 'Escape') setFeedMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feedMode, filtered.length])

  function openContent(item: SavedContentRow) {
    if (item.creator_id) {
      router.push(`/incubator/creator/${item.creator_id}/content/${item.id}`)
    } else {
      router.push(`/incubator/saved/${item.id}`)
    }
  }

  function getCreatorLabel(item: SavedContentRow): string {
    if (item.creator_profiles) return `@${item.creator_profiles.username}`
    if (item.creator_username) return `@${item.creator_username}`
    return ''
  }

  async function handleDelete(e: React.MouseEvent, item: SavedContentRow) {
    e.stopPropagation()
    const label = item.title || item.url
    if (!confirm(`Hapus "${label}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('creator_saved_content').delete().eq('id', item.id)
    if (error) { toast.error('Gagal menghapus: ' + error.message); return }
    toast.success('Konten dihapus')
    queryClient.invalidateQueries({ queryKey: ['all-saved-content', workspaceId] })
  }

  async function handleAddContent() {
    if (!addUrl.trim()) return
    setAdding(true)
    try {
      const supabase = createClient()

      let meta = null
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(addUrl)}`)
        if (res.ok) meta = await res.json()
      } catch { /* ignore */ }

      const payload: Record<string, unknown> = {
        url: addUrl,
        title: meta?.title ?? null,
        thumbnail_url: meta?.image ?? null,
        link_meta: meta,
        notes: addNotes || null,
        hashtags: [
          ...addSelectedTags,
          ...(addHashtags.trim() ? addHashtags.split(/[\s,]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean) : []),
        ].filter((t, i, arr) => t && arr.indexOf(t) === i),
      }

      if (addCreatorMode === 'existing' && addCreatorId) {
        payload.creator_id = addCreatorId
      } else if (addCreatorMode === 'manual' && addNewUsername.trim()) {
        payload.creator_username = addNewUsername.trim().replace(/^@/, '')
        payload.creator_platform = addNewPlatform
      }

      const { error } = await supabase.from('creator_saved_content').insert(payload as any)
      if (error) throw new Error(error.message)

      toast.success('Konten disimpan!')
      queryClient.invalidateQueries({ queryKey: ['all-saved-content', workspaceId] })
      setAddUrl('')
      setAddNotes('')
      setAddCreatorId('')
      setAddNewUsername('')
      setAddHashtags('')
      setAddSelectedTags([])
      setAddOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setAdding(false)
    }
  }

  function aspectCount(item: SavedContentRow): number {
    if (!item.analysis) return 0
    const keys = ['ide', 'angle', 'hook', 'flow', 'highlight', 'emotion', 'takeaway', 'learnings']
    return keys.filter((k) => item.analysis?.[k]?.trim()).length
  }

  return (
    <PageContainer className="h-full flex flex-col space-y-4">
      <PageHeader title="Referensi" subtitle="Konten disimpan untuk inspirasi & bahan bedah" className="mb-0" />

      {/* Toolbar */}
      <div className="bg-white border-b border-border px-4 py-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <Input
            placeholder="Cari hook, judul, creator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {allCreators.length > 0 && (
          <Select value={creatorFilter ?? 'all'} onValueChange={(v) => setCreatorFilter(v === 'all' ? null : v)}>
            <SelectTrigger className="h-8 text-sm w-40">
              <SelectValue placeholder="Creator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Creator</SelectItem>
              {allCreators.map((c) => (
                <SelectItem key={c} value={c}>@{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={platformFilter ?? 'all'} onValueChange={(v) => setPlatformFilter(v === 'all' ? null : v)}>
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Platform</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={analysisFilter} onValueChange={(v) => setAnalysisFilter(v as typeof analysisFilter)}>
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="analyzed">Sudah Dibedah</SelectItem>
            <SelectItem value="not_analyzed">Belum Dibedah</SelectItem>
          </SelectContent>
        </Select>

        <Select value={hashtagFilter ?? 'all'} onValueChange={(v) => setHashtagFilter(v === 'all' ? null : v)}>
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder="Hashtag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Hashtag</SelectItem>
            {allHashtags.map((h) => (
              <SelectItem key={h} value={h}>#{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <span className="text-xs text-text-muted">{filtered.length} konten</span>
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setFeedMode(false)}
            className={cn('p-1.5 transition-colors', !feedMode ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle')}
            title="Tampilan List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => enterFeed(0)}
            disabled={filtered.length === 0}
            className={cn('p-1.5 transition-colors', feedMode ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle disabled:opacity-40')}
            title="Tampilan Feed"
          >
            <Tv2 className="w-4 h-4" />
          </button>
        </div>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Simpan Konten
        </Button>
      </div>

      {/* Add content form */}
      {addOpen && (
        <div className="bg-white border-b border-border px-4 py-3">
          <div className="max-w-xl space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">URL Konten</Label>
              <Input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Creator</Label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setAddCreatorMode('manual')}
                  className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', addCreatorMode === 'manual' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border text-text-muted hover:bg-subtle')}
                >
                  Tulis Manual
                </button>
                {creators.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAddCreatorMode('existing')}
                    className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', addCreatorMode === 'existing' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border text-text-muted hover:bg-subtle')}
                  >
                    Dari Creator Tersimpan
                  </button>
                )}
              </div>

              {addCreatorMode === 'existing' ? (
                <Select value={addCreatorId || 'none'} onValueChange={(v) => setAddCreatorId(v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Pilih creator..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Pilih creator...</SelectItem>
                    {creators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>@{c.username} ({c.platform})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input value={addNewUsername} onChange={(e) => setAddNewUsername(e.target.value)} placeholder="@username (opsional)" className="h-8 text-sm" />
                  <Select value={addNewPlatform} onValueChange={setAddNewPlatform}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Catatan (opsional)</Label>
              <Textarea value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Catatan..." rows={2} className="text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Hashtag</Label>
              <Input value={addHashtags} onChange={(e) => setAddHashtags(e.target.value)} placeholder="#hook #storytelling #editing" className="h-8 text-sm" />
              <p className="text-[10px] text-text-muted">Pisahkan dengan spasi atau koma untuk hashtag baru</p>
              {allHashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {allHashtags.map((h) => {
                    const selected = addSelectedTags.includes(h)
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => toggleAddSuggestedTag(h)}
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors',
                          selected
                            ? 'bg-teal-500 border-teal-500 text-white'
                            : 'bg-white border-border text-text-muted hover:border-teal-300 hover:text-teal-700'
                        )}
                      >
                        #{h}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddContent} disabled={adding || !addUrl.trim()} className="h-7 text-xs bg-teal-500 hover:bg-teal-600 text-white">
                {adding ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Menyimpan...</> : 'Simpan'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddOpen(false)}>Batal</Button>
            </div>
          </div>
        </div>
      )}

      {/* Feed Mode */}
      {feedMode && feedItem && (
        <div className="flex-1 flex overflow-hidden bg-gray-950">
          {/* Left: player */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-0 p-4 gap-4">
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative" style={{ maxHeight: 'calc(100vh - 12rem)', maxWidth: 'calc((100vh - 12rem) * 9 / 16)', width: '100%' }}>
              <div className="relative w-full aspect-[9/16]">
                {/* Preload window: render prev2..next2, only show current */}
                {[-2, -1, 0, 1, 2].map((offset) => {
                  const idx = feedIndex + offset
                  const item = filtered[idx]
                  if (!item) return null
                  const isCurrent = offset === 0
                  const embedUrl = getEmbedUrl(item, isCurrent)
                  const isYT = embedUrl?.includes('youtube.com/embed')
                  const iframeKey = isYT ? item.id : isCurrent ? `${item.id}-${feedIndex}` : item.id
                  return (
                    <div key={item.id} className={cn('absolute inset-0', isCurrent ? 'z-10' : 'z-0 opacity-0 pointer-events-none')}>
                      {embedUrl ? (
                        <iframe
                          key={iframeKey}
                          ref={(el) => { iframeRefs.current[item.id] = el }}
                          src={embedUrl}
                          className="w-full h-full"
                          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                          allowFullScreen
                        />
                      ) : isCurrent ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/50">
                          <p className="text-sm">Embed tidak tersedia</p>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-teal-400 hover:underline">
                            Buka di tab baru <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Nav controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => feedNav(-1)}
                disabled={feedIndex === 0}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-white/60 text-sm tabular-nums">{feedIndex + 1} / {filtered.length}</span>
              <button
                onClick={() => feedNav(1)}
                disabled={feedIndex >= filtered.length - 1}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right: info panel */}
          <div className="w-72 shrink-0 bg-gray-900 border-l border-white/10 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <p className="text-white font-semibold text-sm line-clamp-2 leading-snug">
                {feedItem.analysis?.hook || feedItem.title || feedItem.url}
              </p>
              {(() => {
                const label = feedItem.creator_profiles ? `@${feedItem.creator_profiles.username}` : feedItem.creator_username ? `@${feedItem.creator_username}` : null
                return label ? <p className="text-white/50 text-xs mt-1">{label}</p> : null
              })()}
              <div className="flex flex-wrap gap-1 mt-2">
                {(feedItem.hashtags ?? []).map((h) => (
                  <span key={h} className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 font-medium">#{h}</span>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(['ide','angle','hook','flow','highlight','emotion','takeaway'] as const).map((key) => {
                const val = feedItem.analysis?.[key]
                if (!val?.trim()) return null
                return (
                  <div key={key}>
                    <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold mb-0.5">{key}</p>
                    <p className="text-white/80 text-xs leading-relaxed">{val}</p>
                  </div>
                )
              })}
              {feedItem.analysis?.learnings && (
                <div className="mt-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                  <p className="text-[10px] uppercase tracking-wide text-teal-400 font-semibold mb-1">Learnings</p>
                  <p className="text-white/80 text-xs leading-relaxed">{feedItem.analysis.learnings}</p>
                </div>
              )}
              {feedItem.view_count != null && feedItem.view_count > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-white/40 text-[10px]">
                    {feedItem.view_count >= 1000000 ? `${(feedItem.view_count / 1000000).toFixed(1)}M` : feedItem.view_count >= 1000 ? `${(feedItem.view_count / 1000).toFixed(1)}K` : feedItem.view_count} views
                    {feedItem.platform && ` · ${feedItem.platform}`}
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/10 flex gap-2">
              <button
                onClick={() => openContent(feedItem)}
                className="flex-1 text-xs py-1.5 rounded-md bg-teal-500 hover:bg-teal-600 text-white font-semibold transition-colors"
              >
                Buka & Edit Analisis
              </button>
              <a href={feedItem.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className={cn('flex-1 overflow-y-auto', feedMode && 'hidden')}>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Bookmark className="w-10 h-10 text-border mx-auto mb-2" />
            <p className="text-sm text-text-muted">
              {items.length === 0 ? 'Belum ada konten disimpan' : 'Tidak ada konten sesuai filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((item) => {
              const hook = item.analysis?.hook
              const filled = aspectCount(item)
              const creatorLabel = getCreatorLabel(item)
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-subtle transition-colors group"
                  onClick={() => enterFeed(filtered.indexOf(item))}
                >
                  <Play className="w-4 h-4 text-text-muted shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {hook || item.title || item.url}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {creatorLabel && <span className="text-[11px] text-text-muted">{creatorLabel}</span>}
                      {hook && item.title && (
                        <span className="text-[11px] text-text-muted truncate max-w-[200px]">{item.title}</span>
                      )}
                      {(item.hashtags ?? []).map((h) => (
                        <span key={h} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium border border-amber-200">#{h}</span>
                      ))}
                    </div>
                  </div>

                  {item.platform && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-subtle text-text-muted capitalize shrink-0">
                      {item.platform}
                    </span>
                  )}

                  {item.view_count != null && item.view_count > 0 && (
                    <span className="text-[10px] text-text-muted shrink-0">
                      {item.view_count >= 1000000
                        ? `${(item.view_count / 1000000).toFixed(1)}M`
                        : item.view_count >= 1000
                          ? `${(item.view_count / 1000).toFixed(1)}K`
                          : item.view_count} views
                    </span>
                  )}

                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium',
                    filled > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-text-muted'
                  )}>
                    {filled}/8
                  </span>

                  <span className="text-[10px] text-text-muted shrink-0">
                    {format(new Date(item.created_at), 'd MMM', { locale: localeId })}
                  </span>

                  <button
                    onClick={(e) => handleDelete(e, item)}
                    className="p-1 rounded hover:bg-red-50 text-text-muted hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
