'use client'

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export const TAG_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#D4860A', // amber (brand)
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280', // gray (default)
]

export interface WorkspaceTag {
  id: string
  workspace_id: string
  name: string
  color: string
}

export function useWorkspaceTags(workspaceId: string | null) {
  return useQuery<WorkspaceTag[]>({
    queryKey: ['workspace-tags', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data } = await supabase.from('workspace_tags').select('*').eq('workspace_id', workspaceId)
      return (data ?? []) as WorkspaceTag[]
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpsertWorkspaceTag(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!workspaceId) return
      const supabase = createClient()
      await supabase.from('workspace_tags').upsert(
        { workspace_id: workspaceId, name, color },
        { onConflict: 'workspace_id,name' }
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-tags', workspaceId] }),
  })
}

export function tagColor(tags: WorkspaceTag[] | undefined, name: string): string {
  return tags?.find((t) => t.name === name)?.color ?? '#6B7280'
}

export function TagChip({ name, color, className }: { name: string; color?: string; className?: string }) {
  const c = color ?? '#6B7280'
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', className)}
      style={{ backgroundColor: `${c}20`, color: c, border: `1px solid ${c}40` }}
    >
      {name}
    </span>
  )
}
