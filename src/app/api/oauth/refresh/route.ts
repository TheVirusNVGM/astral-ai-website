import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCorsHeaders } from '@/lib/cors'
import { generateAccessToken, generateRefreshToken } from '@/lib/tokens'

export const runtime = 'edge'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  return new NextResponse(null, { status: 200, headers: corsHeaders })
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
    const { grant_type, refresh_token, client_id } = body

    // Validate grant type
    if (grant_type !== 'refresh_token') {
      return NextResponse.json({
        error: 'unsupported_grant_type',
        error_description: 'Only refresh_token grant type is supported'
      }, { status: 400, headers: corsHeaders })
    }

    // Validate required parameters
    if (!refresh_token || !client_id) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'Missing required parameters: refresh_token and client_id'
      }, { status: 400, headers: corsHeaders })
    }

    // Find refresh token in database
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('oauth_tokens')
      .select('id, user_id, client_id, scope, refresh_expires_at')
      .eq('refresh_token', refresh_token)
      .eq('client_id', client_id)
      .single()

    if (tokenError || !tokenRecord) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Invalid refresh token'
      }, { status: 400, headers: corsHeaders })
    }

    // Check if refresh token is expired
    const now = new Date()
    const refreshExpiresAt = tokenRecord.refresh_expires_at 
      ? new Date(tokenRecord.refresh_expires_at)
      : null

    if (refreshExpiresAt && now > refreshExpiresAt) {
      // Delete expired token
      await supabaseAdmin
        .from('oauth_tokens')
        .delete()
        .eq('id', tokenRecord.id)

      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Refresh token has expired'
      }, { status: 400, headers: corsHeaders })
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken()
    const newRefreshToken = generateRefreshToken()
    const expiresIn = 3600 // 1 hour (access token)
    const refreshExpiresIn = 7 * 24 * 60 * 60 // 7 days (refresh token)

    // Update token record with new tokens (rotate refresh token)
    const { error: updateError } = await supabaseAdmin
      .from('oauth_tokens')
      .update({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        refresh_expires_at: new Date(Date.now() + refreshExpiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenRecord.id)

    if (updateError) {
      console.error('Error updating tokens:', updateError)
      return NextResponse.json({
        error: 'server_error',
        error_description: 'Failed to refresh token'
      }, { status: 500, headers: corsHeaders })
    }

    // Return new tokens
    return NextResponse.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_expires_in: refreshExpiresIn,
      scope: tokenRecord.scope
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Refresh token error:', error)
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error'
    }, { status: 500, headers: corsHeaders })
  }
}

