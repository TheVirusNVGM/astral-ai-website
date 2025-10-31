import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCorsHeaders } from '@/lib/cors'
import { validateToken } from '@/lib/auth-utils'

export const runtime = 'edge'

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json(
      { error: 'No token provided' },
      { status: 401, headers: corsHeaders }
    )
  }

  const userId = await validateToken(token)
  if (!userId) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401, headers: corsHeaders }
    )
  }

  try {
    // Получаем список друзей с их данными и статусом
    const { data: friendsData, error } = await supabaseAdmin
      .from('friends')
      .select(`
        user_id,
        friend_id,
        created_at
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    if (error) {
      console.error('Error fetching friends:', error)
      throw error
    }

    // Получаем ID друзей
    const friendIds = friendsData?.map(f => 
      f.user_id === userId ? f.friend_id : f.user_id
    ) || []
    
    // Получаем данные всех друзей
    let friendsUsers: any[] = []
    let friendStatuses: any[] = []
    
    if (friendIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('users')
        .select('id, name, custom_username, avatar_url, email, updated_at')
        .in('id', friendIds)
      
      friendsUsers = usersData || []
      
      const { data: statusData } = await supabaseAdmin
        .from('user_status')
        .select('user_id, status, current_game, is_playing, last_seen')
        .in('user_id', friendIds)
      
      friendStatuses = statusData || []
    }

    // Объединяем данные друзей со статусом
    const friends = friendsData?.map(friendRecord => {
      const friendId = friendRecord.user_id === userId ? friendRecord.friend_id : friendRecord.user_id
      const friend = friendsUsers.find(u => u.id === friendId)
      
      if (!friend) return null
      
      const status = friendStatuses.find(s => s.user_id === friend.id)
      
      const lastSeen = status?.last_seen || friend.updated_at
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const isRecentlyActive = lastSeen > fiveMinutesAgo
      
      return {
        id: friend.id,
        name: friend.custom_username || friend.name,
        custom_username: friend.custom_username,
        avatar_url: friend.avatar_url,
        status: status?.status || (isRecentlyActive ? 'online' : 'offline'),
        is_playing: status?.is_playing || false,
        current_game: status?.current_game,
        last_seen: lastSeen,
        friendship_created: friendRecord.created_at
      }
    }).filter(Boolean) || []

    // Получаем входящие заявки в друзья
    const { data: incomingRequests, error: requestsError } = await supabaseAdmin
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

    if (requestsError) {
      console.error('Error fetching friend requests:', requestsError)
    }

    return NextResponse.json({
      friends: friends || [],
      incomingRequests: incomingRequests || []
    }, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Error in friends/list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

