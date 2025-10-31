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

  const { username } = await request.json()
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400, headers: corsHeaders })
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  if (!usernameRegex.test(username)) {
    return NextResponse.json({ 
      error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' 
    }, { status: 400, headers: corsHeaders })
  }

  try {
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('custom_username', username)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking username availability:', checkError)
      throw checkError
    }

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400, headers: corsHeaders })
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        custom_username: username,
        has_custom_username: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('custom_username, name, avatar_url')
      .single()

    if (updateError) {
      console.error('Error updating username:', updateError)
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Username set successfully',
      user: updatedUser
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error in username/set:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

