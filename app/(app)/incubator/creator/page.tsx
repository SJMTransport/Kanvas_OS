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
import { PageContainer, PageHeader } from '@/components/layout/page-header'
import { PageToolbar, SearchInput } from '@/components/layout/page-toolbar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { WorkspaceTableRow, WorkspaceTableCell, WorkspaceTableHeaderCell } from '@/components/ui/table-row'
import type { CreatorProfile } from '@/lib/types/incubator'
import { cn } from '@/lib/utils'

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
    <PageContainer className="flex flex-col h-full space-y-4">
      <PageHeader
        title="Creator"
        subtitle="Kreator yang kamu pelajari & referensi"
        className="mb-0"
      />

      {/* Toolbar — search & filters */}
      <PageToolbar
        left={
          <div className="flex items-center gap-2 flex-wrap">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kreator..."
            />

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-10 text-sm w-36 rounded-[12px] border-border bg-white"><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Platform</SelectItem>
                {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={analysisFilter} onValueChange={setAnalysisFilter}>
              <SelectTrigger className="h-10 text-sm w-36 rounded-[12px] border-border bg-white"><SelectValue placeholder="Status Analisis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Belum dianalisis</SelectItem>
                <SelectItem value="in_progress">Sedang dipelajari</SelectItem>
                <SelectItem value="done">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        right={
          <Button size="lg" className="h-10 gap-1.5 text-sm font-semibold rounded-[12px] bg-[#4C9998] hover:bg-[#287978] text-white" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Tambah Kreator
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full rounded-[12px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[16px] border border-[#E8EEEC]">
            <Users className="w-12 h-12 text-[#4C9998]/40 mx-auto mb-3" />
            <p className="text-text-muted font-medium">Belum ada kreator tersimpan</p>
            <p className="text-xs text-text-muted mt-1">Simpan kreator inspiratif untuk dipelajari.</p>
            <Button size="lg" className="mt-4 rounded-[12px] bg-[#4C9998] text-white" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Tambah Kreator
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-[#E8EEEC] rounded-[16px] overflow-hidden shadow-subtle">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <WorkspaceTableHeaderCell>Creator</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Platform</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Followers</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Rating</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Status Analisis</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Konten</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell align="right">Aksi</WorkspaceTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <WorkspaceTableRow
                    key={c.id}
                    onClick={() => router.push(`/incubator/creator/${c.id}`)}
                  >
                    <WorkspaceTableCell className="max-w-[260px]">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={c.avatar_url ?? ''} />
                          <AvatarFallback className="bg-teal-50 text-[#287978] text-xs font-semibold">
                            {c.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary text-sm truncate">@{c.username}</p>
                          {c.display_name && (
                            <p className="text-[11px] text-text-muted truncate">{c.display_name}</p>
                          )}
                        </div>
                      </div>
                    </WorkspaceTableCell>

                    <WorkspaceTableCell>
                      <Badge variant="outline" className="h-6 rounded-full px-2.5 text-xs font-medium capitalize bg-teal-50 text-teal-700 border-teal-200">
                        {c.platform}
                      </Badge>
                    </WorkspaceTableCell>

                    <WorkspaceTableCell className="text-xs text-text-secondary">
                      {c.followers_count || '—'}
                    </WorkspaceTableCell>

                    <WorkspaceTableCell>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn('w-3.5 h-3.5', i < c.rating ? 'fill-amber-400 text-amber-400' : 'text-border')} />
                        ))}
                      </div>
                    </WorkspaceTableCell>

                    <WorkspaceTableCell>
                      <Badge variant="outline" className="h-6 rounded-full px-2.5 text-xs font-medium">
                        {c.analysis_status === 'done' ? 'Selesai' : c.analysis_status === 'in_progress' ? 'Sedang dipelajari' : 'Belum dianalisis'}
                      </Badge>
                    </WorkspaceTableCell>

                    <WorkspaceTableCell className="text-xs text-text-secondary">
                      {c.saved_content_count} konten
                    </WorkspaceTableCell>

                    <WorkspaceTableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs rounded-[8px]" onClick={() => router.push(`/incubator/creator/${c.id}`)}>
                        Detail
                      </Button>
                    </WorkspaceTableCell>
                  </WorkspaceTableRow>
                ))}
              </tbody>
            </table>
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
    </PageContainer>
  )
}
