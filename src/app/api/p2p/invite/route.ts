import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { sessionId, friendId, invitationData = {} } = await request.json()
  if (!sessionId || !friendId) {
    return NextResponse.json({ error: 'Session ID and friend ID are required' }, { status: 400 })
  }

  try {
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .select('id, host_user_id, max_players, current_players, status')
      .eq('id', sessionId)
      .eq('host_user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Game session not found or you are not the host' }, { status: 404 })
    }

    if (session.status === 'closed') {
      return NextResponse.json({ error: 'Game session is closed' }, { status: 400 })
    }

    const { data: friendship, error: friendshipError } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .maybeSingle()

    if (friendshipError || !friendship) {
      return NextResponse.json({ error: 'User is not your friend' }, { status: 400 })
    }

    if (session.current_players >= session.max_players) {
      return NextResponse.json({ error: 'Game session is full' }, { status: 400 })
    }

    const { data: existingInvitation } = await supabaseAdmin
      .from('p2p_invitations')
      .select('id')
      .eq('session_id', sessionId)
      .eq('to_user_id', friendId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInvitation) {
      return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 })
    }

    const { data: existingParticipant } = await supabaseAdmin
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', friendId)
      .in('status', ['invited', 'joined'])
      .maybeSingle()

    if (existingParticipant) {
      return NextResponse.json({ error: 'User is already invited or joined' }, { status: 400 })
    }

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('p2p_invitations')
      .insert([{
        session_id: sessionId,
        from_user_id: user.id,
        to_user_id: friendId,
        invitation_data: invitationData,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }])
      .select(`
        id,
        invitation_data,
        expires_at,
        created_at,
        game_sessions!p2p_invitations_session_id_fkey (
          session_name,
          minecraft_version,
          mod_loader
        ),
        users!p2p_invitations_from_user_id_fkey (
          name,
          custom_username,
          avatar_url
        )
      `)
      .single()

    if (invitationError) {
      console.error('Error creating invitation:', invitationError)
      throw invitationError
    }

    await supabaseAdmin
      .from('session_participants')
      .insert([{
        session_id: sessionId,
        user_id: friendId,
        status: 'invited'
      }])

    return NextResponse.json({ 
      success: true,
      invitation: invitation,
      message: 'Invitation sent successfully'
    })
  } catch (error) {
    console.error('Error in p2p/invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

