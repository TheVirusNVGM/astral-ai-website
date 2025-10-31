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

  const { status, current_game, is_playing } = await request.json()
  if (!status || !['online', 'offline', 'away'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status. Must be online, offline, or away' }, { status: 400, headers: corsHeaders })
  }

  try {
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders })
    }

    const statusData = {
      user_id: userId,
      status,
      current_game: current_game || null,
      is_playing: is_playing || false,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: existingStatus } = await supabaseAdmin
      .from('user_status')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingStatus) {
      const { error: updateError } = await supabaseAdmin
        .from('user_status')
        .update(statusData)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating user status:', updateError)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500, headers: corsHeaders })
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('user_status')
        .insert([{ ...statusData, created_at: new Date().toISOString() }])

      if (insertError) {
        console.error('Error creating user status:', insertError)
        return NextResponse.json({ error: 'Failed to create status' }, { status: 500, headers: corsHeaders })
      }
    }

    await supabaseAdmin
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userId)

    return NextResponse.json({
      success: true,
      status: {
        status,
        current_game,
        is_playing,
        last_seen: statusData.last_seen
      }
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error in user/status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

