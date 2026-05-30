import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { AppMain } from '@/components/layout/app-main'
import { Toaster } from 'sonner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user = null
  let profile = null

  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user

    if (user) {
      const { data: p } = await supabase
        .from('users')
        .select('full_name, avatar_url, email')
        .eq('id', user.id)
        .single()
      profile = p
    }
  } catch {
    // Supabase init failed — redirect to login
    redirect('/login')
  }

  if (!user) redirect('/login')

  const userData = {
    email: user.email ?? '',
    full_name: profile?.full_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <Topbar user={userData} />
      <AppMain>{children}</AppMain>
      <BottomNav />
      <Toaster richColors position="top-right" />
    </div>
  )
}
