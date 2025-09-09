import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, token, client_id } = await request.json()

    // Validate request
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    if (!token || token.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Validate client (optional)
    if (client_id !== 'astral-launcher') {
      console.warn('Unknown client verifying OTP:', client_id)
    }

    // Verify OTP using Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })

    if (error) {
      console.error('Supabase OTP verification error:', error)
      
      // Handle specific errors
      if (error.message.includes('expired')) {
        return NextResponse.json(
          { error: 'Verification code has expired' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('invalid')) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400 }
      )
    }

    if (!data.session || !data.user) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    console.log('✅ OTP verified successfully for:', email)

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
        name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || email.split('@')[0],
        email: data.user.email || email,
        avatar_url: data.user.user_metadata?.avatar_url,
        subscription_tier: 'free',
        created_at: new Date().toISOString()
      }

      const { data: createdUser } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single()

      if (createdUser) {
        console.log('✅ Created new user profile:', createdUser.id)
      }
    }

    // Return session data in format expected by launcher
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in || 3600,
      token_type: 'bearer',
      user: {
        id: data.user.id,
        name: userProfile?.name || data.user.user_metadata?.name || data.user.user_metadata?.full_name || email.split('@')[0],
        email: data.user.email || email,
        avatar_url: userProfile?.avatar_url || data.user.user_metadata?.avatar_url,
        subscription_tier: userProfile?.subscription_tier || 'free',
        created_at: userProfile?.created_at || data.user.created_at
      }
    })

  } catch (error) {
    console.error('OTP verification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
