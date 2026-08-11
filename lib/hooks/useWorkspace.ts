'use client'

import { useWorkspaceStore } from '@/lib/stores/workspaceStore'

export function useWorkspace() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace)
  const role = useWorkspaceStore((s) => s.role)
  return {
    workspace,
    workspaceId: workspace?.id ?? null,
    role,
  }
}
