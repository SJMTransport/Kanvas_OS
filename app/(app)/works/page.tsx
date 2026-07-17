'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Search, Plus, FolderOpen, Pencil, Trash2, ChevronRight, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import Link from 'next/link'
import type { Work } from '@/lib/types/domain'

export default function WorksPage() {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editWork, setEditWork] = useState<Work | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Work | null>(null)

  const { data: works = [], isLoading, isError, refetch } = useQuery<Work[]>({
    queryKey: ['works', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Work[]
    },
    enabled: !!workspaceId,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !title.trim()) throw new Error('Judul wajib diisi')
      const supabase = createClient()
      if (editWork) {
        const { error } = await supabase
          .from('works')
          .update({ title: title.trim(), description: description.trim() || null })
          .eq('id', editWork.id)
        if (error) throw error
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase
          .from('works')
          .insert({ workspace_id: workspaceId, created_by: user?.id ?? null, title: title.trim(), description: description.trim() || null })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works', workspaceId] })
      closeDialog()
      toast.success(editWork ? 'Karya diperbarui' : 'Karya baru ditambahkan')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Gagal menyimpan'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('works').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works', workspaceId] })
      setDeleteTarget(null)
      toast.success('Karya dihapus')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Gagal menghapus'),
  })

  function openAdd() {
    setEditWork(null)
    setTitle('')
    setDescription('')
    setDialogOpen(true)
  }

  function openEdit(w: Work) {
    setEditWork(w)
    setTitle(w.title)
    setDescription(w.description ?? '')
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditWork(null)
    setTitle('')
    setDescription('')
  }

  const filtered = works.filter((w) =>
    w.title.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-error mx-auto mb-3" />
        <h2 className="font-heading text-lg font-bold text-text-primary mb-1">Gagal memuat Karya</h2>
        <p className="text-sm text-text-secondary mb-4">Pastikan migrasi database sudah dijalankan, lalu coba lagi.</p>
        <Button onClick={() => refetch()}>Coba Lagi</Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Karya</h1>
          <p className="text-sm text-text-secondary mt-0.5">Kelola semua karya kreatif kamu</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Karya Baru
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input placeholder="Cari karya..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-surface rounded-xl border border-border">
          <FolderOpen className="w-12 h-12 text-border mb-3" />
          <p className="text-sm text-text-muted">{search ? 'Tidak ada karya yang cocok' : 'Belum ada karya. Mulai dengan membuat satu!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((w) => (
            <div key={w.id} className="group bg-white border border-border rounded-xl p-4 hover:border-accent hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-2">
                <Link href={`/works/${w.id}`} className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                    {w.title}
                  </h3>
                </Link>
                <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(w)} className="p-1 rounded hover:bg-surface"><Pencil className="w-3.5 h-3.5 text-text-muted" /></button>
                  <button onClick={() => setDeleteTarget(w)} className="p-1 rounded hover:bg-error/10"><Trash2 className="w-3.5 h-3.5 text-error" /></button>
                </div>
              </div>
              {w.description && (
                <p className="text-xs text-text-secondary line-clamp-2 mb-3">{w.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">
                  {formatDistanceToNow(new Date(w.updated_at), { addSuffix: true, locale: localeId })}
                </span>
                <Link href={`/works/${w.id}`} className="text-xs text-accent flex items-center gap-0.5 hover:underline">
                  Buka <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editWork ? 'Edit Karya' : 'Karya Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Judul</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Japan 2027, Ramadan Series..." className="mt-1" />
            </div>
            <div>
              <Label>Deskripsi <span className="text-text-muted font-normal">(opsional)</span></Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tentang apa karya ini..." rows={3} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>Batal</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!title.trim() || saveMutation.isPending}>
                {saveMutation.isPending ? 'Menyimpan...' : editWork ? 'Simpan' : 'Buat'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Karya?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            Karya <span className="font-semibold">"{deleteTarget?.title}"</span> akan dihapus beserta semua item di dalamnya. Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
