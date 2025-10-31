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

async function getUserFromToken(token: string) {
  let userId = await validateToken(token)
  let user = null
  
  if (userId) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (userData) {
      user = { id: userId, ...userData }
    }
  }
  
  if (!user) {
    const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (supabaseUser && !authError) {
      user = supabaseUser
      userId = user.id
    }
  }
  
  return { user, userId }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401, headers: corsHeaders })
  }

  const { user, userId } = await getUserFromToken(token)
  if (!user || !userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
  }

  const { username, message = '' } = await request.json()
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400, headers: corsHeaders })
  }

  try {
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, custom_username')
      .eq('custom_username', username)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders })
    }

    if (targetUser.id === userId) {
      return NextResponse.json({ error: 'Cannot add yourself as friend' }, { status: 400, headers: corsHeaders })
    }

    const { data: existingFriend } = await supabaseAdmin
      .from('friends')
      .select('id')
      .or(`and(user_id.eq.${userId},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${userId})`)
      .maybeSingle()

    if (existingFriend) {
      return NextResponse.json({ error: 'Already friends' }, { status: 400, headers: corsHeaders })
    }

    const { data: anyRequest } = await supabaseAdmin
      .from('friend_requests')
      .select('id, status')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${targetUser.id}),and(from_user_id.eq.${targetUser.id},to_user_id.eq.${user.id})`)
      .maybeSingle()
        
    if (anyRequest) {
      if (anyRequest.status === 'pending') {
        return NextResponse.json({ error: 'Friend request already exists' }, { status: 400, headers: corsHeaders })
      } else if (anyRequest.status === 'accepted') {
        return NextResponse.json({ error: 'You are already friends' }, { status: 400, headers: corsHeaders })
      } else if (anyRequest.status === 'declined') {
        await supabaseAdmin
          .from('friend_requests')
          .delete()
          .eq('id', anyRequest.id)
      }
    }

    const { data: newRequest, error } = await supabaseAdmin
      .from('friend_requests')
      .insert([{
        from_user_id: user.id,
        to_user_id: targetUser.id,
        message: message
      }])
      .select(`
        id,
        message,
        created_at,
        users!friend_requests_to_user_id_fkey (
          custom_username,
          name
        )
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Friend request already exists' }, { status: 400, headers: corsHeaders })
      }
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      request: newRequest,
      message: `Friend request sent to ${targetUser.custom_username}`
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error sending friend request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401, headers: corsHeaders })
  }

  const { user, userId } = await getUserFromToken(token)
  if (!user || !userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
  }

  const { requestId, action } = await request.json()
  if (!requestId || !action || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400, headers: corsHeaders })
  }

  try {
    const { data: request, error: requestError } = await supabaseAdmin
      .from('friend_requests')
      .select('id, from_user_id, to_user_id, status')
      .eq('id', requestId)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (requestError || !request) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404, headers: corsHeaders })
    }

    if (action === 'accept') {
      const { error: friendsError } = await supabaseAdmin
        .from('friends')
        .insert([{ user_id: request.from_user_id, friend_id: request.to_user_id }])

      if (friendsError) {
        console.error('Error adding friends:', friendsError)
        throw friendsError
      }
    }
    
    const { error: deleteError } = await supabaseAdmin
      .from('friend_requests')
      .delete()
      .eq('id', requestId)
    
    if (deleteError) {
      console.error('Error deleting friend request:', deleteError)
      throw deleteError
    }

    return NextResponse.json({ 
      success: true, 
      message: `Friend request ${action}ed successfully`
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error handling friend request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401, headers: corsHeaders })
  }

  const { userId } = await getUserFromToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  if (action === 'list') {
    try {
      const { data: requests, error } = await supabaseAdmin
        .from('friend_requests')
        .select(`
          id,
          message,
          created_at,
          users!friend_requests_from_user_id_fkey (
            id,
            name,
            custom_username,
            avatar_url
          )
        `)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      return NextResponse.json({ requests: requests || [] }, { headers: corsHeaders })
    } catch (error) {
      console.error('Error fetching friend requests:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
    }
  } else {
    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400, headers: corsHeaders })
  }
}

