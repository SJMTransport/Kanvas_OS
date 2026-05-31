import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { AppMain } from '@/components/layout/app-main'
import { Toaster } from 'sonner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createClient()
    // getSession reads from cookie — no network call, fast
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) redirect('/login')

    const user = session.user
    // user_metadata has name+avatar from Google OAuth; fall back to email
    const userData = {
      email: user.email ?? '',
      full_name: (user.user_metadata?.full_name as string | null) ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string | null) ?? null,
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
  } catch {
    redirect('/login')
  }
}
