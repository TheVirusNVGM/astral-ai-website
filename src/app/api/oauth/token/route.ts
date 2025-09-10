import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCorsHeaders } from '@/lib/cors'
import { generateAccessToken, generateRefreshToken } from '@/lib/tokens'

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
    console.log('🔥 OAuth token request received')

    const { grant_type, code, client_id, redirect_uri } = body

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
          created_at
        )
      `)
      .eq('code', code)
      .eq('client_id', client_id)
      .single()

    if (codeError || !authCode) {
      console.error('❌ Invalid authorization code')
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code'
      }, { status: 400, headers: corsHeaders })
    }
    
    console.log('✅ Found valid authorization code')

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

    // Generate access token
    const accessToken = generateAccessToken()
    const refreshToken = generateRefreshToken()
    const expiresIn = 3600 // 1 hour

    // Delete the used authorization code
    await supabaseAdmin
      .from('oauth_codes')
      .delete()
      .eq('code', code)

    // Save access token (optional - for token revocation)
    await supabaseAdmin
      .from('oauth_tokens')
      .insert({
        access_token: accessToken,
        refresh_token: refreshToken,
        client_id,
        user_id: authCode.user_id,
        scope: authCode.scope,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
      })

    // Prepare response
    const tokenResponse = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: authCode.scope,
      user: authCode.users
    }

    console.log('✅ OAuth token generated successfully')

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
