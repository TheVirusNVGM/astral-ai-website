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

export async function POST(request: NextRequest) {
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

  const { 
    sessionName, 
    minecraftVersion, 
    modLoader, 
    maxPlayers = 10,
    isPrivate = false,
    password = null,
    hostPort = null,
    p2pData = {} 
  } = await request.json()

  if (!sessionName || !minecraftVersion || !modLoader) {
    return NextResponse.json({ 
      error: 'Session name, Minecraft version, and mod loader are required' 
    }, { status: 400, headers: corsHeaders })
  }

  try {
    const { data: existingSession } = await supabaseAdmin
      .from('game_sessions')
      .select('id')
      .eq('host_user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (existingSession) {
      return NextResponse.json({ 
        error: 'You already have an active game session' 
      }, { status: 400, headers: corsHeaders })
    }

    const { data: session, error } = await supabaseAdmin
      .from('game_sessions')
      .insert([{
        host_user_id: userId,
        session_name: sessionName,
        minecraft_version: minecraftVersion,
        mod_loader: modLoader,
        max_players: maxPlayers,
        is_private: isPrivate,
        password: password,
        host_port: hostPort,
        p2p_data: p2pData,
        status: 'waiting'
      }])
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
        users!game_sessions_host_user_id_fkey (
          name,
          custom_username,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating game session:', error)
      throw error
    }

    await supabaseAdmin
      .from('session_participants')
      .insert([{
        session_id: session.id,
        user_id: userId,
        status: 'joined'
      }])

    return NextResponse.json({ 
      success: true,
      session: session
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error in p2p/create-session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

