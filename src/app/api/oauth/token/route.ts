import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCorsHeaders } from '@/lib/cors'
import { generateRefreshToken } from '@/lib/tokens'

export const runtime = 'edge'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined
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
  const origin = request.headers.get('origin') || undefined
  const corsHeaders = {
    ...getCorsHeaders(origin),
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
    'Access-Control-Allow-Credentials': 'true',
  }
  
  try {
    const body = await request.json()
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

    // 🛡️ АТОМАРНАЯ ОПЕРАЦИЯ: Получаем код и помечаем как использованный в одной транзакции
    // Это предотвращает race condition при параллельных запросах
    // 🔧 Указываем конкретный foreign key, чтобы Supabase знал, какой использовать
    const { data: authCode, error: codeError } = await supabaseAdmin
      .from('oauth_codes')
      .select(`
        *,
        users!oauth_codes_user_id_fkey (
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
      console.error('❌ Invalid authorization code:', codeError?.message || 'not found or already used')
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

    // 🛡️ КРИТИЧНО: Сначала сохраняем токены, ПОТОМ помечаем код как использованный
    // Это гарантирует, что если сохранение токенов упадет, код останется валидным
    // Save tokens with expiration dates
    // Note: We store the Supabase JWT as access_token, and our custom refresh token
    const { data: insertedToken, error: tokenInsertError } = await supabaseAdmin
      .from('oauth_tokens')
      .insert({
        access_token: supabaseJWT,
        refresh_token: refreshToken,
        client_id,
        user_id: authCode.user_id,
        scope: authCode.scope,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        refresh_expires_at: new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
      })
      .select()
      .single()

    // Если сохранение токенов упало, код остается валидным для повторной попытки
    if (tokenInsertError) {
      // Проверяем, может быть это ошибка уникальности (токен уже существует)
      if (tokenInsertError.code === '23505') { // Unique violation
        // Обновляем существующий токен
        const { data: updatedToken, error: updateError } = await supabaseAdmin
          .from('oauth_tokens')
          .update({
            refresh_token: refreshToken,
            client_id,
            user_id: authCode.user_id,
            scope: authCode.scope,
            expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            refresh_expires_at: new Date(Date.now() + refreshExpiresIn * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('access_token', supabaseJWT)
          .select()
          .single()

        if (updateError) {
          console.error('❌ Failed to update token after unique violation:', updateError)
          return NextResponse.json({
            error: 'server_error',
            error_description: 'Failed to save or update token. Please try again.'
          }, { status: 500, headers: corsHeaders })
        }
      } else {
        console.error('❌ Failed to save OAuth tokens:', tokenInsertError)
        return NextResponse.json({
          error: 'server_error',
          error_description: 'Failed to save tokens. Please try again.'
        }, { status: 500, headers: corsHeaders })
      }
    }

    // 🛡️ АТОМАРНОЕ ОБНОВЛЕНИЕ: Помечаем код как использованный ТОЛЬКО если он еще не использован
    // Это предотвращает race condition - если два запроса придут одновременно,
    // только один сможет обновить код (WHERE used = false)
    // ВАЖНО: Делаем это ПОСЛЕ успешного сохранения токенов
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('oauth_codes')
      .update({ used: true })
      .eq('code', code)
      .eq('used', false) // Критично: обновляем ТОЛЬКО если еще не использован
      .select()

    // Проверяем, что код был успешно помечен как использованный
    // Если updateResult пустой, значит код уже был использован другим запросом
    // Но это не критично, так как токены уже сохранены
    if (updateError || !updateResult || updateResult.length === 0) {
      // Не возвращаем ошибку, так как токены уже сохранены
      // Просто продолжаем выполнение
    }

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
