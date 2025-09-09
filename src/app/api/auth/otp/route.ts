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

    // Prefer Confirm Signup flow (email OTP code) instead of Magic Link.
    // Try to sign up the user; Supabase will send the Confirm Signup email with {{ .Token }}.
    const { data, error } = await supabase.auth.signUp({
      email,
      options: {
        emailRedirectTo: undefined,
      },
    })

    if (error) {
      // If user already registered, fall back to resending the confirmation email (still OTP-style if unconfirmed)
      const msg = String(error.message || '')
      if (msg.includes('User already registered')) {
        // Attempt to re-send confirmation email to existing but unconfirmed users
        try {
          const { error: resendErr } = await supabase.auth.resend({
            type: 'signup',
            email,
          })
          if (resendErr) {
            console.error('Supabase resend(signup) error:', resendErr)
            return NextResponse.json(
              { error: 'Failed to resend verification code' },
              { status: 500, headers: corsHeaders }
            )
          }
        } catch (resendCatch) {
          console.error('Resend catch error:', resendCatch)
          return NextResponse.json(
            { error: 'Failed to resend verification code' },
            { status: 500, headers: corsHeaders }
          )
        }
      } else if (msg.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait before trying again.' },
          { status: 429, headers: corsHeaders }
        )
      } else {
        console.error('Supabase signUp error:', error)
        return NextResponse.json(
          { error: 'Failed to send verification code' },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    console.log('✅ Confirm signup email (OTP) sent to:', email)

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
