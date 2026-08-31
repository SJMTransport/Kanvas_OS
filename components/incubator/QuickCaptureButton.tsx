'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { type JSONContent } from '@tiptap/react'
import { Lightbulb, Upload, X, Loader2, PenLine, Link2, Image as ImageIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { IdeaEditor } from './IdeaEditor'

type Tab = 'write' | 'link' | 'photo'

function isUrl(s: string) {
  try { new URL(s); return true } catch { return false }
}

export function QuickCaptureButton() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('write')
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cardId, setCardId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const router = useRouter()

  function reset() {
    setTab('write')
    setTitle('')
    setLinkUrl('')
    setTags([])
    setTagInput('')
    setCardId(null)
  }

  function handleOpen() {
    reset()
    setOpen(true)
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) return
    setTags((prev) => [...prev, t])
    setTagInput('')
  }

  // Lazily create the draft card on first edit, then keep updating it
  async function ensureCard(): Promise<string | null> {
    if (cardId) return cardId
    if (!workspaceId) return null
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('idea_cards').insert({
      workspace_id: workspaceId,
      created_by: user?.id,
      type: 'scratch',
      title: title || null,
      tags: tags.length > 0 ? tags : null,
    }).select('id').single()
    if (error) { toast.error(error.message); return null }
    setCardId(data.id)
    return data.id
  }

  const handleEditorSave = useCallback(async (json: JSONContent) => {
    const id = await ensureCard()
    if (!id) return
    const supabase = createClient()
    await supabase.from('idea_cards').update({ body_json: json, updated_at: new Date().toISOString() }).eq('id', id)
  }, [cardId, workspaceId, title, tags])

  async function persistMeta(id: string) {
    const supabase = createClient()
    await supabase.from('idea_cards').update({
      title: title || null,
      tags: tags.length > 0 ? tags : null,
    }).eq('id', id)
  }

  async function handleSaveLink() {
    if (!workspaceId || !linkUrl.trim() || !isUrl(linkUrl.trim())) { toast.error('Masukkan URL yang valid'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const trimmed = linkUrl.trim()
      let meta = null
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(trimmed)}`)
        if (res.ok) meta = await res.json()
      } catch { /* ignore */ }

      const { error } = await supabase.from('idea_cards').insert({
        workspace_id: workspaceId,
        created_by: user?.id,
        type: 'link',
        title: title || meta?.title || null,
        link_url: trimmed,
        link_meta: meta,
        tags: tags.length > 0 ? tags : null,
      })
      if (error) throw error
      toast.success('Link tersimpan ke Incubator!')
      queryClient.invalidateQueries({ queryKey: ['idea-cards', workspaceId] })
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !workspaceId) return
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${workspaceId}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('incubator-images').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('incubator-images').getPublicUrl(path)

      const { error } = await supabase.from('idea_cards').insert({
        workspace_id: workspaceId,
        created_by: user?.id,
        type: 'image',
        title: title || null,
        image_urls: [publicUrl],
        tags: tags.length > 0 ? tags : null,
      })
      if (error) throw error

      toast.success('Gambar tersimpan ke Incubator!')
      queryClient.invalidateQueries({ queryKey: ['idea-cards', workspaceId] })
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSimpan(openAfter: boolean) {
    if (tab === 'link') { handleSaveLink(); return }
    if (tab === 'photo') { fileRef.current?.click(); return }

    setSaving(true)
    try {
      const id = await ensureCard()
      if (!id) return
      await persistMeta(id)
      queryClient.invalidateQueries({ queryKey: ['idea-cards', workspaceId] })
      toast.success('Ide tersimpan ke Incubator!')
      setOpen(false)
      if (openAfter) router.push(`/incubator/idea?card=${id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-40 w-12 h-12 rounded-full bg-teal-500 hover:bg-teal-600 text-white shadow-popover flex items-center justify-center transition-colors"
        title="Capture Ide"
      >
        <Lightbulb className="w-5 h-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-text-primary">
              <Lightbulb className="w-4 h-4 text-teal-600" /> Ide Baru
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul ide..."
              className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0"
            />

            {/* Tabs */}
            <div className="flex items-center gap-1 border border-border rounded-sm p-0.5 w-fit">
              {[
                { key: 'write' as Tab, label: 'Tulis', icon: PenLine },
                { key: 'link' as Tab, label: 'Link', icon: Link2 },
                { key: 'photo' as Tab, label: 'Foto', icon: ImageIcon },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-medium transition-colors',
                    tab === key ? 'bg-teal-50 text-teal-700' : 'text-text-secondary hover:bg-subtle'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'write' && (
              <IdeaEditor
                key={cardId ?? 'new'}
                initialContent={null}
                onSave={handleEditorSave}
                cardId={cardId ?? 'draft'}
              />
            )}
            {tab === 'link' && (
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Tempel URL link di sini..."
                autoFocus
              />
            )}
            {tab === 'photo' && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-border rounded-lg text-sm text-text-muted hover:border-teal-500 hover:text-teal-600 transition-colors"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Mengupload...' : 'Pilih foto untuk diupload'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            {/* Tags */}
            <div>
              <Label className="text-xs text-text-muted mb-1.5 block">Tags</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 text-xs rounded-full">
                    {t}
                    <button onClick={() => setTags((p) => p.filter((x) => x !== t))}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Ketik tag + Enter"
                className="h-9 text-xs rounded-md border-border focus:ring-teal-500"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => handleSimpan(false)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Simpan
              </Button>
              {tab === 'write' && (
                <Button onClick={() => handleSimpan(true)} disabled={saving} className="bg-teal-500 hover:bg-teal-600">
                  Simpan & Buka
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
