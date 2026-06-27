'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, X, Play, Bookmark, Plus, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter', 'threads', 'pinterest']

interface SavedContentRow {
  id: string
  creator_id: string
  url: string
  title: string | null
  thumbnail_url: string | null
  platform: string | null
  view_count: number | null
  analysis: Record<string, string> | null
  notes: string | null
  created_at: string
  creator_profiles: { id: string; username: string; platform: string; avatar_url: string | null } | null
}

export default function SavedContentPage() {
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string | null>(null)
  const [analysisFilter, setAnalysisFilter] = useState<'all' | 'analyzed' | 'not_analyzed'>('all')

  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [addCreatorMode, setAddCreatorMode] = useState<'existing' | 'new'>('existing')
  const [addCreatorId, setAddCreatorId] = useState('')
  const [addNewUsername, setAddNewUsername] = useState('')
  const [addNewPlatform, setAddNewPlatform] = useState('tiktok')

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
      const { data } = await supabase
        .from('creator_saved_content')
        .select('*, creator_profiles!inner(id, username, platform, avatar_url)')
        .eq('creator_profiles.workspace_id', workspaceId)
        .order('created_at', { ascending: false })
      return (data ?? []) as unknown as SavedContentRow[]
    },
    enabled: !!workspaceId,
  })

  const filtered = items.filter((item) => {
    if (search) {
      const q = search.toLowerCase()
      const hook = item.analysis?.hook ?? ''
      const title = item.title ?? ''
      const creator = item.creator_profiles?.username ?? ''
      if (!hook.toLowerCase().includes(q) && !title.toLowerCase().includes(q) && !creator.toLowerCase().includes(q)) return false
    }
    if (platformFilter && item.platform !== platformFilter) return false
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

  function openContent(item: SavedContentRow) {
    router.push(`/incubator/creator/${item.creator_id}/content/${item.id}`)
  }

  async function handleAddContent() {
    if (!addUrl.trim() || !workspaceId) return
    setAdding(true)
    try {
      const supabase = createClient()
      let creatorId = addCreatorId

      if (addCreatorMode === 'new') {
        if (!addNewUsername.trim()) { toast.error('Username creator wajib diisi'); setAdding(false); return }
        const { data: { user } } = await supabase.auth.getUser()
        const { data: newCreator, error: cErr } = await supabase
          .from('creator_profiles')
          .insert({
            workspace_id: workspaceId,
            created_by: user?.id,
            username: addNewUsername.trim().replace(/^@/, ''),
            platform: addNewPlatform,
          })
          .select('id')
          .single()
        if (cErr) throw new Error(cErr.message)
        creatorId = newCreator.id
        queryClient.invalidateQueries({ queryKey: ['creators-list', workspaceId] })
      }

      if (!creatorId) { toast.error('Pilih atau buat creator'); setAdding(false); return }

      let meta = null
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(addUrl)}`)
        if (res.ok) meta = await res.json()
      } catch { /* ignore */ }

      const { error } = await supabase.from('creator_saved_content').insert({
        creator_id: creatorId,
        url: addUrl,
        title: meta?.title ?? null,
        thumbnail_url: meta?.image ?? null,
        link_meta: meta,
        notes: addNotes || null,
      })
      if (error) throw new Error(error.message)

      toast.success('Konten disimpan!')
      queryClient.invalidateQueries({ queryKey: ['all-saved-content', workspaceId] })
      setAddUrl('')
      setAddNotes('')
      setAddCreatorId('')
      setAddNewUsername('')
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
    <div className="h-full flex flex-col overflow-hidden">
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

        <div className="flex-1" />
        <span className="text-xs text-text-muted">{filtered.length} konten</span>
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
                  onClick={() => setAddCreatorMode('existing')}
                  className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', addCreatorMode === 'existing' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border text-text-muted hover:bg-subtle')}
                >
                  Creator Tersimpan
                </button>
                <button
                  type="button"
                  onClick={() => setAddCreatorMode('new')}
                  className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', addCreatorMode === 'new' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border text-text-muted hover:bg-subtle')}
                >
                  Creator Baru
                </button>
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
                  <Input value={addNewUsername} onChange={(e) => setAddNewUsername(e.target.value)} placeholder="@username" className="h-8 text-sm" />
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

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddContent} disabled={adding || !addUrl.trim()} className="h-7 text-xs">
                {adding ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Menyimpan...</> : 'Simpan'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddOpen(false)}>Batal</Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
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
              {items.length === 0 ? 'Belum ada konten disimpan dari creator manapun' : 'Tidak ada konten sesuai filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((item) => {
              const hook = item.analysis?.hook
              const filled = aspectCount(item)
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-subtle transition-colors"
                  onClick={() => openContent(item)}
                >
                  <Play className="w-4 h-4 text-text-muted shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {hook || item.title || item.url}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-text-muted">@{item.creator_profiles?.username}</span>
                      {hook && item.title && (
                        <span className="text-[11px] text-text-muted truncate max-w-[200px]">{item.title}</span>
                      )}
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
