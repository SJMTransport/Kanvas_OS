'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, Trash2, Plus, Loader2, Image } from 'lucide-react'
import { toast } from 'sonner'

interface MoodboardItem {
  id: string
  image_url: string
  caption: string | null
  sort_order: number
}

interface Props {
  videoId: string
  initialItems: MoodboardItem[]
  refUrls: string[]
  onRefUrlsChange: (urls: string[]) => void
}

export function MoodboardSection({ videoId, initialItems, refUrls, onRefUrlsChange }: Props) {
  const [items, setItems] = useState<MoodboardItem[]>(initialItems)
  const [uploading, setUploading] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const supabase = createClient()
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const path = `moodboard/${videoId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('thumbnails').upload(path, file)
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(path)
        const { data, error } = await supabase.from('moodboard').insert({
          video_id: videoId, image_url: publicUrl, sort_order: items.length,
        }).select().single()
        if (error) throw error
        setItems((p) => [...p, data as MoodboardItem])
      }
      toast.success('Gambar berhasil diupload!')
    } catch { toast.error('Gagal upload gambar') } finally { setUploading(false) }
  }

  async function deleteItem(id: string) {
    setItems((p) => p.filter((x) => x.id !== id))
    const supabase = createClient()
    await supabase.from('moodboard').delete().eq('id', id)
  }

  function addRefUrl() {
    if (!newUrl.trim()) return
    onRefUrlsChange([...refUrls, newUrl.trim()])
    setNewUrl('')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-xs text-text-muted">Moodboard</Label>

        {/* Upload zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files) }}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <p className="text-xs text-text-muted">Mengupload...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-text-muted" />
              <p className="text-sm text-text-secondary">Drag & drop atau klik untuk upload</p>
              <p className="text-xs text-text-muted">PNG, JPG, WEBP · Multiple files OK</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </div>

        {/* Grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden bg-subtle">
                <img src={item.image_url} alt={item.caption ?? ''} className="w-full h-full object-cover" />
                <button
                  onClick={() => deleteItem(item.id)}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-text-muted">Referensi Video</Label>
        <div className="flex gap-2">
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRefUrl()}
            placeholder="https://youtube.com/watch?v=..."
            className="h-8 text-sm"
          />
          <Button size="sm" variant="outline" onClick={addRefUrl} className="shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        {refUrls.map((url, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <a href={url} target="_blank" rel="noopener" className="flex-1 text-accent hover:underline truncate text-xs">{url}</a>
            <button onClick={() => onRefUrlsChange(refUrls.filter((_, j) => j !== i))} className="text-text-muted hover:text-error">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
