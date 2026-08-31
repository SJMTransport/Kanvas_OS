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
  const [step, setStep] = useState<'login' | 'consent'>('login')
  const [username, setUsername] = useState('sjmtransportasi')
  const [displayName, setDisplayName] = useState('SJM Transportasi')

  // Mock input fields for standard login forms
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

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

  function proceedWithLoginInfo(u: string, d: string) {
    setUsername(u)
    setDisplayName(d)
    setStep('consent')
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <button 
        onClick={() => {
          if (step === 'consent') setStep('login')
          else router.push('/settings')
        }} 
        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary mb-6 transition-colors font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Kembali
      </button>

      {step === 'login' ? (
        /* STEP 1: REALISTIC PLATFORM LOGIN SCREEN */
        <Card className="border border-border/60 shadow-xl overflow-hidden rounded-2xl bg-white">
          
          {/* GOOGLE SIGN IN SCREEN (YouTube) */}
          {platform === 'youtube' && (
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                {/* Google Multi-colored mock logo */}
                <div className="flex justify-center items-center gap-0.5 text-xl font-bold font-sans">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">o</span>
                  <span className="text-[#FBBC05]">o</span>
                  <span className="text-[#4285F4]">g</span>
                  <span className="text-[#34A853]">l</span>
                  <span className="text-[#EA4335]">e</span>
                </div>
                <h2 className="text-xl font-medium font-sans text-[#202124]">Sign in</h2>
                <p className="text-xs text-[#5f6368]">to continue to <span className="font-semibold text-text-primary">Kanvas OS</span></p>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs text-[#202124] font-medium block">Pilih akun Anda:</p>
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                  <button 
                    onClick={() => proceedWithLoginInfo('sjmtransport_yt', 'SJM Transportasi (YouTube)')}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-subtle/50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">S</div>
                    <div>
                      <p className="text-xs font-semibold text-[#3c4043]">SJM Transportasi</p>
                      <p className="text-[10px] text-[#70757a]">sjmtransport.official@gmail.com</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => proceedWithLoginInfo('naufalaudya_yt', 'Naufal Audya (YouTube)')}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-subtle/50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">N</div>
                    <div>
                      <p className="text-xs font-semibold text-[#3c4043]">Naufal Audya</p>
                      <p className="text-[10px] text-[#70757a]">naufalaudya@gmail.com</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => proceedWithLoginInfo('new_creator_yt', 'Creator Baru (YouTube)')}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-subtle/50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-100 border border-border text-text-secondary flex items-center justify-center font-bold text-xs">🔑</div>
                    <div>
                      <p className="text-xs font-medium text-[#70757a]">Gunakan akun lain...</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-[#70757a] flex justify-between pt-6 font-sans">
                <span>Indonesia</span>
                <div className="flex gap-3">
                  <span className="hover:underline cursor-pointer">Bantuan</span>
                  <span className="hover:underline cursor-pointer">Privasi</span>
                  <span className="hover:underline cursor-pointer">Persyaratan</span>
                </div>
              </div>
            </div>
          )}

          {/* FACEBOOK LOGIN SCREEN (Instagram & Facebook) */}
          {(platform === 'instagram' || platform === 'facebook') && (
            <div className="p-0">
              <div className="bg-[#1877F2] text-white p-5 text-center relative">
                <h2 className="text-2xl font-bold font-sans tracking-tight">facebook</h2>
                <p className="text-[10px] opacity-80 mt-1">Masuk ke Facebook untuk menyambungkan {platform === 'instagram' ? 'Instagram' : 'Facebook Page'} Anda ke Kanvas OS</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Input 
                    type="text" 
                    placeholder="Email atau Nomor Telepon" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-10 text-xs bg-slate-50 border border-border" 
                  />
                  <Input 
                    type="password" 
                    placeholder="Kata Sandi" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-10 text-xs bg-slate-50 border border-border" 
                  />
                </div>

                <Button 
                  onClick={() => proceedWithLoginInfo(loginEmail.split('@')[0] || 'sjmtransportasi', loginEmail.split('@')[0] || 'SJM Transportasi')}
                  className="w-full h-10 bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold font-sans rounded-md"
                >
                  Masuk
                </Button>

                <div className="text-center pt-2">
                  <span className="text-[11px] text-[#1877F2] hover:underline cursor-pointer">Lupa kata sandi?</span>
                </div>

                <hr className="border-border/60" />

                <div className="pt-2 text-center">
                  <p className="text-[10px] text-text-secondary mb-2">Atau gunakan akun tersimpan di browser ini:</p>
                  <Button 
                    variant="outline" 
                    onClick={() => proceedWithLoginInfo('sjmtransportasi', 'SJM Transportasi')}
                    className="w-full h-10 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/5 text-xs font-bold"
                  >
                    Lanjutkan sebagai SJM Transportasi
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TIKTOK LOGIN SCREEN */}
          {platform === 'tiktok' && (
            <div className="p-8 space-y-6">
              <div className="text-center space-y-1">
                <span className="text-4xl block">🎵</span>
                <h2 className="text-xl font-bold font-sans">Masuk ke TikTok</h2>
                <p className="text-xs text-text-muted">Sambungkan akun TikTok Creator Anda ke Kanvas OS</p>
              </div>

              <div className="space-y-2 pt-2">
                {[
                  { text: 'Lanjutkan dengan Google', icon: '🔑', action: () => proceedWithLoginInfo('sjm_tiktok_google', 'SJM Transportasi (TikTok)') },
                  { text: 'Lanjutkan dengan Facebook', icon: '🔵', action: () => proceedWithLoginInfo('sjm_tiktok_fb', 'SJM Transportasi (Meta)') },
                  { text: 'Gunakan nomor HP / email / username', icon: '👤', action: () => proceedWithLoginInfo('sjmtransportasi', 'SJM Transportasi') }
                ].map((opt, idx) => (
                  <button 
                    key={idx}
                    onClick={opt.action}
                    className="w-full h-10 border border-border rounded-md px-4 flex items-center justify-between text-xs font-semibold text-text-primary hover:bg-subtle transition-colors"
                  >
                    <span>{opt.icon}</span>
                    <span className="flex-1 text-center pr-4">{opt.text}</span>
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-text-muted text-center pt-4">
                Dengan melanjutkan, Anda menyetujui Ketentuan Layanan TikTok dan menyatakan bahwa Anda telah membaca Kebijakan Privasi TikTok.
              </p>
            </div>
          )}
        </Card>
      ) : (
        /* STEP 2: CONSENT AND SCOPES PERMISSION SCREEN */
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
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Konfigurasi Profil Terhubung:</p>
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
      )}
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
