import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// CORS headers for launcher
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email, client_id } = await request.json()

    // Validate request
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate client (optional - for rate limiting)
    if (client_id !== 'astral-launcher') {
      console.warn('Unknown client requesting OTP:', client_id)
    }

    // Use signInWithOtp but with channel 'email' to force OTP instead of magic link
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        channel: 'email', // Forces email OTP instead of magic link
      },
    })

    if (error) {
      console.error('Supabase OTP error:', error)
      
      // Handle specific errors
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait before trying again.' },
          { status: 429, headers: corsHeaders }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ OTP sent successfully to:', email)

    return NextResponse.json(
      {
        success: true,
        message: 'Verification code sent to your email',
        user_created: Boolean(data?.user),
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('OTP API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
