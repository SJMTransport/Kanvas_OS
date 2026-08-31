'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { WorkspaceSwitcher } from './workspace-switcher'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Palette, LogOut, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TopbarProps {
  user: { email: string; full_name: string | null; avatar_url: string | null } | null
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter()
  const { sidebarCollapsed } = useWorkspaceStore()

  async function handleSignOut() {
    const supabase = createClient()
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('Gagal keluar. Coba lagi.')
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0].toUpperCase() ?? 'U'

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-14 bg-white border-b border-border z-20 flex items-center justify-between px-4 transition-[left] duration-200 ease-in-out',
        'lg:left-60',
        sidebarCollapsed && 'lg:left-16',
        'left-0'
      )}
    >
      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 rounded-sm bg-teal-500 flex items-center justify-center">
          <Palette className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-heading font-bold text-text-primary text-sm">Kanvas OS</span>
      </div>

      {/* Mobile workspace switcher */}
      <div className="lg:hidden">
        <WorkspaceSwitcher />
      </div>

      {/* Desktop: empty left — workspace switcher is in sidebar */}
      <div className="hidden lg:block" />

      {/* Right: user */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-sm p-1 hover:bg-subtle transition-colors">
            <Avatar className="w-7 h-7">
              <AvatarImage src={user?.avatar_url ?? ''} />
              <AvatarFallback className="bg-teal-50 text-teal-600 text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-text-primary leading-none">{user?.full_name ?? user?.email}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-text-primary">{user?.full_name}</p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2">
            <Settings className="w-4 h-4 text-teal-600" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-error focus:text-error">
            <LogOut className="w-4 h-4" /> Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
