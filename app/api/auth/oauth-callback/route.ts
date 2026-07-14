import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const platform = searchParams.get('platform')
    const workspaceId = searchParams.get('workspace_id')
    const username = searchParams.get('username') || 'sjmtransportasi'
    const displayName = searchParams.get('display_name') || 'SJM Transportasi'
    const avatarUrl = searchParams.get('avatar_url') || 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=150&auto=format&fit=crop&q=60'

    if (!platform || !workspaceId) {
      return NextResponse.redirect(new URL('/settings?error=missing_params', req.url))
    }

    const supabase = await createClient()

    // Generate mock tokens valid for 30 days
    const mockAccessToken = `mock_access_${platform}_${crypto.randomUUID().slice(0, 8)}`
    const mockRefreshToken = `mock_refresh_${platform}_${crypto.randomUUID().slice(0, 8)}`
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Check if social account already exists for this workspace and platform
    const { data: existing } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', platform)
      .maybeSingle()

    if (existing) {
      // Update existing social account
      const { error } = await supabase
        .from('social_accounts')
        .update({
          username,
          display_name: displayName,
          avatar_url: avatarUrl,
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_at: expiresAt,
          is_connected: true,
          url: `https://${platform}.com/@${username}`,
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Insert new social account connection
      const { error } = await supabase
        .from('social_accounts')
        .insert({
          workspace_id: workspaceId,
          platform,
          username,
          display_name: displayName,
          avatar_url: avatarUrl,
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          expires_at: expiresAt,
          is_connected: true,
          url: `https://${platform}.com/@${username}`,
        })

      if (error) throw error
    }

    return NextResponse.redirect(new URL(`/settings?connected=${platform}`, req.url))
  } catch (error: any) {
    console.error('OAuth Callback Error:', error)
    return NextResponse.redirect(new URL('/settings?error=auth_failed', req.url))
  }
}
