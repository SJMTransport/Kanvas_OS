import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/lib/types'

interface WorkspaceState {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  role: WorkspaceRole | null
  members: WorkspaceMember[]
  setCurrentWorkspace: (workspace: Workspace) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  setRole: (role: WorkspaceRole) => void
  setMembers: (members: WorkspaceMember[]) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      workspaces: [],
      role: null,
      members: [],
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      setRole: (role) => set({ role }),
      setMembers: (members) => set({ members }),
      reset: () => set({ currentWorkspace: null, workspaces: [], role: null, members: [] }),
    }),
    { name: 'kanvas-workspace' }
  )
)
