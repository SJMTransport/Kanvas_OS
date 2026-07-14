'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Inline Card Helpers
const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props}>
    {children}
  </div>
)

const CardHeader = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>
    {children}
  </div>
)

const CardContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0", className)} {...props}>
    {children}
  </div>
)

const CardFooter = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center p-6 pt-0", className)} {...props}>
    {children}
  </div>
)
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Shield, AlertCircle, ArrowLeft } from 'lucide-react'

const PLATFORM_THEMES: Record<string, {
  name: string
  color: string
  bg: string
  textColor: string
  logo: string
  scopes: string[]
}> = {
  tiktok: {
    name: 'TikTok Creator API',
    color: 'bg-black hover:bg-zinc-900 border-zinc-800',
    bg: 'bg-zinc-950 text-white',
    textColor: 'text-zinc-400',
    logo: '🎵',
    scopes: ['video.publish', 'user.info.basic', 'video.list'],
  },
  instagram: {
    name: 'Instagram Content Publishing API',
    color: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 border-transparent',
    bg: 'bg-purple-950/20 text-text-primary',
    textColor: 'text-text-secondary',
    logo: '📸',
    scopes: ['instagram_content_publish', 'instagram_basic', 'pages_show_list'],
  },
  facebook: {
    name: 'Facebook Graph API',
    color: 'bg-[#1877F2] hover:bg-[#166FE5] border-transparent',
    bg: 'bg-blue-950/10 text-text-primary',
    textColor: 'text-text-secondary',
    logo: '🔵',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'publish_video'],
  },
  youtube: {
    name: 'YouTube Partner API (Google OAuth)',
    color: 'bg-red-600 hover:bg-red-700 border-transparent',
    bg: 'bg-red-950/10 text-text-primary',
    textColor: 'text-text-secondary',
    logo: '🎥',
    scopes: ['youtube.upload', 'youtube.readonly', 'userinfo.profile'],
  },
}

function ConsentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const platform = searchParams.get('platform') || 'instagram'
  const workspaceId = searchParams.get('workspace_id')

  const theme = PLATFORM_THEMES[platform] || PLATFORM_THEMES.instagram
  const [username, setUsername] = useState('sjmtransportasi')
  const [displayName, setDisplayName] = useState('SJM Transportasi')

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 p-4 text-center">
        <AlertCircle className="w-12 h-12 text-error" />
        <h2 className="text-lg font-bold">Workspace ID Tidak Ditemukan</h2>
        <p className="text-sm text-text-muted">Silakan hubungkan ulang sosial media Anda dari halaman Pengaturan.</p>
        <Button className="mt-2" onClick={() => router.push('/settings')}>Kembali ke Pengaturan</Button>
      </div>
    )
  }

  function handleAuthorize() {
    const callbackUrl = `/api/auth/oauth-callback?platform=${platform}&workspace_id=${workspaceId}&username=${encodeURIComponent(username)}&display_name=${encodeURIComponent(displayName)}`
    router.push(callbackUrl)
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <button 
        onClick={() => router.push('/settings')} 
        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary mb-6 transition-colors font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Kembali
      </button>

      <Card className="border border-border/60 shadow-xl overflow-hidden rounded-2xl bg-white backdrop-blur-md">
        <div className={`p-6 flex items-center justify-between border-b border-border/40 ${theme.bg}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{theme.logo}</span>
            <div>
              <h1 className="font-heading font-bold text-sm leading-none">{theme.name}</h1>
              <p className="text-[10px] opacity-75 mt-1 font-mono">Status: Secure Sandbox Auth</p>
            </div>
          </div>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          </div>
        </div>

        <CardHeader className="p-6 pb-2">
          <div className="flex gap-2.5 p-3 rounded-lg bg-accent-light/5 border border-accent-light/10 text-xs text-text-secondary">
            <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-text-primary">Kanvas OS</span> meminta izin akses ke akun Anda untuk penjadwalan & posting otomatis.
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Akses yang Diminta:</p>
            <ul className="space-y-2 text-xs text-text-secondary">
              {theme.scopes.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                  <span>{s === 'video.publish' || s === 'instagram_content_publish' || s === 'publish_video' || s === 'youtube.upload'
                    ? 'Memposting video, gambar, dan caption secara otomatis sesuai jadwal'
                    : s.includes('readonly') || s.includes('basic') || s.includes('info')
                    ? 'Membaca data dasar profil (nama, avatar, handle)'
                    : 'Mengelola detail list postingan dan riwayat konten'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-border/40" />

          <div className="space-y-3">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Konfigurasi Profil Simulasi:</p>
            <div className="space-y-2.5 bg-subtle/40 p-3.5 rounded-lg border border-border/30">
              <div className="space-y-1">
                <Label htmlFor="username" className="text-[10px] uppercase font-bold text-text-secondary">Username Handle</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-text-muted">@</span>
                  <Input 
                    id="username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    className="h-8 text-xs pl-6 bg-white border border-border" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="displayName" className="text-[10px] uppercase font-bold text-text-secondary">Display Name</Label>
                <Input 
                  id="displayName" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  className="h-8 text-xs bg-white border border-border" 
                />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-6 pt-0 flex gap-2.5">
          <Button 
            className="flex-1 h-9 text-xs text-white" 
            style={{ backgroundColor: platform === 'youtube' ? '#DC2626' : platform === 'facebook' ? '#1877F2' : platform === 'instagram' ? '#A855F7' : '#000000' }}
            onClick={handleAuthorize}
          >
            Izinkan & Hubungkan Akun
          </Button>
          <Button variant="outline" className="flex-1 h-9 text-xs border border-border" onClick={() => router.push('/settings')}>
            Batalkan
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen text-xs text-text-muted">
        Memuat OAuth Simulator...
      </div>
    }>
      <ConsentForm />
    </Suspense>
  )
}
