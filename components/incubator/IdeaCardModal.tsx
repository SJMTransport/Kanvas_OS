'use client'

import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, ExternalLink, Sparkles, Video, Play } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { EmbedModal } from './EmbedModal'
import type { IdeaCard, IdeaBoard } from '@/lib/types/incubator'

interface Props {
  card: IdeaCard | null
  boards: IdeaBoard[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onConvertToContent?: (card: IdeaCard) => void
  workspaceId: string | null
}

export function IdeaCardModal({ card, boards, open, onOpenChange, onConvertToContent, workspaceId }: Props) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState('raw')
  const [priority, setPriority] = useState('medium')
  const [deadline, setDeadline] = useState('')
  const [boardIds, setBoardIds] = useState<string[]>([])
  const [embedOpen, setEmbedOpen] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (card) {
      setBody(card.body ?? '')
      setTitle(card.title ?? '')
      setTags(card.tags ?? [])
      setStatus(card.status)
      setPriority(card.priority)
      setDeadline(card.deadline ?? '')
      setBoardIds(card.board_ids ?? [])
    }
  }, [card])

  async function save(patch: Partial<IdeaCard>) {
    if (!card) return
    const supabase = createClient()
    const { error } = await supabase.from('idea_cards').update(patch).eq('id', card.id)
    if (error) toast.error(error.message)
    else queryClient.invalidateQueries({ queryKey: ['idea-cards', workspaceId] })
  }

  function scheduleAutoSave(patch: Partial<IdeaCard>) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => save(patch), 600)
  }

  function handleBodyChange(v: string) {
    setBody(v)
    scheduleAutoSave({ body: v })
  }

  function handleTitleChange(v: string) {
    setTitle(v)
    scheduleAutoSave({ title: v })
  }

  function handleStatusChange(v: string) {
    setStatus(v)
    save({ status: v as IdeaCard['status'] })
  }

  function handlePriorityChange(v: string) {
    setPriority(v)
    save({ priority: v as IdeaCard['priority'] })
  }

  function handleDeadlineBlur() {
    save({ deadline: deadline || null })
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) return
    const next = [...tags, t]
    setTags(next)
    setTagInput('')
    save({ tags: next })
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t)
    setTags(next)
    save({ tags: next })
  }

  function toggleBoard(id: string) {
    const next = boardIds.includes(id) ? boardIds.filter((x) => x !== id) : [...boardIds, id]
    setBoardIds(next)
    save({ board_ids: next })
  }

  if (!card) return null
  const meta = card.link_meta
  const isEmbeddable = meta?.embed_url && !meta?.open_new_tab

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-border px-4 py-3 flex items-center justify-between z-10">
            <p className="text-xs text-text-muted capitalize">{card.type} card</p>
            <div className="flex items-center gap-2">
              {onConvertToContent && (
                <Button size="sm" variant="secondary" className="gap-1.5 text-xs h-7" onClick={() => { onOpenChange(false); onConvertToContent(card) }}>
                  <Video className="w-3.5 h-3.5" /> Jadikan Konten
                </Button>
              )}
              <button onClick={() => onOpenChange(false)} className="text-text-muted hover:text-text-primary p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Title */}
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Judul (opsional)..."
              className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-b-accent"
            />

            {/* Link preview / embed */}
            {card.type === 'link' && card.link_url && (
              <div className="rounded-xl overflow-hidden border border-border">
                {meta?.image && (
                  <div className="relative">
                    <img src={meta.image} alt="" className="w-full max-h-56 object-cover" />
                    {(isEmbeddable || card.link_url) && (
                      <button
                        onClick={() => isEmbeddable ? setEmbedOpen(true) : window.open(card.link_url!, '_blank')}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="w-5 h-5 text-gray-800 ml-0.5" />
                        </div>
                      </button>
                    )}
                  </div>
                )}
                <div className="p-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium line-clamp-2">{meta?.title ?? card.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{new URL(card.link_url).hostname}</p>
                  </div>
                  <a href={card.link_url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent shrink-0 mt-0.5">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Image grid */}
            {card.type === 'image' && card.image_urls && card.image_urls.length > 0 && (
              <div className={cn('grid gap-1 rounded-xl overflow-hidden', card.image_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                {card.image_urls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full object-cover max-h-64" />
                ))}
              </div>
            )}

            {/* Scratch / Notes */}
            <div>
              <Label className="text-xs text-text-muted mb-1.5 block">Catatan / Script</Label>
              <Textarea
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="Tulis apa saja — script, analisis, inspirasi..."
                rows={5}
                className="text-sm resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs text-text-muted mb-1.5 block">Tags</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-subtle text-text-secondary text-xs rounded-full">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-error leading-none">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="+ Tambah tag"
                  className="h-7 text-xs"
                />
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={addTag}>Tambah</Button>
              </div>
            </div>

            {/* Board */}
            {boards.length > 0 && (
              <div>
                <Label className="text-xs text-text-muted mb-1.5 block">Board</Label>
                <div className="flex flex-wrap gap-1.5">
                  {boards.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => toggleBoard(b.id)}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-full border transition-colors',
                        boardIds.includes(b.id)
                          ? 'bg-accent text-white border-accent'
                          : 'border-border text-text-secondary hover:bg-subtle'
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status / Priority / Deadline */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-text-muted mb-1 block">Status</Label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['raw', 'developing', 'ready', 'converted', 'archived'].map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-text-muted mb-1 block">Prioritas</Label>
                <Select value={priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low', 'medium', 'high'].map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-text-muted mb-1 block">Deadline</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  onBlur={handleDeadlineBlur}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* AI Tools placeholder */}
            <div className="border border-dashed border-border rounded-xl p-3">
              <p className="text-xs text-text-muted mb-2 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Tools
              </p>
              <div className="flex flex-wrap gap-2">
                {['Generate Hook', 'Caption', 'Expand Idea'].map((t) => (
                  <button key={t} disabled className="px-2.5 py-1 text-xs rounded-md bg-subtle text-text-muted cursor-not-allowed border border-dashed border-border">
                    🤖 {t} <span className="text-[10px]">(soon)</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {card.link_url && (
        <EmbedModal
          open={embedOpen}
          onOpenChange={setEmbedOpen}
          embedUrl={meta?.embed_url ?? null}
          title={meta?.title ?? card.title}
          sourceUrl={card.link_url}
        />
      )}
    </>
  )
}
