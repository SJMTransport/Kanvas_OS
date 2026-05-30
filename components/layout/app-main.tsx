'use client'

import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { cn } from '@/lib/utils'

export function AppMain({ children }: { children: React.ReactNode }) {
  const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed)
  return (
    <main
      className={cn(
        'pt-14 pb-16 lg:pb-0 min-h-screen transition-all duration-200',
        collapsed ? 'lg:pl-16' : 'lg:pl-60'
      )}
    >
      {children}
    </main>
  )
}
