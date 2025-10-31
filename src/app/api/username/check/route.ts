import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const { username } = await request.json()

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  if (!usernameRegex.test(username)) {
    return NextResponse.json({ 
      available: false,
      error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores'
    }, { status: 400 })
  }

  try {
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('custom_username', username)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking username:', error)
      throw error
    }

    const available = !existingUser

    return NextResponse.json({
      available,
      username,
      message: available ? 'Username is available!' : 'Username is already taken'
    })
  } catch (error) {
    console.error('Error in username/check:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

