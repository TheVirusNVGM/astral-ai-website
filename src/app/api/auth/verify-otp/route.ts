import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCorsHeaders } from '@/lib/cors'

export const runtime = 'edge'

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  try {
    const { email, token, client_id } = await request.json()

    // Validate request
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!token || token.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate client (optional)
    if (client_id !== 'astral-launcher') {
      console.warn('Unknown client verifying OTP')
    }

    // Verify OTP using Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })

    if (error) {
      console.error('Supabase OTP verification error')

      const msg = String(error.message || '')
      if (msg.includes('expired')) {
        return NextResponse.json(
          { error: 'Verification code has expired' },
          { status: 400, headers: corsHeaders }
        )
      }

      if (msg.includes('invalid')) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!data.session || !data.user) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ OTP verified successfully')

    // Fetch or create user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    // Create user profile if it doesn't exist
    if (!userProfile) {
      const newUser = {
        id: data.user.id,
        name:
          data.user.user_metadata?.name ||
          data.user.user_metadata?.full_name ||
          email.split('@')[0],
        email: data.user.email || email,
        avatar_url: data.user.user_metadata?.avatar_url,
        subscription_tier: 'free',
        created_at: new Date().toISOString(),
      }

      const { data: createdUser } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single()

      if (createdUser) {
        console.log('✅ Created new user profile')
      }
    }

    // Return session data in format expected by launcher
    return NextResponse.json(
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        token_type: 'bearer',
        user: {
          id: data.user.id,
          name:
            userProfile?.name ||
            data.user.user_metadata?.name ||
            data.user.user_metadata?.full_name ||
            email.split('@')[0],
          email: data.user.email || email,
          avatar_url: userProfile?.avatar_url || data.user.user_metadata?.avatar_url,
          subscription_tier: userProfile?.subscription_tier || 'free',
          created_at: userProfile?.created_at || data.user.created_at,
        },
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('OTP verification API error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
