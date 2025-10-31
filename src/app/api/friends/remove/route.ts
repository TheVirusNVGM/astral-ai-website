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

export async function DELETE(request: NextRequest) {
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

  const { friendId } = await request.json()
  if (!friendId) {
    return NextResponse.json({ error: 'Friend ID is required' }, { status: 400, headers: corsHeaders })
  }

  try {
    const { data: friendship, error: friendshipError } = await supabaseAdmin
      .from('friends')
      .select('id')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .maybeSingle()

    if (friendshipError || !friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404, headers: corsHeaders })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)

    if (deleteError) {
      console.error('Error removing friend:', deleteError)
      throw deleteError
    }
    
    await supabaseAdmin
      .from('friend_requests')
      .delete()
      .or(`and(from_user_id.eq.${userId},to_user_id.eq.${friendId}),and(from_user_id.eq.${friendId},to_user_id.eq.${userId})`)

    return NextResponse.json({ success: true, message: 'Friend removed successfully' }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error in friends/remove:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

