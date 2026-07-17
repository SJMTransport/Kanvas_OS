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
import { Search, Plus, MapPin, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Location } from '@/lib/types/domain'

export default function LocationsPage() {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editLoc, setEditLoc] = useState<Location | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [notes, setNotes] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['locations', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('locations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
      return (data ?? []) as Location[]
    },
    enabled: !!workspaceId,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !name.trim()) return
      const supabase = createClient()
      const payload = {
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        notes: notes.trim() || null,
      }
      if (editLoc) {
        await supabase.from('locations').update(payload).eq('id', editLoc.id)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('locations').insert({ ...payload, workspace_id: workspaceId, created_by: user?.id ?? null })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', workspaceId] })
      closeDialog()
      toast.success(editLoc ? 'Lokasi diperbarui' : 'Lokasi ditambahkan')
    },
    onError: () => toast.error('Gagal menyimpan'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      await supabase.from('locations').delete().eq('id', id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', workspaceId] })
      setDeleteTarget(null)
      toast.success('Lokasi dihapus')
    },
    onError: () => toast.error('Gagal menghapus'),
  })

  function openAdd() {
    setEditLoc(null)
    setName(''); setAddress(''); setCity(''); setCountry(''); setNotes('')
    setDialogOpen(true)
  }

  function openEdit(l: Location) {
    setEditLoc(l)
    setName(l.name); setAddress(l.address ?? ''); setCity(l.city ?? ''); setCountry(l.country ?? ''); setNotes(l.notes ?? '')
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditLoc(null)
  }

  const filtered = locations.filter((l) =>
    [l.name, l.city, l.country].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Lokasi</h1>
          <p className="text-sm text-text-secondary mt-0.5">Tempat-tempat bermakna untuk karya kreatif kamu</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Lokasi Baru
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input placeholder="Cari lokasi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-surface rounded-xl border border-border">
          <MapPin className="w-12 h-12 text-border mb-3" />
          <p className="text-sm text-text-muted">{search ? 'Tidak ada lokasi yang cocok' : 'Belum ada lokasi. Tambahkan tempat favorit kamu!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <div key={l.id} className="group bg-white border border-border rounded-xl p-4 hover:border-accent hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MapPin className="w-4 h-4 text-accent shrink-0" />
                  <h3 className="font-heading font-semibold text-text-primary truncate">{l.name}</h3>
                </div>
                <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(l)} className="p-1 rounded hover:bg-surface"><Pencil className="w-3.5 h-3.5 text-text-muted" /></button>
                  <button onClick={() => setDeleteTarget(l)} className="p-1 rounded hover:bg-error/10"><Trash2 className="w-3.5 h-3.5 text-error" /></button>
                </div>
              </div>
              {(l.city || l.country) && (
                <p className="text-xs text-text-secondary ml-6">{[l.city, l.country].filter(Boolean).join(', ')}</p>
              )}
              {l.notes && <p className="text-xs text-text-muted mt-2 line-clamp-2">{l.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editLoc ? 'Edit Lokasi' : 'Lokasi Baru'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Nama Lokasi</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Tsukiji Market, Cafe Kopi..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kota</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tokyo" className="mt-1" />
              </div>
              <div>
                <Label>Negara</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Japan" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Alamat <span className="text-text-muted font-normal">(opsional)</span></Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap" className="mt-1" />
            </div>
            <div>
              <Label>Catatan <span className="text-text-muted font-normal">(opsional)</span></Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Golden hour jam 5 sore, parkir mudah..." rows={2} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>Batal</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending}>
                {saveMutation.isPending ? 'Menyimpan...' : editLoc ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Lokasi?</DialogTitle></DialogHeader>
          <p className="text-sm text-text-secondary">Lokasi <span className="font-semibold">"{deleteTarget?.name}"</span> akan dihapus. Tindakan ini tidak bisa dibatalkan.</p>
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
