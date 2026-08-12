'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Image as ImageIcon, Clock } from 'lucide-react'
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
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-text-primary">Aset</h1>
        <p className="text-sm text-text-secondary mt-0.5">Kelola foto, video, dan file aset konten</p>
      </div>

      {/* Honest "coming soon" banner — upload/manage belum aktif */}
      <div className="flex items-start gap-3 bg-accent-light/50 border border-accent/20 rounded-xl p-4 mb-6">
        <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Manajemen Aset segera hadir</p>
          <p className="text-sm text-text-secondary mt-0.5">
            Upload dan pengelolaan aset penuh sedang disiapkan. Untuk sementara, simpan link file di Google Drive lewat kolom <span className="font-medium">Aset</span> di Video Banking.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : !assets?.length ? (
        <div className="py-20 text-center bg-surface rounded-xl border border-border">
          <ImageIcon className="w-12 h-12 text-border mx-auto mb-3" />
          <p className="text-text-muted font-medium">Belum ada aset</p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-text-muted mb-2">File tersimpan (hanya-baca)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {assets.map((file: { name: string }) => (
              <div key={file.name} className="aspect-square rounded-xl bg-subtle border border-border flex items-center justify-center overflow-hidden p-2">
                <p className="text-xs text-text-muted text-center truncate">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
