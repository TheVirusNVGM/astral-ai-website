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

  const { query } = await request.json()
  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400, headers: corsHeaders })
  }

  if (query.length < 2) {
    return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400, headers: corsHeaders })
  }

  try {
    const { data: users, error: searchError } = await supabaseAdmin
      .from('users')
      .select('id, name, custom_username, avatar_url')
      .or(`custom_username.ilike.%${query}%,name.ilike.%${query}%`)
      .neq('id', userId)
      .limit(10)

    if (searchError) {
      console.error('Error searching users:', searchError)
      throw searchError
    }

    const userIds = users?.map(u => u.id) || []
    
    if (userIds.length > 0) {
      const { data: friendships } = await supabaseAdmin
        .from('friends')
        .select('friend_id')
        .eq('user_id', userId)
        .in('friend_id', userIds)

      const { data: pendingRequests } = await supabaseAdmin
        .from('friend_requests')
        .select('from_user_id, to_user_id')
        .eq('status', 'pending')
        .or(`and(from_user_id.eq.${userId},to_user_id.in.(${userIds.join(',')})),and(to_user_id.eq.${userId},from_user_id.in.(${userIds.join(',')}))`)

      const friendIds = new Set(friendships?.map(f => f.friend_id) || [])
      const pendingIds = new Set([
        ...(pendingRequests?.map(r => r.from_user_id === userId ? r.to_user_id : r.from_user_id) || [])
      ])

      const usersWithStatus = users?.map(searchUser => ({
        ...searchUser,
        relationship: friendIds.has(searchUser.id) ? 'friend' :
                    pendingIds.has(searchUser.id) ? 'pending' : 'none'
      }))

      return NextResponse.json({
        success: true,
        users: usersWithStatus || []
      }, { headers: corsHeaders })
    } else {
      return NextResponse.json({
        success: true,
        users: []
      }, { headers: corsHeaders })
    }
  } catch (error) {
    console.error('Error in users/search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

