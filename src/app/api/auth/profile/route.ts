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

export async function GET(request: NextRequest) {
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

  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, custom_username, has_custom_username, avatar_url, subscription_tier, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      throw userError
    }

    const { count: friendsCount } = await supabaseAdmin
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    return NextResponse.json({
      user: {
        id: userData.id,
        name: userData.custom_username || userData.name,
        email: userData.email,
        avatar_url: userData.avatar_url,
        subscription_tier: userData.subscription_tier || 'free',
        created_at: userData.created_at,
        custom_username: userData.custom_username,
        has_custom_username: userData.has_custom_username || false,
        friends_count: friendsCount || 0,
        last_seen: userData.updated_at || userData.created_at
      }
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error in auth/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

