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
import { GripVertical, Trash2, Plus, Eye, Printer, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ScriptBlock {
  id: string
  type: string
  label: string
  content: string
  order: number
}

const DEFAULT_BLOCKS: ScriptBlock[] = [
  { id: crypto.randomUUID(), type: 'hook', label: 'Hook', content: '', order: 0 },
  { id: crypto.randomUUID(), type: 'body', label: 'Body', content: '', order: 1 },
  { id: crypto.randomUUID(), type: 'cta', label: 'CTA (Call to Action)', content: '', order: 2 },
  { id: crypto.randomUUID(), type: 'insight', label: 'Insight / Director\'s Note', content: '', order: 3 },
  { id: crypto.randomUUID(), type: 'on_screen', label: 'On-Screen Text', content: '', order: 4 },
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
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-text-muted">
          {durationText(totalWords)}
          {totalWords > 0 && <span className="ml-2">· {totalWords} kata</span>}
          {saveStatus === 'saving' && <span className="ml-3">Menyimpan...</span>}
          {saveStatus === 'saved' && <span className="ml-3 text-success">✓ Tersimpan</span>}
        </span>
        <div className="flex gap-2">
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

      <button
        onClick={() => addBlock('custom', 'Section Baru')}
        className="mt-2 w-full border border-dashed border-border rounded-lg py-2.5 text-sm text-text-muted hover:border-accent hover:text-accent transition-colors"
      >
        + Tambah Section
      </button>

      {fullScriptOpen && (
        <FullScriptPortal
          blocks={blocks}
          videoTitle={videoTitle}
          onClose={() => setFullScriptOpen(false)}
        />
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.max(80, textareaRef.current.scrollHeight) + 'px'
    }
  }, [block.content])

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-3 bg-white">
      <div className="flex items-center gap-2 px-3 py-2 bg-subtle border-b border-border">
        <button
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary p-0.5 touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={block.label}
          onChange={(e) => onUpdate(block.id, { label: e.target.value })}
          className="flex-1 bg-transparent font-semibold text-sm text-text-primary border-none outline-none hover:bg-white hover:px-2 rounded transition-all"
        />
        {words > 0 && (
          <span className="text-xs text-text-muted shrink-0">{words} kata</span>
        )}
        <button
          onClick={() => onDelete(block.id)}
          className="text-text-muted hover:text-error transition-colors ml-1 p-0.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={block.content}
        onChange={(e) => onUpdate(block.id, { content: e.target.value })}
        placeholder={PLACEHOLDERS[block.type] || 'Tulis di sini...'}
        rows={3}
        className="w-full px-4 py-3 text-sm text-text-primary resize-none border-none outline-none leading-relaxed bg-white min-h-[80px]"
        onInput={(e) => {
          const t = e.target as HTMLTextAreaElement
          t.style.height = 'auto'
          t.style.height = Math.max(80, t.scrollHeight) + 'px'
        }}
      />
    </div>
  )
}

function AddSectionDropdown({ onAdd }: { onAdd: (type: string, customLabel?: string) => void }) {
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <Plus className="w-4 h-4" /> Section
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-border rounded-lg shadow-lg z-30 py-1">
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
