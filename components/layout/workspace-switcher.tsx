'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/lib/types'

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter()
  const { currentWorkspace, workspaces, setCurrentWorkspace, setWorkspaces, setRole } = useWorkspaceStore()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function loadWorkspaces() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('workspace_members')
        .select('role, workspaces(*)')
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)

      if (!data) return
      const wsList = data.map((m) => m.workspaces as unknown as Workspace)
      setWorkspaces(wsList)
      if (!currentWorkspace && wsList.length > 0) {
        setCurrentWorkspace(wsList[0])
        setRole(data[0].role as 'owner' | 'manager' | 'editor')
      }
    }
    loadWorkspaces()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function switchWorkspace(ws: Workspace) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', ws.id)
      .eq('user_id', user.id)
      .single()

    setCurrentWorkspace(ws)
    if (member) setRole(member.role as 'owner' | 'manager' | 'editor')
    setOpen(false)
    router.refresh()
  }

  const ws = currentWorkspace
  const initials = ws?.name?.slice(0, 2).toUpperCase() ?? 'KO'

  if (collapsed) {
    return (
      <Avatar className="w-8 h-8 cursor-pointer" onClick={() => setOpen(true)}>
        <AvatarImage src={ws?.logo_url ?? ''} />
        <AvatarFallback className="bg-accent-light text-accent text-xs font-bold">{initials}</AvatarFallback>
      </Avatar>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-subtle w-full text-left transition-colors">
          <Avatar className="w-6 h-6 shrink-0">
            <AvatarImage src={ws?.logo_url ?? ''} />
            <AvatarFallback className="bg-accent-light text-accent text-[10px] font-bold">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-text-primary truncate flex-1">{ws?.name ?? 'Pilih Workspace'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.id} onClick={() => switchWorkspace(w)} className="gap-2">
            <Avatar className="w-5 h-5 shrink-0">
              <AvatarImage src={w.logo_url ?? ''} />
              <AvatarFallback className="text-[9px] bg-accent-light text-accent">{w.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate">{w.name}</span>
            {w.id === currentWorkspace?.id && <Check className="w-3.5 h-3.5 text-accent" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/onboarding')} className="gap-2 text-accent">
          <Plus className="w-4 h-4" />
          Workspace Baru
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
