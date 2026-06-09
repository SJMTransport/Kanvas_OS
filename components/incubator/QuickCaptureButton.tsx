'use client'

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Lightbulb, Upload, X, Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'

function isUrl(s: string) {
  try { new URL(s); return true } catch { return false }
}

export function QuickCaptureButton() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()

  function addTag() {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) return
    setTags((prev) => [...prev, t])
    setTagInput('')
  }

  async function handleSave() {
    if (!workspaceId || (!input.trim())) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const trimmed = input.trim()

      if (isUrl(trimmed)) {
        // Fetch link preview
        let meta = null
        try {
          const res = await fetch(`/api/link-preview?url=${encodeURIComponent(trimmed)}`)
          if (res.ok) meta = await res.json()
        } catch { /* ignore */ }

        const { error } = await supabase.from('idea_cards').insert({
          workspace_id: workspaceId,
          created_by: user?.id,
          type: 'link',
          title: meta?.title ?? null,
          link_url: trimmed,
          link_meta: meta,
          tags: tags.length > 0 ? tags : null,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('idea_cards').insert({
          workspace_id: workspaceId,
          created_by: user?.id,
          type: 'scratch',
          body: trimmed,
          tags: tags.length > 0 ? tags : null,
        })
        if (error) throw error
      }

      toast.success('Ide tersimpan ke Incubator!')
      queryClient.invalidateQueries({ queryKey: ['idea-cards', workspaceId] })
      setInput('')
      setTags([])
      setTagInput('')
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
        image_urls: [publicUrl],
        tags: tags.length > 0 ? tags : null,
      })
      if (error) throw error

      toast.success('Gambar tersimpan ke Incubator!')
      queryClient.invalidateQueries({ queryKey: ['idea-cards', workspaceId] })
      setTags([])
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-40 w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg flex items-center justify-center transition-colors"
        title="Capture Ide"
      >
        <Lightbulb className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> Capture Ide
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}
                placeholder="Paste link atau ketik ide..."
                autoFocus
                className="text-sm"
              />
              <p className="text-xs text-text-muted mt-1">
                {isUrl(input.trim()) ? '🔗 Link terdeteksi — akan dibuat Link Card' : input.trim() ? '✍️ Teks — akan dibuat Scratch Card' : 'Paste URL atau ketik teks bebas'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-text-muted">atau</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-sm text-text-muted hover:border-accent hover:text-accent transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Mengupload...' : 'Upload foto'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            {/* Tags */}
            <div>
              <Label className="text-xs text-text-muted mb-1.5 block">Tags (opsional)</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                    {t}
                    <button onClick={() => setTags((p) => p.filter((x) => x !== t))}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="Ketik tag + Enter"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !input.trim()}
              className="w-full gap-2 bg-amber-500 hover:bg-amber-600"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
              {saving ? 'Menyimpan...' : 'Simpan ke Incubator'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
