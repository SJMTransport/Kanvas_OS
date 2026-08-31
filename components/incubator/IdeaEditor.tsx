'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import Heading from '@tiptap/extension-heading'
import {
  Bold, Italic, Strikethrough, Highlighter, List, ListOrdered,
  CheckSquare, Quote, Minus, Undo, Heading1, Heading2, Heading3, Type, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function TBtn({
  onClick, active, disabled, title, children, small,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title?: string
  children: React.ReactNode; small?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center justify-center rounded transition-colors',
        small ? 'w-6 h-6' : 'w-7 h-7',
        active ? 'bg-amber-100 text-amber-700' : 'text-text-secondary hover:bg-subtle hover:text-text-primary',
        disabled && 'opacity-30 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-4 bg-border mx-0.5 shrink-0" />
}

// ─── Slash Command Items ──────────────────────────────────────────────────────

const SLASH_ITEMS = [
  { label: 'Teks biasa', icon: Type },
  { label: 'Heading 1', icon: Heading1 },
  { label: 'Heading 2', icon: Heading2 },
  { label: 'Heading 3', icon: Heading3 },
  { label: 'Bullet List', icon: List },
  { label: 'Numbered List', icon: ListOrdered },
  { label: 'Checklist', icon: CheckSquare },
  { label: 'Blockquote', icon: Quote },
  { label: 'Divider', icon: Minus },
]

type SaveStatus = 'idle' | 'saving' | 'saved'

interface Props {
  initialContent: JSONContent | string | null
  onSave: (json: JSONContent) => Promise<void>
  cardId: string
}

export function IdeaEditor({ initialContent, onSave, cardId }: Props) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Slash menu
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashIdx, setSlashIdx] = useState(0)
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 })
  const slashAnchorPos = useRef<number | null>(null)
  const editorWrapRef = useRef<HTMLDivElement>(null)

  // Bubble menu (selection)
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const [bubblePos, setBubblePos] = useState({ top: 0, left: 0 })

  const debouncedSave = useCallback(
    (json: JSONContent) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving')
        await onSave(json)
        setSaveStatus('saved')
        if (statusTimer.current) clearTimeout(statusTimer.current)
        statusTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
      }, 1000)
    },
    [onSave]
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, bulletList: { keepMarks: true }, orderedList: { keepMarks: true } }),
      Heading.configure({ levels: [1, 2, 3] }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'heading' ? 'Judul section...' : 'Tulis apa saja — script, analisis, inspirasi...',
        showOnlyWhenEditable: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      Highlight.configure({ multicolor: false }),
    ],
    content: initialContent ?? '',
    onUpdate: ({ editor: e }) => debouncedSave(e.getJSON()),
    onSelectionUpdate: ({ editor: e }) => {
      const { empty } = e.state.selection
      if (empty) { setBubbleVisible(false); return }
      // Position bubble above selection
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const wrapRect = editorWrapRef.current?.getBoundingClientRect()
      if (!wrapRect) return
      setBubblePos({ top: rect.top - wrapRect.top - 44, left: rect.left - wrapRect.left + rect.width / 2 - 80 })
      setBubbleVisible(true)
    },
  })

  // Slash detection
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!slashOpen) return
      const items = SLASH_ITEMS.filter(i => !slashQuery || i.label.toLowerCase().includes(slashQuery.toLowerCase()))
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(idx => Math.min(idx + 1, items.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIdx(idx => Math.max(idx - 1, 0)) }
      else if (e.key === 'Enter') { e.preventDefault(); executeSlashAtIdx(slashIdx, items) }
      else if (e.key === 'Escape') { setSlashOpen(false) }
    }

    const dom = editor.view.dom
    dom.addEventListener('keydown', handleKeyDown)
    return () => dom.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    if (!editor) return
    const onUpdate = () => {
      const { state } = editor
      const { from } = state.selection
      const text = state.doc.textBetween(Math.max(0, from - 50), from)
      const lastSlash = text.lastIndexOf('/')
      if (lastSlash !== -1) {
        const afterSlash = text.slice(lastSlash + 1)
        if (!afterSlash.includes(' ') && !afterSlash.includes('\n')) {
          if (text.length - 1 === lastSlash) {
            // Just typed /
            const coords = editor.view.coordsAtPos(from - 1)
            const wrap = editorWrapRef.current?.getBoundingClientRect()
            if (wrap) setSlashPos({ top: coords.bottom - wrap.top + 4, left: coords.left - wrap.left })
            slashAnchorPos.current = from
            setSlashQuery('')
            setSlashOpen(true)
            setSlashIdx(0)
          } else if (slashOpen) {
            setSlashQuery(afterSlash)
            setSlashIdx(0)
          }
          return
        }
      }
      setSlashOpen(false)
    }

    editor.on('update', onUpdate)
    return () => { editor.off('update', onUpdate) }
  }, [editor, slashOpen])

  function executeSlashAtIdx(idx: number, items: typeof SLASH_ITEMS) {
    if (!editor || !items[idx]) return
    const { from } = editor.state.selection
    const anchor = slashAnchorPos.current
    if (anchor !== null) {
      editor.chain().focus().deleteRange({ from: anchor - 1, to: from }).run()
    }
    const label = items[idx].label
    if (label === 'Teks biasa') editor.chain().focus().clearNodes().run()
    else if (label === 'Heading 1') editor.chain().focus().toggleHeading({ level: 1 }).run()
    else if (label === 'Heading 2') editor.chain().focus().toggleHeading({ level: 2 }).run()
    else if (label === 'Heading 3') editor.chain().focus().toggleHeading({ level: 3 }).run()
    else if (label === 'Bullet List') editor.chain().focus().toggleBulletList().run()
    else if (label === 'Numbered List') editor.chain().focus().toggleOrderedList().run()
    else if (label === 'Checklist') editor.chain().focus().toggleTaskList().run()
    else if (label === 'Blockquote') editor.chain().focus().toggleBlockquote().run()
    else if (label === 'Divider') editor.chain().focus().setHorizontalRule().run()
    setSlashOpen(false)
    slashAnchorPos.current = null
  }

  const filteredSlash = SLASH_ITEMS.filter(i => !slashQuery || i.label.toLowerCase().includes(slashQuery.toLowerCase()))

  if (!editor) return null

  return (
    <div className="relative" ref={editorWrapRef}>
      <div className="tiptap-editor border border-border rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-white sticky top-0 z-10">
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 className="w-3.5 h-3.5" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 className="w-3.5 h-3.5" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 className="w-3.5 h-3.5" /></TBtn>
          <Sep />
          <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (⌘B)"><Bold className="w-3.5 h-3.5" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (⌘I)"><Italic className="w-3.5 h-3.5" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><Highlighter className="w-3.5 h-3.5" /></TBtn>
          <Sep />
          <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List"><List className="w-3.5 h-3.5" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist"><CheckSquare className="w-3.5 h-3.5" /></TBtn>
          <Sep />
          <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote className="w-3.5 h-3.5" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="w-3.5 h-3.5" /></TBtn>
          <Sep />
          <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (⌘Z)"><Undo className="w-3.5 h-3.5" /></TBtn>

          <div className="ml-auto flex items-center gap-1 text-[11px] h-7">
            {saveStatus === 'saving' && <span className="text-text-muted">Menyimpan...</span>}
            {saveStatus === 'saved' && <span className="text-green-600 flex items-center gap-0.5"><Check className="w-3 h-3" /> Tersimpan</span>}
          </div>
        </div>

        <EditorContent editor={editor} />
      </div>

      {/* Bubble menu */}
      {bubbleVisible && !editor.state.selection.empty && (
        <div
          className="absolute z-50 flex items-center gap-0.5 bg-white border border-border rounded-lg shadow-md px-1.5 py-1 pointer-events-auto"
          style={{ top: Math.max(0, bubblePos.top), left: Math.max(0, bubblePos.left) }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <TBtn small onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="w-3 h-3" /></TBtn>
          <TBtn small onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="w-3 h-3" /></TBtn>
          <TBtn small onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough className="w-3 h-3" /></TBtn>
          <TBtn small onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')}><Highlighter className="w-3 h-3" /></TBtn>
        </div>
      )}

      {/* Slash command menu */}
      {slashOpen && filteredSlash.length > 0 && (
        <div
          className="slash-menu absolute z-50"
          style={{ top: slashPos.top, left: Math.max(0, slashPos.left) }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredSlash.map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className={cn('slash-menu-item', i === slashIdx && 'active')}
                onMouseDown={() => executeSlashAtIdx(i, filteredSlash)}
                onMouseEnter={() => setSlashIdx(i)}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
