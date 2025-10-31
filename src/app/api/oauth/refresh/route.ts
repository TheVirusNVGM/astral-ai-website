import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCorsHeaders } from '@/lib/cors'
import { generateRefreshToken } from '@/lib/tokens'

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
      .select('id, user_id, client_id, scope, refresh_expires_at, access_token')
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

    // Get user from Supabase to generate new JWT
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(tokenRecord.user_id)
    
    if (userError || !userData?.user) {
      console.error('Error getting user for refresh:', userError)
      return NextResponse.json({
        error: 'server_error',
        error_description: 'Failed to refresh token'
      }, { status: 500, headers: corsHeaders })
    }

    // Try to reuse existing JWT if still valid, otherwise generate new one
    let newSupabaseJWT: string | null = null
    
    // Check if current access_token is a JWT and still valid
    if (tokenRecord.access_token && tokenRecord.access_token.startsWith('eyJ')) {
      try {
        const { data: { user }, error: jwtError } = await supabaseAdmin.auth.getUser(tokenRecord.access_token)
        if (!jwtError && user) {
          // JWT is still valid, reuse it
          newSupabaseJWT = tokenRecord.access_token
        }
      } catch (error) {
        // JWT expired or invalid, need to generate new one
      }
    }

    // If JWT is expired or not a JWT, we need to generate a new one
    // But Supabase Admin API doesn't provide direct method to generate JWT
    // Best we can do is return error asking user to re-authorize
    if (!newSupabaseJWT) {
      // Delete old token record
      await supabaseAdmin
        .from('oauth_tokens')
        .delete()
        .eq('id', tokenRecord.id)

      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Access token expired. Please re-authorize the application.'
      }, { status: 400, headers: corsHeaders })
    }

    // Generate new refresh token (rotate)
    const newRefreshToken = generateRefreshToken()
    const expiresIn = 3600 // 1 hour (Supabase JWT lifetime)
    const refreshExpiresIn = 7 * 24 * 60 * 60 // 7 days (refresh token)

    // Update token record with new refresh token and reuse JWT
    const { error: updateError } = await supabaseAdmin
      .from('oauth_tokens')
      .update({
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
      access_token: newSupabaseJWT, // ✅ Return Supabase JWT
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

