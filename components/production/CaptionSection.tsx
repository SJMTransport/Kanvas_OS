'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CaptionData {
  caption_default: string
  hashtags: string[]
  caption_tiktok: string
  caption_instagram: string
  caption_youtube: string
  caption_facebook: string
}

interface Props {
  data: CaptionData
  onChange: (field: string, value: unknown) => void
}

const PLATFORM_CAPTIONS = [
  { key: 'caption_tiktok', label: 'TikTok' },
  { key: 'caption_instagram', label: 'Instagram' },
  { key: 'caption_youtube', label: 'YouTube' },
  { key: 'caption_facebook', label: 'Facebook' },
]

export function CaptionSection({ data, onChange }: Props) {
  const [tagInput, setTagInput] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])

  function addTag(raw: string) {
    const tag = raw.replace(/^#/, '').trim()
    if (!tag || data.hashtags.includes(tag)) return
    onChange('hashtags', [...data.hashtags, tag])
    setTagInput('')
  }

  function removeTag(tag: string) {
    onChange('hashtags', data.hashtags.filter((t) => t !== tag))
  }

  function toggleExpand(key: string) {
    setExpanded((p) => p.includes(key) ? p.filter((x) => x !== key) : [...p, key])
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Caption Default</Label>
        <Textarea
          value={data.caption_default}
          onChange={(e) => onChange('caption_default', e.target.value)}
          placeholder="Caption yang digunakan untuk semua platform..."
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-text-muted">Hashtag</Label>
        <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-lg min-h-[36px]">
          {data.hashtags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 bg-accent-light text-accent text-xs px-2 py-0.5 rounded-full">
              #{tag}
              <button onClick={() => removeTag(tag)} className="hover:text-error">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addTag(tagInput) }
            }}
            placeholder="Ketik + Enter"
            className="outline-none text-xs flex-1 min-w-[100px] bg-transparent"
          />
        </div>
        <p className="text-[11px] text-text-muted">Tekan Enter atau Space untuk tambah hashtag</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Override per Platform</p>
        {PLATFORM_CAPTIONS.map(({ key, label }) => {
          const isOpen = expanded.includes(key)
          return (
            <div key={key} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleExpand(key)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-subtle transition-colors"
              >
                <span className="text-sm font-medium text-text-secondary">{label}</span>
                <div className="flex items-center gap-2">
                  {(data as any)[key] && <span className="text-[10px] text-accent">Diisi</span>}
                  {isOpen ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                </div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 border-t border-border">
                  <Textarea
                    value={(data as any)[key]}
                    onChange={(e) => onChange(key, e.target.value)}
                    placeholder={`Caption khusus ${label} (kosong = pakai caption default)`}
                    rows={3}
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
