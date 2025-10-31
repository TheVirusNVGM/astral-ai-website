import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCorsHeaders } from '@/lib/cors'
import { generateRefreshToken } from '@/lib/tokens'

export const runtime = 'edge'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = {
    ...getCorsHeaders(origin),
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
    'Access-Control-Allow-Credentials': 'true',
  }
  
  try {
    const body = await request.json()
    // Don't log sensitive data (codes, tokens)
    console.log('🔥 OAuth token request received')

    const { grant_type, code, client_id, redirect_uri, state } = body

    // Validate grant type
    if (grant_type !== 'authorization_code') {
      return NextResponse.json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      }, { status: 400, headers: corsHeaders })
    }

    // Validate required parameters
    if (!code || !client_id) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      }, { status: 400, headers: corsHeaders })
    }

    // Get authorization code from database
    const { data: authCode, error: codeError } = await supabaseAdmin
      .from('oauth_codes')
      .select(`
        *,
        users (
          id,
          name,
          email,
          avatar_url,
          subscription_tier,
          created_at,
          custom_username,
          has_custom_username
        )
      `)
      .eq('code', code)
      .eq('client_id', client_id)
      .eq('used', false)
      .single()

    if (codeError || !authCode) {
      console.error('❌ Invalid authorization code - not found in database or already used')
      console.error('Database error:', codeError)
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Invalid, expired, or already used authorization code'
      }, { status: 400, headers: corsHeaders })
    }
    
    // Authorization code validated successfully

    // Check if code is expired
    const now = new Date()
    const expiresAt = new Date(authCode.expires_at)
    
    if (now > expiresAt) {
      console.error('⏰ Authorization code expired')
      // Delete expired code
      await supabaseAdmin
        .from('oauth_codes')
        .delete()
        .eq('code', code)

      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Authorization code has expired'
      }, { status: 400, headers: corsHeaders })
    }

    // Validate redirect URI
    if (redirect_uri && redirect_uri !== authCode.redirect_uri) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Invalid redirect URI'
      }, { status: 400, headers: corsHeaders })
    }

    // Validate state parameter (CSRF protection)
    if (state && state !== authCode.state) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'Invalid state parameter'
      }, { status: 400, headers: corsHeaders })
    }

    // Get Supabase JWT token from authorization code
    // New codes will have this field populated, old codes will be NULL
    const supabaseJWT: string | null = authCode.supabase_jwt_token || null
    
    // If no JWT saved (old codes created before migration), return error
    // User needs to re-authorize to get JWT
    if (!supabaseJWT) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'JWT token not available. Please re-authorize the application.'
      }, { status: 400, headers: corsHeaders })
    }

    // Generate refresh token (custom, for OAuth token rotation)
    const refreshToken = generateRefreshToken()
    const expiresIn = 3600 // 1 hour (Supabase JWT lifetime)
    const refreshExpiresIn = 7 * 24 * 60 * 60 // 7 days (refresh token)

    // Mark authorization code as used (instead of deleting)
    await supabaseAdmin
      .from('oauth_codes')
      .update({ used: true })
      .eq('code', code)

    // Save tokens with expiration dates
    // Note: We store the Supabase JWT as access_token, and our custom refresh token
    await supabaseAdmin
      .from('oauth_tokens')
      .insert({
        access_token: supabaseJWT, // ✅ Use Supabase JWT instead of custom token
        refresh_token: refreshToken,
        client_id,
        user_id: authCode.user_id,
        scope: authCode.scope,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        refresh_expires_at: new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
      })

    // Prepare response
    const tokenResponse = {
      access_token: supabaseJWT, // ✅ Return Supabase JWT (starts with eyJ...)
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_expires_in: refreshExpiresIn,
      scope: authCode.scope,
      user: authCode.users
    }

    // OAuth token generated successfully

    return NextResponse.json(tokenResponse, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('❌ OAuth token error')
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error'
    }, { status: 500, headers: corsHeaders })
  }
}
