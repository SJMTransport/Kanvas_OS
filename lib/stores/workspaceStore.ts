import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/lib/types'

interface WorkspaceState {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  role: WorkspaceRole | null
  members: WorkspaceMember[]
  sidebarCollapsed: boolean
  setCurrentWorkspace: (workspace: Workspace) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  setRole: (role: WorkspaceRole) => void
  setMembers: (members: WorkspaceMember[]) => void
  setSidebarCollapsed: (v: boolean) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      workspaces: [],
      role: null,
      members: [],
      sidebarCollapsed: false,
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      setRole: (role) => set({ role }),
      setMembers: (members) => set({ members }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      reset: () => set({ currentWorkspace: null, workspaces: [], role: null, members: [], sidebarCollapsed: false }),
    }),
    { name: 'kanvas-workspace' }
  )
)
