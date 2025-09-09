import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔥 EMERGENCY DEBUG - OAUTH TOKEN REQUEST RECEIVED!')
    console.log('🔥 Body:', JSON.stringify(body, null, 2))
    console.log('🔥 Method:', request.method)
    console.log('🔥 URL:', request.url)
    console.log('✨ OAuth token request [v3 - FRESH]:', body)
    console.log('⏰ API timestamp [v3]:', new Date().toISOString())
    console.log('🆕 Vercel deployment updated!')
    console.log('🔍 Request headers:', {
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type')
    })

    const { grant_type, code, client_id, redirect_uri } = body

    // Validate grant type
    if (grant_type !== 'authorization_code') {
      return NextResponse.json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      }, { status: 400 })
    }

    // Validate required parameters
    if (!code || !client_id) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      }, { status: 400 })
    }

    // Get authorization code from database
    console.log('🔍 Searching for code in database:', { code, client_id })
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
      console.error('❌ Invalid authorization code:', codeError)
      console.error('🔍 Code search result:', { authCode, codeError })
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code'
      }, { status: 400 })
    }
    
    console.log('✅ Found authorization code:', {
      code: authCode.code,
      client_id: authCode.client_id,
      user_id: authCode.user_id,
      expires_at: authCode.expires_at,
      created_at: authCode.created_at
    })

    // Check if code is expired
    const now = new Date()
    const expiresAt = new Date(authCode.expires_at)
    const timeLeft = expiresAt.getTime() - now.getTime()
    
    console.log('🕰️ Time check:', {
      now: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      timeLeftMs: timeLeft,
      timeLeftMin: Math.round(timeLeft / 60000),
      isExpired: now > expiresAt
    })
    
    if (now > expiresAt) {
      console.error('⏰ Code expired, deleting...')
      // Delete expired code
      await supabaseAdmin
        .from('oauth_codes')
        .delete()
        .eq('code', code)

      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Authorization code has expired'
      }, { status: 400 })
    }

    // Validate redirect URI
    if (redirect_uri && redirect_uri !== authCode.redirect_uri) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Invalid redirect URI'
      }, { status: 400 })
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
        'Access-Control-Allow-Credentials': 'true',
      }
    })

  } catch (error) {
    console.error('❌ OAuth token error:', error)
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error'
    }, { status: 500 })
  }
}

function generateAccessToken(): string {
  // Generate a secure access token (in production, use proper JWT)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'at_' // access token prefix
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateRefreshToken(): string {
  // Generate a secure refresh token
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'rt_' // refresh token prefix
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
