'use client'

import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { cn } from '@/lib/utils'

export function AppMain({ children }: { children: React.ReactNode }) {
  const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed)
  return (
    <main
      className={cn(
        'pt-14 pb-16 lg:pb-0 h-screen overflow-y-auto transition-[padding-left] duration-200 ease-in-out',
        collapsed ? 'lg:pl-16' : 'lg:pl-60'
      )}
    >
      {children}
    </main>
  )
}
