'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { CreatorCard } from '@/components/incubator/CreatorCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Users, X, Star } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import type { CreatorProfile } from '@/lib/types/incubator'

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook', 'pinterest', 'twitter', 'threads']

export default function CreatorPage() {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [analysisFilter, setAnalysisFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rating, setRating] = useState(3)
  const [form, setForm] = useState({
    username: '', display_name: '', platform: 'tiktok', profile_url: '',
    niche: '', followers_count: '', why_saved: '',
  })

  const { data: creators = [], isLoading } = useQuery<(CreatorProfile & { saved_content_count: number })[]>({
    queryKey: ['creators', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('creator_profiles')
        .select('*, creator_saved_content(count)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
      return (data ?? []).map((c: any) => ({
        ...c,
        saved_content_count: c.creator_saved_content?.[0]?.count ?? 0,
      }))
    },
    enabled: !!workspaceId,
  })

  const filtered = creators.filter((c) => {
    if (search && !c.username.toLowerCase().includes(search.toLowerCase()) && !c.display_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (platformFilter !== 'all' && c.platform !== platformFilter) return false
    if (analysisFilter !== 'all' && c.analysis_status !== analysisFilter) return false
    return true
  })

  async function handleAdd() {
    if (!workspaceId || !form.username.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('creator_profiles').insert({
        workspace_id: workspaceId,
        created_by: user?.id,
        username: form.username.trim().replace(/^@/, ''),
        display_name: form.display_name || null,
        platform: form.platform,
        profile_url: form.profile_url || null,
        niche: form.niche || null,
        followers_count: form.followers_count || null,
        why_saved: form.why_saved || null,
        rating,
      })
      if (error) throw error
      toast.success('Kreator ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['creators', workspaceId] })
      setAddOpen(false)
      setForm({ username: '', display_name: '', platform: 'tiktok', profile_url: '', niche: '', followers_count: '', why_saved: '' })
      setRating(3)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title header — consistent across the app */}
      <div className="bg-white border-b border-border px-4 sm:px-6 pt-4 pb-3">
        <PageHeader
          title="Creator"
          subtitle="Kreator yang kamu pelajari & referensi"
          className="mb-0"
          action={<Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" /> Tambah Kreator</Button>}
        />
      </div>

      {/* Toolbar — search & filters */}
      <div className="bg-white border-b border-border px-4 py-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <Input
            placeholder="Cari kreator..."
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

        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="h-8 text-sm w-32"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Platform</SelectItem>
            {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={analysisFilter} onValueChange={setAnalysisFilter}>
          <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="Status Analisis" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Belum dianalisis</SelectItem>
            <SelectItem value="in_progress">Sedang dipelajari</SelectItem>
            <SelectItem value="done">Selesai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 text-border mx-auto mb-3" />
            <p className="text-text-muted font-medium">Belum ada kreator tersimpan</p>
            <p className="text-sm text-text-muted mt-1">Simpan kreator inspiratif untuk dipelajari</p>
            <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Kreator
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <CreatorCard key={c.id} creator={c} onClick={(cr) => router.push(`/incubator/creator/${cr.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Add creator sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Tambah Kreator</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">Username / Handle *</Label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="@namakreator" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">Nama Tampil</Label>
              <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">Platform *</Label>
              <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">URL Profil</Label>
              <Input value={form.profile_url} onChange={(e) => setForm((f) => ({ ...f, profile_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-text-muted">Niche</Label>
                <Input value={form.niche} onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))} placeholder="Edukasi, Lifestyle..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-text-muted">Followers</Label>
                <Input value={form.followers_count} onChange={(e) => setForm((f) => ({ ...f, followers_count: e.target.value }))} placeholder="2.3M" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">Rating</Label>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} onClick={() => setRating(i + 1)} className="p-0.5">
                    <Star className={i < rating ? 'fill-amber-400 text-amber-400 w-5 h-5' : 'text-border w-5 h-5'} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">Kenapa Disimpan</Label>
              <Textarea value={form.why_saved} onChange={(e) => setForm((f) => ({ ...f, why_saved: e.target.value }))} placeholder="Hook-nya selalu kuat..." rows={3} />
            </div>
            <Button onClick={handleAdd} disabled={saving || !form.username.trim()} className="w-full">
              {saving ? 'Menyimpan...' : 'Simpan Kreator'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
