'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext, closestCenter, type DragEndEvent,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { useDebouncedCallback } from 'use-debounce'
import { GripVertical, Trash2, Plus, Eye, Printer, X, Sparkles, Loader2, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export interface ScriptBlock {
  id: string
  type: string
  label: string
  content: string
  order: number
}

const DEFAULT_BLOCKS: ScriptBlock[] = [
  { id: crypto.randomUUID(), type: 'hook', label: 'Hook', content: '', order: 0 },
]

const PLACEHOLDERS: Record<string, string> = {
  hook: 'Kalimat pembuka yang menarik perhatian dalam 3 detik pertama...',
  body: 'Isi konten utama — cerita, fakta, demonstrasi...',
  cta: 'Ajakan di akhir video: subscribe, komen, share, beli...',
  insight: 'Catatan khusus untuk tim produksi dan editor...',
  on_screen: 'Teks yang muncul di layar, satu per baris...',
  narasi: 'Teks narasi / voice over...',
  transisi: 'Catatan transisi antar scene...',
  custom: 'Tulis di sini...',
}

const SECTION_PRESETS = [
  { type: 'hook', label: 'Hook' },
  { type: 'body', label: 'Body' },
  { type: 'cta', label: 'CTA' },
  { type: 'insight', label: 'Insight / Director\'s Note' },
  { type: 'on_screen', label: 'On-Screen Text' },
  { type: 'narasi', label: 'Narasi' },
  { type: 'transisi', label: 'Transisi' },
]

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

function durationText(words: number): string {
  if (words === 0) return '—'
  const sec = Math.round((words / 130) * 60)
  if (sec < 60) return `~${sec} detik`
  return `~${Math.floor(sec / 60)} menit ${sec % 60} detik`
}

interface ScriptBlocksProps {
  videoId: string
  videoTitle: string
  initialBlocks: ScriptBlock[]
  onSave: (blocks: ScriptBlock[]) => Promise<void>
}

export function ScriptBlocks({ videoId, videoTitle, initialBlocks, onSave }: ScriptBlocksProps) {
  const [blocks, setBlocks] = useState<ScriptBlock[]>(
    initialBlocks?.length > 0 ? initialBlocks : DEFAULT_BLOCKS
  )
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [fullScriptOpen, setFullScriptOpen] = useState(false)

  // AI Writer States
  const [aiWriterOpen, setAiWriterOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiPlatform, setAiPlatform] = useState('tiktok')
  const [aiTone, setAiTone] = useState('casual')
  const [aiFormat, setAiFormat] = useState('hook')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleAiGenerate() {
    if (!aiTopic.trim()) {
      toast.error('Topik ide wajib diisi')
      return
    }
    setAiLoading(true)
    setAiResult('')
    try {
      const res = await fetch('/api/ai-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          platform: aiPlatform,
          tone: aiTone,
          format: aiFormat,
        }),
      })
      if (!res.ok) throw new Error('Gagal memanggil AI Writer')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiResult(data.result || '')
      toast.success('Draf AI berhasil dibuat!')
    } catch (err: any) {
      toast.error(err.message || 'Gagal generate naskah')
    } finally {
      setAiLoading(false)
    }
  }

  function handleInsertAiResult() {
    if (!aiResult) return
    const newBlock: ScriptBlock = {
      id: crypto.randomUUID(),
      type: aiFormat === 'hook' ? 'hook' : aiFormat === 'outline' ? 'custom' : 'narasi',
      label: aiFormat === 'hook' ? 'AI Hook Alternatives' : aiFormat === 'outline' ? 'AI Outline' : 'AI Full Script',
      content: aiResult,
      order: blocks.length,
    }
    const updated = [...blocks, newBlock]
    setBlocks(updated)
    debouncedSave(updated)
    setAiWriterOpen(false)
    setAiTopic('')
    setAiResult('')
    toast.success('Naskah AI ditambahkan ke editor!')
  }

  function handleCopyAiResult() {
    if (!aiResult) return
    navigator.clipboard.writeText(aiResult)
    setCopied(true)
    toast.success('Teks berhasil disalin!')
    setTimeout(() => setCopied(false), 2000)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const totalWords = blocks.reduce((sum, b) => sum + wordCount(b.content), 0)

  const debouncedSave = useDebouncedCallback(async (b: ScriptBlock[]) => {
    setSaveStatus('saving')
    await onSave(b)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, 800)

  function updateBlock(id: string, changes: Partial<ScriptBlock>) {
    const updated = blocks.map((b) => (b.id === id ? { ...b, ...changes } : b))
    setBlocks(updated)
    debouncedSave(updated)
  }

  function deleteBlock(id: string) {
    const block = blocks.find((b) => b.id === id)
    if (block?.content.trim()) {
      if (!confirm(`Hapus section "${block.label}"? Konten akan hilang.`)) return
    }
    const updated = blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i }))
    setBlocks(updated)
    debouncedSave(updated)
  }

  function addBlock(type: string, customLabel?: string) {
    const labels: Record<string, string> = {
      hook: 'Hook', body: 'Body', cta: 'CTA (Call to Action)',
      insight: 'Insight / Director\'s Note', on_screen: 'On-Screen Text',
      narasi: 'Narasi', transisi: 'Transisi',
    }
    const newBlock: ScriptBlock = {
      id: crypto.randomUUID(),
      type,
      label: labels[type] || customLabel || 'Section Baru',
      content: '',
      order: blocks.length,
    }
    const updated = [...blocks, newBlock]
    setBlocks(updated)
    debouncedSave(updated)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setBlocks((prev) => {
      const oldIdx = prev.findIndex((b) => b.id === active.id)
      const newIdx = prev.findIndex((b) => b.id === over.id)
      const reordered = arrayMove(prev, oldIdx, newIdx).map((b, i) => ({ ...b, order: i }))
      debouncedSave(reordered)
      return reordered
    })
  }

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <span className="text-sm text-text-muted">
          {durationText(totalWords)}
          {totalWords > 0 && <span className="ml-2">· {totalWords} kata</span>}
          {saveStatus === 'saving' && <span className="ml-3">Menyimpan...</span>}
          {saveStatus === 'saved' && <span className="ml-3 text-success">✓ Tersimpan</span>}
        </span>
        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            onClick={() => setAiWriterOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-accent bg-accent-light text-accent hover:bg-accent hover:text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Writer
          </button>
          <button
            onClick={() => setFullScriptOpen(true)}
            disabled={totalWords === 0}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Eye className="w-4 h-4" /> Full Script
          </button>
          <AddSectionDropdown onAdd={addBlock} />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block) => (
            <SortableBlock key={block.id} block={block} onUpdate={updateBlock} onDelete={deleteBlock} />
          ))}
        </SortableContext>
      </DndContext>

      <AddSectionDropdown onAdd={addBlock} fullWidth />

      {fullScriptOpen && (
        <FullScriptPortal
          blocks={blocks}
          videoTitle={videoTitle}
          onClose={() => setFullScriptOpen(false)}
        />
      )}

      {aiWriterOpen && (
        <Dialog open={aiWriterOpen} onOpenChange={setAiWriterOpen}>
          <DialogContent className="max-w-xl bg-white border border-border rounded-xl shadow-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-text-primary font-heading font-bold text-lg">
                <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" /> AI Script Assistant
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Topik atau Ide Utama Konten</label>
                <textarea
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Misal: 3 tips produktif bangun jam 5 pagi, review gadget baru..."
                  className="w-full text-xs border border-border rounded-md p-2.5 outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Platform</label>
                  <Select value={aiPlatform} onValueChange={setAiPlatform}>
                    <SelectTrigger className="h-8 text-xs bg-white border-border text-text-primary">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-border">
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Gaya Bahasa</label>
                  <Select value={aiTone} onValueChange={setAiTone}>
                    <SelectTrigger className="h-8 text-xs bg-white border-border text-text-primary">
                      <SelectValue placeholder="Gaya Bahasa" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-border">
                      <SelectItem value="casual">Casual & Santai</SelectItem>
                      <SelectItem value="antusias">Antusias & Hype</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                      <SelectItem value="edukatif">Informatif / Edukatif</SelectItem>
                      <SelectItem value="komedi">Humor / Komedi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Format Output</label>
                  <Select value={aiFormat} onValueChange={setAiFormat}>
                    <SelectTrigger className="h-8 text-xs bg-white border-border text-text-primary">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-border">
                      <SelectItem value="hook">5 Alternatif Hook</SelectItem>
                      <SelectItem value="outline">Outline Script</SelectItem>
                      <SelectItem value="full">Full Script</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <button
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="w-full py-2 bg-teal-500 text-white text-xs font-bold rounded-md hover:bg-teal-600 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors shadow-subtle"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sedang Menulis Draf...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Generate Draf AI
                  </>
                )}
              </button>

              {aiResult && (
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary">Hasil Generator AI</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyAiResult}
                        className="inline-flex items-center gap-1 text-[10px] text-text-secondary hover:text-text-primary border border-border bg-white px-2 py-1 rounded-md transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        Salin Teks
                      </button>
                      <button
                        onClick={handleInsertAiResult}
                        className="inline-flex items-center gap-1 text-[10px] bg-accent text-white hover:bg-accent/90 px-2.5 py-1 rounded-md font-semibold transition-colors"
                      >
                        Masukkan ke Editor
                      </button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={aiResult}
                    className="w-full text-xs font-mono border border-border rounded-lg p-2.5 bg-subtle min-h-[150px] outline-none max-h-[250px] leading-relaxed"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function SortableBlock({
  block, onUpdate, onDelete,
}: {
  block: ScriptBlock
  onUpdate: (id: string, changes: Partial<ScriptBlock>) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
    >
      <ScriptBlockCard
        block={block}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function ScriptBlockCard({
  block, onUpdate, onDelete, dragHandleProps,
}: {
  block: ScriptBlock
  onUpdate: (id: string, changes: Partial<ScriptBlock>) => void
  onDelete: (id: string) => void
  dragHandleProps: Record<string, unknown>
}) {
  const words = wordCount(block.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Growing without limit made a long section's textarea (e.g. a 500+
  // word Body) taller than the viewport itself — the browser then kept
  // auto-scrolling the whole page to follow the caret as it grew, which
  // read as "typing keeps getting shoved to the bottom". Capped here so
  // a long block scrolls WITHIN its own box past this height instead of
  // growing the page indefinitely.
  const MAX_HEIGHT = 480

  // The browser auto-scrolls the page to keep the caret visible as part
  // of natively handling the keystroke — that happens BEFORE React's
  // onChange/effect ever run, so reading window.scrollY inside the
  // effect below only ever sees the page already jumped (restoring to
  // that value was a no-op, which is why the previous fix didn't help).
  // Capture the scroll position in onBeforeInput, which fires before the
  // browser applies the edit, so we have the true "before" position to
  // restore to.
  const preEditScrollY = useRef<number | null>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.max(48, el.scrollHeight)
    el.style.height = Math.min(next, MAX_HEIGHT) + 'px'
    el.style.overflowY = next > MAX_HEIGHT ? 'auto' : 'hidden'
    if (preEditScrollY.current !== null) {
      window.scrollTo({ top: preEditScrollY.current })
      preEditScrollY.current = null
    }
  }, [block.content])

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-4 py-3 border-b border-border/50 last:border-b-0 group">
      {/* Sisi Kiri: Label & Meta Info */}
      <div className="sm:w-40 shrink-0 space-y-1">
        <div className="flex items-center gap-1">
          <button
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-0.5 touch-none"
            title="Tarik untuk urutkan"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <input
            type="text"
            value={block.label}
            onChange={(e) => onUpdate(block.id, { label: e.target.value })}
            className="flex-1 bg-transparent font-semibold text-xs text-text-primary border-none outline-none focus:bg-white focus:px-1 rounded transition-all truncate"
            title="Klik untuk ubah nama section"
          />
          <button
            onClick={() => onDelete(block.id)}
            className="sm:hidden text-text-muted hover:text-error transition-all p-1 rounded hover:bg-subtle shrink-0"
            title="Hapus section"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="pl-5 flex flex-col text-[10px] text-text-muted">
          <span>{words} kata</span>
          {words > 0 && <span>{durationText(words)}</span>}
        </div>
      </div>

      {/* Sisi Kanan: Input Script & Tombol Aksi */}
      <div className="flex-1 flex items-start gap-2">
        <div className="flex-1 min-w-0 border border-border/80 hover:border-border rounded-lg bg-white shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-accent/30 focus-within:border-accent transition-all">
          <textarea
            ref={textareaRef}
            value={block.content}
            onChange={(e) => onUpdate(block.id, { content: e.target.value })}
            onBeforeInput={() => { preEditScrollY.current = window.scrollY }}
            onKeyDown={() => { preEditScrollY.current = window.scrollY }}
            placeholder={PLACEHOLDERS[block.type] || 'Tulis di sini...'}
            rows={1}
            className="w-full px-3 py-2 text-xs text-text-primary resize-none border-none outline-none leading-relaxed bg-transparent min-h-[48px]"
          />
        </div>
        <button
          onClick={() => onDelete(block.id)}
          className="hidden sm:inline-flex text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded hover:bg-subtle shrink-0 mt-1"
          title="Hapus section"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function AddSectionDropdown({ onAdd, fullWidth = false }: { onAdd: (type: string, customLabel?: string) => void; fullWidth?: boolean }) {
  const [open, setOpen] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className={cn("relative", fullWidth ? "w-full" : "")} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          fullWidth
            ? "w-full border border-dashed border-border rounded-lg py-2 text-sm text-text-muted hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-1.5"
            : "inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        )}
      >
        <Plus className="w-4 h-4" /> Tambah Section
      </button>
      {open && (
        <div className={cn(
          "absolute bg-white border border-border rounded-lg shadow-lg z-30 py-1 w-52",
          fullWidth ? "left-1/2 -translate-x-1/2 bottom-full mb-1" : "right-0 top-full mt-1"
        )}>
          {SECTION_PRESETS.map((p) => (
            <button
              key={p.type}
              onClick={() => { onAdd(p.type); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-subtle transition-colors"
            >
              {p.label}
            </button>
          ))}
          <div className="border-t border-border my-1" />
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-subtle text-text-secondary"
            >
              + Custom...
            </button>
          ) : (
            <div className="px-3 py-2">
              <input
                autoFocus
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customLabel.trim()) {
                    onAdd('custom', customLabel.trim())
                    setOpen(false)
                    setCustomLabel('')
                    setShowCustom(false)
                  }
                  if (e.key === 'Escape') { setOpen(false); setShowCustom(false) }
                }}
                placeholder="Nama section..."
                className="w-full text-sm border border-border rounded px-2 py-1 outline-none focus:border-accent"
              />
              <p className="text-xs text-text-muted mt-1">Enter untuk tambah</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FullScriptPortal({
  blocks, videoTitle, onClose,
}: {
  blocks: ScriptBlock[]
  videoTitle: string
  onClose: () => void
}) {
  const nonEmpty = blocks.filter((b) => b.content.trim()).sort((a, b) => a.order - b.order)
  const totalWords = blocks.reduce((sum, b) => sum + wordCount(b.content), 0)
  const durText = durationText(totalWords)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return createPortal(
    <div id="full-script-overlay" className="fixed inset-0 z-[100] bg-white flex flex-col">
      <div className="flex items-center justify-between px-8 py-4 border-b border-border shrink-0 no-print">
        <div>
          <p className="font-semibold text-text-primary text-lg">{videoTitle || 'Untitled Video'}</p>
          <p className="text-xs text-text-muted mt-0.5">{durText} · {totalWords} kata</p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto print-area">
        <div className="max-w-2xl mx-auto py-10 px-8">
          <div className="hidden print:block mb-8">
            <h1 className="text-2xl font-bold text-text-primary">{videoTitle}</h1>
            <p className="text-xs text-text-muted mt-1">{durText} · {totalWords} kata</p>
            <div className="border-b border-border mt-4" />
          </div>
          {nonEmpty.length === 0 ? (
            <p className="text-text-muted text-center py-12">Belum ada konten script.</p>
          ) : (
            nonEmpty.map((block) => (
              <div key={block.id} className="mb-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-accent">{block.label}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <p className="text-text-primary leading-relaxed whitespace-pre-wrap text-base">{block.content}</p>
              </div>
            ))
          )}
          <div className="mt-16 pt-6 border-t border-border text-center">
            <p className="text-xs text-text-muted">{durText} · {totalWords} kata · Kanvas OS</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
