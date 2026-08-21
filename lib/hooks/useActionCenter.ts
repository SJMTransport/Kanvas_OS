import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  buildApprovalActionItems,
  buildContentDateActionItems,
  buildReadyToPublishActionItems,
  buildInvoiceActionItems,
  buildPaymentActionItems,
  sortActionItems,
  isPublishingFullyDone,
  type ActionItem,
} from '@/lib/operations/rules'

// Phase 5 — Action Center data source. Workspace-wide (not date-range
// bound like Calendar), safe-queried the same way so one failing source
// never blanks the whole panel. Every judgment (overdue, aging, ready)
// is delegated to lib/operations/rules.ts — this hook only fetches rows.

async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`Action Center: failed to load ${label}:`, err)
    return fallback
  }
}

export function useActionCenter(workspaceId: string | null) {
  return useQuery<ActionItem[]>({
    queryKey: ['action-center', workspaceId],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createClient()

      const [videos, invoices, payments] = await Promise.all([
        safeQuery('videos', async () => {
          const { data, error } = await supabase
            .from('videos')
            .select('id, judul, no_video, status, production_status, approval_status, publishing_status, approval_waiting_since, tanggal_shooting, deadline_posting, deal_id')
            .eq('workspace_id', workspaceId)
            .not('status', 'in', '("archived")')
          if (error) throw error
          return data ?? []
        }, [] as any[]),

        safeQuery('invoices', async () => {
          const { data, error } = await supabase
            .from('invoices')
            .select('id, invoice_number, total, due_date, status, deal_id, brands(name, nama_brand)')
            .eq('workspace_id', workspaceId)
            .not('status', 'in', '("paid","cancelled")')
          if (error) throw error
          return data ?? []
        }, [] as any[]),

        safeQuery('payments', async () => {
          const { data, error } = await supabase
            .from('deal_payments')
            .select('id, amount, payment_type, due_date, status, deal_id, deals!inner(title, nama_campaign, workspace_id, brands(name, nama_brand))')
            .eq('deals.workspace_id', workspaceId)
            .neq('status', 'paid')
          if (error) throw error
          return data ?? []
        }, [] as any[]),
      ])

      const videoIds = videos.map((v: any) => v.id)
      const scheduleStatusesByVideo = await safeQuery('publishing completion check', async () => {
        if (videoIds.length === 0) return {} as Record<string, string[]>
        const { data, error } = await supabase
          .from('video_platform_schedules')
          .select('video_id, status')
          .in('video_id', videoIds)
        if (error) throw error
        const map: Record<string, string[]> = {}
        for (const row of data ?? []) {
          (map[row.video_id] ??= []).push(row.status)
        }
        return map
      }, {} as Record<string, string[]>)

      const items: ActionItem[] = [
        ...buildApprovalActionItems(videos),
        ...buildContentDateActionItems(videos, (id) => isPublishingFullyDone(scheduleStatusesByVideo[id])),
        ...buildReadyToPublishActionItems(videos),
        ...buildInvoiceActionItems(
          invoices.map((inv: any) => ({ ...inv, brandName: inv.brands?.name || inv.brands?.nama_brand || null }))
        ),
        ...buildPaymentActionItems(
          payments.map((p: any) => ({
            ...p,
            dealTitle: p.deals?.title || p.deals?.nama_campaign || null,
            brandName: p.deals?.brands?.name || p.deals?.brands?.nama_brand || null,
          }))
        ),
      ]

      return sortActionItems(items)
    },
  })
}
