import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  try {
    const { data: hostSessions, error: hostError } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        id,
        session_name,
        minecraft_version,
        mod_loader,
        max_players,
        current_players,
        is_private,
        status,
        created_at,
        updated_at,
        session_participants!session_participants_session_id_fkey (
          user_id,
          status,
          joined_at,
          users!session_participants_user_id_fkey (
            name,
            custom_username,
            avatar_url
          )
        )
      `)
      .eq('host_user_id', user.id)
      .in('status', ['waiting', 'active'])

    if (hostError) {
      console.error('Error fetching host sessions:', hostError)
      throw hostError
    }

    const { data: participantSessions, error: participantError } = await supabaseAdmin
      .from('session_participants')
      .select(`
        status,
        joined_at,
        p2p_connection_data,
        game_sessions!session_participants_session_id_fkey (
          id,
          session_name,
          minecraft_version,
          mod_loader,
          max_players,
          current_players,
          is_private,
          status,
          created_at,
          updated_at,
          users!game_sessions_host_user_id_fkey (
            name,
            custom_username,
            avatar_url
          )
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['invited', 'joined'])

    if (participantError) {
      console.error('Error fetching participant sessions:', participantError)
      throw participantError
    }

    const { data: invitations, error: invitationsError } = await supabaseAdmin
      .from('p2p_invitations')
      .select(`
        id,
        invitation_data,
        expires_at,
        created_at,
        game_sessions!p2p_invitations_session_id_fkey (
          id,
          session_name,
          minecraft_version,
          mod_loader,
          max_players,
          current_players
        ),
        users!p2p_invitations_from_user_id_fkey (
          name,
          custom_username,
          avatar_url
        )
      `)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
    }

    const { data: friendsSessions, error: friendsError } = await supabaseAdmin
      .rpc('get_friends_public_sessions', { user_id: user.id })

    if (friendsError) {
      console.error('Error fetching friends sessions:', friendsError)
    }

    return NextResponse.json({
      hostSessions: hostSessions || [],
      participantSessions: participantSessions || [],
      invitations: invitations || [],
      friendsSessions: friendsSessions || []
    })
  } catch (error) {
    console.error('Error in p2p/sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

