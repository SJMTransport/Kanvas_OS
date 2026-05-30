'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/hooks/useWorkspace'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'

const PLATFORM_OPTIONS = ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter', 'linkedin']

export default function SettingsPage() {
  const { workspaceId, role } = useWorkspace()
  const queryClient = useQueryClient()

  // ---- Profile ----
  const [profileSaving, setProfileSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      return data as { id: string; full_name: string | null; avatar_url: string | null; email: string } | null
    },
  })

  useEffect(() => { if (profile?.full_name) setFullName(profile.full_name) }, [profile])

  async function saveProfile() {
    setProfileSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('users').update({ full_name: fullName }).eq('id', user!.id)
      if (error) throw error
      toast.success('Profil tersimpan!')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    } catch { toast.error('Gagal menyimpan profil') } finally { setProfileSaving(false) }
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const ext = file.name.split('.').pop()
      const path = `avatars/${user!.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user!.id)
      toast.success('Avatar diupload!')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    } catch { toast.error('Gagal upload avatar') } finally { setAvatarUploading(false) }
  }

  // ---- Workspace ----
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceSaving, setWorkspaceSaving] = useState(false)

  const { data: workspace } = useQuery({
    queryKey: ['workspace-detail', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null
      const supabase = createClient()
      const { data } = await supabase.from('workspaces').select('*').eq('id', workspaceId).single()
      return data as { id: string; nama: string; slug: string; logo_url: string | null } | null
    },
    enabled: !!workspaceId,
  })

  useEffect(() => { if (workspace?.nama) setWorkspaceName(workspace.nama) }, [workspace])

  async function saveWorkspace() {
    if (!workspaceId) return
    setWorkspaceSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('workspaces').update({ nama: workspaceName }).eq('id', workspaceId)
      if (error) throw error
      toast.success('Workspace tersimpan!')
      queryClient.invalidateQueries({ queryKey: ['workspace-detail', workspaceId] })
    } catch { toast.error('Gagal menyimpan') } finally { setWorkspaceSaving(false) }
  }

  // ---- Billing ----
  const [billing, setBilling] = useState<Record<string, string>>({
    billing_name: '', billing_address: '', billing_city: '', billing_phone: '',
    billing_email: '', billing_npwp: '', billing_bank_name: '', billing_bank_account: '', billing_bank_holder: '',
  })
  const [billingSaving, setBillingSaving] = useState(false)

  const { data: billingData } = useQuery({
    queryKey: ['billing', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null
      const supabase = createClient()
      const { data } = await supabase.from('workspaces').select('billing_name,billing_address,billing_city,billing_phone,billing_email,billing_npwp,billing_bank_name,billing_bank_account,billing_bank_holder').eq('id', workspaceId).single()
      return data as Record<string, string> | null
    },
    enabled: !!workspaceId,
  })

  useEffect(() => { if (billingData) setBilling((prev) => ({ ...prev, ...billingData })) }, [billingData])

  async function saveBilling() {
    if (!workspaceId) return
    setBillingSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('workspaces').update(billing).eq('id', workspaceId)
      if (error) throw error
      toast.success('Billing info tersimpan!')
    } catch { toast.error('Gagal menyimpan') } finally { setBillingSaving(false) }
  }

  // ---- Sosmed ----
  const { data: socials } = useQuery({
    queryKey: ['social-accounts', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase.from('social_accounts').select('*').eq('workspace_id', workspaceId)
      return (data ?? []) as { id: string; platform: string; username: string; url: string | null }[]
    },
    enabled: !!workspaceId,
  })

  const [addingSocial, setAddingSocial] = useState(false)
  const [newSocial, setNewSocial] = useState({ platform: 'tiktok', username: '', url: '' })

  async function addSocial() {
    if (!workspaceId || !newSocial.username) return
    const supabase = createClient()
    const { error } = await supabase.from('social_accounts').insert({ workspace_id: workspaceId, ...newSocial, url: newSocial.url || null })
    if (error) toast.error('Gagal menambah akun')
    else {
      toast.success('Akun ditambahkan!')
      queryClient.invalidateQueries({ queryKey: ['social-accounts', workspaceId] })
      setNewSocial({ platform: 'tiktok', username: '', url: '' })
      setAddingSocial(false)
    }
  }

  async function deleteSocial(id: string) {
    const supabase = createClient()
    await supabase.from('social_accounts').delete().eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['social-accounts', workspaceId] })
    toast.success('Akun dihapus')
  }

  // ---- Members ----
  const { data: members } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase.from('workspace_members').select('user_id, role, accepted_at, users(full_name, email, avatar_url)').eq('workspace_id', workspaceId)
      return (data ?? []) as unknown as { user_id: string; role: string; accepted_at: string | null; users: { full_name: string | null; email: string; avatar_url: string | null } }[]
    },
    enabled: !!workspaceId,
  })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-text-primary">Pengaturan</h1>
        <p className="text-sm text-text-secondary mt-0.5">Kelola profil, workspace, dan tim kamu</p>
      </div>

      <Tabs defaultValue="profil">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="billing">Billing Info</TabsTrigger>
          <TabsTrigger value="sosmed">Akun Sosmed</TabsTrigger>
          <TabsTrigger value="tim">Tim</TabsTrigger>
        </TabsList>

        {/* Profil */}
        <TabsContent value="profil">
          <div className="bg-white border border-border rounded-xl p-5 space-y-5">
            {profileLoading ? <Skeleton className="h-32 w-full" /> : (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-lg">{(profile?.full_name ?? profile?.email ?? '?')[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <label className="absolute -bottom-1 -right-1 bg-accent text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-accent/80">
                      {avatarUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
                    </label>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{profile?.full_name ?? 'Nama belum diisi'}</p>
                    <p className="text-sm text-text-muted">{profile?.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Nama Lengkap</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama kamu" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={profile?.email ?? ''} disabled className="bg-subtle text-text-muted" />
                  <p className="text-xs text-text-muted">Email tidak dapat diubah</p>
                </div>
                <Button onClick={saveProfile} disabled={profileSaving}>
                  {profileSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan Profil
                </Button>
              </>
            )}
          </div>
        </TabsContent>

        {/* Workspace */}
        <TabsContent value="workspace">
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Workspace</Label>
              <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={workspace?.slug ?? ''} disabled className="bg-subtle text-text-muted font-mono" />
              <p className="text-xs text-text-muted">Slug tidak dapat diubah setelah dibuat</p>
            </div>
            {role === 'owner' && (
              <Button onClick={saveWorkspace} disabled={workspaceSaving}>
                {workspaceSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan Workspace
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <p className="text-xs text-text-muted">Informasi ini akan muncul di header PDF quotation dan invoice.</p>

            {[
              { key: 'billing_name', label: 'Nama / Nama Perusahaan', placeholder: 'PT Kreator Jaya' },
              { key: 'billing_address', label: 'Alamat', placeholder: 'Jl. Contoh No. 1' },
              { key: 'billing_city', label: 'Kota, Kode Pos', placeholder: 'Jakarta, 12345' },
              { key: 'billing_phone', label: 'Nomor Telepon', placeholder: '+62 812-xxxx-xxxx' },
              { key: 'billing_email', label: 'Email', placeholder: 'billing@kreator.id' },
              { key: 'billing_npwp', label: 'NPWP (optional)', placeholder: '00.000.000.0-000.000' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input value={billing[key] ?? ''} onChange={(e) => setBilling((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />
              </div>
            ))}

            <div className="pt-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Rekening Bank</p>
              <div className="space-y-2">
                <Input value={billing.billing_bank_name ?? ''} onChange={(e) => setBilling((p) => ({ ...p, billing_bank_name: e.target.value }))} placeholder="Nama Bank (BCA, BRI, Mandiri...)" />
                <Input value={billing.billing_bank_account ?? ''} onChange={(e) => setBilling((p) => ({ ...p, billing_bank_account: e.target.value }))} placeholder="Nomor Rekening" />
                <Input value={billing.billing_bank_holder ?? ''} onChange={(e) => setBilling((p) => ({ ...p, billing_bank_holder: e.target.value }))} placeholder="Atas Nama" />
              </div>
            </div>

            <Button onClick={saveBilling} disabled={billingSaving}>
              {billingSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan Billing Info
            </Button>
          </div>
        </TabsContent>

        {/* Sosmed */}
        <TabsContent value="sosmed">
          <div className="space-y-3">
            {(socials ?? []).map((s) => (
              <div key={s.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-text-muted uppercase">{s.platform}</span>
                  <p className="text-sm font-medium text-text-primary">@{s.username}</p>
                  {s.url && <p className="text-xs text-text-muted truncate max-w-xs">{s.url}</p>}
                </div>
                <button onClick={() => deleteSocial(s.id)} className="text-error hover:text-error/80 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {addingSocial ? (
              <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Platform</Label>
                    <Select value={newSocial.platform} onValueChange={(v) => setNewSocial((p) => ({ ...p, platform: v }))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Username</Label>
                    <Input value={newSocial.username} onChange={(e) => setNewSocial((p) => ({ ...p, username: e.target.value }))} placeholder="username" className="h-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">URL (optional)</Label>
                  <Input value={newSocial.url} onChange={(e) => setNewSocial((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." className="h-8 text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addSocial}>Tambah</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingSocial(false)}>Batal</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAddingSocial(true)}>
                <Plus className="w-4 h-4 mr-1" /> Tambah Akun Sosmed
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Tim */}
        <TabsContent value="tim">
          <div className="space-y-3">
            {(members ?? []).map((m) => (
              <div key={m.user_id} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarImage src={m.users?.avatar_url ?? undefined} />
                  <AvatarFallback>{(m.users?.full_name ?? m.users?.email ?? '?')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{m.users?.full_name ?? m.users?.email}</p>
                  <p className="text-xs text-text-muted">{m.users?.email} · <span className="capitalize">{m.role}</span></p>
                  {!m.accepted_at && <span className="text-[10px] bg-yellow-100 text-yellow-700 rounded px-1.5 py-0.5">Pending</span>}
                </div>
              </div>
            ))}

            {role === 'owner' && (
              <div className="bg-white border border-border rounded-xl p-4">
                <p className="text-sm font-semibold text-text-primary mb-3">Undang Anggota</p>
                <InviteForm workspaceId={workspaceId ?? ''} onInvited={() => queryClient.invalidateQueries({ queryKey: ['members', workspaceId] })} />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InviteForm({ workspaceId, onInvited }: { workspaceId: string; onInvited: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')

  async function invite() {
    if (!email || !workspaceId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Find user by email
      const { data: targetUser } = await supabase.from('users').select('id').eq('email', email).single()

      if (!targetUser) {
        // Generate invite link instead
        const token = Math.random().toString(36).slice(2, 18)
        setInviteLink(`${window.location.origin}/join?workspace=${workspaceId}&token=${token}&role=${role}`)
        toast.success('Link invite dibuat! Kirimkan ke anggota.')
        return
      }

      const { error } = await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: targetUser.id,
        role,
        invited_by: user?.id,
        accepted_at: null,
      })
      if (error) throw error
      toast.success(`Undangan dikirim ke ${email}!`)
      setEmail('')
      onInvited()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengundang')
    } finally {
      setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@anggota.com" className="h-8 text-sm" />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" onClick={invite} disabled={loading || !email}>
        {loading && <Loader2 className="w-3 h-3 animate-spin mr-1" />} Kirim Undangan
      </Button>
      {inviteLink && (
        <div className="text-xs bg-subtle rounded p-2 break-all text-text-muted">
          <p className="font-semibold mb-1">Link Invite:</p>
          <p>{inviteLink}</p>
          <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Link disalin!') }} className="text-accent mt-1">Salin Link</button>
        </div>
      )}
    </div>
  )
}
