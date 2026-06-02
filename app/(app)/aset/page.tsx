'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Image, Upload, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function AsetPage() {
  const { workspaceId } = useWorkspace()

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .storage
        .from('logos')
        .list(`workspace-${workspaceId}`, { limit: 100 })
      return data ?? []
    },
    enabled: !!workspaceId,
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Aset</h1>
          <p className="text-sm text-text-secondary mt-0.5">Kelola foto, video, dan file aset konten</p>
        </div>
        <Button size="sm">
          <Upload className="w-4 h-4 mr-1.5" /> Upload
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input placeholder="Cari aset..." className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : !assets?.length ? (
        <div className="py-20 text-center bg-surface rounded-xl border border-border">
          <Image className="w-12 h-12 text-border mx-auto mb-3" />
          <p className="text-text-muted font-medium">Belum ada aset</p>
          <p className="text-sm text-text-muted mt-1">Upload foto atau file untuk mulai mengelola aset konten</p>
          <Button size="sm" className="mt-4">
            <Upload className="w-4 h-4 mr-1.5" /> Upload Aset
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {assets.map((file: { name: string }) => (
            <div key={file.name} className="aspect-square rounded-xl bg-subtle border border-border flex items-center justify-center overflow-hidden">
              <p className="text-xs text-text-muted text-center px-2 truncate">{file.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
