'use client'

import { useState } from 'react'
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
import { Search, Plus, Lightbulb, Layers, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { IdeaCard as IdeaCardType, IdeaBoard } from '@/lib/types/incubator'
import { AddVideoSheet } from '@/app/(app)/content/add-video-sheet'

const BREAKPOINTS = { default: 4, 1280: 3, 1024: 3, 768: 2, 640: 2, 0: 1 }

export default function IdeaPage() {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
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
                <button
                  key={b.id}
                  onClick={() => setBoardFilter(b.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-lg text-sm hover:border-accent hover:text-accent transition-colors"
                >
                  <span>📌</span>
                  <span>{b.name}</span>
                  <span className="text-xs text-text-muted">{count}</span>
                </button>
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

      <AddVideoSheet
        open={addVideoOpen}
        onOpenChange={(v) => { setAddVideoOpen(v); if (!v) setConvertCard(null) }}
        defaultValues={convertCard ? { judul: convertCard.title ?? '', caption_default: convertCard.body ?? '' } : undefined}
      />
    </div>
  )
}
