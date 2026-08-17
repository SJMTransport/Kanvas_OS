'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import Masonry from 'react-masonry-css'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { IdeaCard } from '@/components/incubator/IdeaCard'
import { IdeaCardModal } from '@/components/incubator/IdeaCardModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { LayoutGrid, List, Layers, Trash2, Plus, Lightbulb, Pin } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/page-header'
import { PageToolbar, SearchInput } from '@/components/layout/page-toolbar'
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs'
import { WorkspaceTableRow, WorkspaceTableCell, WorkspaceTableHeaderCell } from '@/components/ui/table-row'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { TagChip, tagColor, useWorkspaceTags } from '@/components/incubator/TagChip'
import { STATUS_ACCENT } from '@/components/incubator/IdeaCard'
import type { IdeaCard as IdeaCardType, IdeaBoard } from '@/lib/types/incubator'
import { AddVideoSheet } from '@/app/(app)/content/add-video-sheet'

const BREAKPOINTS = { default: 4, 1280: 3, 1024: 3, 768: 2, 640: 2, 0: 1 }
const CARD_ICONS: Record<string, string> = { scratch: '✍️', link: '🔗', image: '🖼️', audio: '🎵', combo: '📎' }
type ViewMode = 'grid' | 'list'

export default function IdeaPage() {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [boardFilter, setBoardFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [selectedCard, setSelectedCard] = useState<IdeaCardType | null>(null)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [addVideoOpen, setAddVideoOpen] = useState(false)
  const [convertCard, setConvertCard] = useState<IdeaCardType | null>(null)
  const [newBoardOpen, setNewBoardOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<IdeaBoard | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const { data: workspaceTags } = useWorkspaceTags(workspaceId)

  useEffect(() => {
    if (workspaceId) {
      const saved = localStorage.getItem(`view-incubator-${workspaceId}`)
      if (saved === 'grid' || saved === 'list') setViewMode(saved)
    }
  }, [workspaceId])

  function changeView(v: ViewMode) {
    setViewMode(v)
    if (workspaceId) localStorage.setItem(`view-incubator-${workspaceId}`, v)
  }

  const { data: cards = [], isLoading } = useQuery<IdeaCardType[]>({
    queryKey: ['idea-cards', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('idea_cards')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
      return (data ?? []) as IdeaCardType[]
    },
    enabled: !!workspaceId,
  })

  const { data: boards = [] } = useQuery<IdeaBoard[]>({
    queryKey: ['idea-boards', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('idea_boards')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('sort_order')
      return (data ?? []) as IdeaBoard[]
    },
    enabled: !!workspaceId,
  })

  const createBoard = useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('idea_boards').insert({ workspace_id: workspaceId, name })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idea-boards', workspaceId] })
      setNewBoardName('')
      setNewBoardOpen(false)
      toast.success('Board dibuat!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteBoard = useMutation({
    mutationFn: async (board: IdeaBoard) => {
      const supabase = createClient()
      const { data: affectedCards } = await supabase
        .from('idea_cards')
        .select('id, board_ids')
        .contains('board_ids', [board.id])
      for (const card of affectedCards || []) {
        const newBoardIds = (card.board_ids ?? []).filter((id: string) => id !== board.id)
        await supabase.from('idea_cards').update({ board_ids: newBoardIds }).eq('id', card.id)
      }
      const { error } = await supabase.from('idea_boards').delete().eq('id', board.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idea-boards', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['idea-cards', workspaceId] })
      setDeleteBoardTarget(null)
      setBoardFilter('all')
      toast.success('Board dihapus. Semua card dipindah ke Umum.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Collect all unique tags from cards
  const allTags = Array.from(new Set(cards.flatMap((c) => c.tags ?? []))).sort()

  // Filter
  const filtered = cards.filter((c) => {
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase()) && !c.body?.toLowerCase().includes(search.toLowerCase())) return false
    if (boardFilter !== 'all' && !(c.board_ids ?? []).includes(boardFilter)) return false
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (tagFilter !== 'all' && !(c.tags ?? []).includes(tagFilter)) return false
    return true
  })

  // Open modal directly if ?card=<id> is present (e.g. from Quick Capture "Simpan & Buka")
  useEffect(() => {
    const cardId = searchParams.get('card')
    if (cardId && cards.length > 0) {
      const target = cards.find((c) => c.id === cardId)
      if (target) {
        setSelectedCard(target)
        setCardModalOpen(true)
        router.replace('/incubator/idea')
      }
    }
  }, [searchParams, cards])

  function handleCardClick(card: IdeaCardType) {
    setSelectedCard(card)
    setCardModalOpen(true)
  }

  async function handleConvertToContent(card: IdeaCardType) {
    if (!workspaceId) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Calculate next sort order
      const { data: minRow } = await supabase
        .from('videos')
        .select('sort_order')
        .eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single()
      const nextSortOrder = ((minRow?.sort_order ?? 0) as number) - 1

      // Insert video record preserving title, link, body; format left null
      const { data: newVideo, error: vidErr } = await supabase
        .from('videos')
        .insert({
          workspace_id: workspaceId,
          created_by: user?.id ?? null,
          judul: card.title || 'Ide Konten',
          status: 'ide',
          format: null,
          sort_order: nextSortOrder,
          google_drive_link: card.link_url || null,
          caption_default: card.body || null,
        } as any)
        .select('id')
        .single()

      if (vidErr) throw vidErr

      // Update idea_cards status to converted
      await supabase
        .from('idea_cards')
        .update({ status: 'converted', converted_video_id: newVideo.id })
        .eq('id', card.id)

      toast.success('Ide berhasil dikembangkan ke Konten!')
      queryClient.invalidateQueries({ queryKey: ['idea-cards', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['videos'] })

      setCardModalOpen(false)

      // Instantly open Content Detail page for progressive disclosure
      router.push(`/content/${newVideo.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengonversi ide')
    }
  }

  const viewOptions: TabOption<ViewMode>[] = [
    { value: 'list', label: 'Tabel', icon: List },
    { value: 'grid', label: 'Board', icon: LayoutGrid },
  ]

  return (
    <PageContainer className="flex flex-col h-full space-y-4">
      <PageHeader title="Ide" subtitle="Tangkap & kembangkan ide konten" className="mb-0" />

      {/* Toolbar */}
      <PageToolbar
        left={
          <div className="flex items-center gap-2 flex-wrap">
            <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari ide..." />

            <Select value={boardFilter} onValueChange={setBoardFilter}>
              <SelectTrigger className="h-10 text-sm w-36 rounded-[12px] border-[#E8EEEC] bg-white"><SelectValue placeholder="Board" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Board</SelectItem>
                {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 text-sm w-36 rounded-[12px] border-[#E8EEEC] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {['raw', 'developing', 'ready', 'converted', 'archived'].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {allTags.length > 0 && (
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="h-10 text-sm w-36 rounded-[12px] border-[#E8EEEC] bg-white"><SelectValue placeholder="Tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tag</SelectItem>
                  {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="default" className="h-9 gap-1.5 text-xs rounded-[12px]" onClick={() => setNewBoardOpen(true)}>
              <Layers className="w-3.5 h-3.5" /> Board Baru
            </Button>
            <Button size="lg" className="h-10 gap-1.5 text-sm font-semibold rounded-[12px] bg-[#4C9998] hover:bg-[#287978] text-white" onClick={() => { setSelectedCard(null); setCardModalOpen(true) }}>
              <Plus className="w-4 h-4" /> Tambah Ide
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full rounded-[12px]" />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E8EEEC] rounded-[16px] overflow-hidden shadow-subtle">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <WorkspaceTableHeaderCell>Ide</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Board / Tag</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Status</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell>Diupdate</WorkspaceTableHeaderCell>
                  <WorkspaceTableHeaderCell align="right">Aksi</WorkspaceTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <Lightbulb className="w-10 h-10 text-[#4C9998]/40 mx-auto mb-2" />
                      <p className="text-text-muted text-sm font-medium">Belum ada ide</p>
                      <p className="text-xs text-text-muted mt-1">Klik Tambah Ide untuk membuat ide baru.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((card) => (
                    <WorkspaceTableRow
                      key={card.id}
                      onClick={() => handleCardClick(card)}
                    >
                      <WorkspaceTableCell className="max-w-[320px]">
                        <div className="flex items-center gap-2.5">
                          <Lightbulb className="w-4 h-4 text-[#4C9998] shrink-0" />
                          <span className="font-semibold text-text-primary text-sm truncate">{card.title || 'Tanpa judul'}</span>
                        </div>
                      </WorkspaceTableCell>

                    <WorkspaceTableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {(card.tags ?? []).slice(0, 3).map((t) => (
                          <TagChip key={t} name={t} color={tagColor(workspaceTags, t)} />
                        ))}
                      </div>
                    </WorkspaceTableCell>

                    <WorkspaceTableCell>
                      <Badge variant="outline" className="h-6 rounded-full px-2.5 text-xs font-medium bg-teal-50 text-teal-700 border-teal-200">
                        {card.status}
                      </Badge>
                    </WorkspaceTableCell>

                    <WorkspaceTableCell className="text-text-secondary text-xs">
                      {formatDistanceToNow(new Date(card.created_at), { locale: localeId, addSuffix: true })}
                    </WorkspaceTableCell>

                    <WorkspaceTableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!confirm('Apakah Anda yakin ingin menghapus ide ini?')) return
                          const supabase = createClient()
                          const { error } = await supabase.from('idea_cards').delete().eq('id', card.id)
                          if (error) {
                            toast.error('Gagal menghapus ide: ' + error.message)
                          } else {
                            toast.success('Ide berhasil dihapus')
                            queryClient.invalidateQueries({ queryKey: ['idea-cards', workspaceId] })
                          }
                        }}
                        className="p-1 text-text-muted hover:text-error rounded-[8px] hover:bg-subtle transition-colors"
                        title="Hapus Ide"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </WorkspaceTableCell>
                    </WorkspaceTableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <IdeaCardModal
        card={selectedCard}
        boards={boards}
        open={cardModalOpen}
        onOpenChange={setCardModalOpen}
        onConvertToContent={handleConvertToContent}
        workspaceId={workspaceId}
      />

      {/* New Board dialog */}
      <Dialog open={newBoardOpen} onOpenChange={setNewBoardOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Buat Board Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-text-muted">Nama Board</Label>
              <Input
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createBoard.mutate(newBoardName) }}
                placeholder="Contoh: Script Ideas..."
                autoFocus
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => createBoard.mutate(newBoardName)}
              disabled={!newBoardName.trim() || createBoard.isPending}
              className="w-full"
            >
              {createBoard.isPending ? 'Membuat...' : 'Buat Board'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete board confirmation */}
      <Dialog open={!!deleteBoardTarget} onOpenChange={(v) => { if (!v) setDeleteBoardTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus board &quot;{deleteBoardTarget?.name}&quot;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            {cards.filter((c) => (c.board_ids ?? []).includes(deleteBoardTarget?.id ?? '')).length} card akan dipindahkan ke Umum, tidak ada yang hilang.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setDeleteBoardTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => deleteBoardTarget && deleteBoard.mutate(deleteBoardTarget)}
              disabled={deleteBoard.isPending}
            >
              {deleteBoard.isPending ? 'Menghapus...' : 'Hapus Board'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddVideoSheet
        open={addVideoOpen}
        onOpenChange={(v) => { setAddVideoOpen(v); if (!v) setConvertCard(null) }}
        defaultValues={convertCard ? { judul: convertCard.title ?? '', caption_default: convertCard.body ?? '' } : undefined}
      />
    </PageContainer>
  )
}
