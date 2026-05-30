'use client'

import { useWorkspaceStore } from '@/lib/stores/workspaceStore'

export function useWorkspace() {
  const store = useWorkspaceStore()
  return {
    workspace: store.currentWorkspace,
    workspaceId: store.currentWorkspace?.id ?? null,
    role: store.role,
  }
}
