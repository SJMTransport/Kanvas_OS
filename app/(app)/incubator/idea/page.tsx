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
import { Search, Plus, Lightbulb, Layers, X, Trash2, LayoutGrid, List } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
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

  function handleConvertToContent(card: IdeaCardType) {
    setConvertCard(card)
    setAddVideoOpen(true)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title header — consistent across the app */}
      <div className="bg-white border-b border-border px-4 sm:px-6 pt-4 pb-3">
        <PageHeader title="Ide" subtitle="Tangkap & kembangkan ide konten" className="mb-0" />
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-border px-4 py-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <Input
            placeholder="Cari idea..."
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

        <Select value={boardFilter} onValueChange={setBoardFilter}>
          <SelectTrigger className="h-8 text-sm w-32"><SelectValue placeholder="Board" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Board</SelectItem>
            {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-sm w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {['raw', 'developing', 'ready', 'converted', 'archived'].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {allTags.length > 0 && (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="h-8 text-sm w-32"><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tag</SelectItem>
              {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button onClick={() => changeView('grid')} className={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => changeView('list')} className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle')}>
            <List className="w-4 h-4" />
          </button>
        </div>

        <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setNewBoardOpen(true)}>
          <Layers className="w-3.5 h-3.5" /> Board
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Boards strip */}
        {boards.length > 0 && boardFilter === 'all' && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {boards.map((b) => {
              const count = cards.filter((c) => (c.board_ids ?? []).includes(b.id)).length
              return (
                <div
                  key={b.id}
                  className="group flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-lg text-sm hover:border-accent transition-colors"
                >
                  <button onClick={() => setBoardFilter(b.id)} className="flex items-center gap-1.5 hover:text-accent">
                    <span>📌</span>
                    <span>{b.name}</span>
                    <span className="text-xs text-text-muted">{count}</span>
                  </button>
                  <button
                    onClick={() => setDeleteBoardTarget(b)}
                    className="text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus board"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {isLoading ? (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-36 rounded-xl mb-3 break-inside-avoid" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Lightbulb className="w-12 h-12 text-amber-300 mx-auto mb-3" />
            <p className="text-text-muted font-medium">Belum ada ide</p>
            <p className="text-sm text-text-muted mt-1">Gunakan tombol 💡 di pojok kanan bawah untuk capture ide</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white border border-border rounded-xl divide-y divide-border overflow-hidden">
            {filtered.map((card) => (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface cursor-pointer transition-colors group/row"
              >
                <div className="w-1 h-8 rounded-full shrink-0" style={{ background: STATUS_ACCENT[card.status] ?? '#9AA3AF' }} />
                <span className="text-lg shrink-0">{CARD_ICONS[card.type] ?? '📎'}</span>
                <p className="flex-1 min-w-0 font-medium text-sm text-text-primary truncate">{card.title || 'Tanpa judul'}</p>
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {(card.tags ?? []).slice(0, 3).map((t) => (
                    <TagChip key={t} name={t} color={tagColor(workspaceTags, t)} />
                  ))}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-subtle text-text-secondary shrink-0">
                  {card.status}
                </span>
                <span className="text-[10px] text-text-muted shrink-0 hidden sm:inline">
                  {formatDistanceToNow(new Date(card.created_at), { locale: localeId, addSuffix: true })}
                </span>
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
                  className="p-1 text-text-muted hover:text-error rounded hover:bg-subtle shrink-0 transition-colors opacity-0 group-hover/row:opacity-100"
                  title="Hapus Ide"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Masonry breakpointCols={BREAKPOINTS} className="flex gap-3 -ml-3 w-auto" columnClassName="pl-3">
            {filtered.map((card) => (
              <IdeaCard key={card.id} card={card} onClick={handleCardClick} />
            ))}
          </Masonry>
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
    </div>
  )
}
