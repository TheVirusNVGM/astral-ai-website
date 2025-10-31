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
      console.warn('Unknown client requesting OTP')
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
      console.error('Supabase OTP error')
      
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

    console.log('✅ OTP sent successfully')

    return NextResponse.json(
      {
        success: true,
        message: 'Verification code sent to your email',
        user_created: Boolean(data?.user),
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('OTP API error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
