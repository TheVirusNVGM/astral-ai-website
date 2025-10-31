import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCorsHeaders } from '@/lib/cors'
import { validateToken } from '@/lib/auth-utils'

export const runtime = 'edge'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401, headers: corsHeaders })
  }

  const userId = await validateToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
  }

  const { sessionId, invitationId, connectionData = {}, password = null } = await request.json()
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400, headers: corsHeaders })
  }

  try {
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .select('id, host_user_id, max_players, current_players, is_private, password, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404, headers: corsHeaders })
    }

    if (session.status !== 'waiting' && session.status !== 'active') {
      return NextResponse.json({ error: 'Game session is not available' }, { status: 400, headers: corsHeaders })
    }

    if (session.current_players >= session.max_players) {
      return NextResponse.json({ error: 'Game session is full' }, { status: 400, headers: corsHeaders })
    }

    if (session.is_private && session.password !== password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers: corsHeaders })
    }

    if (invitationId) {
      const { data: invitation, error: invitationError } = await supabaseAdmin
        .from('p2p_invitations')
        .select('id, to_user_id, expires_at')
        .eq('id', invitationId)
        .eq('session_id', sessionId)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .single()

      if (invitationError || !invitation) {
        return NextResponse.json({ error: 'Invitation not found or expired' }, { status: 404, headers: corsHeaders })
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Invitation has expired' }, { status: 400, headers: corsHeaders })
      }

      await supabaseAdmin
        .from('p2p_invitations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', invitationId)
    } else {
      if (!session.is_private) {
        const { data: friendship } = await supabaseAdmin
          .from('friends')
          .select('id')
          .eq('user_id', userId)
          .eq('friend_id', session.host_user_id)
          .maybeSingle()

        if (!friendship) {
          return NextResponse.json({ error: 'You can only join sessions of your friends' }, { status: 403, headers: corsHeaders })
        }
      }
    }

    const { data: existingParticipant, error: participantCheckError } = await supabaseAdmin
      .from('session_participants')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (participantCheckError && participantCheckError.code !== 'PGRST116') {
      throw participantCheckError
    }

    if (existingParticipant) {
      if (existingParticipant.status === 'joined') {
        return NextResponse.json({ error: 'Already joined this session' }, { status: 400, headers: corsHeaders })
      }
      
      const { error: updateError } = await supabaseAdmin
        .from('session_participants')
        .update({ 
          status: 'joined',
          p2p_connection_data: connectionData,
          joined_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating participant status:', updateError)
        throw updateError
      }
    } else {
      const { error: participantError } = await supabaseAdmin
        .from('session_participants')
        .insert([{
          session_id: sessionId,
          user_id: userId,
          status: 'joined',
          p2p_connection_data: connectionData
        }])

      if (participantError) {
        console.error('Error adding participant:', participantError)
        throw participantError
      }
    }

    await supabaseAdmin
      .from('game_sessions')
      .update({ 
        current_players: session.current_players + 1,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    const { data: updatedSession, error: fetchError } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        id,
        session_name,
        minecraft_version,
        mod_loader,
        current_players,
        max_players,
        p2p_data,
        users!game_sessions_host_user_id_fkey (
          name,
          custom_username,
          avatar_url
        )
      `)
      .eq('id', sessionId)
      .single()

    if (fetchError) {
      console.error('Error fetching updated session:', fetchError)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully joined the session',
      session: updatedSession
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error in p2p/join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

