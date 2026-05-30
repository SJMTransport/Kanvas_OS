import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name)')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .limit(1)
    .single()

  if (!member) redirect('/onboarding')

  const workspaceId = member.workspace_id
  const role = member.role as string
  const today = new Date().toISOString().split('T')[0]

  // Today's schedules
  const { data: todaySchedules } = await supabase
    .from('video_platform_schedules')
    .select('*, videos(id, judul, thumbnail_url, status, workspace_id)')
    .eq('tanggal_tayang', today)
    .order('jam_post', { ascending: true })

  const filteredSchedules = (todaySchedules ?? []).filter(
    (s) => (s.videos as { workspace_id: string } | null)?.workspace_id === workspaceId
  )

  // Pipeline counts
  const { count: totalVideos } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  const { count: scheduledCount } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'scheduled')

  const startOfMonth = new Date(); startOfMonth.setDate(1)
  const { count: liveCount } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'live')
    .gte('updated_at', startOfMonth.toISOString())

  const { count: draftCount } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('status', ['ide', 'scripting', 'produksi', 'editing'])

  // Follow-up reminders
  const { data: followups } = await supabase
    .from('brands')
    .select('id, nama_brand, status, next_followup_date, industri')
    .eq('workspace_id', workspaceId)
    .not('status', 'in', '("selesai","cold")')
    .lte('next_followup_date', today)
    .order('next_followup_date', { ascending: true })
    .limit(5)

  // Invoice alerts (owner only)
  let overdueInvoices: { id: string; invoice_number: string; total: number; due_date: string; brands: { nama_brand: string } | null }[] = []
  if (role === 'owner') {
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, due_date, brands(nama_brand)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(5)
    overdueInvoices = (data ?? []) as unknown as typeof overdueInvoices
  }

  // Recent activity
  const { data: recentVideos } = await supabase
    .from('videos')
    .select('id, judul, status, updated_at, created_by, users(full_name)')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(5)

  return (
    <DashboardClient
      userName={profile?.full_name ?? user.email ?? 'Kreator'}
      role={role}
      todaySchedules={filteredSchedules}
      pipeline={{ total: totalVideos ?? 0, scheduled: scheduledCount ?? 0, live: liveCount ?? 0, draft: draftCount ?? 0 }}
      followups={followups ?? []}
      overdueInvoices={overdueInvoices}
      recentVideos={(recentVideos ?? []) as unknown as RecentVideo[]}
    />
  )
}

export interface RecentVideo {
  id: string
  judul: string
  status: string
  updated_at: string
  created_by: string | null
  users: { full_name: string | null } | null
}
