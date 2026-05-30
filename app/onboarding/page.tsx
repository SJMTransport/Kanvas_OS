'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Palette, Plus, X, Check, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Platform } from '@/lib/types'

const PLATFORMS: { id: Platform; label: string; color: string; placeholder: string }[] = [
  { id: 'tiktok', label: 'TikTok', color: 'bg-black text-white', placeholder: '@username' },
  { id: 'instagram', label: 'Instagram', color: 'bg-instagram text-white', placeholder: '@username' },
  { id: 'youtube', label: 'YouTube', color: 'bg-youtube text-white', placeholder: 'Nama Channel' },
  { id: 'facebook', label: 'Facebook', color: 'bg-facebook text-white', placeholder: 'Nama Halaman' },
]

interface SocialEntry {
  platform: Platform
  handle: string
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function OnboardingPage() {
  const router = useRouter()
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace)
  const setRole = useWorkspaceStore((s) => s.setRole)

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [wsName, setWsName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Step 2
  const [socials, setSocials] = useState<SocialEntry[]>([])
  const [newHandles, setNewHandles] = useState<Record<Platform, string>>({
    tiktok: '', instagram: '', youtube: '', facebook: '',
  })

  // Auto slug from name
  useEffect(() => {
    if (wsName) setSlug(slugify(wsName))
  }, [wsName])

  // Debounce slug check
  const checkSlug = useCallback(async (value: string) => {
    if (!value) return
    setCheckingSlug(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('workspaces').select('id').eq('slug', value).limit(1)
      setSlugAvailable(!data || data.length === 0)
    } finally {
      setCheckingSlug(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { if (slug) checkSlug(slug) }, 500)
    return () => clearTimeout(t)
  }, [slug, checkSlug])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function addSocial(platform: Platform) {
    const handle = newHandles[platform].trim()
    if (!handle) return
    setSocials((prev) => [...prev, { platform, handle }])
    setNewHandles((prev) => ({ ...prev, [platform]: '' }))
  }

  function removeSocial(idx: number) {
    setSocials((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleFinish() {
    setSaving(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi tidak ditemukan, silakan login kembali')

      let logoUrl: string | null = null
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${user.id}/${slug}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('logos')
          .upload(path, logoFile, { upsert: true })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
          logoUrl = urlData.publicUrl
        }
      }

      const { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .insert({ name: wsName, slug, owner_id: user.id, logo_url: logoUrl })
        .select()
        .single()
      if (wsErr) throw wsErr

      const { error: memberErr } = await supabase.from('workspace_members').insert({
        workspace_id: ws.id,
        user_id: user.id,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      })
      if (memberErr) throw memberErr

      if (socials.length > 0) {
        const { error: socialErr } = await supabase.from('social_accounts').insert(
          socials.map((s) => ({ workspace_id: ws.id, platform: s.platform, handle: s.handle }))
        )
        if (socialErr) throw socialErr
      }

      setCurrentWorkspace(ws)
      setRole('owner')
      toast.success('Workspace berhasil dibuat!')
      router.push('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const canProceedStep1 = wsName.trim() && slug && slugAvailable === true

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading text-xl font-bold text-text-primary">Kanvas OS</span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                  s < step ? 'bg-success text-white' : s === step ? 'bg-accent text-white' : 'bg-border text-text-muted'
                )}>
                  {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                {s < 3 && <div className={cn('h-0.5 flex-1', s < step ? 'bg-success' : 'bg-border')} />}
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {step === 1 && 'Buat workspace Anda'}
            {step === 2 && 'Hubungkan akun sosial media'}
            {step === 3 && 'Semua siap!'}
          </p>
        </div>

        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-lg font-bold text-text-primary">Buat Workspace</h2>
                <p className="text-sm text-text-secondary mt-0.5">Workspace adalah rumah semua konten dan bisnis Anda.</p>
              </div>

              {/* Logo upload */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-surface cursor-pointer hover:border-accent transition-colors" onClick={() => document.getElementById('logo-input')?.click()}>
                  {logoPreview ? (
                    <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-5 h-5 text-text-muted" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Logo Workspace</p>
                  <p className="text-xs text-text-muted">Opsional · PNG, JPG maks 2MB</p>
                  <button className="text-xs text-accent hover:underline mt-0.5" onClick={() => document.getElementById('logo-input')?.click()}>
                    Pilih file
                  </button>
                </div>
                <input id="logo-input" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ws-name">Nama Workspace <span className="text-error">*</span></Label>
                <Input
                  id="ws-name"
                  placeholder="Contoh: Studio Kreatif Budi"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ws-slug">Slug URL <span className="text-error">*</span></Label>
                <div className="relative">
                  <Input
                    id="ws-slug"
                    placeholder="studio-kreatif-budi"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="pr-8"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingSlug && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
                    {!checkingSlug && slugAvailable === true && <Check className="w-4 h-4 text-success" />}
                    {!checkingSlug && slugAvailable === false && <X className="w-4 h-4 text-error" />}
                  </div>
                </div>
                {slugAvailable === false && <p className="text-xs text-error">Slug sudah digunakan, coba yang lain.</p>}
                {slugAvailable === true && <p className="text-xs text-success">Slug tersedia.</p>}
              </div>

              <Button className="w-full" onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Lanjut →
              </Button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-lg font-bold text-text-primary">Akun Sosial Media</h2>
                <p className="text-sm text-text-secondary mt-0.5">Tambahkan akun platform yang Anda kelola.</p>
              </div>

              <div className="space-y-3">
                {PLATFORMS.map((p) => (
                  <div key={p.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', p.color)}>{p.label}</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={p.placeholder}
                        value={newHandles[p.id]}
                        onChange={(e) => setNewHandles((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addSocial(p.id)}
                        className="flex-1"
                      />
                      <Button size="icon" variant="secondary" onClick={() => addSocial(p.id)} disabled={!newHandles[p.id].trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {socials.filter((s) => s.platform === p.id).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-md">
                        <span className="text-sm text-text-primary flex-1">{s.handle}</span>
                        <button onClick={() => removeSocial(socials.indexOf(s))} className="text-text-muted hover:text-error">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(3)} disabled={socials.length === 0}>
                  Lanjut →
                </Button>
                <Button variant="ghost" onClick={() => setStep(3)}>
                  Lewati
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-text-primary">Semua Siap!</h2>
                <p className="text-sm text-text-secondary mt-1">Workspace Anda sudah dikonfigurasi.</p>
              </div>

              <div className="bg-surface rounded-lg p-4 text-left space-y-2">
                <div className="flex items-center gap-2">
                  {logoPreview && <img src={logoPreview} alt="" className="w-8 h-8 rounded-md object-cover" />}
                  <div>
                    <p className="font-medium text-text-primary">{wsName}</p>
                    <p className="text-xs text-text-muted">/{slug}</p>
                  </div>
                </div>
                {socials.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {socials.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{s.handle}</Badge>
                    ))}
                  </div>
                )}
                {socials.length === 0 && <p className="text-xs text-text-muted">Belum ada akun sosial media.</p>}
              </div>

              <Button className="w-full h-11" onClick={handleFinish} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Mulai Gunakan Kanvas OS →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
